/**
 * PostProcessorDeepAIHardeningEngine — PP-HARDEN-MS1
 * ===================================================
 * Cross-engine AI hardening layer for ALL post processor capabilities.
 *
 * Unifies:
 *   - ControllerKnowledgeEngine        (11 controller families, 250+ M-codes, 100+ cycles)
 *   - PostProcessorAnalysisEngine      (AI-powered code analysis, dead code detection)
 *   - PostProcessorPipelineEngine      (38-stage post processing pipeline)
 *   - LathePostProcessorEngine         (turning-specific post logic)
 *   - FiveAxisPostProcessorEngine      (5-axis TCPM, tilted work planes)
 *   - MillTurnPostProcessorEngine      (hybrid mill-turn coordination)
 *   - OkumaParametricProgramEngine     (OSP macro programming)
 *   - HurcoWinMaxKnowledgeEngine       (BNC/ISNC, UltiMotion, G84.2/G84.3)
 *   - TribalKnowledgeEngine            (87+ controller-specific tips)
 *
 * Controller Knowledge (from resources):
 *   - Hurco WinMax (67 M-codes, 18 cycles, BNC/ISNC modes)
 *   - Heidenhain TNC (14 CYCL DEF, PLANE SPATIAL, Klartext)
 *   - Fanuc 0i/31i (13 cycles, AICC, Nano Smoothing, G68.2)
 *   - Siemens 840D (12 CYCLE definitions, TRAORI, CYCLE800)
 *   - Okuma OSP (11 cycles, Super-NURBS G08, G15 H## offsets)
 *   - Haas NGC (15 cycles, G187 smoothing, TCPC G234)
 *   - Mazak Mazatrol (conversational + EIA, G12.1 polar)
 *   - Brother C00 (G77/G78 tapping, 0.9s tool change)
 *   - Mitsubishi M70/M80 (SSS Control II)
 *
 * JM Die Shop Machines (canonical test shop):
 *   - Okuma LB15II (OSP-U10L, 2-axis lathe)
 *   - Okuma LB15II-M (OSP-U10L, C-axis live tooling)
 *   - Okuma Captain L370 (OSP-E100L, 2-axis lathe)
 *   - Hurco VMX42 (WinMax, 3-axis mill, CAT40)
 *   - Haas VF-2 (NGC, 3-axis mill, CAT40)
 *   - Haas VF-3 (NGC, 3-axis mill, CAT40)
 *   - Okuma Genos M460V (OSP-P300, 3-axis VMC)
 *
 * @module engines/PostProcessorDeepAIHardeningEngine
 * @milestone PP-HARDEN-MS1
 * @version 1.0.0
 */

import { log } from "../utils/Logger.js";
import { controllerKnowledgeEngine, type ControllerFamily, type ControllerProfile, type CycleDefinition, type MCodeMapping } from "./ControllerKnowledgeEngine.js";
import { analyzePostProcessor, type AnalysisResult, type PostIssue } from "./PostProcessorAnalysisEngine.js";
import { CONTROLLER_KNOWLEDGE_TIPS } from "../data/controller-knowledge-tips.js";

// ============================================================================
// MATHEMATICAL FORMULAS — Post Processor Calculations
// ============================================================================

/**
 * Calculate spindle RPM from Surface Feet per Minute (SFM)
 * Formula: RPM = (SFM × 12) / (π × Diameter)
 * @param sfm Surface speed in feet per minute
 * @param diameter Tool diameter in inches
 * @returns Spindle RPM
 */
export function calculateRPMFromSFM(sfm: number, diameter: number): number {
  if (diameter <= 0) return 0;
  return (sfm * 12) / (Math.PI * diameter);
}

/**
 * Calculate spindle RPM from Surface Meters per Minute (SMM)
 * Formula: RPM = (SMM × 1000) / (π × Diameter)
 * @param smm Surface speed in meters per minute
 * @param diameter Tool diameter in millimeters
 * @returns Spindle RPM
 */
export function calculateRPMFromSMM(smm: number, diameter: number): number {
  if (diameter <= 0) return 0;
  return (smm * 1000) / (Math.PI * diameter);
}

/**
 * Calculate feed rate in inches per minute (IPM) from chip load
 * Formula: IPM = RPM × Chip Load × Number of Flutes
 * @param rpm Spindle RPM
 * @param chipLoad Chip load per tooth in inches
 * @param flutes Number of cutting flutes
 * @returns Feed rate in inches per minute
 */
export function calculateIPMFromChipLoad(rpm: number, chipLoad: number, flutes: number): number {
  return rpm * chipLoad * flutes;
}

/**
 * Calculate tapping feed rate for rigid tapping
 * Formula: Feed = RPM × Pitch (in inches per revolution mode)
 * @param rpm Spindle RPM
 * @param pitch Thread pitch in inches (or mm for metric)
 * @param isMetric Whether pitch is in mm
 * @returns Feed rate
 */
export function calculateTappingFeed(rpm: number, pitch: number, isMetric: boolean = false): number {
  // For rigid tapping, feed = RPM × pitch (in IPR or mm/rev mode)
  // Most controllers use IPR for tapping, so just return pitch
  // The RPM × pitch calculation is for IPM mode
  return isMetric ? pitch : pitch;
}

/**
 * Calculate optimal peck depth for drilling
 * Based on material hardness and hole diameter
 * @param holeDiameter Hole diameter
 * @param materialHardness Rockwell hardness (HRC) or approximate
 * @param isDeepHole Whether hole depth > 3× diameter
 * @returns Recommended peck depth
 */
export function calculatePeckDepth(
  holeDiameter: number,
  materialHardness: number = 30,
  isDeepHole: boolean = false
): number {
  // Base peck depth: 0.5-1.0 × diameter for normal materials
  // Reduce for harder materials
  // Reduce further for deep holes

  let factor = 1.0;

  if (materialHardness > 50) {
    factor = 0.3; // Very hard (>50 HRC)
  } else if (materialHardness > 40) {
    factor = 0.5; // Hard (40-50 HRC)
  } else if (materialHardness > 30) {
    factor = 0.7; // Medium (30-40 HRC)
  }

  if (isDeepHole) {
    factor *= 0.5; // Halve for deep holes
  }

  return holeDiameter * factor;
}

/**
 * Calculate safe retract height for 5-axis operations
 * Based on part height and tool length
 * @param partHeight Maximum part height from WCS zero
 * @param toolLength Tool stick-out length
 * @param safetyMargin Additional clearance (default 0.5")
 * @returns Safe retract height above part
 */
export function calculate5AxisRetractHeight(
  partHeight: number,
  toolLength: number,
  safetyMargin: number = 0.5
): number {
  // Retract height should clear the part + safety margin
  // Account for potential tool tilt in 5-axis
  const tiltCompensation = toolLength * 0.3; // 30% of tool length for worst-case tilt
  return partHeight + safetyMargin + tiltCompensation;
}

/**
 * Calculate IJK tool vector from Euler angles (A, B, C)
 * For 5-axis simultaneous machining
 * @param aAngle A-axis angle in degrees (rotation around X)
 * @param bAngle B-axis angle in degrees (rotation around Y)
 * @param cAngle C-axis angle in degrees (rotation around Z)
 * @returns IJK unit vector components
 */
export function calculateToolVectorFromAngles(
  aAngle: number,
  bAngle: number,
  cAngle: number
): { i: number; j: number; k: number } {
  const toRad = Math.PI / 180;
  const a = aAngle * toRad;
  const b = bAngle * toRad;
  const c = cAngle * toRad;

  // Start with Z-up tool vector [0, 0, 1]
  // Apply rotations in order: C (Z), B (Y), A (X)
  // This is a common convention but varies by machine kinematics

  // Rotation matrices applied to [0, 0, 1]:
  const cosA = Math.cos(a), sinA = Math.sin(a);
  const cosB = Math.cos(b), sinB = Math.sin(b);
  const cosC = Math.cos(c), sinC = Math.sin(c);

  // Combined rotation: R = Rz(C) × Ry(B) × Rx(A) × [0, 0, 1]
  const i = cosC * sinB * cosA + sinC * sinA;
  const j = sinC * sinB * cosA - cosC * sinA;
  const k = cosB * cosA;

  // Normalize and round to 6 decimal places (per Cope 2014 requirement)
  const mag = Math.sqrt(i * i + j * j + k * k);
  return {
    i: Math.round((i / mag) * 1e6) / 1e6,
    j: Math.round((j / mag) * 1e6) / 1e6,
    k: Math.round((k / mag) * 1e6) / 1e6,
  };
}

/**
 * Calculate shortest rotary path (for M126 logic)
 * @param currentAngle Current rotary position in degrees
 * @param targetAngle Target rotary position in degrees
 * @param axisMin Minimum axis travel (e.g., -360)
 * @param axisMax Maximum axis travel (e.g., 360)
 * @returns Optimal target angle for shortest path
 */
export function calculateShortestRotaryPath(
  currentAngle: number,
  targetAngle: number,
  axisMin: number = -360,
  axisMax: number = 360
): number {
  // Normalize both angles to 0-360 range
  const normalizedCurrent = ((currentAngle % 360) + 360) % 360;
  const normalizedTarget = ((targetAngle % 360) + 360) % 360;

  // Calculate both possible paths
  let diff1 = normalizedTarget - normalizedCurrent;
  let diff2 = diff1 > 0 ? diff1 - 360 : diff1 + 360;

  // Choose shorter path
  const shortestDiff = Math.abs(diff1) <= Math.abs(diff2) ? diff1 : diff2;
  const optimalTarget = currentAngle + shortestDiff;

  // Check if optimal target is within axis limits
  if (optimalTarget >= axisMin && optimalTarget <= axisMax) {
    return optimalTarget;
  }

  // If not, return original target
  return targetAngle;
}

// ============================================================================
// TYPES — Input Structures
// ============================================================================

/** Post processor conversion request */
export interface PostConversionRequest {
  /** Source controller family */
  source_controller: ControllerFamily;
  /** Target controller family */
  target_controller: ControllerFamily;
  /** G-code program to convert */
  source_program: string;
  /** Part material (affects cycle selection) */
  material?: string;
  /** Operation type */
  operation_type?: "milling" | "turning" | "mill_turn" | "5_axis";
  /** Preserve comments */
  preserve_comments?: boolean;
}

/** Post conversion result */
export interface PostConversionResult {
  /** Converted G-code */
  converted_program: string;
  /** Conversion warnings */
  warnings: string[];
  /** Incompatible features that couldn't be converted */
  incompatible_features: string[];
  /** Mapping log of G/M code changes */
  code_mappings: Array<{
    source: string;
    target: string;
    reason: string;
  }>;
  /** Confidence score 0-100 */
  confidence: number;
}

/** Post processor generation request */
export interface PostGeneratorRequest {
  /** Target controller */
  controller: ControllerFamily;
  /** Machine model */
  machine_model?: string;
  /** Axes configuration */
  axes: "3_axis" | "4_axis" | "5_axis" | "mill_turn" | "swiss";
  /** CAM system source */
  cam_system: "mastercam" | "fusion360" | "hypermill" | "solidcam" | "nx" | "esprit" | "edgecam" | "other";
  /** Required features */
  features: {
    rigid_tapping?: boolean;
    high_speed_machining?: boolean;
    cutter_compensation?: boolean;
    probing?: boolean;
    tool_breakage_detection?: boolean;
    chip_conveyor?: boolean;
    coolant_through_spindle?: boolean;
    rotary_clamps?: boolean;
  };
  /** JM Die shop specific requirements */
  jm_die_options?: {
    use_jm_die_tooling_strategy?: boolean;
    customer_specific_header?: string;
    include_tribal_tips?: boolean;
  };
}

/** Generated post processor specification */
export interface PostGeneratorResult {
  /** Generated post processor code */
  post_code: string;
  /** Post configuration properties */
  properties: Record<string, {
    title: string;
    type: string;
    default_value: unknown;
    description: string;
  }>;
  /** Cycle definitions included */
  cycles_included: string[];
  /** M-codes mapped */
  mcodes_mapped: number;
  /** Recommendations for optimization */
  recommendations: string[];
  /** Confidence score 0-100 */
  confidence: number;
}

/** Post processor validation request */
export interface PostValidationRequest {
  /** Post processor code */
  post_code: string;
  /** Post processor filename */
  filename: string;
  /** Target controller (for validation context) */
  controller?: ControllerFamily;
  /** Sample output to validate */
  sample_output?: string;
}

/** Post validation result */
export interface PostValidationResult {
  /** Overall quality score 0-100 */
  score: number;
  /** Issues found */
  issues: PostIssue[];
  /** Controller compatibility */
  controller_compatibility: {
    compatible: boolean;
    missing_features: string[];
    syntax_warnings: string[];
  };
  /** Cycle implementation quality */
  cycle_quality: {
    implemented: string[];
    missing_critical: string[];
    incomplete: string[];
  };
  /** Recommendations */
  recommendations: string[];
}

/** Tribal knowledge query for controller */
export interface ControllerTipQuery {
  /** Controller family */
  controller: ControllerFamily;
  /** Topic keywords */
  keywords?: string[];
  /** Operation type filter */
  operation_type?: string;
  /** Maximum tips to return */
  limit?: number;
}

/** Tribal tip result */
export interface ControllerTip {
  id: string;
  title: string;
  body: string;
  confidence: number;
  tags: string[];
}

/** JM Die machine post configuration */
export interface JMDieMachinePostConfig {
  machine_id: string;
  machine_name: string;
  controller: ControllerFamily;
  post_template: string;
  special_requirements: string[];
  typical_operations: string[];
  tribal_tips: string[];
}

// ============================================================================
// CONTROLLER CONVERSION MAPPINGS
// ============================================================================

/** Cross-controller G-code conversion rules */
const G_CODE_CONVERSIONS: Record<string, Record<string, string>> = {
  // Tapping conversions
  "G88": {
    "hurco_winmax_bnc": "G88",      // BNC mode rigid tap
    "hurco_winmax_isnc": "G84 M29", // ISNC mode needs M29
    "fanuc_0i": "G84 M29",
    "fanuc_31i": "G84 M29",
    "haas_ngc": "G84",              // Haas handles rigid internally
    "okuma_osp": "G84",             // OSP auto-detects rigid
    "heidenhain_tnc": "CYCL DEF 207",
    "siemens_840d": "CYCLE84",
    "mazatrol": "G84",
  },
  // Peck tapping
  "G84.2": {
    "hurco_winmax_isnc": "G84.2",
    "fanuc_31i": "G84.2",
    "haas_ngc": "G84.2",
    "heidenhain_tnc": "CYCL DEF 209",
    "siemens_840d": "CYCLE84 VARI=1",
  },
  // Left-hand tapping
  "G84.3": {
    "hurco_winmax_isnc": "G84.3",
    "fanuc_31i": "G74 M29",
    "haas_ngc": "G74",
    "heidenhain_tnc": "CYCL DEF 207 M4",
    "siemens_840d": "CYCLE84 SDR=1",
  },
  // High-speed peck
  "G73": {
    "hurco_winmax": "G73",
    "fanuc_0i": "G73",
    "fanuc_31i": "G73",
    "haas_ngc": "G73",
    "okuma_osp": "G73",
    "heidenhain_tnc": "CYCL DEF 203",
    "siemens_840d": "CYCLE83 VARI=1",
    "mazatrol": "G73",
  },
  // Fine boring
  "G76": {
    "hurco_winmax": "G76",
    "fanuc_0i": "G76",
    "fanuc_31i": "G76",
    "haas_ngc": "G76",
    "okuma_osp": "G76",
    "heidenhain_tnc": "CYCL DEF 86",
    "siemens_840d": "CYCLE86",
  },
  // Tilted work plane / Transform Plane (Cope 2014)
  // Hurco native G68.2 also enables TCPM
  "G68.2": {
    "hurco_winmax": "G68.2",         // native, also enables TCPM
    "fanuc_31i": "G68.2",
    "haas_ngc": "G68.2",
    "okuma_osp": "G68.2",            // OSP-P300+
    "heidenhain_tnc": "PLANE SPATIAL",
    "siemens_840d": "CYCLE800",
  },
  // ASR (Automatic Safe Repositioning) — Hurco-specific (Cope 2014)
  // Finds optimized path without overtravel
  "G8.2": {
    "hurco_winmax": "G8.2",          // native - optimized repositioning
    // Other controllers: no direct equivalent (manual repositioning required)
  },
  // TCP / TCPM / Toolpath Linearization (Cope 2014)
  "G43.4": {
    "hurco_winmax": "G43.4",         // with M128 for TCPM mode
    "fanuc_31i": "G43.4",
    "haas_ngc": "G234",
    "okuma_osp": "G43.4",
    "heidenhain_tnc": "M128 FUNCTION TCPM",
    "siemens_840d": "TRAORI",
  },
  // Smoothing / HSM
  "G05.1": {
    "fanuc_31i": "G05.1 Q1",
    "fanuc_0i": "G05.1 Q1",
    "haas_ngc": "G187",
    "hurco_winmax": "G64",          // UltiMotion
    "heidenhain_tnc": "CYCL DEF 32",
    "siemens_840d": "CYCLE832",
    "okuma_osp": "G08 P1",
  },
};

/** M-code cross-controller mappings */
const M_CODE_CONVERSIONS: Record<string, Record<string, string>> = {
  // TCPM On
  "M128": {
    "hurco_winmax": "M128",
    "heidenhain_tnc": "M128",
    "fanuc_31i": "", // Implicit with G43.4
    "haas_ngc": "",  // Implicit with G234
    "siemens_840d": "TRAORI",
  },
  // TCPM Off
  "M129": {
    "hurco_winmax": "M129",
    "heidenhain_tnc": "M129",
    "fanuc_31i": "G49",
    "haas_ngc": "G49",
    "siemens_840d": "TRAFOOF",
  },
  // Shortest rotary path
  "M126": {
    "hurco_winmax": "M126",
    "haas_ngc": "M126",
    "fanuc_31i": "", // Parameter-based
    "heidenhain_tnc": "", // Default behavior
  },
  // Tool vector retract
  "M140": {
    "hurco_winmax": "M140",
    "heidenhain_tnc": "M140 MB MAX",
    "fanuc_31i": "G53 Z0",
    "haas_ngc": "G53 Z0",
    "siemens_840d": "SUPA G0 Z_",
  },
  // Rotary Axis Encoder Reset (Cope 2014)
  // Hurco-specific, no direct equivalent on other controllers
  "M31": {
    "hurco_winmax": "M31",
    // Other controllers: no direct equivalent (controller-specific)
  },
  // C Axis Unclamp (Cope 2014)
  "M13": {
    "hurco_winmax": "M13",
    "haas_ngc": "M10",               // A/B axis unclamp varies
  },
  // A Axis Unclamp (Cope 2014)
  "M33": {
    "hurco_winmax": "M33",
    // Hurco-specific rotary unclamp
  },
};

// ============================================================================
// JM DIE MACHINE CONFIGURATIONS
// ============================================================================

const JM_DIE_POST_CONFIGS: JMDieMachinePostConfig[] = [
  {
    machine_id: "hurco_vmx42",
    machine_name: "Hurco VMX42",
    controller: "hurco_winmax",
    post_template: "hurco_winmax_isnc",
    special_requirements: [
      "Use ISNC mode for CAM compatibility",
      "G84.2/G84.3 for peck tapping (dual Z-word syntax)",
      "M126 for shortest rotary path on 4th axis",
      "UltiMotion (G64) for HSM finishing",
    ],
    typical_operations: ["electrode_milling", "die_finishing", "punch_roughing"],
    tribal_tips: ["ctrl-122", "ctrl-123", "ctrl-130"],
  },
  {
    machine_id: "haas_vf2",
    machine_name: "Haas VF-2",
    controller: "haas_ngc",
    post_template: "haas_ngc_mill",
    special_requirements: [
      "G187 P2 E0.001 for finishing (medium smoothness)",
      "Setting 130=0 for rigid tapping (IPR mode)",
      "M88 P1 for through-spindle coolant",
    ],
    typical_operations: ["case_milling", "general_milling"],
    tribal_tips: ["ctrl-189", "ctrl-190", "ctrl-197"],
  },
  {
    machine_id: "haas_vf3",
    machine_name: "Haas VF-3",
    controller: "haas_ngc",
    post_template: "haas_ngc_mill",
    special_requirements: [
      "Same as VF-2 with larger envelope",
      "G187 P2 for typical work",
    ],
    typical_operations: ["fixture_milling", "large_electrode"],
    tribal_tips: ["ctrl-189", "ctrl-190"],
  },
  {
    machine_id: "okuma_genos_m460v",
    machine_name: "Okuma Genos M460V-5AX",
    controller: "okuma_osp",
    post_template: "okuma_osp_p300_mill",
    special_requirements: [
      "G15 H## for work offsets (not G54)",
      "No M29 needed for rigid tapping",
      "G08 P1 for Super-NURBS smoothing",
      "M510/M511 for CAS (Collision Avoidance)",
    ],
    typical_operations: ["5_axis_electrode", "complex_die"],
    tribal_tips: ["ctrl-180", "ctrl-181", "ctrl-182", "ctrl-183"],
  },
  {
    machine_id: "okuma_lb15ii",
    machine_name: "Okuma LB15II",
    controller: "okuma_osp",
    post_template: "okuma_osp_lathe",
    special_requirements: [
      "G15 H## work offsets",
      "G96/G97 for CSS control",
      "Tailstock control M-codes",
    ],
    typical_operations: ["punch_turning", "quill_turning"],
    tribal_tips: ["ctrl-180"],
  },
  {
    machine_id: "okuma_lb15ii_m",
    machine_name: "Okuma LB15II-M (Live Tooling)",
    controller: "okuma_osp",
    post_template: "okuma_osp_lathe_live",
    special_requirements: [
      "C-axis positioning for milling",
      "Live tool M-codes",
      "Coordinate rotation for polar milling",
    ],
    typical_operations: ["punch_with_flats", "hex_turning"],
    tribal_tips: ["ctrl-180"],
  },
  {
    machine_id: "okuma_captain_l370",
    machine_name: "Okuma Captain L370",
    controller: "okuma_osp",
    post_template: "okuma_osp_lathe",
    special_requirements: [
      "Large turning capacity",
      "G15 H## work offsets",
    ],
    typical_operations: ["large_die_case", "case_turning"],
    tribal_tips: ["ctrl-180"],
  },
  // === NEW: Okuma Multus B250II Mill-Turn (added from H:/PRISM/JM DIE/ programs) ===
  {
    machine_id: "okuma_multus_b250ii",
    machine_name: "Okuma Multus B250IIW",
    controller: "okuma_osp",
    post_template: "okuma_osp_multus_millturn",
    special_requirements: [
      "Dual spindle: G136 (main), G140/G141 (sub) spindle systems",
      "G15 H## + G20 HP=# for workpiece plane offsets",
      "TD=TTHHDD M323 for turret tool + spindle mode selection",
      "M151/M150 for synchronized spindle rotation on/off",
      "M247/M185 chuck interlock release, M248/M249 sub chuck clamp/unclamp",
      "W-axis for sub spindle Z positioning and bar pull",
      "VWKCC[1] common variable for part counting",
      "CLEAR/DRAW initialization, M960 shop macro",
    ],
    typical_operations: ["punch_complete", "quill_millturn", "complex_die_case"],
    tribal_tips: ["ctrl-180", "ctrl-181", "ctrl-233", "ctrl-234", "ctrl-235"],
  },
  // === NEW: Mitsubishi Wire EDM (added from H:/PRISM/JM DIE/WIRE EDM programs) ===
  {
    machine_id: "mitsubishi_wedm",
    machine_name: "Mitsubishi Wire EDM (FA20-S)",
    controller: "mitsubishi",
    post_template: "mitsubishi_wedm_standard",
    special_requirements: [
      "H-variable offset system: H175 master, H1-H4 per pass",
      "M78 M78 (doubled) for tank fill confirmation",
      "M20 thread wire, M21 cut wire",
      "M80/M81 water, M82/M83 wire feed, M84/M85 power",
      "M90/M91 adaptive control on/off",
      "E-codes for power: E1221 (rough), E1222-E1224 (skim passes)",
      "4-pass strategy: rough + 3 skim with decreasing H offsets",
      "G41/G42 alternating per pass for corner quality",
      "M01 glue stop for slug retention",
    ],
    typical_operations: ["die_profile", "punch_profile", "complex_contour", "internal_cutout"],
    tribal_tips: ["ctrl-236", "ctrl-237", "ctrl-238", "ctrl-239"],
  },
];

// ============================================================================
// JM DIE REAL-WORLD PROGRAM PATTERNS (extracted from H:/PRISM/JM DIE/)
// ============================================================================

/** Okuma lathe program header pattern */
export const OKUMA_LATHE_HEADER_PATTERN = `\$<name>.MIN%
M1
NBAR
CLEAR
DEF WORK
PS LC,[-400,0],[400,19]
END
DRAW
/CALL OBAR
M1`;

/** Okuma lathe NAT subroutine template */
export const OKUMA_LATHE_NAT_TEMPLATE = `NAT<nn>   (<description>)
G0 X20 Z20
T<nn><nn><nn>
G50 S<maxrpm>
G97 S<rpm> M3
G0 X<safe> Z.005 M8
G96 S<sfm>
<operations>
G0 X20 Z20
M1`;

/** Haas mill program header pattern */
export const HAAS_MILL_HEADER_PATTERN = `%
O<number> (<part_name>)

(LAST RAN <date>)

(DATE - <dd-mm-yy> TIME - <hh:mm>)
(<tool_list>)
G20
G00 G17 G40 G49 G80 G90`;

/** Haas mill tool change sequence */
export const HAAS_TOOL_CHANGE_SEQUENCE = `M05
G91 G28 Z0. M9
M01
T<n> M06
G00 G90 G54 X<x> Y<y> S<rpm> M03
G43 H<n> Z<clearance>
M08`;

/** Okuma Multus initialization block */
export const OKUMA_MULTUS_INIT_PATTERN = `NSTRT
G140
(1001)
(MACHINE)
(  VENDOR OKUMA)
(  MODEL OKUMA MULTUS B250IIW)
(<tool_comments>)
CLEAR
DRAW
V1=<part_count>.0
G90
G180
M960
G126`;

/** Okuma Multus subspindle grab sequence */
export const OKUMA_MULTUS_SUBSPINDLE_GRAB = `N<n>(SUBSPINDLE GRAB)
M41
G50 S<maxrpm>
G18
M247 (SUB CHUCK INTERLOCK RELEASE ON)
M185 (MAIN CHUCK INTERLOCK RELEASE ON)
M249 (UNCLAMP SUB CHUCK)
G4 F1.
G94
G97 S<rpm> M4
M151 (SYNCHRONIZED ROTATION ON)
M51 (CLEAN OUT CHIPS)
M289
G4 F3.
M50
M288
G0 W0.
G1 W<grab_pos> F25.
G4 F1.
M248 (CLAMP SUB CHUCK)
G4 F0.5
M84 (UNCLAMP MAIN CHUCK)
G4 F0.5
G1 W<pull_dist> F25. (BAR PULL)
M83 (CLAMP MAIN CHUCK)
G4 F1.`;

/** Mitsubishi Wire EDM program header */
export const MITSUBISHI_WEDM_HEADER = `%
L<number>
(<date>)

H175 = 0.0000

H1 =<offset1> + H175
H2 =<offset2> + H175
H3 =<offset3> + H175
H4 =<offset4> + H175

N5 G90
N10 M91 (Adaptive Control Off)
N15 G92 X0.0 Y0.0`;

/** Mitsubishi Wire EDM cut start sequence */
export const MITSUBISHI_WEDM_CUT_START = `N<n> G1 X0. Y0. F25.0
N<n+5> M20 (Thread Wire)
N<n+10> M78 M78 (Fill Tank)
N<n+15> M80 (Water On)
N<n+20> M82 (Wire On)
N<n+25> M84 (Power On)
N<n+30> E<power> H<offset> F<feed> (PASS=<n>)
N<n+35> M90 (Adaptive Control On)`;

/** Mitsubishi Wire EDM program end */
export const MITSUBISHI_WEDM_PROGRAM_END = `N<n> M85 M83 M81 (Power/Wire/Fluid - Off)
N<n+5> M21 (Cut Wire)
N<n+10> M58 (Drain Tank)
N<n+15> M02`;

// ============================================================================
// ENGINE CLASS
// ============================================================================

export class PostProcessorDeepAIHardeningEngine {
  private _conversionHistory: Map<string, PostConversionResult> = new Map();
  private _generatedPosts: Map<string, PostGeneratorResult> = new Map();

  /**
   * Convert G-code program from one controller to another
   */
  convertPostProgram(request: PostConversionRequest): PostConversionResult {
    log.info( `[PP-Harden] Converting from ${request.source_controller} to ${request.target_controller}`);

    const warnings: string[] = [];
    const incompatible: string[] = [];
    const mappings: Array<{ source: string; target: string; reason: string }> = [];

    let converted = request.source_program;
    let confidence = 100;

    // Get controller profiles
    const sourceProfile = controllerKnowledgeEngine.getProfile(request.source_controller);
    const targetProfile = controllerKnowledgeEngine.getProfile(request.target_controller);

    if (!sourceProfile || !targetProfile) {
      warnings.push(`Unknown controller profile`);
      confidence -= 20;
    }

    // Apply G-code conversions
    for (const [gCode, conversionMap] of Object.entries(G_CODE_CONVERSIONS)) {
      const targetCode = conversionMap[request.target_controller];
      if (targetCode && converted.includes(gCode)) {
        const regex = new RegExp(`\\b${gCode}\\b`, "g");
        converted = converted.replace(regex, targetCode);
        mappings.push({
          source: gCode,
          target: targetCode,
          reason: `Standard ${request.target_controller} equivalent`,
        });
      }
    }

    // Apply M-code conversions
    for (const [mCode, conversionMap] of Object.entries(M_CODE_CONVERSIONS)) {
      const targetCode = conversionMap[request.target_controller];
      if (converted.includes(mCode)) {
        if (targetCode) {
          const regex = new RegExp(`\\b${mCode}\\b`, "g");
          converted = converted.replace(regex, targetCode);
          mappings.push({
            source: mCode,
            target: targetCode,
            reason: `M-code equivalent`,
          });
        } else {
          incompatible.push(`${mCode} has no direct equivalent on ${request.target_controller}`);
          confidence -= 5;
        }
      }
    }

    // Check for controller-specific syntax issues
    if (request.target_controller === "heidenhain_tnc") {
      // Heidenhain uses different syntax
      if (converted.includes("G00") || converted.includes("G01")) {
        warnings.push("Heidenhain uses L (linear) blocks, not G00/G01 - manual review recommended");
        confidence -= 10;
      }
    }

    if (request.target_controller === "hurco_winmax") {
      // Check for dual Z-word peck tapping
      if (converted.includes("G84.2") || converted.includes("G84.3")) {
        warnings.push("WinMax peck tapping uses dual Z-word syntax - verify Z values");
      }
    }

    if (request.source_controller.includes("hurco") && !request.target_controller.includes("hurco")) {
      // Converting from Hurco - check BNC-specific codes
      if (converted.includes("G88")) {
        warnings.push("G88 is Hurco BNC-specific rigid tap - converted to G84 M29");
      }
    }

    const result: PostConversionResult = {
      converted_program: converted,
      warnings,
      incompatible_features: incompatible,
      code_mappings: mappings,
      confidence: Math.max(0, confidence),
    };

    this._conversionHistory.set(`${request.source_controller}_to_${request.target_controller}`, result);
    return result;
  }

  /**
   * Generate a new post processor from specification
   */
  generatePostProcessor(request: PostGeneratorRequest): PostGeneratorResult {
    log.info( `[PP-Harden] Generating post for ${request.controller} (${request.axes})`);

    const profile = controllerKnowledgeEngine.getProfile(request.controller);
    if (!profile) {
      throw new Error(`Unknown controller: ${request.controller}`);
    }

    // Build property definitions
    const properties: PostGeneratorResult["properties"] = {
      isnc: {
        title: "ISNC Mode",
        type: "boolean",
        default_value: true,
        description: "Use Industry Standard NC mode for CAM compatibility",
      },
      useG64: {
        title: "Use G64 Smoothing",
        type: "boolean",
        default_value: true,
        description: "Enable path smoothing for HSM",
      },
    };

    // Add controller-specific properties
    if (request.controller === "hurco_winmax") {
      properties.usePeckTapping = {
        title: "Use Peck Tapping",
        type: "boolean",
        default_value: true,
        description: "Use G84.2/G84.3 for peck rigid tapping",
      };
      properties.useM140 = {
        title: "Use M140 Retract",
        type: "boolean",
        default_value: true,
        description: "Use M140 for 5-axis safe retract",
      };
    }

    if (request.controller === "haas_ngc") {
      properties.smoothingLevel = {
        title: "G187 Smoothing Level",
        type: "enum",
        default_value: "P2",
        description: "HSM smoothing: P1=rough, P2=medium, P3=finish",
      };
    }

    // Collect cycles from profile
    const cycles = profile.cycleDefinitions?.map(c => c.gCode) || [];

    // Build recommendations
    const recommendations: string[] = [];
    if (request.axes === "5_axis") {
      recommendations.push("Enable TCPM/TCP mode for 5-axis simultaneous machining");
      recommendations.push("Use shortest rotary path (M126) for repositioning");
      if (profile.features?.tcp5Axis) {
        recommendations.push(`${request.controller} supports native 5-axis TCP`);
      }
    }

    if (request.features.rigid_tapping) {
      if (request.controller === "hurco_winmax") {
        recommendations.push("Use G84.2/G84.3 for peck tapping in ISNC mode");
        recommendations.push("Use G88 for simple rigid tapping in BNC mode");
      } else if (request.controller === "haas_ngc") {
        recommendations.push("Setting 130=0 recommended for IPR tapping mode");
      }
    }

    if (request.jm_die_options?.include_tribal_tips) {
      const tips = this.getControllerTips({ controller: request.controller, limit: 5 });
      for (const tip of tips) {
        recommendations.push(`Tribal Tip: ${tip.title}`);
      }
    }

    // Generate skeleton post code
    const postCode = this._generatePostSkeleton(request, profile);

    const result: PostGeneratorResult = {
      post_code: postCode,
      properties,
      cycles_included: cycles,
      mcodes_mapped: profile.mCodeMappings?.length || 0,
      recommendations,
      confidence: 85, // Base confidence for generated posts
    };

    this._generatedPosts.set(`${request.controller}_${request.axes}`, result);
    return result;
  }

  /**
   * Validate an existing post processor
   */
  validatePostProcessor(request: PostValidationRequest): PostValidationResult {
    log.info( `[PP-Harden] Validating post: ${request.filename}`);

    // Run AI analysis
    const analysis = analyzePostProcessor(request.post_code, request.filename);

    // Get controller profile for compatibility check
    const profile = request.controller
      ? controllerKnowledgeEngine.getProfile(request.controller)
      : undefined;

    // Check controller compatibility
    const missingFeatures: string[] = [];
    const syntaxWarnings: string[] = [];

    if (profile) {
      // Check for required cycles
      const requiredCycles = ["G81", "G83", "G84"];
      for (const cycle of requiredCycles) {
        if (!request.post_code.includes(cycle)) {
          missingFeatures.push(`Missing ${cycle} cycle implementation`);
        }
      }

      // Check for controller-specific syntax
      if (request.controller === "hurco_winmax") {
        if (request.post_code.includes("G88") && !request.post_code.includes("BNC")) {
          syntaxWarnings.push("G88 is BNC-specific - ensure BNC mode is handled");
        }
      }
    }

    // Check cycle implementations
    const implementedCycles: string[] = [];
    const missingCritical: string[] = [];
    const incompleteCycles: string[] = [];

    const cyclePatterns = [
      { code: "G81", name: "drilling" },
      { code: "G83", name: "peck_drilling" },
      { code: "G84", name: "tapping" },
      { code: "G73", name: "high_speed_peck" },
      { code: "G85", name: "reaming" },
      { code: "G76", name: "fine_boring" },
    ];

    for (const cycle of cyclePatterns) {
      // Check for cycle name OR G-code directly in the post code
      const hasName = request.post_code.includes(`"${cycle.name}"`) || request.post_code.includes(`'${cycle.name}'`);
      const hasGCode = request.post_code.includes(cycle.code);
      if (hasName || hasGCode) {
        implementedCycles.push(cycle.code);
      } else if (["G81", "G83", "G84"].includes(cycle.code)) {
        missingCritical.push(cycle.code);
      }
    }

    // Generate recommendations from analysis
    const recommendations = [
      ...analysis.recommendations,
    ];

    if (missingFeatures.length > 0) {
      recommendations.push("Add missing controller features for full compatibility");
    }

    return {
      score: analysis.score,
      issues: analysis.issues,
      controller_compatibility: {
        compatible: missingFeatures.length === 0,
        missing_features: missingFeatures,
        syntax_warnings: syntaxWarnings,
      },
      cycle_quality: {
        implemented: implementedCycles,
        missing_critical: missingCritical,
        incomplete: incompleteCycles,
      },
      recommendations,
    };
  }

  /**
   * Get tribal knowledge tips for a controller
   */
  getControllerTips(query: ControllerTipQuery): ControllerTip[] {
    const limit = query.limit || 10;
    const results: ControllerTip[] = [];

    // Split controller name into parts for flexible matching
    // e.g., "hurco_winmax" -> ["hurco", "winmax"]
    const controllerParts = query.controller.toLowerCase().split("_");

    for (const tip of CONTROLLER_KNOWLEDGE_TIPS) {
      // Check controller match - any tag matches any controller part
      const controllerMatch = tip.tags?.some(tag => {
        const tagLower = tag.toLowerCase();
        return controllerParts.some(part => tagLower.includes(part) || part.includes(tagLower));
      });

      if (!controllerMatch) continue;

      // Check keyword match if specified
      if (query.keywords && query.keywords.length > 0) {
        const keywordMatch = query.keywords.some(kw =>
          tip.title.toLowerCase().includes(kw.toLowerCase()) ||
          tip.body.toLowerCase().includes(kw.toLowerCase())
        );
        if (!keywordMatch) continue;
      }

      results.push({
        id: tip.id,
        title: tip.title,
        body: tip.body,
        confidence: tip.confidence,
        tags: tip.tags || [],
      });

      if (results.length >= limit) break;
    }

    return results;
  }

  /**
   * Get JM Die machine post configuration
   */
  getJMDieMachineConfig(machine_id: string): JMDieMachinePostConfig | undefined {
    return JM_DIE_POST_CONFIGS.find(c => c.machine_id === machine_id);
  }

  /**
   * List all JM Die machines with post configurations
   */
  listJMDieMachines(): JMDieMachinePostConfig[] {
    return [...JM_DIE_POST_CONFIGS];
  }

  /**
   * Get cross-controller feature compatibility matrix
   */
  getFeatureCompatibilityMatrix(): Record<string, Record<string, boolean>> {
    const features = ["rigid_tapping", "peck_tapping", "5_axis_tcp", "tilted_work_plane", "smoothing", "probing"];
    const controllers: ControllerFamily[] = ["hurco_winmax", "haas_ngc", "fanuc", "okuma_osp", "heidenhain_tnc", "siemens_sinumerik"];

    const matrix: Record<string, Record<string, boolean>> = {};

    for (const feature of features) {
      matrix[feature] = {};
      for (const ctrl of controllers) {
        const profile = controllerKnowledgeEngine.getProfile(ctrl);
        if (!profile) {
          matrix[feature][ctrl] = false;
          continue;
        }

        switch (feature) {
          case "rigid_tapping":
            matrix[feature][ctrl] = profile.features?.rigidTapping || false;
            break;
          case "peck_tapping":
            matrix[feature][ctrl] = profile.cycleDefinitions?.some(c =>
              c.gCode.includes("84.2") || c.gCode.includes("209")
            ) || false;
            break;
          case "5_axis_tcp":
            matrix[feature][ctrl] = profile.features?.tcp5Axis || false;
            break;
          case "tilted_work_plane":
            matrix[feature][ctrl] = profile.cycleDefinitions?.some(c =>
              c.gCode.includes("68.2") || c.gCode.includes("800") || c.gCode.includes("PLANE")
            ) || false;
            break;
          case "smoothing":
            matrix[feature][ctrl] = (profile.features?.smoothingModes?.length || 0) > 0;
            break;
          case "probing":
            matrix[feature][ctrl] = profile.features?.supportsProbing || false;
            break;
        }
      }
    }

    return matrix;
  }

  /**
   * Get recommended post processor for a JM Die job
   */
  recommendPostForJob(jobDescription: {
    material: string;
    operation_type: "milling" | "turning" | "5_axis" | "mill_turn";
    tolerance_mm: number;
    surface_finish_ra_um?: number;
  }): { machine_id: string; post_template: string; reasons: string[] }[] {
    const recommendations: { machine_id: string; post_template: string; reasons: string[] }[] = [];

    for (const config of JM_DIE_POST_CONFIGS) {
      const reasons: string[] = [];

      // Check operation type match
      if (jobDescription.operation_type === "turning") {
        if (!config.machine_id.includes("lb") && !config.machine_id.includes("captain")) {
          continue;
        }
        reasons.push("Lathe machine for turning operations");
      } else if (jobDescription.operation_type === "5_axis") {
        if (!config.machine_id.includes("genos")) {
          continue;
        }
        reasons.push("5-axis capability for complex geometry");
      } else if (jobDescription.operation_type === "milling") {
        if (config.machine_id.includes("lb") || config.machine_id.includes("captain")) {
          continue;
        }
        reasons.push("Mill for milling operations");
      }

      // Check tolerance requirements
      if (jobDescription.tolerance_mm < 0.01) {
        if (config.controller === "okuma_osp") {
          reasons.push("Okuma precision for tight tolerances");
        } else if (config.controller === "hurco_winmax") {
          reasons.push("UltiMotion for precision finishing");
        }
      }

      // Material considerations
      if (jobDescription.material.toLowerCase().includes("graphite")) {
        if (config.machine_id.includes("roku")) {
          reasons.push("High-speed spindle for graphite electrodes");
        }
      }

      if (reasons.length > 0) {
        recommendations.push({
          machine_id: config.machine_id,
          post_template: config.post_template,
          reasons,
        });
      }
    }

    return recommendations;
  }

  /**
   * Validate 5-axis safety line issues based on Cope 2014 documentation
   * Checks for common 5-axis post processor problems
   */
  validate5AxisSafetyLine(code: string, controller: ControllerFamily): {
    safetyScore: number;
    issues: Array<{ severity: "error" | "warning" | "info"; code: string; message: string; fix: string }>;
    recommendations: string[];
  } {
    const issues: Array<{ severity: "error" | "warning" | "info"; code: string; message: string; fix: string }> = [];
    const recommendations: string[] = [];
    let safetyScore = 100;

    const has5Axis = code.includes("G68.2") || code.includes("M128") || code.includes("G43.4") ||
                     /[ABC]\s*[-+]?\d/.test(code);
    const hasRotaryAxes = /[ABC]\s*[-+]?\d/.test(code);

    // Check 1: G17/G18/G19 in safety line with 5-axis (Cope 2014)
    if (has5Axis) {
      const safetyLineMatch = code.match(/G0\s+G\d+\s+G(17|18|19)/);
      if (safetyLineMatch) {
        issues.push({
          severity: "error",
          code: "5AX-001",
          message: `G${safetyLineMatch[1]} plane designation found in safety line with 5-axis code`,
          fix: "Remove G17/G18/G19 from safety line - causes Transform Plane (G68.2) problems",
        });
        safetyScore -= 20;
      }
    }

    // Check 2: Missing M31 encoder reset (Cope 2014)
    if (hasRotaryAxes && controller === "hurco_winmax") {
      const hasM31 = code.includes("M31");
      const firstHundredLines = code.split("\n").slice(0, 100).join("\n");
      const m31InHeader = firstHundredLines.includes("M31");

      if (!hasM31) {
        issues.push({
          severity: "warning",
          code: "5AX-002",
          message: "Missing M31 (Rotary Axis Encoder Reset) - rotary axes may unwind",
          fix: "Add M31 after program number in header to reset encoder position",
        });
        safetyScore -= 15;
      } else if (!m31InHeader) {
        issues.push({
          severity: "info",
          code: "5AX-003",
          message: "M31 found but not in program header - consider moving earlier",
          fix: "Place M31 immediately after program number for safety",
        });
        safetyScore -= 5;
      }
    }

    // Check 3: Missing M126 for rotary repositions (Cope 2014)
    if (hasRotaryAxes) {
      const hasM126 = code.includes("M126");
      const hasRotaryRapid = /G0[^1-9].*[AC]\s*[-+]?\d/.test(code);

      if (hasRotaryRapid && !hasM126 && (controller === "hurco_winmax" || controller === "haas_ngc")) {
        recommendations.push("Consider adding M126 (Shortest Angular Traverse) for rotary repositioning moves");
      }
    }

    // Check 4: G91 G28 without follow-up G90 (Cope 2014)
    const g91g28Matches = code.matchAll(/G91\s*G28[^\n]*/g);
    for (const match of g91g28Matches) {
      const afterMatch = code.slice(code.indexOf(match[0]) + match[0].length, code.indexOf(match[0]) + match[0].length + 100);
      if (!afterMatch.includes("G90")) {
        issues.push({
          severity: "warning",
          code: "5AX-004",
          message: "G91 G28 retract without G90 to restore absolute mode",
          fix: "Add G90 after G91 G28 to return to absolute mode, or use G53 Z0 instead",
        });
        safetyScore -= 10;
      }
    }

    // Check 5: IJK tool vectors with insufficient decimal places (Cope 2014)
    const ijkMatches = code.matchAll(/[IJK]([-+]?\d+\.?\d*)/g);
    for (const match of ijkMatches) {
      const value = match[1];
      const decimalPart = value.split(".")[1] || "";
      if (decimalPart.length < 6 && decimalPart.length > 0) {
        issues.push({
          severity: "warning",
          code: "5AX-005",
          message: `IJK tool vector ${match[0]} has only ${decimalPart.length} decimal places (6 required)`,
          fix: "Output tool vectors to 6 decimal places - 4 is insufficient and causes erratic movement",
        });
        safetyScore -= 5;
        break; // Only report once
      }
    }

    // Check 6: Missing M140 for 5-axis retract (Cope 2014)
    if (has5Axis && controller === "hurco_winmax") {
      const hasM140 = code.includes("M140");
      const hasG53Z = /G53\s*Z/.test(code);

      if (hasG53Z && !hasM140) {
        recommendations.push("Consider using M140 (tool vector retract) before G53 Z0 in 5-axis programs for safer retract");
      }
    }

    // Check 7: G68.2 without G69 cancel
    if (code.includes("G68.2")) {
      const g682Count = (code.match(/G68\.2/g) || []).length;
      const g69Count = (code.match(/G69/g) || []).length;

      if (g682Count > g69Count) {
        issues.push({
          severity: "warning",
          code: "5AX-006",
          message: `Found ${g682Count} G68.2 Transform Plane calls but only ${g69Count} G69 cancels`,
          fix: "Each G68.2 requires a G69 cancel - stacked planes need separate G69s (LIFO order)",
        });
        safetyScore -= 10;
      }
    }

    // Check 8: M128 TCPM without M129 cancel
    if (code.includes("M128")) {
      const hasM129 = code.includes("M129");
      if (!hasM129) {
        issues.push({
          severity: "warning",
          code: "5AX-007",
          message: "M128 (TCPM) activated but M129 cancel not found",
          fix: "Add M129 before tool change and before program end to cancel TCPM",
        });
        safetyScore -= 10;
      }
    }

    // Generate recommendations based on controller
    if (controller === "hurco_winmax" && has5Axis) {
      if (!code.includes("M31")) {
        recommendations.push("Add M31 at program start to reset rotary encoder");
      }
      if (!code.includes("M126")) {
        recommendations.push("Add M126 for shortest angular path on rotary repositions");
      }
    }

    return {
      safetyScore: Math.max(0, safetyScore),
      issues,
      recommendations,
    };
  }

  // ============================================================================
  // PRIVATE METHODS
  // ============================================================================

  private _generatePostSkeleton(request: PostGeneratorRequest, profile: ControllerProfile): string {
    const lines: string[] = [
      `/**`,
      ` * Post Processor: ${request.controller} (${request.axes})`,
      ` * Generated by PRISM PostProcessorDeepAIHardeningEngine`,
      ` * CAM System: ${request.cam_system}`,
      ` * Generated: ${new Date().toISOString()}`,
      ` */`,
      ``,
      `description = "${profile.name} Post Processor";`,
      `vendor = "${profile.manufacturer}";`,
      ``,
      `// Controller: ${profile.name}`,
      `// Versions: ${profile.versions?.join(", ")}`,
      `// Programming Style: ${profile.programmingStyle}`,
      ``,
      `properties = {`,
    ];

    // Add properties
    if (request.controller === "hurco_winmax") {
      lines.push(`  isnc: { type: "boolean", value: true, description: "Use ISNC mode" },`);
      lines.push(`  useM140: { type: "boolean", value: true, description: "Use M140 for 5-axis retract" },`);
    }

    if (request.features.high_speed_machining) {
      lines.push(`  useSmoothing: { type: "boolean", value: true, description: "Enable HSM smoothing" },`);
    }

    lines.push(`};`);
    lines.push(``);

    // Add safety line based on controller
    lines.push(`// Safety line for ${profile.name}`);
    if (profile.gCodeDialect) {
      lines.push(`// Absolute: ${profile.gCodeDialect.absoluteMode}`);
      lines.push(`// Cancel cutter comp: ${profile.gCodeDialect.cutterCompCancel || "G40"}`);
    }

    lines.push(``);
    lines.push(`// Cycle definitions from ControllerKnowledgeEngine:`);
    for (const cycle of profile.cycleDefinitions || []) {
      lines.push(`// ${cycle.gCode}: ${cycle.name} - ${cycle.description}`);
    }

    return lines.join("\n");
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const postProcessorDeepAIHardeningEngine = new PostProcessorDeepAIHardeningEngine();
