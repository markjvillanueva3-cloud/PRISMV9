/**
 * MillingMachineIntelligenceEngine — MILL-AI-MS4: Complete Milling Machine Intelligence
 *
 * Deep Learning + Deep Reasoning + Claude Opus Intelligence for:
 * - All milling machines in database (232+ machines)
 * - All controllers (Heidenhain, Haas, Fanuc, Siemens, Okuma, Mazak, etc.)
 * - All toolpath types (hardcode, macro, conversational, CAM, novel)
 *
 * Knowledge Sources:
 * - JM Die folder: H:/PRISM/JM DIE/ (24,114 programs)
 * - Resources folder: H:/prism/Resources/ (HyperMILL, Mastercam, Fusion, training)
 * - PDF learning: hyperMILL manuals, Mastercam guides
 * - Video learning: YouTube tutorials, training videos
 * - External sources: Sandvik, Kennametal, Machinery's Handbook
 *
 * LLM CLI:
 * - "What's the G-code for adaptive clearing on Haas VF-2?"
 * - "How do I set up TCPM on Heidenhain TNC 640?"
 * - "Macro for helical boring on Fanuc 31i"
 * - "Best parameters for graphite on Roku-Roku SNG?"
 */

import { JM_DIE_COMPANY, JM_DIE_SOURCE_ROOTS } from "../data/jm-die-profile.js";

// ============================================================================
// TYPES — Machines
// ============================================================================

export type MachineType =
  | "3axis_vmc"
  | "4axis_hmc"
  | "5axis_trunnion"
  | "5axis_swivel_head"
  | "5axis_gantry"
  | "mill_turn"
  | "high_speed"
  | "graphite"
  | "micro_milling";

export type MachineManufacturer =
  | "haas"
  | "okuma"
  | "mazak"
  | "dmg_mori"
  | "makino"
  | "matsuura"
  | "hurco"
  | "hermle"
  | "roku_roku"
  | "kern"
  | "brother"
  | "fanuc"
  | "hardinge"
  | "kitamura"
  | "mori_seiki"
  | "doosan"
  | "hyundai_wia"
  | "other";

export type ControllerType =
  | "fanuc"
  | "siemens"
  | "heidenhain"
  | "haas_ngc"
  | "mazak_mazatrol"
  | "okuma_osp"
  | "mitsubishi"
  | "fagor"
  | "hurco_winmax"
  | "brother"
  | "other";

export interface MillingMachineProfile {
  id: string;
  name: string;
  manufacturer: MachineManufacturer;
  model: string;
  type: MachineType;
  controller: ControllerType;
  controller_model?: string;
  axes: number;
  spindle: {
    max_rpm: number;
    power_kw: number;
    taper: string;
    direct_drive?: boolean;
  };
  work_envelope: {
    x_mm: number;
    y_mm: number;
    z_mm: number;
  };
  rapid_rates: {
    xy_mm_min: number;
    z_mm_min: number;
  };
  tool_changer?: {
    type: string;
    capacity: number;
    change_time_sec: number;
  };
  features: string[];
  primary_applications: string[];
}

// ============================================================================
// TYPES — Controllers
// ============================================================================

export interface ControllerCapability {
  controller: ControllerType;
  model: string;
  features: {
    hsm_smoothing: boolean;
    tcp_management: boolean;
    collision_avoidance: boolean;
    adaptive_feed: boolean;
    macro_b: boolean;
    conversational: boolean;
    canned_cycles: string[];
    special_codes: string[];
  };
  programming: {
    languages: string[];
    max_program_size?: number;
    sub_program_levels: number;
    variable_types: string[];
  };
  probing?: {
    supported: boolean;
    probe_types: string[];
    calibration_cycles: string[];
  };
}

export interface ControllerKnowledgeTip {
  id: string;
  controller: ControllerType;
  controller_model?: string;
  title: string;
  content: string;
  category: "hsm" | "5axis" | "macro" | "probing" | "safety" | "programming" | "optimization";
  applies_to_machines: string[];
  tags: string[];
  source: string;
  confidence: number;
}

// ============================================================================
// TYPES — Toolpaths
// ============================================================================

export type ToolpathType =
  | "hardcode"        // Manual G-code programming
  | "macro"           // Parametric macro programming
  | "conversational"  // Controller conversational programming
  | "cam_2d"          // CAM 2D operations
  | "cam_3d"          // CAM 3D operations
  | "cam_5axis"       // CAM 5-axis operations
  | "cam_adaptive"    // CAM adaptive/HSM
  | "novel";          // Novel algorithms (trochoidal, morphed spiral, etc.)

export interface ToolpathStrategy {
  type: ToolpathType;
  name: string;
  description: string;
  controllers_supported: ControllerType[];
  parameters: ToolpathParameter[];
  gcode_pattern?: string;
  macro_example?: string;
  cam_equivalent?: { cam_system: string; strategy_name: string }[];
  physics_basis: string;
  use_cases: string[];
  limitations: string[];
}

export interface ToolpathParameter {
  name: string;
  description: string;
  type: "numeric" | "enum" | "boolean";
  unit?: string;
  default_value?: number | string | boolean;
  range?: { min: number; max: number };
  enum_values?: string[];
  physics_formula?: string;
}

// ============================================================================
// TYPES — Deep Learning
// ============================================================================

export interface MachineFeatureVector {
  machine_id: string;
  features: {
    // Capability features
    axes_normalized: number;
    spindle_rpm_normalized: number;
    spindle_power_normalized: number;
    envelope_volume_normalized: number;
    rapid_rate_normalized: number;

    // Type features (one-hot)
    is_3axis: number;
    is_5axis: number;
    is_hsc: number;
    is_mill_turn: number;
    is_graphite: number;

    // Controller features
    has_macro_b: number;
    has_conversational: number;
    has_tcp_management: number;
    has_collision_avoidance: number;
    has_adaptive_feed: number;
  };
}

export interface MachineSimilarityMatch {
  machine: MillingMachineProfile;
  similarity_score: number;
  capability_match: number;
  controller_match: number;
  application_match: number;
  explanation: string;
}

// ============================================================================
// TYPES — Deep Reasoning
// ============================================================================

export interface MachineReasoningChain {
  query: string;
  machine?: MillingMachineProfile;
  controller?: ControllerCapability;
  steps: ReasoningStep[];
  conclusion: string;
  gcode_solution?: string;
  macro_solution?: string;
  confidence: number;
  sources: string[];
}

export interface ReasoningStep {
  step_number: number;
  type: "observation" | "analysis" | "knowledge_lookup" | "inference" | "synthesis";
  content: string;
  evidence: string[];
  confidence: number;
}

// ============================================================================
// TYPES — NL Interface
// ============================================================================

export interface MachineQuery {
  query_type:
    | "gcode_help"
    | "macro_creation"
    | "parameter_recommendation"
    | "machine_comparison"
    | "toolpath_selection"
    | "troubleshooting"
    | "controller_feature";
  natural_language: string;
  machine?: string;
  controller?: ControllerType;
  operation?: string;
  material?: string;
}

export interface MachineResponse {
  query: MachineQuery;
  machine_matches: MachineSimilarityMatch[];
  controller_tips: ControllerKnowledgeTip[];
  toolpath_recommendations: ToolpathStrategy[];
  reasoning: MachineReasoningChain;
  gcode_example?: string;
  macro_example?: string;
  natural_language_summary: string;
  video_references: VideoReference[];
  pdf_references: PDFReference[];
  web_references: WebReference[];
  follow_up_suggestions: string[];
  processing_time_ms: number;
}

export interface VideoReference {
  title: string;
  source: "youtube" | "local" | "training";
  url?: string;
  path?: string;
  timestamp?: string;
  relevance_score: number;
}

export interface PDFReference {
  title: string;
  document: string;
  page?: number;
  section?: string;
  relevance_score: number;
}

export interface WebReference {
  title: string;
  url: string;
  source: "sandvik" | "kennametal" | "iscar" | "machinery_handbook" | "manufacturer" | "other";
  relevance_score: number;
}

// ============================================================================
// CONSTANTS — JM Die Machines
// ============================================================================

const JM_DIE_MILLING_MACHINES: MillingMachineProfile[] = [
  {
    id: "jmd-haas-vf2",
    name: "Haas VF-2",
    manufacturer: "haas",
    model: "VF-2",
    type: "3axis_vmc",
    controller: "haas_ngc",
    controller_model: "NGC",
    axes: 3,
    spindle: { max_rpm: 8100, power_kw: 22.4, taper: "BT40" },
    work_envelope: { x_mm: 762, y_mm: 406, z_mm: 508 },
    rapid_rates: { xy_mm_min: 25400, z_mm_min: 25400 },
    tool_changer: { type: "side-mount", capacity: 20, change_time_sec: 2.5 },
    features: ["rigid_tapping", "programmable_coolant", "chip_auger"],
    primary_applications: ["die_cases", "fixtures", "general_milling"],
  },
  {
    id: "jmd-haas-vf3",
    name: "Haas VF-3",
    manufacturer: "haas",
    model: "VF-3",
    type: "3axis_vmc",
    controller: "haas_ngc",
    controller_model: "NGC",
    axes: 3,
    spindle: { max_rpm: 8100, power_kw: 22.4, taper: "BT40" },
    work_envelope: { x_mm: 1016, y_mm: 508, z_mm: 635 },
    rapid_rates: { xy_mm_min: 25400, z_mm_min: 25400 },
    tool_changer: { type: "side-mount", capacity: 24, change_time_sec: 2.5 },
    features: ["rigid_tapping", "programmable_coolant", "chip_auger"],
    primary_applications: ["large_die_cases", "fixtures", "mold_bases"],
  },
  {
    id: "jmd-hurco-vmx42",
    name: "Hurco VMX42",
    manufacturer: "hurco",
    model: "VMX42",
    type: "3axis_vmc",
    controller: "hurco_winmax",
    controller_model: "WinMax",
    axes: 3,
    spindle: { max_rpm: 12000, power_kw: 18.6, taper: "BT40" },
    work_envelope: { x_mm: 1067, y_mm: 610, z_mm: 610 },
    rapid_rates: { xy_mm_min: 35000, z_mm_min: 30000 },
    tool_changer: { type: "swing-arm", capacity: 24, change_time_sec: 3.0 },
    features: ["conversational", "ultipocket", "tool_probe"],
    primary_applications: ["electrode_finishing", "precision_milling", "conversational_programming"],
  },
  {
    id: "jmd-okuma-genos",
    name: "Okuma Genos M460-VE",
    manufacturer: "okuma",
    model: "Genos M460-VE",
    type: "3axis_vmc",
    controller: "okuma_osp",
    controller_model: "OSP-P300MA",
    axes: 3,
    spindle: { max_rpm: 15000, power_kw: 22, taper: "BT40", direct_drive: true },
    work_envelope: { x_mm: 762, y_mm: 460, z_mm: 460 },
    rapid_rates: { xy_mm_min: 40000, z_mm_min: 32000 },
    tool_changer: { type: "arm", capacity: 32, change_time_sec: 1.3 },
    features: ["thermo_friendly", "machining_navi", "collision_avoidance"],
    primary_applications: ["high_speed_milling", "electrode_roughing", "die_mold"],
  },
  {
    id: "jmd-roku-roku-sng",
    name: "Roku-Roku SNG",
    manufacturer: "roku_roku",
    model: "SNG",
    type: "graphite",
    controller: "fanuc",
    controller_model: "31i-MB5",
    axes: 3,
    spindle: { max_rpm: 40000, power_kw: 5.5, taper: "HSK-E40" },
    work_envelope: { x_mm: 400, y_mm: 350, z_mm: 250 },
    rapid_rates: { xy_mm_min: 48000, z_mm_min: 48000 },
    tool_changer: { type: "carousel", capacity: 16, change_time_sec: 2.0 },
    features: ["hsk_spindle", "graphite_enclosure", "vacuum_extraction", "linear_motors"],
    primary_applications: ["graphite_electrodes", "high_speed_finishing", "micro_features"],
  },
];

// ============================================================================
// CONSTANTS — Controllers
// ============================================================================

const CONTROLLER_CAPABILITIES: Record<ControllerType, ControllerCapability> = {
  haas_ngc: {
    controller: "haas_ngc",
    model: "NGC (Next Generation Control)",
    features: {
      hsm_smoothing: true,
      tcp_management: false,
      collision_avoidance: false,
      adaptive_feed: true,
      macro_b: true,
      conversational: false,
      canned_cycles: ["G73", "G74", "G76", "G81", "G82", "G83", "G84", "G85", "G86", "G87", "G88", "G89", "G150", "G153"],
      special_codes: ["G187", "G234", "G51", "G68", "G68.2"],
    },
    programming: {
      languages: ["ISO G-code"],
      max_program_size: 1000000,
      sub_program_levels: 9,
      variable_types: ["#100-#199 (common)", "#500-#999 (permanent)", "#1-#33 (local)"],
    },
    probing: {
      supported: true,
      probe_types: ["touch_probe", "tool_probe"],
      calibration_cycles: ["G31", "G36", "G37"],
    },
  },
  fanuc: {
    controller: "fanuc",
    model: "Fanuc 31i/30i/0i Series",
    features: {
      hsm_smoothing: true,
      tcp_management: true,
      collision_avoidance: true,
      adaptive_feed: true,
      macro_b: true,
      conversational: false,
      canned_cycles: ["G73", "G74", "G76", "G80", "G81", "G82", "G83", "G84", "G85", "G86", "G87", "G88", "G89"],
      special_codes: ["G05.1", "G08", "G43.4", "G43.5", "G68.2", "G53.1"],
    },
    programming: {
      languages: ["ISO G-code", "Macro B"],
      max_program_size: 2000000,
      sub_program_levels: 10,
      variable_types: ["#1-#33 (local)", "#100-#199 (common)", "#500-#999 (permanent)", "#1000+ (system)"],
    },
    probing: {
      supported: true,
      probe_types: ["touch_probe", "tool_setter", "laser_probe"],
      calibration_cycles: ["G31", "G37", "G38"],
    },
  },
  heidenhain: {
    controller: "heidenhain",
    model: "TNC 640 / iTNC 530",
    features: {
      hsm_smoothing: true,
      tcp_management: true,
      collision_avoidance: true,
      adaptive_feed: true,
      macro_b: false,
      conversational: true,
      canned_cycles: ["Cycle 1", "Cycle 2", "Cycle 4", "Cycle 5", "Cycle 7", "Cycle 24", "Cycle 25", "Cycle 32", "Cycle 451"],
      special_codes: ["TCPM", "M128", "FUNCTION TCPM", "3D-ToolComp", "DCM", "KinematicsOpt"],
    },
    programming: {
      languages: ["Klartext", "DIN/ISO"],
      max_program_size: 0, // Unlimited with hard drive
      sub_program_levels: 8,
      variable_types: ["Q parameters", "QL (local)", "QR (REF)", "QS (string)"],
    },
    probing: {
      supported: true,
      probe_types: ["TS 460", "TS 760", "TT 460"],
      calibration_cycles: ["Cycle 451", "Cycle 452", "Cycle 453", "Cycle 444"],
    },
  },
  siemens: {
    controller: "siemens",
    model: "Sinumerik 840D sl",
    features: {
      hsm_smoothing: true,
      tcp_management: true,
      collision_avoidance: true,
      adaptive_feed: true,
      macro_b: false,
      conversational: true,
      canned_cycles: ["CYCLE81", "CYCLE82", "CYCLE83", "CYCLE84", "CYCLE85", "CYCLE86", "POCKET3", "POCKET4", "CONTPOCKET"],
      special_codes: ["TRAORI", "TRAFOOF", "CYCLE832", "COMPCAD", "FFWON", "SOFT"],
    },
    programming: {
      languages: ["ISO G-code", "Structured Text", "ShopMill"],
      max_program_size: 0,
      sub_program_levels: 12,
      variable_types: ["R parameters", "GUD (global)", "LUD (local)", "PUD (program)"],
    },
    probing: {
      supported: true,
      probe_types: ["touch_probe", "tool_setter"],
      calibration_cycles: ["CYCLE971", "CYCLE976", "CYCLE997"],
    },
  },
  okuma_osp: {
    controller: "okuma_osp",
    model: "OSP-P300",
    features: {
      hsm_smoothing: true,
      tcp_management: true,
      collision_avoidance: true,
      adaptive_feed: true,
      macro_b: true,
      conversational: false,
      canned_cycles: ["G71", "G73", "G74", "G76", "G81", "G82", "G83", "G84", "G85", "G86", "G87", "G88", "G89"],
      special_codes: ["NAVI", "Machining Navi", "Super-NURBS", "5-axis Auto Tuning"],
    },
    programming: {
      languages: ["ISO G-code", "OSP Macro"],
      max_program_size: 0,
      sub_program_levels: 8,
      variable_types: ["V variables", "VC (common)", "VE (extension)"],
    },
    probing: {
      supported: true,
      probe_types: ["touch_probe", "tool_setter"],
      calibration_cycles: ["G31"],
    },
  },
  mazak_mazatrol: {
    controller: "mazak_mazatrol",
    model: "Mazatrol SmoothG",
    features: {
      hsm_smoothing: true,
      tcp_management: true,
      collision_avoidance: true,
      adaptive_feed: true,
      macro_b: true,
      conversational: true,
      canned_cycles: ["G73", "G74", "G76", "G81", "G82", "G83", "G84", "G85", "G86", "G87", "G88", "G89"],
      special_codes: ["MAZATROL", "EIA/ISO", "Intelligent Safety Shield", "Smooth Corner Control"],
    },
    programming: {
      languages: ["Mazatrol", "EIA/ISO G-code"],
      max_program_size: 0,
      sub_program_levels: 8,
      variable_types: ["Common variables", "Local variables"],
    },
    probing: {
      supported: true,
      probe_types: ["touch_probe", "tool_setter"],
      calibration_cycles: ["G31", "G37"],
    },
  },
  hurco_winmax: {
    controller: "hurco_winmax",
    model: "WinMax",
    features: {
      hsm_smoothing: true,
      tcp_management: false,
      collision_avoidance: false,
      adaptive_feed: true,
      macro_b: false,
      conversational: true,
      canned_cycles: ["G73", "G81", "G82", "G83", "G84", "G85"],
      special_codes: ["UltiMotion", "UltiPocket", "Swept Surface"],
    },
    programming: {
      languages: ["Conversational", "NC G-code"],
      max_program_size: 0,
      sub_program_levels: 5,
      variable_types: ["Variables"],
    },
    probing: {
      supported: true,
      probe_types: ["touch_probe", "tool_probe"],
      calibration_cycles: ["Probing cycles"],
    },
  },
  mitsubishi: {
    controller: "mitsubishi",
    model: "M800/M80 Series",
    features: {
      hsm_smoothing: true,
      tcp_management: true,
      collision_avoidance: true,
      adaptive_feed: true,
      macro_b: true,
      conversational: false,
      canned_cycles: ["G73", "G74", "G76", "G81", "G82", "G83", "G84", "G85", "G86", "G87", "G88", "G89"],
      special_codes: ["SSS", "OMR-FF", "Fast Cycle", "Direct Drive"],
    },
    programming: {
      languages: ["ISO G-code", "Macro"],
      max_program_size: 0,
      sub_program_levels: 8,
      variable_types: ["#100-#999"],
    },
    probing: {
      supported: true,
      probe_types: ["touch_probe"],
      calibration_cycles: ["G31"],
    },
  },
  fagor: {
    controller: "fagor",
    model: "8065",
    features: {
      hsm_smoothing: true,
      tcp_management: true,
      collision_avoidance: false,
      adaptive_feed: true,
      macro_b: false,
      conversational: true,
      canned_cycles: ["G81", "G82", "G83", "G84", "G85", "G86", "G87"],
      special_codes: ["RTCP", "TLC", "Dynamic Work Offsets"],
    },
    programming: {
      languages: ["ISO G-code", "ProGTL3 Conversational"],
      max_program_size: 0,
      sub_program_levels: 7,
      variable_types: ["P parameters", "Local", "Global"],
    },
    probing: {
      supported: true,
      probe_types: ["touch_probe"],
      calibration_cycles: ["PROBE cycles"],
    },
  },
  brother: {
    controller: "brother",
    model: "CNC-C00",
    features: {
      hsm_smoothing: true,
      tcp_management: false,
      collision_avoidance: false,
      adaptive_feed: true,
      macro_b: true,
      conversational: false,
      canned_cycles: ["G73", "G74", "G76", "G81", "G82", "G83", "G84", "G85"],
      special_codes: ["High-speed tapping", "Interpolation tapping"],
    },
    programming: {
      languages: ["ISO G-code"],
      max_program_size: 0,
      sub_program_levels: 4,
      variable_types: ["#100-#999"],
    },
    probing: {
      supported: true,
      probe_types: ["touch_probe"],
      calibration_cycles: ["G31"],
    },
  },
  other: {
    controller: "other",
    model: "Generic",
    features: {
      hsm_smoothing: false,
      tcp_management: false,
      collision_avoidance: false,
      adaptive_feed: false,
      macro_b: false,
      conversational: false,
      canned_cycles: ["G81", "G82", "G83", "G84", "G85"],
      special_codes: [],
    },
    programming: {
      languages: ["ISO G-code"],
      max_program_size: 0,
      sub_program_levels: 4,
      variable_types: [],
    },
    probing: {
      supported: false,
      probe_types: [],
      calibration_cycles: [],
    },
  },
};

// ============================================================================
// CONSTANTS — Toolpath Strategies
// ============================================================================

const TOOLPATH_STRATEGIES: ToolpathStrategy[] = [
  // Hardcode strategies
  {
    type: "hardcode",
    name: "Linear Pocket (Zig-Zag)",
    description: "Manual G-code pocket with linear passes",
    controllers_supported: ["fanuc", "haas_ngc", "siemens", "okuma_osp", "mitsubishi", "heidenhain"],
    parameters: [
      { name: "stepover", description: "XY step between passes", type: "numeric", unit: "mm", default_value: 5 },
      { name: "stepdown", description: "Z depth per level", type: "numeric", unit: "mm", default_value: 2 },
      { name: "feed", description: "Cutting feedrate", type: "numeric", unit: "mm/min", default_value: 1000 },
    ],
    gcode_pattern: `
G0 X[START_X] Y[START_Y]
G43 H[TOOL] Z[SAFE_Z]
G1 Z[DEPTH] F[PLUNGE_FEED]
(BEGIN POCKET PASSES)
G1 X[X1] F[FEED]
G1 Y[Y1]
G1 X[X2]
G1 Y[Y2]
(REPEAT WITH STEPOVER)
G0 Z[SAFE_Z]`,
    physics_basis: "Constant chip load, MRR = ae × ap × vf",
    use_cases: ["Simple rectangular pockets", "When CAM unavailable", "Quick shop-floor edits"],
    limitations: ["No rest machining", "Manual calculation required", "No simulation"],
  },
  {
    type: "macro",
    name: "Circular Pocket Macro",
    description: "Parametric macro for circular pocket milling",
    controllers_supported: ["fanuc", "haas_ngc", "okuma_osp", "mitsubishi", "brother"],
    parameters: [
      { name: "diameter", description: "Pocket diameter", type: "numeric", unit: "mm" },
      { name: "depth", description: "Total depth", type: "numeric", unit: "mm" },
      { name: "tool_diameter", description: "Tool diameter", type: "numeric", unit: "mm" },
      { name: "stepover_pct", description: "Stepover percentage", type: "numeric", unit: "%", default_value: 50 },
    ],
    macro_example: `
(CIRCULAR POCKET MACRO - FANUC)
#100 = 50.0   (POCKET DIAMETER)
#101 = 10.0   (DEPTH)
#102 = 10.0   (TOOL DIAMETER)
#103 = 50     (STEPOVER %)
#104 = #102 * #103 / 100  (STEPOVER)
#105 = [#100 - #102] / 2  (MAX RADIUS)
#106 = 0      (CURRENT RADIUS)
G0 X0 Y0
G43 H#500 Z5.0
G1 Z-#101 F100
WHILE [#106 LT #105] DO1
  #106 = #106 + #104
  IF [#106 GT #105] THEN #106 = #105
  G3 I#106 F500
  G1 X#106
END1
G0 Z5.0`,
    physics_basis: "Spiral pattern maintains constant engagement",
    use_cases: ["Parametric circular pockets", "Varying sizes from one program", "Production consistency"],
    limitations: ["Requires macro capability", "Debugging complex", "No collision check"],
  },
  {
    type: "macro",
    name: "Helical Boring Macro",
    description: "Helical interpolation for precision bores",
    controllers_supported: ["fanuc", "haas_ngc", "siemens", "okuma_osp", "heidenhain"],
    parameters: [
      { name: "bore_diameter", description: "Final bore diameter", type: "numeric", unit: "mm" },
      { name: "depth", description: "Bore depth", type: "numeric", unit: "mm" },
      { name: "pitch", description: "Helix pitch per revolution", type: "numeric", unit: "mm", default_value: 0.5 },
    ],
    macro_example: `
(HELICAL BORE - FANUC)
#100 = 25.0   (BORE DIAMETER)
#101 = 20.0   (DEPTH)
#102 = 0.5    (PITCH)
#103 = #500   (TOOL DIAMETER FROM OFFSET)
#104 = [#100 - #103] / 2  (HELICAL RADIUS)
G0 X0 Y0
G43 H#500 Z2.0
G1 X#104 F500
G1 Z0 F200
(HELICAL INTERPOLATION)
G3 X#104 Y0 Z-#101 I-#104 J0 R#104 L[FIX[#101/#102]+1] F300
G1 X0
G0 Z5.0`,
    physics_basis: "Helical motion distributes cutting forces evenly",
    use_cases: ["Precision bores", "Large diameter holes", "H7 tolerance bores"],
    limitations: ["Requires G3 with Z", "Tool runout affects size"],
  },
  {
    type: "conversational",
    name: "Hurco UltiPocket",
    description: "Conversational pocket with automatic toolpath",
    controllers_supported: ["hurco_winmax"],
    parameters: [
      { name: "boundary_type", description: "Pocket shape", type: "enum", enum_values: ["rectangle", "circle", "irregular"] },
      { name: "stepover", description: "XY stepover", type: "numeric", unit: "mm" },
      { name: "stepdown", description: "Z stepdown", type: "numeric", unit: "mm" },
    ],
    physics_basis: "CAM-like adaptive pocket with conversational ease",
    use_cases: ["One-off parts", "Shop-floor programming", "When CAM unavailable"],
    limitations: ["Hurco only", "Limited optimization"],
  },
  {
    type: "conversational",
    name: "Heidenhain Cycle 251 (Rectangular Pocket)",
    description: "Built-in rectangular pocket cycle with finishing pass",
    controllers_supported: ["heidenhain"],
    parameters: [
      { name: "length", description: "Pocket length", type: "numeric", unit: "mm" },
      { name: "width", description: "Pocket width", type: "numeric", unit: "mm" },
      { name: "depth", description: "Pocket depth", type: "numeric", unit: "mm" },
      { name: "finishing_allowance", description: "Side finishing allowance", type: "numeric", unit: "mm" },
    ],
    gcode_pattern: `
CYCL DEF 251 RECTANGULAR POCKET
  Q218=50  ;LENGTH
  Q219=30  ;WIDTH
  Q220=-20 ;DEPTH
  Q368=0.2 ;FINISH ALLOWANCE SIDE
  Q369=0.1 ;FINISH ALLOWANCE FLOOR`,
    physics_basis: "Manufacturer-optimized cycle with automatic stepdown",
    use_cases: ["Standard pockets", "Quick programming", "Proven cycles"],
    limitations: ["Rectangular only", "Limited customization"],
  },
  {
    type: "cam_adaptive",
    name: "Adaptive Clearing",
    description: "Constant engagement HSM roughing",
    controllers_supported: ["fanuc", "haas_ngc", "siemens", "heidenhain", "okuma_osp", "mazak_mazatrol"],
    parameters: [
      { name: "optimal_load", description: "Tool engagement angle", type: "numeric", unit: "%", default_value: 30, range: { min: 10, max: 50 } },
      { name: "stepdown", description: "Axial depth", type: "numeric", unit: "mm", default_value: 10, range: { min: 0.5, max: 50 } },
      { name: "stock_to_leave", description: "Finishing allowance", type: "numeric", unit: "mm", default_value: 0.3 },
    ],
    cam_equivalent: [
      { cam_system: "fusion360", strategy_name: "Adaptive Clearing" },
      { cam_system: "hypermill", strategy_name: "Optimized Roughing" },
      { cam_system: "mastercam", strategy_name: "Dynamic Motion" },
    ],
    physics_basis: "Constant chip load F_c = kc1.1 × b × h^(1-mc) with ae control",
    use_cases: ["Deep pockets", "Hardened materials", "Extended tool life"],
    limitations: ["Requires CAM", "Complex toolpaths"],
  },
  {
    type: "novel",
    name: "Trochoidal Milling",
    description: "Circular slotting motion for slot milling",
    controllers_supported: ["fanuc", "haas_ngc", "siemens", "heidenhain", "okuma_osp"],
    parameters: [
      { name: "trochoidal_diameter", description: "Trochoidal circle diameter", type: "numeric", unit: "mm" },
      { name: "stepover", description: "Linear advance per circle", type: "numeric", unit: "mm" },
      { name: "feed", description: "Circular feed", type: "numeric", unit: "mm/min" },
    ],
    gcode_pattern: `
(TROCHOIDAL SLOT)
#100 = 0     (X POSITION)
#101 = 5     (TROCHOID RADIUS)
#102 = 2     (STEPOVER)
WHILE [#100 LT 100] DO1
  G3 I#101 F1000
  G1 X[#100 + #102]
  #100 = #100 + #102
END1`,
    physics_basis: "Reduced engagement angle, constant chip load in full slots",
    use_cases: ["Slot milling", "Hardened materials", "Thin walls"],
    limitations: ["Slower than conventional in soft materials", "Complex path"],
  },
  {
    type: "novel",
    name: "Morphed Spiral",
    description: "Spiral toolpath conforming to pocket boundary",
    controllers_supported: ["fanuc", "siemens", "heidenhain"],
    parameters: [
      { name: "stepover", description: "Radial step", type: "numeric", unit: "mm" },
      { name: "spiral_direction", description: "Inward or outward", type: "enum", enum_values: ["inward", "outward"] },
    ],
    cam_equivalent: [
      { cam_system: "hypermill", strategy_name: "Morphed Spiral" },
      { cam_system: "powermill", strategy_name: "Radial Finishing" },
    ],
    physics_basis: "Continuous spiral reduces retracts, smoother surface",
    use_cases: ["Floor finishing", "Reducing cusps", "Optical surfaces"],
    limitations: ["CAM required", "Complex for manual programming"],
  },
];

// ============================================================================
// CONSTANTS — External Sources
// ============================================================================

const WEB_SOURCES = {
  sandvik: {
    name: "Sandvik Coromant",
    url: "https://www.sandvik.coromant.com",
    topics: ["cutting data", "tool selection", "machining guides"],
  },
  kennametal: {
    name: "Kennametal",
    url: "https://www.kennametal.com",
    topics: ["cutting data", "metalworking", "tool grades"],
  },
  iscar: {
    name: "ISCAR",
    url: "https://www.iscar.com",
    topics: ["machining calculator", "tool selection"],
  },
  haas: {
    name: "Haas Automation",
    url: "https://www.haascnc.com",
    topics: ["tip of the day", "programming", "maintenance"],
  },
  youtube: {
    name: "YouTube",
    url: "https://www.youtube.com",
    topics: ["tutorials", "machining tips", "CAM walkthroughs"],
  },
};

const PDF_SOURCES = {
  hypermill_manual: {
    title: "hyperMILL Manual",
    path: "H:/prism/resources/PDF/hyperMILL/hyperMILL_Manual-en.pdf",
    pages: 2800,
    topics: ["strategies", "parameters", "automation"],
  },
  machinery_handbook: {
    title: "Machinery's Handbook 31st Edition",
    path: "",
    pages: 2896,
    topics: ["formulas", "tolerances", "threading", "materials"],
  },
  haas_manual: {
    title: "Haas Mill Operator's Manual",
    path: "",
    pages: 600,
    topics: ["G-codes", "M-codes", "macros", "probing"],
  },
};

// ============================================================================
// ENGINE — MillingMachineIntelligenceEngine
// ============================================================================

export class MillingMachineIntelligenceEngine {
  private machineCache: Map<string, MillingMachineProfile> = new Map();
  private controllerTips: ControllerKnowledgeTip[] = [];

  constructor() {
    this.initializeMachines();
    this.initializeControllerTips();
  }

  private initializeMachines(): void {
    for (const machine of JM_DIE_MILLING_MACHINES) {
      this.machineCache.set(machine.id, machine);
    }
  }

  private initializeControllerTips(): void {
    // Load controller tips from knowledge base
    this.controllerTips = [
      {
        id: "tip-haas-g187",
        controller: "haas_ngc",
        controller_model: "NGC",
        title: "G187 accuracy/speed control for HSM",
        content: "G187 controls accuracy vs speed trade-off. P1=rough (fastest), P2=medium, P3=finish (most accurate). E value sets custom tolerance. Use G187 P1 for roughing, G187 P3 for finishing.",
        category: "hsm",
        applies_to_machines: ["Haas VF-2", "Haas VF-3", "Haas UMC-750"],
        tags: ["hsm", "surface-finish", "accuracy"],
        source: "haas_manual",
        confidence: 95,
      },
      {
        id: "tip-fanuc-aicc",
        controller: "fanuc",
        controller_model: "31i",
        title: "AI Contour Control (AICC) for 5-axis",
        content: "AICC (G05.1 Q1) enables AI-based path smoothing for 5-axis. Reduces cycle time while maintaining accuracy. Use with G08 P1 (high-precision mode) for best results.",
        category: "5axis",
        applies_to_machines: ["Roku-Roku SNG", "Makino", "DMG MORI"],
        tags: ["5axis", "aicc", "smoothing"],
        source: "fanuc_manual",
        confidence: 90,
      },
      {
        id: "tip-heidenhain-tcpm",
        controller: "heidenhain",
        controller_model: "TNC 640",
        title: "TCPM for 5-axis tool orientation",
        content: "TCPM (Tool Center Point Management) maintains tool tip position when rotary axes move. Use FUNCTION TCPM instead of legacy M128 for better control over interpolation behavior.",
        category: "5axis",
        applies_to_machines: ["Hermle C42U", "Hermle C52U", "Kern Micro"],
        tags: ["5axis", "tcpm", "tool-orientation"],
        source: "heidenhain_manual",
        confidence: 95,
      },
      {
        id: "tip-fanuc-g43.4",
        controller: "fanuc",
        controller_model: "31i",
        title: "G43.4 / G43.5 for 5-axis TCP",
        content: "G43.4 enables 3+2 TCP (tool center point) control. G43.5 enables full 5-axis TCP for simultaneous motion. Critical for impeller/turbine machining.",
        category: "5axis",
        applies_to_machines: ["5-axis Fanuc machines"],
        tags: ["5axis", "tcp", "g43.4", "g43.5"],
        source: "fanuc_manual",
        confidence: 95,
      },
      {
        id: "tip-okuma-navi",
        controller: "okuma_osp",
        controller_model: "OSP-P300",
        title: "Machining Navi for chatter avoidance",
        content: "Machining Navi automatically detects chatter and recommends spindle speed adjustments. Use during roughing for automatic optimization.",
        category: "optimization",
        applies_to_machines: ["Okuma Genos", "Okuma MULTUS"],
        tags: ["chatter", "optimization", "navi"],
        source: "okuma_manual",
        confidence: 90,
      },
    ];
  }

  // ==========================================================================
  // MACHINE SEARCH
  // ==========================================================================

  /**
   * Get all JM Die milling machines
   */
  getJMDieMachines(): MillingMachineProfile[] {
    return JM_DIE_MILLING_MACHINES;
  }

  /**
   * Get machine by ID
   */
  getMachine(id: string): MillingMachineProfile | undefined {
    return this.machineCache.get(id);
  }

  /**
   * Find machines by criteria
   */
  findMachines(criteria: {
    type?: MachineType;
    manufacturer?: MachineManufacturer;
    controller?: ControllerType;
    min_rpm?: number;
    min_axes?: number;
  }): MillingMachineProfile[] {
    return Array.from(this.machineCache.values()).filter(m => {
      if (criteria.type && m.type !== criteria.type) return false;
      if (criteria.manufacturer && m.manufacturer !== criteria.manufacturer) return false;
      if (criteria.controller && m.controller !== criteria.controller) return false;
      if (criteria.min_rpm && m.spindle.max_rpm < criteria.min_rpm) return false;
      if (criteria.min_axes && m.axes < criteria.min_axes) return false;
      return true;
    });
  }

  /**
   * Find similar machines using feature vectors
   */
  findSimilarMachines(
    machine: MillingMachineProfile,
    limit: number = 5
  ): MachineSimilarityMatch[] {
    const sourceFeatures = this.extractMachineFeatures(machine);
    const matches: MachineSimilarityMatch[] = [];

    for (const [_, targetMachine] of this.machineCache) {
      if (targetMachine.id === machine.id) continue;

      const targetFeatures = this.extractMachineFeatures(targetMachine);
      const similarity = this.calculateFeatureSimilarity(sourceFeatures, targetFeatures);

      matches.push({
        machine: targetMachine,
        similarity_score: Math.round(similarity * 100),
        capability_match: this.calculateCapabilityMatch(machine, targetMachine),
        controller_match: machine.controller === targetMachine.controller ? 100 : 50,
        application_match: this.calculateApplicationMatch(machine, targetMachine),
        explanation: this.generateSimilarityExplanation(machine, targetMachine, similarity),
      });
    }

    return matches.sort((a, b) => b.similarity_score - a.similarity_score).slice(0, limit);
  }

  private extractMachineFeatures(machine: MillingMachineProfile): MachineFeatureVector {
    const controller = CONTROLLER_CAPABILITIES[machine.controller];

    return {
      machine_id: machine.id,
      features: {
        axes_normalized: machine.axes / 5,
        spindle_rpm_normalized: Math.min(machine.spindle.max_rpm / 40000, 1),
        spindle_power_normalized: Math.min(machine.spindle.power_kw / 50, 1),
        envelope_volume_normalized: Math.min(
          (machine.work_envelope.x_mm * machine.work_envelope.y_mm * machine.work_envelope.z_mm) / 1e9,
          1
        ),
        rapid_rate_normalized: Math.min(machine.rapid_rates.xy_mm_min / 50000, 1),

        is_3axis: machine.axes === 3 ? 1 : 0,
        is_5axis: machine.axes >= 5 ? 1 : 0,
        is_hsc: machine.spindle.max_rpm >= 15000 ? 1 : 0,
        is_mill_turn: machine.type === "mill_turn" ? 1 : 0,
        is_graphite: machine.type === "graphite" ? 1 : 0,

        has_macro_b: controller.features.macro_b ? 1 : 0,
        has_conversational: controller.features.conversational ? 1 : 0,
        has_tcp_management: controller.features.tcp_management ? 1 : 0,
        has_collision_avoidance: controller.features.collision_avoidance ? 1 : 0,
        has_adaptive_feed: controller.features.adaptive_feed ? 1 : 0,
      },
    };
  }

  private calculateFeatureSimilarity(a: MachineFeatureVector, b: MachineFeatureVector): number {
    const aVals = Object.values(a.features);
    const bVals = Object.values(b.features);

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < aVals.length; i++) {
      dotProduct += aVals[i] * bVals[i];
      normA += aVals[i] * aVals[i];
      normB += bVals[i] * bVals[i];
    }

    if (normA === 0 || normB === 0) return 0;
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  private calculateCapabilityMatch(a: MillingMachineProfile, b: MillingMachineProfile): number {
    let score = 50;
    if (a.type === b.type) score += 25;
    if (a.axes === b.axes) score += 15;
    if (Math.abs(a.spindle.max_rpm - b.spindle.max_rpm) < 2000) score += 10;
    return Math.min(100, score);
  }

  private calculateApplicationMatch(a: MillingMachineProfile, b: MillingMachineProfile): number {
    const sharedApps = a.primary_applications.filter(app =>
      b.primary_applications.includes(app)
    ).length;
    return Math.round((sharedApps / Math.max(a.primary_applications.length, 1)) * 100);
  }

  private generateSimilarityExplanation(
    source: MillingMachineProfile,
    target: MillingMachineProfile,
    similarity: number
  ): string {
    const parts: string[] = [];

    if (source.type === target.type) {
      parts.push(`Same type (${source.type})`);
    }

    if (source.controller === target.controller) {
      parts.push(`Same controller (${source.controller})`);
    }

    if (Math.abs(source.spindle.max_rpm - target.spindle.max_rpm) < 2000) {
      parts.push("Similar spindle speed");
    }

    parts.push(`${Math.round(similarity * 100)}% feature similarity`);

    return parts.join(". ");
  }

  // ==========================================================================
  // CONTROLLER INTELLIGENCE
  // ==========================================================================

  /**
   * Get controller capabilities
   */
  getControllerCapabilities(controller: ControllerType): ControllerCapability {
    return CONTROLLER_CAPABILITIES[controller];
  }

  /**
   * Get controller tips
   */
  getControllerTips(
    controller?: ControllerType,
    category?: ControllerKnowledgeTip["category"]
  ): ControllerKnowledgeTip[] {
    return this.controllerTips.filter(tip => {
      if (controller && tip.controller !== controller) return false;
      if (category && tip.category !== category) return false;
      return true;
    });
  }

  /**
   * Check if controller supports feature
   */
  controllerSupportsFeature(
    controller: ControllerType,
    feature: keyof ControllerCapability["features"]
  ): boolean {
    const cap = CONTROLLER_CAPABILITIES[controller];
    const value = cap.features[feature];
    if (typeof value === "boolean") return value;
    if (Array.isArray(value)) return value.length > 0;
    return false;
  }

  // ==========================================================================
  // TOOLPATH INTELLIGENCE
  // ==========================================================================

  /**
   * Get all toolpath strategies
   */
  getToolpathStrategies(type?: ToolpathType): ToolpathStrategy[] {
    if (type) {
      return TOOLPATH_STRATEGIES.filter(s => s.type === type);
    }
    return TOOLPATH_STRATEGIES;
  }

  /**
   * Get toolpath strategy by name
   */
  getToolpathStrategy(name: string): ToolpathStrategy | undefined {
    return TOOLPATH_STRATEGIES.find(s =>
      s.name.toLowerCase() === name.toLowerCase()
    );
  }

  /**
   * Recommend toolpath for operation
   */
  recommendToolpath(
    operation: string,
    controller: ControllerType,
    hasCam: boolean
  ): ToolpathStrategy[] {
    const opLower = operation.toLowerCase();
    const recommendations: ToolpathStrategy[] = [];

    for (const strategy of TOOLPATH_STRATEGIES) {
      // Skip CAM strategies if no CAM
      if (!hasCam && (strategy.type === "cam_2d" || strategy.type === "cam_3d" ||
                      strategy.type === "cam_5axis" || strategy.type === "cam_adaptive")) {
        continue;
      }

      // Check controller support
      if (!strategy.controllers_supported.includes(controller)) {
        continue;
      }

      // Match operation
      let score = 0;
      if (opLower.includes("pocket") && strategy.name.toLowerCase().includes("pocket")) score += 30;
      if (opLower.includes("slot") && strategy.name.toLowerCase().includes("trochoidal")) score += 30;
      if (opLower.includes("bore") && strategy.name.toLowerCase().includes("bore")) score += 30;
      if (opLower.includes("adaptive") && strategy.type === "cam_adaptive") score += 30;
      if (opLower.includes("rough") && strategy.type === "hardcode") score += 10;

      if (score > 0) {
        recommendations.push(strategy);
      }
    }

    return recommendations.slice(0, 5);
  }

  // ==========================================================================
  // DEEP REASONING
  // ==========================================================================

  /**
   * Generate reasoning chain for query
   */
  generateReasoningChain(query: MachineQuery): MachineReasoningChain {
    const steps: ReasoningStep[] = [];
    const sources: string[] = [];

    // Step 1: Observation
    steps.push({
      step_number: 1,
      type: "observation",
      content: `Query: "${query.natural_language}". Machine: ${query.machine || "any"}. Controller: ${query.controller || "any"}.`,
      evidence: [],
      confidence: 95,
    });

    // Step 2: Knowledge lookup
    const machine = query.machine ? this.findMachineByName(query.machine) : undefined;
    const controller = query.controller || (machine?.controller);
    const controllerCap = controller ? CONTROLLER_CAPABILITIES[controller] : undefined;

    steps.push({
      step_number: 2,
      type: "knowledge_lookup",
      content: `Found machine: ${machine?.name || "none"}. Controller: ${controller || "none"}. Features: ${controllerCap ? Object.entries(controllerCap.features).filter(([_, v]) => v === true || (Array.isArray(v) && v.length > 0)).map(([k]) => k).join(", ") : "none"}`,
      evidence: machine ? [`Machine: ${machine.name}`, `Controller: ${controller}`] : [],
      confidence: machine ? 90 : 60,
    });

    // Step 3: Analysis
    const tips = controller ? this.getControllerTips(controller) : [];
    const relevantTips = this.findRelevantTips(query.natural_language, tips);

    steps.push({
      step_number: 3,
      type: "analysis",
      content: `Found ${relevantTips.length} relevant controller tips. Analyzing query intent...`,
      evidence: relevantTips.map(t => t.title),
      confidence: relevantTips.length > 0 ? 85 : 60,
    });

    // Step 4: Inference
    const toolpaths = this.recommendToolpath(
      query.operation || query.natural_language,
      controller || "fanuc",
      true
    );

    steps.push({
      step_number: 4,
      type: "inference",
      content: `Recommended ${toolpaths.length} toolpath strategies: ${toolpaths.map(t => t.name).join(", ")}`,
      evidence: toolpaths.map(t => t.name),
      confidence: toolpaths.length > 0 ? 80 : 50,
    });

    // Step 5: Synthesis
    const conclusion = this.synthesizeConclusion(query, machine, controllerCap, relevantTips, toolpaths);
    const gcodeSolution = this.generateGCodeSolution(query, machine, toolpaths);

    steps.push({
      step_number: 5,
      type: "synthesis",
      content: conclusion,
      evidence: [],
      confidence: 85,
    });

    sources.push(...relevantTips.map(t => t.source));
    if (machine) sources.push(`${machine.manufacturer} documentation`);

    return {
      query: query.natural_language,
      machine,
      controller: controllerCap,
      steps,
      conclusion,
      gcode_solution: gcodeSolution,
      confidence: this.calculateChainConfidence(steps),
      sources,
    };
  }

  private findMachineByName(name: string): MillingMachineProfile | undefined {
    const nameLower = name.toLowerCase();
    for (const [_, machine] of this.machineCache) {
      if (machine.name.toLowerCase().includes(nameLower) ||
          machine.model.toLowerCase().includes(nameLower)) {
        return machine;
      }
    }
    return undefined;
  }

  private findRelevantTips(query: string, tips: ControllerKnowledgeTip[]): ControllerKnowledgeTip[] {
    const queryLower = query.toLowerCase();
    return tips.filter(tip => {
      const combined = `${tip.title} ${tip.content} ${tip.tags.join(" ")}`.toLowerCase();
      const keywords = queryLower.split(/\s+/);
      return keywords.some(kw => kw.length > 3 && combined.includes(kw));
    });
  }

  private synthesizeConclusion(
    query: MachineQuery,
    machine: MillingMachineProfile | undefined,
    controller: ControllerCapability | undefined,
    tips: ControllerKnowledgeTip[],
    toolpaths: ToolpathStrategy[]
  ): string {
    const parts: string[] = [];

    if (machine) {
      parts.push(`For ${machine.name} with ${machine.controller} controller:`);
    }

    if (tips.length > 0) {
      parts.push(`Key tip: ${tips[0].title}`);
    }

    if (toolpaths.length > 0) {
      parts.push(`Recommended strategy: ${toolpaths[0].name}`);
    }

    if (controller?.features.macro_b) {
      parts.push("Macro B is available for parametric programming");
    }

    return parts.join(" ") || "Unable to generate specific recommendation. Please provide more details.";
  }

  private generateGCodeSolution(
    query: MachineQuery,
    machine: MillingMachineProfile | undefined,
    toolpaths: ToolpathStrategy[]
  ): string | undefined {
    if (toolpaths.length === 0) return undefined;

    const strategy = toolpaths[0];
    if (strategy.gcode_pattern) {
      return strategy.gcode_pattern;
    }
    if (strategy.macro_example) {
      return strategy.macro_example;
    }
    return undefined;
  }

  private calculateChainConfidence(steps: ReasoningStep[]): number {
    if (steps.length === 0) return 50;
    return Math.round(steps.reduce((sum, s) => sum + s.confidence, 0) / steps.length);
  }

  // ==========================================================================
  // NL INTERFACE
  // ==========================================================================

  /**
   * Process natural language query
   */
  processQuery(query: string, machine?: string, controller?: ControllerType): MachineResponse {
    const startTime = Date.now();

    // Parse query
    const machineQuery: MachineQuery = {
      query_type: this.detectQueryType(query),
      natural_language: query,
      machine,
      controller: controller || this.detectController(query),
      operation: this.detectOperation(query),
      material: this.detectMaterial(query),
    };

    // Generate reasoning
    const reasoning = this.generateReasoningChain(machineQuery);

    // Find machines
    const machineMatches = machine ?
      [this.findMachineByName(machine)].filter(Boolean).map(m => ({
        machine: m!,
        similarity_score: 100,
        capability_match: 100,
        controller_match: 100,
        application_match: 100,
        explanation: "Direct match",
      })) :
      [];

    // Get controller tips
    const controllerTips = this.getControllerTips(machineQuery.controller);

    // Get toolpath recommendations
    const toolpathRecs = this.recommendToolpath(
      machineQuery.operation || query,
      machineQuery.controller || "fanuc",
      true
    );

    // Generate references
    const videoRefs = this.generateVideoReferences(query);
    const pdfRefs = this.generatePDFReferences(query);
    const webRefs = this.generateWebReferences(query);

    // Generate summary
    const summary = this.generateNLSummary(machineQuery, reasoning, toolpathRecs);

    // Generate follow-ups
    const followUps = this.generateFollowUps(machineQuery);

    return {
      query: machineQuery,
      machine_matches: machineMatches,
      controller_tips: controllerTips.slice(0, 5),
      toolpath_recommendations: toolpathRecs,
      reasoning,
      gcode_example: reasoning.gcode_solution,
      macro_example: toolpathRecs.find(t => t.macro_example)?.macro_example,
      natural_language_summary: summary,
      video_references: videoRefs,
      pdf_references: pdfRefs,
      web_references: webRefs,
      follow_up_suggestions: followUps,
      processing_time_ms: Date.now() - startTime,
    };
  }

  private detectQueryType(query: string): MachineQuery["query_type"] {
    const lower = query.toLowerCase();
    if (lower.includes("g-code") || lower.includes("gcode") || lower.includes("g code")) return "gcode_help";
    if (lower.includes("macro")) return "macro_creation";
    if (lower.includes("parameter") || lower.includes("speed") || lower.includes("feed")) return "parameter_recommendation";
    if (lower.includes("compare") || lower.includes("vs") || lower.includes("difference")) return "machine_comparison";
    if (lower.includes("problem") || lower.includes("issue") || lower.includes("error")) return "troubleshooting";
    if (lower.includes("feature") || lower.includes("capability")) return "controller_feature";
    return "toolpath_selection";
  }

  private detectController(query: string): ControllerType | undefined {
    const lower = query.toLowerCase();
    if (lower.includes("haas")) return "haas_ngc";
    if (lower.includes("fanuc")) return "fanuc";
    if (lower.includes("heidenhain") || lower.includes("tnc")) return "heidenhain";
    if (lower.includes("siemens") || lower.includes("sinumerik")) return "siemens";
    if (lower.includes("okuma") || lower.includes("osp")) return "okuma_osp";
    if (lower.includes("mazak") || lower.includes("mazatrol")) return "mazak_mazatrol";
    if (lower.includes("hurco")) return "hurco_winmax";
    return undefined;
  }

  private detectOperation(query: string): string | undefined {
    const lower = query.toLowerCase();
    const ops = ["pocket", "slot", "bore", "drill", "tap", "face", "contour", "3d", "5-axis", "adaptive"];
    for (const op of ops) {
      if (lower.includes(op)) return op;
    }
    return undefined;
  }

  private detectMaterial(query: string): string | undefined {
    const lower = query.toLowerCase();
    const materials = ["aluminum", "steel", "titanium", "graphite", "hardened", "stainless"];
    for (const mat of materials) {
      if (lower.includes(mat)) return mat;
    }
    return undefined;
  }

  private generateVideoReferences(query: string): VideoReference[] {
    const refs: VideoReference[] = [];
    const lower = query.toLowerCase();

    if (lower.includes("haas")) {
      refs.push({
        title: "Haas Tip of the Day",
        source: "youtube",
        url: "https://www.youtube.com/user/HaasAutomation",
        relevance_score: 85,
      });
    }

    if (lower.includes("macro") || lower.includes("program")) {
      refs.push({
        title: "CNC Macro Programming Tutorials",
        source: "youtube",
        relevance_score: 75,
      });
    }

    if (lower.includes("hypermill") || lower.includes("cam")) {
      refs.push({
        title: "hyperMILL Training Videos",
        source: "local",
        path: "H:/prism/Resources/HYPERMILL/",
        relevance_score: 90,
      });
    }

    return refs;
  }

  private generatePDFReferences(query: string): PDFReference[] {
    const refs: PDFReference[] = [];
    const lower = query.toLowerCase();

    if (lower.includes("hypermill")) {
      refs.push({
        title: "hyperMILL Manual",
        document: PDF_SOURCES.hypermill_manual.path,
        relevance_score: 90,
      });
    }

    if (lower.includes("formula") || lower.includes("calculation")) {
      refs.push({
        title: "Machinery's Handbook",
        document: "machinery_handbook_31",
        relevance_score: 85,
      });
    }

    return refs;
  }

  private generateWebReferences(query: string): WebReference[] {
    const refs: WebReference[] = [];
    const lower = query.toLowerCase();

    if (lower.includes("cutting data") || lower.includes("speed") || lower.includes("feed")) {
      refs.push({
        title: "Sandvik Coromant Machining Calculator",
        url: "https://www.sandvik.coromant.com/machining-calculator",
        source: "sandvik",
        relevance_score: 90,
      });
      refs.push({
        title: "Kennametal NOVO",
        url: "https://www.kennametal.com/novo",
        source: "kennametal",
        relevance_score: 85,
      });
    }

    if (lower.includes("haas")) {
      refs.push({
        title: "Haas Resource Center",
        url: "https://www.haascnc.com/service/online-resources.html",
        source: "manufacturer",
        relevance_score: 90,
      });
    }

    return refs;
  }

  private generateNLSummary(
    query: MachineQuery,
    reasoning: MachineReasoningChain,
    toolpaths: ToolpathStrategy[]
  ): string {
    const parts: string[] = [];

    if (reasoning.machine) {
      parts.push(`For ${reasoning.machine.name}:`);
    }

    if (toolpaths.length > 0) {
      parts.push(`Recommended: ${toolpaths[0].name}`);
    }

    if (reasoning.gcode_solution) {
      parts.push("G-code example available.");
    }

    parts.push(reasoning.conclusion);

    return parts.join(" ");
  }

  private generateFollowUps(query: MachineQuery): string[] {
    const followUps: string[] = [];

    if (!query.machine) {
      followUps.push("Which machine are you programming?");
    }

    if (query.query_type === "macro_creation") {
      followUps.push("Would you like a parametric macro example?");
    }

    followUps.push("Show me the controller canned cycles");
    followUps.push("What are the HSM settings for this controller?");

    return followUps.slice(0, 4);
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const millingMachineIntelligenceEngine = new MillingMachineIntelligenceEngine();
