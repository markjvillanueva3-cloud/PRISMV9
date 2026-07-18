/**
 * ControllerStrategyValidatorEngine (E1090) — CAMX-MS2/U01
 *
 * Pre-validates that a selected toolpath strategy is executable on the target
 * CNC controller. Checks: NURBS interpolation support, look-ahead block count,
 * block processing rate (blocks/sec), simultaneous axes count, HSM mode
 * availability (G05.1/CYCLE832/G187), work offset count, canned cycle support,
 * sub-program nesting depth, macro variable support.
 *
 * Controller database: 11 families (Fanuc, Siemens, Heidenhain, Haas, Mazak,
 * Okuma, Brother, Mitsubishi, Fagor, OSAI, Centroid).
 *
 * @module ControllerStrategyValidatorEngine
 */

// ─── Types ─────────────────────────────────────────────────────────

export type ControllerFamily =
  | "fanuc_0i"
  | "fanuc_16i"
  | "fanuc_30i"
  | "fanuc_31i"
  | "siemens_828d"
  | "siemens_840d"
  | "siemens_one"
  | "heidenhain_tnc640"
  | "heidenhain_tnc7"
  | "haas_ngc"
  | "mazak_smooth_ai"
  | "mazak_smooth_g"
  | "okuma_osp_p300"
  | "okuma_osp_p500"
  | "brother_speedio"
  | "mitsubishi_m80"
  | "fagor_8065";

export type StrategyType =
  | "morphed_spiral"
  | "adaptive_clearing"
  | "5axis_simultaneous"
  | "thread_milling"
  | "high_speed_finishing"
  | "trochoidal_milling"
  | "plunge_roughing"
  | "barrel_cutter_finishing"
  | "geodesic_finishing"
  | "z_level_roughing"
  | "rest_machining"
  | "face_milling"
  | "peck_drilling"
  | "bore_milling"
  | "helical_bore"
  | "constant_scallop"
  | "pencil_tracing"
  | "flowline_finishing"
  | "swarf_cutting"
  | "custom";

export type IssueSeverity = "error" | "warning" | "info";

export interface StrategyRequirements {
  needs_nurbs: boolean;
  min_look_ahead: number;
  min_block_rate: number;           // blocks/sec
  min_simultaneous_axes: number;
  needs_hsm: boolean;
  needs_rtcp: boolean;
  needs_helical_interpolation: boolean;
  needs_canned_cycles: boolean;
  min_work_offsets: number;
  min_sub_nesting: number;
  needs_macro_variables: boolean;
  needs_variable_feed_override: boolean;
  description: string;
}

export interface ControllerCapabilities {
  family: ControllerFamily;
  display_name: string;
  nurbs_support: boolean;
  nurbs_notes: string;
  look_ahead_blocks: number;
  block_processing_rate: number;    // blocks/sec
  max_simultaneous_axes: number;
  hsm_mode: string;                 // G05.1, CYCLE832, G187, etc.
  hsm_available: boolean;
  work_offset_count: number;
  work_offset_extended: string;     // G54.1, etc.
  canned_cycle_support: boolean;
  sub_program_nesting_depth: number;
  macro_variable_support: boolean;
  rtcp_tcpc_support: boolean;
  helical_interpolation: boolean;
  variable_feed_override: boolean;
  max_feed_override_pct: number;
  max_block_length: number;         // characters
  max_program_size_kb: number;
  notes: string;
}

export interface ValidationIssue {
  severity: IssueSeverity;
  code: string;
  message: string;
  controller_value: string | number | boolean;
  required_value: string | number | boolean;
  suggestion?: string;
}

export interface ValidationResult {
  compatible: boolean;
  controller: ControllerFamily;
  strategy: StrategyType;
  issues: ValidationIssue[];
  warnings: ValidationIssue[];
  capabilities_used: string[];
  fallback_suggestion?: string;
  score: number;                    // 0-100 compatibility score
}

export interface CompatibleControllerResult {
  strategy: StrategyType;
  compatible: ControllerFamily[];
  partial: { controller: ControllerFamily; issues: string[] }[];
  incompatible: ControllerFamily[];
}

// ─── Controller Database ───────────────────────────────────────────

const CONTROLLER_DB: Record<ControllerFamily, ControllerCapabilities> = {
  fanuc_0i: {
    family: "fanuc_0i", display_name: "Fanuc 0i-F Plus",
    nurbs_support: false, nurbs_notes: "Not supported on 0i series",
    look_ahead_blocks: 200, block_processing_rate: 480,
    max_simultaneous_axes: 4,
    hsm_mode: "G05.1", hsm_available: true,
    work_offset_count: 6, work_offset_extended: "G54.1 P1-P48",
    canned_cycle_support: true, sub_program_nesting_depth: 4,
    macro_variable_support: true,
    rtcp_tcpc_support: false, helical_interpolation: true,
    variable_feed_override: true, max_feed_override_pct: 200,
    max_block_length: 256, max_program_size_kb: 1024,
    notes: "Entry-level Fanuc, no NURBS, limited look-ahead"
  },
  fanuc_16i: {
    family: "fanuc_16i", display_name: "Fanuc 16i-MB",
    nurbs_support: false, nurbs_notes: "Limited to Nano interpolation",
    look_ahead_blocks: 400, block_processing_rate: 750,
    max_simultaneous_axes: 5,
    hsm_mode: "G05.1", hsm_available: true,
    work_offset_count: 6, work_offset_extended: "G54.1 P1-P48",
    canned_cycle_support: true, sub_program_nesting_depth: 4,
    macro_variable_support: true,
    rtcp_tcpc_support: true, helical_interpolation: true,
    variable_feed_override: true, max_feed_override_pct: 200,
    max_block_length: 256, max_program_size_kb: 2048,
    notes: "Mid-range Fanuc, Nano interpolation but no true NURBS"
  },
  fanuc_30i: {
    family: "fanuc_30i", display_name: "Fanuc 30i-B Plus",
    nurbs_support: true, nurbs_notes: "Full NURBS G06.2 support",
    look_ahead_blocks: 1000, block_processing_rate: 1500,
    max_simultaneous_axes: 8,
    hsm_mode: "G05.1", hsm_available: true,
    work_offset_count: 6, work_offset_extended: "G54.1 P1-P300",
    canned_cycle_support: true, sub_program_nesting_depth: 10,
    macro_variable_support: true,
    rtcp_tcpc_support: true, helical_interpolation: true,
    variable_feed_override: true, max_feed_override_pct: 254,
    max_block_length: 512, max_program_size_kb: 8192,
    notes: "Top-tier Fanuc, full NURBS + AI Servo tuning"
  },
  fanuc_31i: {
    family: "fanuc_31i", display_name: "Fanuc 31i-B5 Plus",
    nurbs_support: true, nurbs_notes: "NURBS G06.2 with 5-axis TCPC",
    look_ahead_blocks: 1000, block_processing_rate: 1500,
    max_simultaneous_axes: 5,
    hsm_mode: "G05.1", hsm_available: true,
    work_offset_count: 6, work_offset_extended: "G54.1 P1-P300",
    canned_cycle_support: true, sub_program_nesting_depth: 10,
    macro_variable_support: true,
    rtcp_tcpc_support: true, helical_interpolation: true,
    variable_feed_override: true, max_feed_override_pct: 254,
    max_block_length: 512, max_program_size_kb: 8192,
    notes: "5-axis variant of 30i platform"
  },
  siemens_828d: {
    family: "siemens_828d", display_name: "Siemens Sinumerik 828D",
    nurbs_support: true, nurbs_notes: "BSPLINE command for NURBS",
    look_ahead_blocks: 2000, block_processing_rate: 2000,
    max_simultaneous_axes: 5,
    hsm_mode: "CYCLE832", hsm_available: true,
    work_offset_count: 99, work_offset_extended: "G500-G599",
    canned_cycle_support: true, sub_program_nesting_depth: 8,
    macro_variable_support: true,
    rtcp_tcpc_support: true, helical_interpolation: true,
    variable_feed_override: true, max_feed_override_pct: 200,
    max_block_length: 512, max_program_size_kb: 4096,
    notes: "Compact CNC, strong 3+2 and light 5-axis"
  },
  siemens_840d: {
    family: "siemens_840d", display_name: "Siemens Sinumerik 840D sl",
    nurbs_support: true, nurbs_notes: "Full BSPLINE + compressor",
    look_ahead_blocks: 3000, block_processing_rate: 3000,
    max_simultaneous_axes: 31,
    hsm_mode: "CYCLE832", hsm_available: true,
    work_offset_count: 99, work_offset_extended: "Unlimited frames",
    canned_cycle_support: true, sub_program_nesting_depth: 16,
    macro_variable_support: true,
    rtcp_tcpc_support: true, helical_interpolation: true,
    variable_feed_override: true, max_feed_override_pct: 200,
    max_block_length: 1024, max_program_size_kb: 65536,
    notes: "Premium industrial CNC, multi-channel, full 5-axis"
  },
  siemens_one: {
    family: "siemens_one", display_name: "Siemens Sinumerik ONE",
    nurbs_support: true, nurbs_notes: "Digital twin + BSPLINE + AI",
    look_ahead_blocks: 5000, block_processing_rate: 5000,
    max_simultaneous_axes: 31,
    hsm_mode: "CYCLE832", hsm_available: true,
    work_offset_count: 99, work_offset_extended: "Unlimited frames",
    canned_cycle_support: true, sub_program_nesting_depth: 16,
    macro_variable_support: true,
    rtcp_tcpc_support: true, helical_interpolation: true,
    variable_feed_override: true, max_feed_override_pct: 200,
    max_block_length: 1024, max_program_size_kb: 131072,
    notes: "Latest Siemens platform, digital twin capable"
  },
  heidenhain_tnc640: {
    family: "heidenhain_tnc640", display_name: "Heidenhain TNC 640",
    nurbs_support: true, nurbs_notes: "Spline interpolation with ADP",
    look_ahead_blocks: 10000, block_processing_rate: 10000,
    max_simultaneous_axes: 18,
    hsm_mode: "M120", hsm_available: true,
    work_offset_count: 99, work_offset_extended: "Datum table 0-2499",
    canned_cycle_support: true, sub_program_nesting_depth: 10,
    macro_variable_support: true,
    rtcp_tcpc_support: true, helical_interpolation: true,
    variable_feed_override: true, max_feed_override_pct: 150,
    max_block_length: 512, max_program_size_kb: 65536,
    notes: "Premium Heidenhain, class-leading look-ahead"
  },
  heidenhain_tnc7: {
    family: "heidenhain_tnc7", display_name: "Heidenhain TNC7",
    nurbs_support: true, nurbs_notes: "Enhanced spline with ACC",
    look_ahead_blocks: 15000, block_processing_rate: 15000,
    max_simultaneous_axes: 24,
    hsm_mode: "M120", hsm_available: true,
    work_offset_count: 99, work_offset_extended: "Datum table 0-9999",
    canned_cycle_support: true, sub_program_nesting_depth: 12,
    macro_variable_support: true,
    rtcp_tcpc_support: true, helical_interpolation: true,
    variable_feed_override: true, max_feed_override_pct: 150,
    max_block_length: 1024, max_program_size_kb: 131072,
    notes: "Latest Heidenhain, touchscreen, best-in-class motion"
  },
  haas_ngc: {
    family: "haas_ngc", display_name: "Haas NGC (Next Gen Control)",
    nurbs_support: false, nurbs_notes: "No NURBS interpolation",
    look_ahead_blocks: 80, block_processing_rate: 200,
    max_simultaneous_axes: 5,
    hsm_mode: "G187", hsm_available: true,
    work_offset_count: 200, work_offset_extended: "G54-G59 + G154 P1-P99",
    canned_cycle_support: true, sub_program_nesting_depth: 9,
    macro_variable_support: true,
    rtcp_tcpc_support: true, helical_interpolation: true,
    variable_feed_override: true, max_feed_override_pct: 999,
    max_block_length: 256, max_program_size_kb: 1024,
    notes: "Cost-effective 5-axis capable, limited look-ahead"
  },
  mazak_smooth_ai: {
    family: "mazak_smooth_ai", display_name: "Mazak SmoothAi",
    nurbs_support: true, nurbs_notes: "NURBS with AI spindle",
    look_ahead_blocks: 1500, block_processing_rate: 1800,
    max_simultaneous_axes: 5,
    hsm_mode: "High Speed", hsm_available: true,
    work_offset_count: 48, work_offset_extended: "G54.1 P1-P300",
    canned_cycle_support: true, sub_program_nesting_depth: 8,
    macro_variable_support: true,
    rtcp_tcpc_support: true, helical_interpolation: true,
    variable_feed_override: true, max_feed_override_pct: 200,
    max_block_length: 512, max_program_size_kb: 16384,
    notes: "AI-enhanced Mazak platform, smooth 5-axis"
  },
  mazak_smooth_g: {
    family: "mazak_smooth_g", display_name: "Mazak SmoothG",
    nurbs_support: true, nurbs_notes: "NURBS interpolation standard",
    look_ahead_blocks: 1500, block_processing_rate: 1500,
    max_simultaneous_axes: 5,
    hsm_mode: "High Speed", hsm_available: true,
    work_offset_count: 48, work_offset_extended: "G54.1 P1-P300",
    canned_cycle_support: true, sub_program_nesting_depth: 8,
    macro_variable_support: true,
    rtcp_tcpc_support: true, helical_interpolation: true,
    variable_feed_override: true, max_feed_override_pct: 200,
    max_block_length: 512, max_program_size_kb: 8192,
    notes: "Previous-gen Mazak, solid 5-axis capability"
  },
  okuma_osp_p300: {
    family: "okuma_osp_p300", display_name: "Okuma OSP-P300A",
    nurbs_support: true, nurbs_notes: "Super-NURBS standard",
    look_ahead_blocks: 1000, block_processing_rate: 1200,
    max_simultaneous_axes: 5,
    hsm_mode: "Super-NURBS", hsm_available: true,
    work_offset_count: 99, work_offset_extended: "G15 H1-H99",
    canned_cycle_support: true, sub_program_nesting_depth: 8,
    macro_variable_support: true,
    rtcp_tcpc_support: true, helical_interpolation: true,
    variable_feed_override: true, max_feed_override_pct: 200,
    max_block_length: 512, max_program_size_kb: 8192,
    notes: "Okuma open-architecture CNC"
  },
  okuma_osp_p500: {
    family: "okuma_osp_p500", display_name: "Okuma OSP-P500",
    nurbs_support: true, nurbs_notes: "Super-NURBS II enhanced",
    look_ahead_blocks: 1500, block_processing_rate: 2000,
    max_simultaneous_axes: 8,
    hsm_mode: "Super-NURBS", hsm_available: true,
    work_offset_count: 99, work_offset_extended: "G15 H1-H99",
    canned_cycle_support: true, sub_program_nesting_depth: 10,
    macro_variable_support: true,
    rtcp_tcpc_support: true, helical_interpolation: true,
    variable_feed_override: true, max_feed_override_pct: 200,
    max_block_length: 1024, max_program_size_kb: 32768,
    notes: "Latest Okuma, enhanced motion control"
  },
  brother_speedio: {
    family: "brother_speedio", display_name: "Brother SPEEDIO CNC-C00",
    nurbs_support: false, nurbs_notes: "Limited spline, no full NURBS",
    look_ahead_blocks: 400, block_processing_rate: 600,
    max_simultaneous_axes: 4,
    hsm_mode: "HSM built-in", hsm_available: true,
    work_offset_count: 6, work_offset_extended: "G54-G59",
    canned_cycle_support: true, sub_program_nesting_depth: 4,
    macro_variable_support: true,
    rtcp_tcpc_support: false, helical_interpolation: true,
    variable_feed_override: true, max_feed_override_pct: 200,
    max_block_length: 256, max_program_size_kb: 2048,
    notes: "High-speed compact machining center, 3+1 axis focus"
  },
  mitsubishi_m80: {
    family: "mitsubishi_m80", display_name: "Mitsubishi M80A",
    nurbs_support: true, nurbs_notes: "NURBS with SSS control",
    look_ahead_blocks: 1000, block_processing_rate: 1400,
    max_simultaneous_axes: 8,
    hsm_mode: "SSS Control", hsm_available: true,
    work_offset_count: 54, work_offset_extended: "G54-G59 + G54.1",
    canned_cycle_support: true, sub_program_nesting_depth: 10,
    macro_variable_support: true,
    rtcp_tcpc_support: true, helical_interpolation: true,
    variable_feed_override: true, max_feed_override_pct: 200,
    max_block_length: 512, max_program_size_kb: 16384,
    notes: "Mitsubishi high-performance CNC with SSS"
  },
  fagor_8065: {
    family: "fagor_8065", display_name: "Fagor 8065 CNC",
    nurbs_support: true, nurbs_notes: "NURBS with HSSA",
    look_ahead_blocks: 2000, block_processing_rate: 2500,
    max_simultaneous_axes: 28,
    hsm_mode: "HSSA", hsm_available: true,
    work_offset_count: 99, work_offset_extended: "G159 N1-N99",
    canned_cycle_support: true, sub_program_nesting_depth: 15,
    macro_variable_support: true,
    rtcp_tcpc_support: true, helical_interpolation: true,
    variable_feed_override: true, max_feed_override_pct: 200,
    max_block_length: 1024, max_program_size_kb: 65536,
    notes: "Fagor premium CNC with HSSA high-speed algorithm"
  },
};

// ─── Strategy Requirements ─────────────────────────────────────────

const STRATEGY_REQUIREMENTS: Record<StrategyType, StrategyRequirements> = {
  morphed_spiral: {
    needs_nurbs: true, min_look_ahead: 500, min_block_rate: 500,
    min_simultaneous_axes: 3, needs_hsm: true, needs_rtcp: false,
    needs_helical_interpolation: false, needs_canned_cycles: false,
    min_work_offsets: 1, min_sub_nesting: 1, needs_macro_variables: false,
    needs_variable_feed_override: false,
    description: "NURBS-based morphed spiral finishing (AMEF/CFSF) requires smooth interpolation or very high block rate for linear approximation"
  },
  adaptive_clearing: {
    needs_nurbs: false, min_look_ahead: 200, min_block_rate: 300,
    min_simultaneous_axes: 3, needs_hsm: true, needs_rtcp: false,
    needs_helical_interpolation: false, needs_canned_cycles: false,
    min_work_offsets: 1, min_sub_nesting: 2, needs_macro_variables: false,
    needs_variable_feed_override: true,
    description: "Adaptive clearing with variable engagement needs adequate look-ahead and feed override responsiveness"
  },
  "5axis_simultaneous": {
    needs_nurbs: false, min_look_ahead: 500, min_block_rate: 500,
    min_simultaneous_axes: 5, needs_hsm: true, needs_rtcp: true,
    needs_helical_interpolation: false, needs_canned_cycles: false,
    min_work_offsets: 1, min_sub_nesting: 2, needs_macro_variables: true,
    needs_variable_feed_override: true,
    description: "Full 5-axis simultaneous machining requires RTCP/TCPC and 5 simultaneous axes"
  },
  thread_milling: {
    needs_nurbs: false, min_look_ahead: 100, min_block_rate: 200,
    min_simultaneous_axes: 3, needs_hsm: false, needs_rtcp: false,
    needs_helical_interpolation: true, needs_canned_cycles: false,
    min_work_offsets: 1, min_sub_nesting: 1, needs_macro_variables: true,
    needs_variable_feed_override: false,
    description: "Thread milling requires helical interpolation (G02/G03 with Z) and macro support for pitch calculations"
  },
  high_speed_finishing: {
    needs_nurbs: false, min_look_ahead: 500, min_block_rate: 800,
    min_simultaneous_axes: 3, needs_hsm: true, needs_rtcp: false,
    needs_helical_interpolation: false, needs_canned_cycles: false,
    min_work_offsets: 1, min_sub_nesting: 1, needs_macro_variables: false,
    needs_variable_feed_override: false,
    description: "High-speed finishing requires HSM mode for smooth cornering and jerk limitation"
  },
  trochoidal_milling: {
    needs_nurbs: false, min_look_ahead: 300, min_block_rate: 400,
    min_simultaneous_axes: 3, needs_hsm: true, needs_rtcp: false,
    needs_helical_interpolation: false, needs_canned_cycles: false,
    min_work_offsets: 1, min_sub_nesting: 2, needs_macro_variables: false,
    needs_variable_feed_override: true,
    description: "Trochoidal milling generates many small arcs, needs adequate look-ahead and HSM"
  },
  plunge_roughing: {
    needs_nurbs: false, min_look_ahead: 100, min_block_rate: 200,
    min_simultaneous_axes: 3, needs_hsm: false, needs_rtcp: false,
    needs_helical_interpolation: false, needs_canned_cycles: true,
    min_work_offsets: 1, min_sub_nesting: 2, needs_macro_variables: false,
    needs_variable_feed_override: false,
    description: "Plunge roughing uses Z-axis primary cutting, benefits from canned cycle support"
  },
  barrel_cutter_finishing: {
    needs_nurbs: true, min_look_ahead: 1000, min_block_rate: 1000,
    min_simultaneous_axes: 5, needs_hsm: true, needs_rtcp: true,
    needs_helical_interpolation: false, needs_canned_cycles: false,
    min_work_offsets: 1, min_sub_nesting: 2, needs_macro_variables: true,
    needs_variable_feed_override: true,
    description: "Barrel/lens cutter finishing requires tight 5-axis control with NURBS for smooth curvature"
  },
  geodesic_finishing: {
    needs_nurbs: true, min_look_ahead: 800, min_block_rate: 800,
    min_simultaneous_axes: 5, needs_hsm: true, needs_rtcp: true,
    needs_helical_interpolation: false, needs_canned_cycles: false,
    min_work_offsets: 1, min_sub_nesting: 2, needs_macro_variables: false,
    needs_variable_feed_override: true,
    description: "Geodesic finishing follows surface curvature, needs smooth 5-axis with NURBS"
  },
  z_level_roughing: {
    needs_nurbs: false, min_look_ahead: 100, min_block_rate: 200,
    min_simultaneous_axes: 3, needs_hsm: false, needs_rtcp: false,
    needs_helical_interpolation: false, needs_canned_cycles: false,
    min_work_offsets: 1, min_sub_nesting: 1, needs_macro_variables: false,
    needs_variable_feed_override: false,
    description: "Z-level roughing is controller-friendly, minimal requirements"
  },
  rest_machining: {
    needs_nurbs: false, min_look_ahead: 200, min_block_rate: 300,
    min_simultaneous_axes: 3, needs_hsm: false, needs_rtcp: false,
    needs_helical_interpolation: false, needs_canned_cycles: false,
    min_work_offsets: 2, min_sub_nesting: 2, needs_macro_variables: true,
    needs_variable_feed_override: false,
    description: "Rest machining needs work offset awareness and macro variables for tool tracking"
  },
  face_milling: {
    needs_nurbs: false, min_look_ahead: 50, min_block_rate: 100,
    min_simultaneous_axes: 3, needs_hsm: false, needs_rtcp: false,
    needs_helical_interpolation: false, needs_canned_cycles: false,
    min_work_offsets: 1, min_sub_nesting: 1, needs_macro_variables: false,
    needs_variable_feed_override: false,
    description: "Face milling has minimal controller requirements"
  },
  peck_drilling: {
    needs_nurbs: false, min_look_ahead: 50, min_block_rate: 100,
    min_simultaneous_axes: 1, needs_hsm: false, needs_rtcp: false,
    needs_helical_interpolation: false, needs_canned_cycles: true,
    min_work_offsets: 1, min_sub_nesting: 1, needs_macro_variables: false,
    needs_variable_feed_override: false,
    description: "Peck drilling uses canned cycles (G73/G83)"
  },
  bore_milling: {
    needs_nurbs: false, min_look_ahead: 100, min_block_rate: 200,
    min_simultaneous_axes: 3, needs_hsm: false, needs_rtcp: false,
    needs_helical_interpolation: true, needs_canned_cycles: false,
    min_work_offsets: 1, min_sub_nesting: 1, needs_macro_variables: false,
    needs_variable_feed_override: false,
    description: "Bore milling uses circular interpolation with Z"
  },
  helical_bore: {
    needs_nurbs: false, min_look_ahead: 100, min_block_rate: 200,
    min_simultaneous_axes: 3, needs_hsm: false, needs_rtcp: false,
    needs_helical_interpolation: true, needs_canned_cycles: false,
    min_work_offsets: 1, min_sub_nesting: 1, needs_macro_variables: false,
    needs_variable_feed_override: false,
    description: "Helical bore requires G02/G03 with simultaneous Z feed"
  },
  constant_scallop: {
    needs_nurbs: false, min_look_ahead: 500, min_block_rate: 600,
    min_simultaneous_axes: 3, needs_hsm: true, needs_rtcp: false,
    needs_helical_interpolation: false, needs_canned_cycles: false,
    min_work_offsets: 1, min_sub_nesting: 1, needs_macro_variables: false,
    needs_variable_feed_override: false,
    description: "Constant scallop finishing generates dense toolpath, needs adequate block rate"
  },
  pencil_tracing: {
    needs_nurbs: false, min_look_ahead: 300, min_block_rate: 400,
    min_simultaneous_axes: 3, needs_hsm: true, needs_rtcp: false,
    needs_helical_interpolation: false, needs_canned_cycles: false,
    min_work_offsets: 1, min_sub_nesting: 1, needs_macro_variables: false,
    needs_variable_feed_override: false,
    description: "Pencil tracing follows fillet edges, needs smooth motion in tight areas"
  },
  flowline_finishing: {
    needs_nurbs: true, min_look_ahead: 500, min_block_rate: 600,
    min_simultaneous_axes: 3, needs_hsm: true, needs_rtcp: false,
    needs_helical_interpolation: false, needs_canned_cycles: false,
    min_work_offsets: 1, min_sub_nesting: 1, needs_macro_variables: false,
    needs_variable_feed_override: false,
    description: "Flowline finishing follows surface flow, benefits from NURBS for smooth curves"
  },
  swarf_cutting: {
    needs_nurbs: false, min_look_ahead: 500, min_block_rate: 500,
    min_simultaneous_axes: 5, needs_hsm: true, needs_rtcp: true,
    needs_helical_interpolation: false, needs_canned_cycles: false,
    min_work_offsets: 1, min_sub_nesting: 2, needs_macro_variables: true,
    needs_variable_feed_override: true,
    description: "Swarf cutting uses tool flank contact, requires full 5-axis RTCP control"
  },
  custom: {
    needs_nurbs: false, min_look_ahead: 100, min_block_rate: 200,
    min_simultaneous_axes: 3, needs_hsm: false, needs_rtcp: false,
    needs_helical_interpolation: false, needs_canned_cycles: false,
    min_work_offsets: 1, min_sub_nesting: 1, needs_macro_variables: false,
    needs_variable_feed_override: false,
    description: "Custom strategy with default requirements; override with explicit parameters"
  },
};

// ─── Fallback Maps ─────────────────────────────────────────────────

/** Ordered fallback chains: if strategy X is incompatible, try these in order */
const FALLBACK_CHAINS: Partial<Record<StrategyType, StrategyType[]>> = {
  morphed_spiral:          ["constant_scallop", "flowline_finishing", "z_level_roughing"],
  adaptive_clearing:       ["trochoidal_milling", "z_level_roughing", "face_milling"],
  "5axis_simultaneous":    ["swarf_cutting", "barrel_cutter_finishing", "z_level_roughing"],
  barrel_cutter_finishing: ["geodesic_finishing", "constant_scallop", "high_speed_finishing"],
  geodesic_finishing:      ["constant_scallop", "flowline_finishing", "high_speed_finishing"],
  high_speed_finishing:    ["constant_scallop", "pencil_tracing", "z_level_roughing"],
  trochoidal_milling:      ["adaptive_clearing", "z_level_roughing"],
  flowline_finishing:       ["constant_scallop", "pencil_tracing"],
  swarf_cutting:           ["5axis_simultaneous", "z_level_roughing"],
  thread_milling:          ["bore_milling", "helical_bore"],
};

// ─── Engine Implementation ─────────────────────────────────────────

class ControllerStrategyValidatorEngineImpl {

  /**
   * Validate that a strategy is executable on a target controller.
   */
  validate(
    strategy: StrategyType,
    controller: ControllerFamily,
    overrides?: Partial<StrategyRequirements>,
    // Internal: strategies already on the current fallback-resolution path. FALLBACK_CHAINS is
    // cyclic for some strategies (adaptive_clearing <-> trochoidal_milling, 5axis_simultaneous
    // <-> swarf_cutting), so this guards validate() against infinite recursion when a controller
    // is incompatible with every strategy in a cycle. External callers never pass this.
    _fallbackVisited?: Set<StrategyType>,
  ): ValidationResult {
    const caps = CONTROLLER_DB[controller];
    if (!caps) {
      return {
        compatible: false, controller, strategy, score: 0,
        issues: [{ severity: "error", code: "UNKNOWN_CONTROLLER",
          message: `Unknown controller family: ${controller}`,
          controller_value: controller, required_value: "valid family" }],
        warnings: [], capabilities_used: [],
      };
    }

    const reqs = { ...STRATEGY_REQUIREMENTS[strategy], ...overrides };
    if (!reqs) {
      return {
        compatible: false, controller, strategy, score: 0,
        issues: [{ severity: "error", code: "UNKNOWN_STRATEGY",
          message: `Unknown strategy type: ${strategy}`,
          controller_value: strategy, required_value: "valid strategy" }],
        warnings: [], capabilities_used: [],
      };
    }

    const issues: ValidationIssue[] = [];
    const warnings: ValidationIssue[] = [];
    const capabilities_used: string[] = [];
    let penalty = 0;

    // --- NURBS check ---
    if (reqs.needs_nurbs) {
      capabilities_used.push("nurbs_interpolation");
      if (!caps.nurbs_support) {
        // Check if high block rate can compensate via linear approximation
        if (caps.block_processing_rate >= reqs.min_block_rate * 2) {
          warnings.push({
            severity: "warning", code: "NURBS_LINEAR_FALLBACK",
            message: `No NURBS support — using linear approximation at ${caps.block_processing_rate} blocks/sec`,
            controller_value: false, required_value: true,
            suggestion: "Increase output resolution in CAM to compensate for linear interpolation"
          });
          penalty += 10;
        } else {
          issues.push({
            severity: "error", code: "NO_NURBS",
            message: `Strategy requires NURBS interpolation; ${caps.display_name} does not support it. ${caps.nurbs_notes}`,
            controller_value: false, required_value: true,
            suggestion: "Use a controller with NURBS support (Fanuc 30i+, Siemens, Heidenhain, etc.)"
          });
          penalty += 30;
        }
      }
    }

    // --- Look-ahead check ---
    if (caps.look_ahead_blocks < reqs.min_look_ahead) {
      capabilities_used.push("look_ahead");
      const deficit = reqs.min_look_ahead - caps.look_ahead_blocks;
      const severity: IssueSeverity = deficit > reqs.min_look_ahead * 0.5 ? "error" : "warning";
      const issue: ValidationIssue = {
        severity, code: "INSUFFICIENT_LOOK_AHEAD",
        message: `Look-ahead ${caps.look_ahead_blocks} blocks < required ${reqs.min_look_ahead}. May cause feed hesitation and surface marks.`,
        controller_value: caps.look_ahead_blocks, required_value: reqs.min_look_ahead,
        suggestion: `Reduce toolpath point density or use a controller with ${reqs.min_look_ahead}+ block look-ahead`
      };
      if (severity === "error") { issues.push(issue); penalty += 25; }
      else { warnings.push(issue); penalty += 10; }
    } else {
      capabilities_used.push("look_ahead");
    }

    // --- Block processing rate check ---
    if (caps.block_processing_rate < reqs.min_block_rate) {
      capabilities_used.push("block_processing_rate");
      const deficit = reqs.min_block_rate - caps.block_processing_rate;
      const severity: IssueSeverity = deficit > reqs.min_block_rate * 0.5 ? "error" : "warning";
      const issue: ValidationIssue = {
        severity, code: "SLOW_BLOCK_RATE",
        message: `Block rate ${caps.block_processing_rate}/sec < required ${reqs.min_block_rate}/sec. Machine will starve and stutter.`,
        controller_value: caps.block_processing_rate, required_value: reqs.min_block_rate,
        suggestion: "Increase CAM tolerance to reduce block count, or use a faster controller"
      };
      if (severity === "error") { issues.push(issue); penalty += 25; }
      else { warnings.push(issue); penalty += 10; }
    } else {
      capabilities_used.push("block_processing_rate");
    }

    // --- Simultaneous axes check ---
    if (caps.max_simultaneous_axes < reqs.min_simultaneous_axes) {
      capabilities_used.push("simultaneous_axes");
      issues.push({
        severity: "error", code: "INSUFFICIENT_AXES",
        message: `Controller supports ${caps.max_simultaneous_axes} simultaneous axes, strategy requires ${reqs.min_simultaneous_axes}`,
        controller_value: caps.max_simultaneous_axes, required_value: reqs.min_simultaneous_axes,
        suggestion: `Use 3+2 positioning instead of full ${reqs.min_simultaneous_axes}-axis simultaneous`
      });
      penalty += 30;
    } else {
      capabilities_used.push("simultaneous_axes");
    }

    // --- HSM mode check ---
    if (reqs.needs_hsm) {
      capabilities_used.push("hsm_mode");
      if (!caps.hsm_available) {
        issues.push({
          severity: "error", code: "NO_HSM",
          message: `Strategy requires HSM mode; ${caps.display_name} does not support it`,
          controller_value: false, required_value: true,
          suggestion: "Enable HSM or use a controller with G05.1/CYCLE832/G187/M120 support"
        });
        penalty += 20;
      }
    }

    // --- RTCP/TCPC check ---
    if (reqs.needs_rtcp) {
      capabilities_used.push("rtcp_tcpc");
      if (!caps.rtcp_tcpc_support) {
        issues.push({
          severity: "error", code: "NO_RTCP",
          message: `Strategy requires RTCP/TCPC for tool center point control; ${caps.display_name} does not support it`,
          controller_value: false, required_value: true,
          suggestion: "Use 3+2 indexed positioning instead of continuous 5-axis"
        });
        penalty += 30;
      }
    }

    // --- Helical interpolation check ---
    if (reqs.needs_helical_interpolation) {
      capabilities_used.push("helical_interpolation");
      if (!caps.helical_interpolation) {
        issues.push({
          severity: "error", code: "NO_HELICAL",
          message: `Strategy requires helical interpolation (G02/G03 with Z); not supported`,
          controller_value: false, required_value: true,
        });
        penalty += 25;
      }
    }

    // --- Canned cycle check ---
    if (reqs.needs_canned_cycles) {
      capabilities_used.push("canned_cycles");
      if (!caps.canned_cycle_support) {
        warnings.push({
          severity: "warning", code: "NO_CANNED_CYCLES",
          message: `Canned cycles preferred but not available; will use expanded G-code`,
          controller_value: false, required_value: true,
          suggestion: "Use explicit drilling motion (G01 Z) instead of canned cycles"
        });
        penalty += 5;
      }
    }

    // --- Work offset check ---
    if (caps.work_offset_count < reqs.min_work_offsets) {
      capabilities_used.push("work_offsets");
      warnings.push({
        severity: "warning", code: "LIMITED_WORK_OFFSETS",
        message: `Only ${caps.work_offset_count} work offsets available; strategy prefers ${reqs.min_work_offsets}`,
        controller_value: caps.work_offset_count, required_value: reqs.min_work_offsets,
        suggestion: `Use ${caps.work_offset_extended} for additional offsets`
      });
      penalty += 5;
    }

    // --- Sub-program nesting check ---
    if (caps.sub_program_nesting_depth < reqs.min_sub_nesting) {
      capabilities_used.push("sub_program_nesting");
      warnings.push({
        severity: "warning", code: "LIMITED_NESTING",
        message: `Sub-program nesting depth ${caps.sub_program_nesting_depth} < preferred ${reqs.min_sub_nesting}`,
        controller_value: caps.sub_program_nesting_depth, required_value: reqs.min_sub_nesting,
        suggestion: "Flatten sub-program structure or inline sub-programs"
      });
      penalty += 5;
    }

    // --- Macro variable check ---
    if (reqs.needs_macro_variables && !caps.macro_variable_support) {
      capabilities_used.push("macro_variables");
      issues.push({
        severity: "error", code: "NO_MACROS",
        message: `Strategy requires macro variable support; not available on ${caps.display_name}`,
        controller_value: false, required_value: true,
      });
      penalty += 20;
    }

    // --- Variable feed override check ---
    if (reqs.needs_variable_feed_override && !caps.variable_feed_override) {
      capabilities_used.push("variable_feed_override");
      warnings.push({
        severity: "warning", code: "NO_FEED_OVERRIDE",
        message: `Variable feed override not available; constant feed will be used`,
        controller_value: false, required_value: true,
        suggestion: "Pre-compute feed rates in CAM post-processor instead"
      });
      penalty += 10;
    }

    // Compute score
    const score = Math.max(0, 100 - penalty);
    const compatible = issues.length === 0;

    // Find fallback if incompatible
    let fallback_suggestion: string | undefined;
    if (!compatible) {
      const chain = FALLBACK_CHAINS[strategy];
      if (chain) {
        // Cycle guard: FALLBACK_CHAINS is cyclic for some strategies (adaptive_clearing <->
        // trochoidal_milling, 5axis_simultaneous <-> swarf_cutting). Track the strategies on the
        // current resolution path so validate() cannot recurse A->B->A->... forever when a
        // controller is incompatible with every strategy in a cycle (previously a
        // RangeError: Maximum call stack size exceeded, hit by compatibilityMatrix()). Backtrack
        // (delete self after the loop) so a compatible fallback reachable via a sibling path is
        // never wrongly skipped -- behavior is identical to before for any acyclic input.
        const visited = _fallbackVisited ?? new Set<StrategyType>();
        visited.add(strategy);
        for (const alt of chain) {
          if (visited.has(alt)) continue;
          const altResult = this.validate(alt, controller, undefined, visited);
          if (altResult.compatible) {
            fallback_suggestion = `Consider using '${alt}' instead (compatibility score: ${altResult.score}/100)`;
            break;
          }
        }
        visited.delete(strategy);
        if (!fallback_suggestion && chain.length > 0) {
          fallback_suggestion = `No fully compatible fallback found. Closest alternatives: ${chain.join(", ")}`;
        }
      }
    }

    return {
      compatible, controller, strategy, issues, warnings,
      capabilities_used: [...new Set(capabilities_used)],
      fallback_suggestion, score,
    };
  }

  /**
   * Get full capability report for a controller.
   */
  getCapabilities(controller: ControllerFamily): ControllerCapabilities | null {
    return CONTROLLER_DB[controller] ?? null;
  }

  /**
   * Get all supported controller families.
   */
  listControllers(): ControllerFamily[] {
    return Object.keys(CONTROLLER_DB) as ControllerFamily[];
  }

  /**
   * Get all supported strategy types.
   */
  listStrategies(): StrategyType[] {
    return Object.keys(STRATEGY_REQUIREMENTS) as StrategyType[];
  }

  /**
   * Get requirements for a strategy type.
   */
  getRequirements(strategy: StrategyType): StrategyRequirements | null {
    return STRATEGY_REQUIREMENTS[strategy] ?? null;
  }

  /**
   * Find all controllers compatible with a given strategy.
   */
  findCompatibleControllers(strategy: StrategyType): CompatibleControllerResult {
    const compatible: ControllerFamily[] = [];
    const partial: { controller: ControllerFamily; issues: string[] }[] = [];
    const incompatible: ControllerFamily[] = [];

    for (const controller of this.listControllers()) {
      const result = this.validate(strategy, controller);
      if (result.compatible && result.warnings.length === 0) {
        compatible.push(controller);
      } else if (result.compatible) {
        partial.push({
          controller,
          issues: result.warnings.map(w => w.message)
        });
      } else {
        incompatible.push(controller);
      }
    }

    return { strategy, compatible, partial, incompatible };
  }

  /**
   * Compare two controllers for a given strategy.
   */
  compareControllers(
    strategy: StrategyType,
    controllerA: ControllerFamily,
    controllerB: ControllerFamily
  ): { a: ValidationResult; b: ValidationResult; recommendation: string } {
    const a = this.validate(strategy, controllerA);
    const b = this.validate(strategy, controllerB);

    let recommendation: string;
    if (a.score > b.score) {
      recommendation = `${CONTROLLER_DB[controllerA]?.display_name ?? controllerA} is better suited (score ${a.score} vs ${b.score})`;
    } else if (b.score > a.score) {
      recommendation = `${CONTROLLER_DB[controllerB]?.display_name ?? controllerB} is better suited (score ${b.score} vs ${a.score})`;
    } else {
      recommendation = `Both controllers are equally compatible (score ${a.score})`;
    }

    return { a, b, recommendation };
  }

  /**
   * Batch validate multiple strategies against a single controller.
   */
  batchValidate(
    strategies: StrategyType[],
    controller: ControllerFamily
  ): { controller: ControllerFamily; results: ValidationResult[] } {
    const results = strategies.map(s => this.validate(s, controller));
    return { controller, results };
  }

  /**
   * Generate a compatibility matrix for all strategies vs all controllers.
   */
  compatibilityMatrix(): {
    controllers: ControllerFamily[];
    strategies: StrategyType[];
    matrix: Record<StrategyType, Record<ControllerFamily, { compatible: boolean; score: number }>>;
  } {
    const controllers = this.listControllers();
    const strategies = this.listStrategies();
    const matrix: Record<string, Record<string, { compatible: boolean; score: number }>> = {};

    for (const strategy of strategies) {
      matrix[strategy] = {};
      for (const controller of controllers) {
        const result = this.validate(strategy, controller);
        matrix[strategy][controller] = {
          compatible: result.compatible,
          score: result.score,
        };
      }
    }

    return {
      controllers, strategies,
      matrix: matrix as Record<StrategyType, Record<ControllerFamily, { compatible: boolean; score: number }>>,
    };
  }
}

// ─── Singleton Export ──────────────────────────────────────────────

export const controllerStrategyValidatorEngine = new ControllerStrategyValidatorEngineImpl();
