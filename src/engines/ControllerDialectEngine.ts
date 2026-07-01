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
  | "fanuc_0i" | "fanuc_16i" | "fanuc_18i" | "fanuc_30i" | "fanuc_31i"
  | "siemens_828d" | "siemens_840d" | "siemens_one"
  | "heidenhain_tnc640" | "heidenhain_tnc7"
  | "haas_ngc"
  | "mazak_smooth_ai" | "mazak_smooth_g"
  | "okuma_osp_p300" | "okuma_osp_p500"
  | "brother_speedio"
  | "mitsubishi_m80"
  | "fagor_8065"
  | "citizen_cincom" | "star_fanuc"
  | "dmg_celos_siemens" | "dmg_celos_fanuc" | "hurco_max5"
  | "doosan_puma"
  | "generic_fanuc" | "generic_iso";

export type ArcFormat = "ijk_incremental" | "ijk_absolute" | "r_word" | "both";
export type CommentStyle = "parentheses" | "semicolon" | "heidenhain";
export type LineNumberStyle = "n10" | "n1" | "none" | "optional";
export type DecimalStyle = "mandatory_point" | "optional_point" | "no_trailing_zeros";

export interface CannedCycleMap {
  drill: string;              // G81
  peck_drill: string;         // G83
  deep_hole: string;          // G73
  tap: string;                // G84
  bore: string;               // G85 / G86
  ream: string;               // G85
  back_bore: string;          // G87
  cancel: string;             // G80
  // PP-MOAT-MS3 U02: rigid tapping + threading
  rigid_tap?: string;         // G84.2/G84.3 (Fanuc), CYCLE84 (Siemens), CYCL DEF 207 (Heidenhain)
  rigid_tap_lh?: string;      // Left-hand rigid tap variant
  thread_single_point?: string; // G76 (Fanuc/Haas), CYCLE206 (Siemens), CYCL DEF 262 (Heidenhain)
  thread_multi_pass?: string;   // G76 multi-pass (Fanuc), CYCLE207 (Siemens), CYCL DEF 263 (Heidenhain)
}

/** PP-MOAT-MS3 U03: Probing cycle definitions per controller */
export interface ProbingCycleMap {
  auto_datum?: string;    // Datum/corner probe for WCS setup
  surface_z?: string;     // Z-surface probe
  bore?: string;          // Bore/pocket probe
  boss?: string;          // Boss/web probe
  corner?: string;        // Corner/edge probe
  tool_length?: string;   // Tool length measurement
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

  // Machine capability awareness (P0 gap fix)
  look_ahead_blocks?: number;       // e.g., 200 for Fanuc 31i-B5, 40 for 0i-MF
  block_processing_rate?: number;   // blocks/sec, e.g., 7000 for 31i, 1000 for 0i
  nurbs_interpolation?: boolean;    // true if controller supports NURBS G-code
  max_simultaneous_axes?: number;   // 3, 4, or 5
  work_offset_count?: number;       // 48, 99, 300 etc.
  macro_b_support?: boolean;        // G65/G66 custom macro capability
  program_memory_kb?: number;       // program storage capacity

  // Swiss/turning-specific capabilities
  sub_spindle?: boolean;            // dual-spindle machine
  guide_bushing?: boolean;          // sliding headstock guide bushing
  part_catcher?: boolean;           // automatic part catcher
  thread_whirling?: boolean;        // thread whirling capability
  lfv_vibration?: boolean;          // Low Frequency Vibration chip breaking (Citizen)
  gang_tooling?: boolean;           // gang-style tool block (Star)
  ulti_motion?: boolean;            // UltiMotion motion control (Hurco)
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

  // Probing cycles (PP-MOAT-MS3 U03)
  probing_cycles?: ProbingCycleMap;

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
      rigid_tap: "G84.2", rigid_tap_lh: "G84.3", thread_single_point: "G76", thread_multi_pass: "G76",
    },
    probing_cycles: {
      auto_datum: "G65 P9810", surface_z: "G65 P9811", bore: "G65 P9812",
      boss: "G65 P9812", corner: "G65 P9811", tool_length: "G65 P9023",
    },
    sub_program_call: "M98 P{num}",
    sub_program_return: "M99",
    features: {
      look_ahead_blocks: 40, block_processing_rate: 1000, nurbs_interpolation: false,
      max_simultaneous_axes: 4, work_offset_count: 48, macro_b_support: true, program_memory_kb: 256,
    },
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
      rigid_tap: "G84.2", rigid_tap_lh: "G84.3", thread_single_point: "G76", thread_multi_pass: "G76",
    },
    probing_cycles: {
      auto_datum: "G65 P9810", surface_z: "G65 P9811", bore: "G65 P9812",
      boss: "G65 P9812", corner: "G65 P9811", tool_length: "G65 P9023",
    },
    sub_program_call: "M98 P{num}",
    sub_program_return: "M99",
    features: {
      hsc_mode: { on: "G05 P10000", off: "G05 P0" },
      nano_smooth: "G05.1 Q1",
      look_ahead_blocks: 200, block_processing_rate: 5000, nurbs_interpolation: true,
      max_simultaneous_axes: 5, work_offset_count: 300, macro_b_support: true, program_memory_kb: 1024,
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
      rigid_tap: "G84.2", rigid_tap_lh: "G84.3", thread_single_point: "G76", thread_multi_pass: "G76",
    },
    probing_cycles: {
      auto_datum: "G65 P9810", surface_z: "G65 P9811", bore: "G65 P9812",
      boss: "G65 P9812", corner: "G65 P9811", tool_length: "G65 P9023",
    },
    sub_program_call: "M98 P{num}",
    sub_program_return: "M99",
    features: {
      hsc_mode: { on: "G05.1 Q1", off: "G05.1 Q0", tolerance_param: "G05.1 Q1 R{tol}" },
      smoothing: { rough: "G05 P10000", medium: "G05.1 Q1", finish: "G05.1 Q1" },
      tcpc: { on: "G43.4 H{offset}", off: "G49" },
      coord_rotation: "G68.2 X{x} Y{y} Z{z} I{a} J{b} K{c}",
      nano_smooth: "G05.1 Q1",
      look_ahead_blocks: 200, block_processing_rate: 7000, nurbs_interpolation: true,
      max_simultaneous_axes: 5, work_offset_count: 300, macro_b_support: true, program_memory_kb: 2048,
    },
  },

  fanuc_16i: {
    id: "fanuc_16i",
    display_name: "Fanuc 16i-MB",
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
      rigid_tap: "G84.2", rigid_tap_lh: "G84.3", thread_single_point: "G76", thread_multi_pass: "G76",
    },
    probing_cycles: {
      auto_datum: "G65 P9810", surface_z: "G65 P9811", bore: "G65 P9812",
      boss: "G65 P9812", corner: "G65 P9811", tool_length: "G65 P9023",
    },
    sub_program_call: "M98 P{num}",
    sub_program_return: "M99",
    features: {
      hsc_mode: { on: "G05 P10000", off: "G05 P0" },
      look_ahead_blocks: 20, block_processing_rate: 500, nurbs_interpolation: false,
      max_simultaneous_axes: 4, work_offset_count: 48, macro_b_support: true, program_memory_kb: 128,
    },
  },

  fanuc_18i: {
    id: "fanuc_18i",
    display_name: "Fanuc 18i-MB",
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
      rigid_tap: "G84.2", rigid_tap_lh: "G84.3", thread_single_point: "G76", thread_multi_pass: "G76",
    },
    probing_cycles: {
      auto_datum: "G65 P9810", surface_z: "G65 P9811", bore: "G65 P9812",
      boss: "G65 P9812", corner: "G65 P9811", tool_length: "G65 P9023",
    },
    sub_program_call: "M98 P{num}",
    sub_program_return: "M99",
    features: {
      hsc_mode: { on: "G05 P10000", off: "G05 P0" },
      look_ahead_blocks: 30, block_processing_rate: 800, nurbs_interpolation: false,
      max_simultaneous_axes: 4, work_offset_count: 48, macro_b_support: true, program_memory_kb: 256,
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
      rigid_tap: "CYCLE84", thread_single_point: "CYCLE97", thread_multi_pass: "CYCLE98",
    },
    probing_cycles: {
      auto_datum: "CYCLE977", surface_z: "CYCLE978", bore: "CYCLE979",
      boss: "CYCLE979", corner: "CYCLE977", tool_length: "CYCLE982",
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
      look_ahead_blocks: 150, block_processing_rate: 6000, nurbs_interpolation: true,
      max_simultaneous_axes: 5, work_offset_count: 99, macro_b_support: false, program_memory_kb: 4096,
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
      rigid_tap: "CYCLE84", thread_single_point: "CYCLE97", thread_multi_pass: "CYCLE98",
    },
    probing_cycles: {
      auto_datum: "CYCLE977", surface_z: "CYCLE978", bore: "CYCLE979",
      boss: "CYCLE979", corner: "CYCLE977", tool_length: "CYCLE982",
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
      look_ahead_blocks: 200, block_processing_rate: 10000, nurbs_interpolation: true,
      max_simultaneous_axes: 5, work_offset_count: 99, macro_b_support: false, program_memory_kb: 8192,
    },
  },

  siemens_828d: {
    id: "siemens_828d",
    display_name: "Siemens 828D",
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
    arc_format: "both",
    rapid_code: "G0", linear_code: "G1", cw_arc_code: "G2", ccw_arc_code: "G3",
    absolute_mode: "G90", incremental_mode: "G91",
    tool_change_sequence: ["T{tool}", "M6", "D1"],
    spindle_cw: "M3", spindle_ccw: "M4", spindle_stop: "M5",
    coolant_flood: "M8", coolant_mist: "M7", coolant_off: "M9",
    work_offsets: { base: "G54", extended: "$P_UIFR[{n},X,C]", format: "G5{4+n}" },
    canned_cycles: {
      drill: "CYCLE81", peck_drill: "CYCLE83", deep_hole: "CYCLE83",
      tap: "CYCLE84", bore: "CYCLE85", ream: "CYCLE85",
      back_bore: "CYCLE86", cancel: "MCALL",
      rigid_tap: "CYCLE84", thread_single_point: "CYCLE97",
    },
    probing_cycles: {
      auto_datum: "CYCLE977", surface_z: "CYCLE978", bore: "CYCLE979",
      boss: "CYCLE979", corner: "CYCLE977", tool_length: "CYCLE982",
    },
    cycle_call_prefix: "MCALL ",
    sub_program_call: "CALL \"{name}\"",
    sub_program_return: "RET",
    features: {
      hsc_mode: { on: "CYCLE832({tol},1)", off: "CYCLE832()", tolerance_param: "CYCLE832({tol},{mode})" },
      smoothing: { rough: "CYCLE832(0.05,1)", medium: "CYCLE832(0.02,1)", finish: "CYCLE832(0.005,1)" },
      coord_rotation: "CYCLE800(0,\"\",0,0,0,{a},{b},{c},0,0,0,0,1)",
      look_ahead: { set: "COMPCAD" },
      look_ahead_blocks: 100, block_processing_rate: 3000, nurbs_interpolation: false,
      max_simultaneous_axes: 3, work_offset_count: 99, macro_b_support: false, program_memory_kb: 1024,
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
      rigid_tap: "CYCL DEF 207", thread_single_point: "CYCL DEF 262", thread_multi_pass: "CYCL DEF 263",
    },
    probing_cycles: {
      auto_datum: "TCH PROBE 410", surface_z: "TCH PROBE 411", bore: "TCH PROBE 412",
      boss: "TCH PROBE 413", corner: "TCH PROBE 414", tool_length: "TCH PROBE 417",
    },
    cycle_call_prefix: "CYCL CALL",
    sub_program_call: "CALL PGM {name}",
    sub_program_return: "END PGM",
    features: {
      hsc_mode: { on: "FUNCTION TCPM F TCP AXIS POS PATHCTRL AXIS", off: "" },
      smoothing: { rough: "CYCL DEF 32.0 TOLERANCE\nCYCL DEF 32.1 T0.05", medium: "CYCL DEF 32.0 TOLERANCE\nCYCL DEF 32.1 T0.02", finish: "CYCL DEF 32.0 TOLERANCE\nCYCL DEF 32.1 T0.005" },
      tcpc: { on: "FUNCTION TCPM F TCP AXIS POS PATHCTRL AXIS", off: "FUNCTION RESET TCPM" },
      coord_rotation: "PLANE SPATIAL SPA{a} SPB{b} SPC{c} STAY",
      look_ahead_blocks: 512, block_processing_rate: 10000, nurbs_interpolation: true,
      max_simultaneous_axes: 5, work_offset_count: 99, macro_b_support: false, program_memory_kb: 4096,
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
      rigid_tap: "CYCL DEF 207", thread_single_point: "CYCL DEF 262", thread_multi_pass: "CYCL DEF 263",
    },
    probing_cycles: {
      auto_datum: "TCH PROBE 410", surface_z: "TCH PROBE 411", bore: "TCH PROBE 412",
      boss: "TCH PROBE 413", corner: "TCH PROBE 414", tool_length: "TCH PROBE 417",
    },
    sub_program_call: "CALL PGM {name}",
    sub_program_return: "END PGM",
    features: {
      hsc_mode: { on: "FUNCTION TCPM F TCP AXIS POS PATHCTRL AXIS", off: "" },
      smoothing: { rough: "CYCL DEF 32.0 TOLERANCE\nCYCL DEF 32.1 T0.05", medium: "CYCL DEF 32.0 TOLERANCE\nCYCL DEF 32.1 T0.02", finish: "CYCL DEF 32.0 TOLERANCE\nCYCL DEF 32.1 T0.005" },
      tcpc: { on: "FUNCTION TCPM F TCP AXIS POS PATHCTRL AXIS", off: "FUNCTION RESET TCPM" },
      coord_rotation: "PLANE SPATIAL SPA{a} SPB{b} SPC{c} STAY",
      look_ahead_blocks: 1024, block_processing_rate: 15000, nurbs_interpolation: true,
      max_simultaneous_axes: 5, work_offset_count: 99, macro_b_support: false, program_memory_kb: 8192,
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
      rigid_tap: "G84", rigid_tap_lh: "G84", thread_single_point: "G76", thread_multi_pass: "G76",
    },
    probing_cycles: {
      auto_datum: "G65 P9810", surface_z: "G65 P9811", bore: "G65 P9812",
      boss: "G65 P9812", corner: "G65 P9811", tool_length: "G65 P9023",
    },
    sub_program_call: "M98 P{num}",
    sub_program_return: "M99",
    features: {
      smoothing: { rough: "G187 P1 (ROUGH)", medium: "G187 P2 (MEDIUM)", finish: "G187 P3 (FINISH)" },
      tcpc: { on: "G234", off: "G49" },
      look_ahead_blocks: 80, block_processing_rate: 1000, nurbs_interpolation: false,
      max_simultaneous_axes: 5, work_offset_count: 200, macro_b_support: true, program_memory_kb: 1024,
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
      rigid_tap: "G84", rigid_tap_lh: "G84", thread_single_point: "G76", thread_multi_pass: "G76",
    },
    probing_cycles: {
      auto_datum: "G65 P9810", surface_z: "G65 P9811", bore: "G65 P9812",
      boss: "G65 P9812", corner: "G65 P9811", tool_length: "G65 P9023",
    },
    sub_program_call: "M98 P{num}",
    sub_program_return: "M99",
    features: {
      hsc_mode: { on: "G05.1 Q1", off: "G05.1 Q0" },
      smoothing: { rough: "G61.1 P1", medium: "G61.1 P2", finish: "G61.1 P3" },
      tcpc: { on: "G43.4 H{offset}", off: "G49" },
      coord_rotation: "G68 X{x} Y{y} R{angle}",
      look_ahead_blocks: 200, block_processing_rate: 5000, nurbs_interpolation: true,
      max_simultaneous_axes: 5, work_offset_count: 48, macro_b_support: true, program_memory_kb: 2048,
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
      rigid_tap: "G84", rigid_tap_lh: "G84", thread_single_point: "G76", thread_multi_pass: "G76",
    },
    probing_cycles: {
      auto_datum: "G65 P9810", surface_z: "G65 P9811", bore: "G65 P9812",
      boss: "G65 P9812", corner: "G65 P9811", tool_length: "G65 P9023",
    },
    sub_program_call: "M98 P{num}",
    sub_program_return: "M99",
    features: {
      smoothing: { rough: "G61.1 P1", medium: "G61.1 P2", finish: "G61.1 P3" },
      tcpc: { on: "G43.4 H{offset}", off: "G49" },
      look_ahead_blocks: 100, block_processing_rate: 3000, nurbs_interpolation: false,
      max_simultaneous_axes: 4, work_offset_count: 48, macro_b_support: true, program_memory_kb: 1024,
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
      rigid_tap: "G84", thread_single_point: "G76", thread_multi_pass: "G76",
    },
    probing_cycles: {
      auto_datum: "G65 P8810", surface_z: "G65 P8811", bore: "G65 P8812",
      boss: "G65 P8812", corner: "G65 P8811", tool_length: "G65 P8823",
    },
    sub_program_call: "M98 P{num}",
    sub_program_return: "M99",
    features: {
      nano_smooth: "G05.1 Q1",
      tcpc: { on: "G43.4", off: "G49" },
      look_ahead_blocks: 100, block_processing_rate: 3000, nurbs_interpolation: false,
      max_simultaneous_axes: 4, work_offset_count: 48, macro_b_support: true, program_memory_kb: 512,
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
      rigid_tap: "G84", thread_single_point: "G76", thread_multi_pass: "G76",
    },
    probing_cycles: {
      auto_datum: "G65 P8810", surface_z: "G65 P8811", bore: "G65 P8812",
      boss: "G65 P8812", corner: "G65 P8811", tool_length: "G65 P8823",
    },
    sub_program_call: "M98 P{num}",
    sub_program_return: "M99",
    features: {
      hsc_mode: { on: "G05.1 Q1", off: "G05.1 Q0" },
      nano_smooth: "Super-NURBS ON",
      tcpc: { on: "G43.5 H{offset}", off: "G49" },
      look_ahead_blocks: 200, block_processing_rate: 6000, nurbs_interpolation: true,
      max_simultaneous_axes: 5, work_offset_count: 99, macro_b_support: true, program_memory_kb: 2048,
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
      rigid_tap: "G84.2", rigid_tap_lh: "G84.3", thread_single_point: "G76", thread_multi_pass: "G76",
    },
    probing_cycles: {
      auto_datum: "G65 P9810", surface_z: "G65 P9811", bore: "G65 P9812",
      boss: "G65 P9812", corner: "G65 P9811", tool_length: "G65 P9023",
    },
    sub_program_call: "M98 P{num}",
    sub_program_return: "M99",
    features: {
      hsc_mode: { on: "G05.1 Q1", off: "G05.1 Q0" },
      look_ahead_blocks: 100, block_processing_rate: 5000, nurbs_interpolation: false,
      max_simultaneous_axes: 4, work_offset_count: 48, macro_b_support: true, program_memory_kb: 256,
    },
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
      rigid_tap: "G84.2", rigid_tap_lh: "G84.3", thread_single_point: "G76", thread_multi_pass: "G76",
    },
    probing_cycles: {
      auto_datum: "G65 P9810", surface_z: "G65 P9811", bore: "G65 P9812",
      boss: "G65 P9812", corner: "G65 P9811", tool_length: "G65 P9023",
    },
    sub_program_call: "M98 P{num}",
    sub_program_return: "M99",
    features: {
      hsc_mode: { on: "G05.1 Q1", off: "G05.1 Q0", tolerance_param: "G05.1 Q1 R{tol}" },
      smoothing: { rough: "G61.1 P1", medium: "G61.1 P2", finish: "G61.1 P3" },
      look_ahead_blocks: 200, block_processing_rate: 5400, nurbs_interpolation: true,
      max_simultaneous_axes: 5, work_offset_count: 48, macro_b_support: true, program_memory_kb: 1024,
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
      rigid_tap: "G84.2", rigid_tap_lh: "G84.3", thread_single_point: "G76", thread_multi_pass: "G76",
    },
    probing_cycles: {
      auto_datum: "G65 P9810", surface_z: "G65 P9811", bore: "G65 P9812",
      boss: "G65 P9812", corner: "G65 P9811", tool_length: "G65 P9023",
    },
    sub_program_call: "M98 P{num}",
    sub_program_return: "M99",
    features: {
      hsc_mode: { on: "G134", off: "G133" },
      look_ahead_blocks: 150, block_processing_rate: 4000, nurbs_interpolation: true,
      max_simultaneous_axes: 5, work_offset_count: 99, macro_b_support: false, program_memory_kb: 2048,
    },
  },

  // ════════════════════════════════════════════════════════════════════
  // SWISS/TURNING SPECIALTY
  // ════════════════════════════════════════════════════════════════════

  citizen_cincom: {
    id: "citizen_cincom",
    display_name: "Citizen Cincom (Fanuc-based)",
    manufacturer: "Citizen",
    base_family: "fanuc",
    program_start: ["%", "O0001", "(CITIZEN CINCOM)", "G18 G40 G80 G99"],
    program_end: ["M30", "%"],
    safe_start: "G18 G40 G80 G99 G21",
    comment_style: "parentheses" as CommentStyle,
    comment_open: "(", comment_close: ")",
    line_numbers: "n10" as LineNumberStyle,
    decimal_style: "mandatory_point" as DecimalStyle,
    arc_format: "ijk_incremental" as ArcFormat,
    rapid_code: "G0", linear_code: "G1", cw_arc_code: "G2", ccw_arc_code: "G3",
    absolute_mode: "G90", incremental_mode: "G91",
    tool_change_sequence: ["T{tool}00"],
    spindle_cw: "M3", spindle_ccw: "M4", spindle_stop: "M5",
    coolant_flood: "M8", coolant_mist: "M7", coolant_off: "M9", coolant_tsc: "M50",
    work_offsets: { base: "G54", format: "G5{4+n}" },
    canned_cycles: {
      drill: "G81", peck_drill: "G83", deep_hole: "G73", tap: "G84",
      bore: "G85", ream: "G85", back_bore: "G87", cancel: "G80",
      rigid_tap: "G84.2", rigid_tap_lh: "G84.3", thread_single_point: "G76", thread_multi_pass: "G76",
    },
    sub_program_call: "M98 P{num}",
    sub_program_return: "M99",
    features: {
      look_ahead_blocks: 200, block_processing_rate: 5000, nurbs_interpolation: false,
      max_simultaneous_axes: 5, work_offset_count: 48, macro_b_support: true, program_memory_kb: 1024,
      sub_spindle: true, guide_bushing: true, part_catcher: true, thread_whirling: true, lfv_vibration: true,
    },
  },

  star_fanuc: {
    id: "star_fanuc",
    display_name: "Star SR/SW (Fanuc-based)",
    manufacturer: "Star Micronics",
    base_family: "fanuc",
    program_start: ["%", "O0001", "(STAR SWISS)", "G18 G40 G80 G99"],
    program_end: ["M30", "%"],
    safe_start: "G18 G40 G80 G99 G21",
    comment_style: "parentheses" as CommentStyle,
    comment_open: "(", comment_close: ")",
    line_numbers: "n10" as LineNumberStyle,
    decimal_style: "mandatory_point" as DecimalStyle,
    arc_format: "ijk_incremental" as ArcFormat,
    rapid_code: "G0", linear_code: "G1", cw_arc_code: "G2", ccw_arc_code: "G3",
    absolute_mode: "G90", incremental_mode: "G91",
    tool_change_sequence: ["T{tool}00"],
    spindle_cw: "M3", spindle_ccw: "M4", spindle_stop: "M5",
    coolant_flood: "M8", coolant_mist: "M7", coolant_off: "M9", coolant_tsc: "M50",
    work_offsets: { base: "G54", format: "G5{4+n}" },
    canned_cycles: {
      drill: "G81", peck_drill: "G83", deep_hole: "G73", tap: "G84",
      bore: "G85", ream: "G85", back_bore: "G87", cancel: "G80",
      rigid_tap: "G84.2", rigid_tap_lh: "G84.3", thread_single_point: "G76", thread_multi_pass: "G76",
    },
    sub_program_call: "M98 P{num}",
    sub_program_return: "M99",
    features: {
      look_ahead_blocks: 200, block_processing_rate: 5000, nurbs_interpolation: false,
      max_simultaneous_axes: 5, work_offset_count: 48, macro_b_support: true, program_memory_kb: 1024,
      sub_spindle: true, guide_bushing: true, part_catcher: true, thread_whirling: true, gang_tooling: true,
    },
  },

  // ════════════════════════════════════════════════════════════════════
  // DMG MORI CELOS + HURCO
  // ════════════════════════════════════════════════════════════════════

  dmg_celos_siemens: {
    id: "dmg_celos_siemens",
    display_name: "DMG MORI CELOS (Siemens)",
    manufacturer: "DMG MORI",
    base_family: "siemens",
    program_start: ["; DMG MORI CELOS / SINUMERIK", "PROC MAIN", "DEF INT TOOL_NUM"],
    program_end: ["M30", "RET"],
    safe_start: "G90 G710 G17 G40 G60 D0",
    comment_style: "semicolon" as CommentStyle,
    comment_open: ";", comment_close: "",
    line_numbers: "none" as LineNumberStyle,
    decimal_style: "mandatory_point" as DecimalStyle,
    arc_format: "ijk_absolute" as ArcFormat,
    rapid_code: "G0", linear_code: "G1", cw_arc_code: "G2", ccw_arc_code: "G3",
    absolute_mode: "G90", incremental_mode: "G91",
    tool_change_sequence: ["T{tool}", "M6", "D1"],
    spindle_cw: "M3", spindle_ccw: "M4", spindle_stop: "M5",
    coolant_flood: "M8", coolant_mist: "M7", coolant_off: "M9", coolant_tsc: "M51",
    work_offsets: { base: "$P_UIFR[1]", extended: "$P_UIFR[{n}]", format: "$P_UIFR[{n}]" },
    canned_cycles: {
      drill: "CYCLE81", peck_drill: "CYCLE83", deep_hole: "CYCLE83", tap: "CYCLE84",
      bore: "CYCLE85", ream: "CYCLE85", back_bore: "CYCLE87", cancel: "MCALL",
      rigid_tap: "CYCLE84", thread_single_point: "CYCLE97", thread_multi_pass: "CYCLE98",
    },
    probing_cycles: {
      auto_datum: "CYCLE977", surface_z: "CYCLE978", bore: "CYCLE979",
      boss: "CYCLE979", corner: "CYCLE977", tool_length: "CYCLE982",
    },
    cycle_call_prefix: "MCALL",
    sub_program_call: "CALL \"{name}\"",
    sub_program_return: "RET",
    features: {
      hsc_mode: { on: "CYCLE832(0.01,1,1)", off: "CYCLE832()", tolerance_param: "CYCLE832({tol})" },
      smoothing: { rough: "G642", medium: "G642", finish: "G641" },
      tcpc: { on: "TRAORI", off: "TRAFOOF" },
      look_ahead_blocks: 300, block_processing_rate: 10000, nurbs_interpolation: true,
      max_simultaneous_axes: 5, work_offset_count: 99, macro_b_support: false, program_memory_kb: 4096,
    },
  },

  dmg_celos_fanuc: {
    id: "dmg_celos_fanuc",
    display_name: "DMG MORI CELOS (Fanuc)",
    manufacturer: "DMG MORI",
    base_family: "fanuc",
    program_start: ["%", "O0001 (DMG MORI CELOS/FANUC)"],
    program_end: ["M30", "%"],
    safe_start: "G90 G21 G17 G40 G80 G49",
    comment_style: "parentheses" as CommentStyle,
    comment_open: "(", comment_close: ")",
    line_numbers: "n10" as LineNumberStyle,
    decimal_style: "mandatory_point" as DecimalStyle,
    arc_format: "ijk_incremental" as ArcFormat,
    rapid_code: "G0", linear_code: "G1", cw_arc_code: "G2", ccw_arc_code: "G3",
    absolute_mode: "G90", incremental_mode: "G91",
    tool_change_sequence: ["T{tool} M6", "G43 H{tool} Z100."],
    spindle_cw: "M3", spindle_ccw: "M4", spindle_stop: "M5",
    coolant_flood: "M8", coolant_mist: "M7", coolant_off: "M9", coolant_tsc: "M51",
    work_offsets: { base: "G54", extended: "G54.1 P{n}", format: "G5{4+n}" },
    canned_cycles: {
      drill: "G81", peck_drill: "G83", deep_hole: "G73", tap: "G84",
      bore: "G85", ream: "G85", back_bore: "G87", cancel: "G80",
      rigid_tap: "G84.2", rigid_tap_lh: "G84.3", thread_single_point: "G76", thread_multi_pass: "G76",
    },
    probing_cycles: {
      auto_datum: "G65 P9810", surface_z: "G65 P9811", bore: "G65 P9812",
      boss: "G65 P9812", corner: "G65 P9811", tool_length: "G65 P9023",
    },
    sub_program_call: "M98 P{num}",
    sub_program_return: "M99",
    features: {
      hsc_mode: { on: "G05.1 Q1", off: "G05.1 Q0" },
      smoothing: { rough: "G64", medium: "G64", finish: "G61.1" },
      look_ahead_blocks: 200, block_processing_rate: 7000, nurbs_interpolation: true,
      max_simultaneous_axes: 5, work_offset_count: 48, macro_b_support: true, program_memory_kb: 2048,
    },
  },

  hurco_max5: {
    id: "hurco_max5",
    display_name: "Hurco WinMax / MAX5",
    manufacturer: "Hurco",
    base_family: "other",
    program_start: ["%", "O0001 (HURCO MAX5)"],
    program_end: ["M30", "%"],
    safe_start: "G90 G21 G17 G40 G80 G49",
    comment_style: "parentheses" as CommentStyle,
    comment_open: "(", comment_close: ")",
    line_numbers: "n1" as LineNumberStyle,
    decimal_style: "mandatory_point" as DecimalStyle,
    arc_format: "r_word" as ArcFormat,
    rapid_code: "G0", linear_code: "G1", cw_arc_code: "G2", ccw_arc_code: "G3",
    absolute_mode: "G90", incremental_mode: "G91",
    tool_change_sequence: ["T{tool} M6", "G43 H{tool}"],
    spindle_cw: "M3", spindle_ccw: "M4", spindle_stop: "M5",
    coolant_flood: "M8", coolant_mist: "M7", coolant_off: "M9",
    work_offsets: { base: "G54", format: "G5{4+n}" },
    canned_cycles: {
      drill: "G81", peck_drill: "G83", deep_hole: "G73", tap: "G84",
      bore: "G85", ream: "G85", back_bore: "G87", cancel: "G80",
      rigid_tap: "G84.2", rigid_tap_lh: "G84.3", thread_single_point: "G76", thread_multi_pass: "G76",
    },
    probing_cycles: {
      auto_datum: "G65 P9810", surface_z: "G65 P9811", bore: "G65 P9812",
      boss: "G65 P9812", corner: "G65 P9811", tool_length: "G65 P9023",
    },
    sub_program_call: "M98 P{num}",
    sub_program_return: "M99",
    features: {
      look_ahead_blocks: 10000, block_processing_rate: 15000, nurbs_interpolation: true,
      max_simultaneous_axes: 5, work_offset_count: 48, macro_b_support: false, program_memory_kb: 4096,
      ulti_motion: true,
    },
  },

  // ════════════════════════════════════════════════════════════════════
  // DOOSAN (Fanuc 0i-Plus based)
  // ════════════════════════════════════════════════════════════════════

  doosan_puma: {
    id: "doosan_puma",
    display_name: "Doosan Puma / DNM (Fanuc 0i-Plus)",
    manufacturer: "Doosan",
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
      rigid_tap: "G84.2", rigid_tap_lh: "G84.3", thread_single_point: "G76", thread_multi_pass: "G76",
    },
    probing_cycles: {
      auto_datum: "G65 P9810", surface_z: "G65 P9811", bore: "G65 P9812",
      boss: "G65 P9812", corner: "G65 P9811", tool_length: "G65 P9023",
    },
    sub_program_call: "M98 P{num}",
    sub_program_return: "M99",
    features: {
      look_ahead_blocks: 40, block_processing_rate: 1000, nurbs_interpolation: false,
      max_simultaneous_axes: 3, work_offset_count: 48, macro_b_support: true, program_memory_kb: 256,
    },
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
      rigid_tap: "G84.2", rigid_tap_lh: "G84.3", thread_single_point: "G76", thread_multi_pass: "G76",
    },
    probing_cycles: {
      auto_datum: "G65 P9810", surface_z: "G65 P9811", bore: "G65 P9812",
      boss: "G65 P9812", corner: "G65 P9811", tool_length: "G65 P9023",
    },
    sub_program_call: "M98 P{num}",
    sub_program_return: "M99",
    features: {
      look_ahead_blocks: 40, block_processing_rate: 1000, nurbs_interpolation: false,
      max_simultaneous_axes: 3, work_offset_count: 48, macro_b_support: false, program_memory_kb: 256,
    },
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
      rigid_tap: "G84.2", rigid_tap_lh: "G84.3", thread_single_point: "G76", thread_multi_pass: "G76",
    },
    sub_program_call: "M98 P{num}",
    sub_program_return: "M99",
    features: {
      look_ahead_blocks: 40, block_processing_rate: 1000, nurbs_interpolation: false,
      max_simultaneous_axes: 3, work_offset_count: 48, macro_b_support: false, program_memory_kb: 256,
    },
  },
};

// ─── Alias map: simple names → dialect IDs ───────────────────────────

const ALIAS_MAP: Record<string, string> = {
  fanuc: "generic_fanuc", "fanuc_0i": "fanuc_0i", "fanuc_16i": "fanuc_16i", "fanuc_18i": "fanuc_18i", "fanuc_30i": "fanuc_30i", "fanuc_31i": "fanuc_31i",
  siemens: "siemens_840d", "siemens_828d": "siemens_828d", "828d": "siemens_828d", "siemens_840d": "siemens_840d", "siemens_one": "siemens_one", "840d": "siemens_840d",
  heidenhain: "heidenhain_tnc640", "tnc640": "heidenhain_tnc640", "tnc7": "heidenhain_tnc7",
  haas: "haas_ngc", "haas_ngc": "haas_ngc",
  mazak: "mazak_smooth_ai", "smooth_ai": "mazak_smooth_ai", "smooth_g": "mazak_smooth_g",
  okuma: "okuma_osp_p300", "osp_p300": "okuma_osp_p300", "osp_p500": "okuma_osp_p500",
  brother: "brother_speedio", mitsubishi: "mitsubishi_m80", fagor: "fagor_8065",
  citizen: "citizen_cincom", cincom: "citizen_cincom", "citizen_cincom": "citizen_cincom", "l20": "citizen_cincom", "l32": "citizen_cincom",
  star: "star_fanuc", "star_fanuc": "star_fanuc", "star_sr": "star_fanuc", "star_sw": "star_fanuc",
  dmg: "dmg_celos_siemens", "dmg_mori": "dmg_celos_siemens", "dmg_celos_siemens": "dmg_celos_siemens", "dmg_celos_fanuc": "dmg_celos_fanuc", celos: "dmg_celos_siemens",
  hurco: "hurco_max5", "hurco_max5": "hurco_max5", "winmax": "hurco_max5", "ultimotion": "hurco_max5",
  doosan: "doosan_puma", "doosan_puma": "doosan_puma", "doosan_fanuc": "doosan_puma", puma: "doosan_puma", dnm: "doosan_puma",
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

  /** Get probing cycles for a controller. Returns undefined fields for unsupported probes. */
  getProbingCycles(controller: string): ProbingCycleMap | undefined {
    return this.getDialect(controller).probing_cycles;
  }

  /** Get rigid tapping cycle for a controller. Returns undefined if not supported. */
  getRigidTapCycle(controller: string, leftHand = false): string | undefined {
    const d = this.getDialect(controller);
    return leftHand ? (d.canned_cycles.rigid_tap_lh ?? d.canned_cycles.rigid_tap) : d.canned_cycles.rigid_tap;
  }

  /** Get threading cycles for a controller */
  getThreadingCycles(controller: string): { single_point?: string; multi_pass?: string } {
    const d = this.getDialect(controller);
    return { single_point: d.canned_cycles.thread_single_point, multi_pass: d.canned_cycles.thread_multi_pass };
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
