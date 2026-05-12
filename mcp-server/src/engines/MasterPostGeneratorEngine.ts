/**
 * MasterPostGeneratorEngine.ts
 *
 * PRISM Master Post Processor Generator — Complete Post Processor Code Generation
 *
 * This engine generates fully functional post processor code for any supported CNC controller.
 * It synthesizes knowledge from ControllerKnowledgeEngine, tribal tips, and mathematical
 * algorithms to produce production-ready post processors.
 *
 * Supported Controller Families:
 * - Hurco WinMax (BNC/ISNC modes, UltiMotion, G84.2/G84.3 peck tapping)
 * - Haas NGC (G187 smoothing, G234 TCPC, Setting 130 tapping)
 * - Fanuc 0i/31i (AICC, Nano Smoothing, G43.4/G43.5 TCP, G68.2)
 * - Okuma OSP (Super-NURBS G08, CAS M510/M511, G15 H## offsets)
 * - Heidenhain TNC (CYCL DEF, PLANE SPATIAL, Klartext, M128/M129 TCPM)
 * - Siemens 840D (CYCLE definitions, TRAORI, CYCLE800, CYCLE832)
 * - Mazak/Mazatrol (EIA mode, G12.1 polar, Integrex mill-turn)
 * - Brother C00/Speedio (G77/G78 tapping, M494/M495 TSC, 0.9s tool change)
 *
 * Machine Configurations:
 * - 3-axis VMC
 * - 4-axis (rotary table or trunnion)
 * - 5-axis (table-table, head-head, table-head)
 * - Mill-turn (with C-axis and live tooling)
 * - Swiss-type (sliding headstock)
 *
 * Mathematical Algorithms:
 * - SFM to RPM: RPM = (SFM * 12) / (PI * diameter_in) or (SMM * 1000) / (PI * diameter_mm)
 * - Feed rate: F = RPM * fpt * flutes (IPM) or F = pitch * RPM (tapping)
 * - Peck depth: First peck = diameter, subsequent = 0.5 * diameter (general rule)
 * - Retract distance: 0.1" or 2mm above R-plane for rapid re-engage
 *
 * @module engines/MasterPostGeneratorEngine
 * @version 1.0.0
 */

import { log } from "../utils/Logger.js";
import {
  controllerKnowledgeEngine,
  type ControllerFamily,
  type ControllerProfile,
  type CycleDefinition,
  type MCodeMapping,
  type CycleParameter,
} from "./ControllerKnowledgeEngine.js";
import { CONTROLLER_KNOWLEDGE_TIPS } from "../data/controller-knowledge-tips.js";

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * Machine configuration type
 */
export type MachineConfiguration =
  | "3_axis_vmc"
  | "4_axis_rotary_table"
  | "4_axis_trunnion"
  | "5_axis_table_table"
  | "5_axis_head_head"
  | "5_axis_table_head"
  | "mill_turn"
  | "swiss_type";

/**
 * CAM system origin for post processor
 */
export type CAMSystem =
  | "mastercam"
  | "fusion360"
  | "hypermill"
  | "solidcam"
  | "nx"
  | "esprit"
  | "edgecam"
  | "gibbscam"
  | "powermill"
  | "camworks"
  | "other";

/**
 * Post processor configuration request
 */
export interface PostGeneratorConfig {
  /** Target CNC controller family */
  controller: ControllerFamily;
  /** Machine model name */
  machine_model?: string;
  /** Machine configuration type */
  machine_config: MachineConfiguration;
  /** CAM system that will use this post */
  cam_system: CAMSystem;
  /** Unit system */
  units: "inch" | "metric";
  /** Enabled features */
  features: PostFeatures;
  /** Output format options */
  output_options: PostOutputOptions;
  /** JM Die specific options */
  jm_die_options?: JMDiePostOptions;
}

/**
 * Post processor features to enable
 */
export interface PostFeatures {
  /** Enable rigid tapping support */
  rigid_tapping: boolean;
  /** Enable peck tapping for deep threads */
  peck_tapping: boolean;
  /** Enable high-speed machining smoothing */
  high_speed_machining: boolean;
  /** Enable cutter radius compensation */
  cutter_compensation: boolean;
  /** Enable probing cycles */
  probing: boolean;
  /** Enable tool breakage detection */
  tool_breakage_detection: boolean;
  /** Enable chip conveyor control */
  chip_conveyor: boolean;
  /** Enable through-spindle coolant */
  coolant_through_spindle: boolean;
  /** Enable rotary axis clamps */
  rotary_clamps: boolean;
  /** Enable tilted work plane (3+2) */
  tilted_work_plane: boolean;
  /** Enable 5-axis TCP/TCPM */
  tcp_5axis: boolean;
}

/**
 * Post processor output format options
 */
export interface PostOutputOptions {
  /** Include line numbers */
  line_numbers: boolean;
  /** Line number increment */
  line_number_increment: number;
  /** Max digits for coordinates */
  coordinate_precision: number;
  /** Feed rate precision */
  feed_precision: number;
  /** Include block delete characters */
  block_delete: boolean;
  /** Include optional stop */
  optional_stop: boolean;
  /** File extension */
  file_extension: string;
  /** Program number prefix */
  program_number_prefix: string;
  /** Include verbose comments */
  verbose_comments: boolean;
}

/**
 * JM Die Company specific post options
 */
export interface JMDiePostOptions {
  /** Use JM Die tooling strategies */
  use_jm_die_tooling: boolean;
  /** Customer-specific header text */
  customer_header?: string;
  /** Include tribal knowledge tips in comments */
  include_tribal_tips: boolean;
  /** Job number variable */
  job_number_variable?: string;
}

/**
 * Generated post processor code and metadata
 */
export interface PostProcessorCode {
  /** Post processor file content */
  code: string;
  /** Post processor properties/configuration */
  properties: PostProperty[];
  /** Included cycle definitions */
  cycles: CycleDefinition[];
  /** M-code mappings used */
  m_codes: MCodeMapping[];
  /** Safety line for this controller */
  safety_line: string;
  /** Encoder reset line (for rotary machines) */
  encoder_reset?: string;
  /** Tribal knowledge tips embedded */
  tribal_tips: TribalTip[];
  /** Generation metadata */
  metadata: PostMetadata;
}

/**
 * Post processor property definition
 */
export interface PostProperty {
  /** Property name */
  name: string;
  /** Display title */
  title: string;
  /** Property type */
  type: "boolean" | "integer" | "number" | "enum" | "string";
  /** Default value */
  default_value: unknown;
  /** Allowed values for enum type */
  enum_values?: string[];
  /** Property description */
  description: string;
  /** Property group */
  group?: string;
}

/**
 * Tribal knowledge tip for embedding
 */
export interface TribalTip {
  /** Tip ID */
  id: string;
  /** Tip title */
  title: string;
  /** Tip body */
  body: string;
  /** Relevance to this post */
  relevance: "critical" | "high" | "medium" | "low";
}

/**
 * Post generation metadata
 */
export interface PostMetadata {
  /** Generator version */
  generator_version: string;
  /** Generation timestamp */
  generated_at: string;
  /** Controller family */
  controller: ControllerFamily;
  /** Machine configuration */
  machine_config: MachineConfiguration;
  /** CAM system target */
  cam_system: CAMSystem;
  /** Total lines of code */
  lines_of_code: number;
  /** Total cycles implemented */
  cycles_count: number;
  /** Total M-codes mapped */
  mcodes_count: number;
}

// ============================================================================
// MATHEMATICAL CONSTANTS & FORMULAS
// ============================================================================

/**
 * Mathematical constants for machining calculations
 * Reference: Machinery's Handbook, 30th Edition
 */
const MACHINING_CONSTANTS = {
  /** Pi constant for circumference calculations */
  PI: Math.PI,
  /** Inches per foot for SFM calculations */
  INCHES_PER_FOOT: 12,
  /** Millimeters per meter for SMM calculations */
  MM_PER_METER: 1000,
  /** Default safety distance (mm) */
  DEFAULT_SAFETY_DISTANCE_MM: 2.0,
  /** Default safety distance (inch) */
  DEFAULT_SAFETY_DISTANCE_INCH: 0.1,
  /** Default peck reduction factor per pass */
  PECK_REDUCTION_FACTOR: 0.8,
  /** Minimum peck depth factor (relative to diameter) */
  MIN_PECK_DEPTH_FACTOR: 0.25,
  /** Maximum peck depth factor for first peck */
  MAX_FIRST_PECK_FACTOR: 1.0,
  /** Retract distance for chip-break peck (mm) */
  CHIP_BREAK_RETRACT_MM: 1.0,
};

/**
 * Calculate spindle speed from surface speed
 * @param surfaceSpeed - Surface feet per minute (SFM) or meters per minute (SMM)
 * @param diameter - Tool or workpiece diameter
 * @param isMetric - True if using metric units
 * @returns Spindle RPM
 */
export function calculateRPM(
  surfaceSpeed: number,
  diameter: number,
  isMetric: boolean
): number {
  if (diameter <= 0) return 0;

  if (isMetric) {
    // SMM to RPM: RPM = (SMM * 1000) / (PI * diameter_mm)
    return (surfaceSpeed * MACHINING_CONSTANTS.MM_PER_METER) / (MACHINING_CONSTANTS.PI * diameter);
  } else {
    // SFM to RPM: RPM = (SFM * 12) / (PI * diameter_inch)
    return (surfaceSpeed * MACHINING_CONSTANTS.INCHES_PER_FOOT) / (MACHINING_CONSTANTS.PI * diameter);
  }
}

/**
 * Calculate feed rate from chip load
 * @param rpm - Spindle speed in RPM
 * @param chipLoad - Chip load per tooth (IPT or mm/tooth)
 * @param flutes - Number of cutting flutes
 * @returns Feed rate in IPM or mm/min
 */
export function calculateFeedRate(
  rpm: number,
  chipLoad: number,
  flutes: number
): number {
  return rpm * chipLoad * flutes;
}

/**
 * Calculate tapping feed rate from pitch
 * @param rpm - Spindle speed in RPM
 * @param pitch - Thread pitch (TPI for inch, mm/rev for metric)
 * @param isMetric - True if using metric units
 * @returns Feed rate for rigid tapping
 */
export function calculateTappingFeed(
  rpm: number,
  pitch: number,
  isMetric: boolean
): number {
  if (isMetric) {
    // Metric: F = RPM * pitch (mm/rev)
    return rpm * pitch;
  } else {
    // Inch: F = RPM / TPI (IPR mode) or F = RPM * (1/TPI) for IPM
    return rpm / pitch;
  }
}

/**
 * Calculate recommended peck depths for deep hole drilling
 * @param holeDiameter - Drill diameter
 * @param holeDepth - Total hole depth
 * @param isMetric - True if using metric units
 * @returns Array of cumulative peck depths
 */
export function calculatePeckDepths(
  holeDiameter: number,
  holeDepth: number,
  isMetric: boolean
): number[] {
  const depths: number[] = [];
  let currentDepth = 0;

  // First peck: 1x diameter (or limited by hole depth)
  let peckIncrement = holeDiameter * MACHINING_CONSTANTS.MAX_FIRST_PECK_FACTOR;
  const minPeck = holeDiameter * MACHINING_CONSTANTS.MIN_PECK_DEPTH_FACTOR;

  while (currentDepth < holeDepth) {
    currentDepth += peckIncrement;
    if (currentDepth > holeDepth) {
      currentDepth = holeDepth;
    }
    depths.push(currentDepth);

    // Reduce subsequent pecks
    peckIncrement *= MACHINING_CONSTANTS.PECK_REDUCTION_FACTOR;
    if (peckIncrement < minPeck) {
      peckIncrement = minPeck;
    }
  }

  return depths;
}

/**
 * Calculate retract distance based on operation type
 * @param operationType - Type of hole operation
 * @param isMetric - True if using metric units
 * @returns Recommended retract distance
 */
export function calculateRetractDistance(
  operationType: "drilling" | "peck_drilling" | "tapping" | "boring" | "reaming",
  isMetric: boolean
): number {
  const baseDistance = isMetric
    ? MACHINING_CONSTANTS.DEFAULT_SAFETY_DISTANCE_MM
    : MACHINING_CONSTANTS.DEFAULT_SAFETY_DISTANCE_INCH;

  switch (operationType) {
    case "drilling":
    case "peck_drilling":
      return baseDistance;
    case "tapping":
      return baseDistance * 1.5; // Extra clearance for tap
    case "boring":
      return baseDistance * 0.5; // Reduced for finish
    case "reaming":
      return baseDistance * 0.75;
    default:
      return baseDistance;
  }
}

// ============================================================================
// CONTROLLER-SPECIFIC SAFETY LINES
// ============================================================================

/**
 * Safety line configurations per controller
 * These ensure the machine is in a known state at program start
 */
const SAFETY_LINES: Record<ControllerFamily, Record<MachineConfiguration, string[]>> = {
  hurco_winmax: {
    "3_axis_vmc": [
      "G00 G17 G40 G49 G80 G90",
      "G20 (Inch mode) | G21 (Metric mode)",
      "M05 M09",
    ],
    "4_axis_rotary_table": [
      "G00 G17 G40 G49 G80 G90",
      "G20 (Inch mode) | G21 (Metric mode)",
      "M13 (Unclamp C-axis)",
      "M31 (Encoder reset)",
      "M12 (Clamp C-axis)",
      "M05 M09",
    ],
    "4_axis_trunnion": [
      "G00 G17 G40 G49 G80 G90",
      "M33 (Unclamp A-axis)",
      "M31 (Encoder reset)",
      "M32 (Clamp A-axis)",
      "M05 M09",
    ],
    "5_axis_table_table": [
      "G00 G17 G40 G49 G80 G90",
      "M129 (Cancel TCPM)",
      "M33 (Unclamp A)",
      "M13 (Unclamp C)",
      "M31 (Encoder reset)",
      "G90 A0 C0",
      "M32 (Clamp A)",
      "M12 (Clamp C)",
      "M05 M09",
    ],
    "5_axis_head_head": [
      "G00 G17 G40 G49 G80 G90",
      "M129 (Cancel TCPM)",
      "M35 (Unclamp B)",
      "M33 (Unclamp A)",
      "M31 (Encoder reset)",
      "M05 M09",
    ],
    "5_axis_table_head": [
      "G00 G17 G40 G49 G80 G90",
      "M129 (Cancel TCPM)",
      "M35 (Unclamp B)",
      "M31 (Encoder reset)",
      "M05 M09",
    ],
    "mill_turn": [
      "G00 G40 G80 G90",
      "M05 M09",
    ],
    "swiss_type": [
      "G00 G40 G80 G90",
      "M05 M09",
    ],
  },
  haas_ngc: {
    "3_axis_vmc": [
      "G00 G17 G40 G49 G80 G90 G98",
      "G20 (Inch) | G21 (Metric)",
      "M05 M09",
    ],
    "4_axis_rotary_table": [
      "G00 G17 G40 G49 G80 G90 G98",
      "M11 (Unclamp 4th axis)",
      "G00 A0.",
      "M10 (Clamp 4th axis)",
      "M05 M09",
    ],
    "4_axis_trunnion": [
      "G00 G17 G40 G49 G80 G90 G98",
      "M11 (Unclamp A-axis)",
      "G00 A0.",
      "M10 (Clamp A-axis)",
      "M05 M09",
    ],
    "5_axis_table_table": [
      "G00 G17 G40 G49 G80 G90 G98",
      "G255 (Cancel DWO)",
      "M11 (Unclamp A)",
      "M13 (Unclamp B)",
      "G00 A0. B0.",
      "M10 (Clamp A)",
      "M12 (Clamp B)",
      "M05 M09",
    ],
    "5_axis_head_head": [
      "G00 G17 G40 G49 G80 G90 G98",
      "G255 (Cancel DWO)",
      "M05 M09",
    ],
    "5_axis_table_head": [
      "G00 G17 G40 G49 G80 G90 G98",
      "G255 (Cancel DWO)",
      "M11 (Unclamp A)",
      "G00 A0.",
      "M10 (Clamp A)",
      "M05 M09",
    ],
    "mill_turn": [
      "G00 G40 G80 G90 G98",
      "M05 M09",
    ],
    "swiss_type": [
      "G00 G40 G80 G90",
      "M05 M09",
    ],
  },
  fanuc: {
    "3_axis_vmc": [
      "G00 G17 G40 G49 G80 G90 G98",
      "G21 (Metric) | G20 (Inch)",
      "M05 M09",
    ],
    "4_axis_rotary_table": [
      "G00 G17 G40 G49 G80 G90 G98",
      "G00 A0.",
      "M05 M09",
    ],
    "4_axis_trunnion": [
      "G00 G17 G40 G49 G80 G90 G98",
      "G00 A0.",
      "M05 M09",
    ],
    "5_axis_table_table": [
      "G00 G17 G40 G49 G80 G90 G98",
      "G69 (Cancel coordinate rotation)",
      "G00 A0. C0.",
      "M05 M09",
    ],
    "5_axis_head_head": [
      "G00 G17 G40 G49 G80 G90 G98",
      "G69",
      "M05 M09",
    ],
    "5_axis_table_head": [
      "G00 G17 G40 G49 G80 G90 G98",
      "G69",
      "G00 A0.",
      "M05 M09",
    ],
    "mill_turn": [
      "G00 G40 G80 G90",
      "M05 M09",
    ],
    "swiss_type": [
      "G00 G40 G80 G90",
      "M05 M09",
    ],
  },
  okuma_osp: {
    "3_axis_vmc": [
      "G00 G17 G40 G49 G80 G90",
      "G15 H1 (Work offset 1)",
      "G08 P-1 (Cancel High-Cut mode)",
      "M05 M09",
    ],
    "4_axis_rotary_table": [
      "G00 G17 G40 G49 G80 G90",
      "G15 H1",
      "G08 P-1",
      "M11 (Unclamp)",
      "G00 A0.",
      "M10 (Clamp)",
      "M05 M09",
    ],
    "4_axis_trunnion": [
      "G00 G17 G40 G49 G80 G90",
      "G15 H1",
      "G08 P-1",
      "G00 A0.",
      "M05 M09",
    ],
    "5_axis_table_table": [
      "G00 G17 G40 G49 G80 G90",
      "G15 H1",
      "G08 P-1",
      "M511 (CAS ON)",
      "M27 (Unclamp B)",
      "M11 (Unclamp A)",
      "G00 A0. C0.",
      "M10 (Clamp A)",
      "M26 (Clamp B)",
      "M05 M09",
    ],
    "5_axis_head_head": [
      "G00 G17 G40 G49 G80 G90",
      "G15 H1",
      "G08 P-1",
      "M05 M09",
    ],
    "5_axis_table_head": [
      "G00 G17 G40 G49 G80 G90",
      "G15 H1",
      "G08 P-1",
      "G00 A0.",
      "M05 M09",
    ],
    "mill_turn": [
      "G00 G40 G80 G90",
      "G15 H1",
      "M05 M09",
    ],
    "swiss_type": [
      "G00 G40 G80 G90",
      "M05 M09",
    ],
  },
  heidenhain_tnc: {
    "3_axis_vmc": [
      "BEGIN PGM % MM",
      "TOOL CALL 0 Z",
      "L Z+200 R0 FMAX M05 M09",
    ],
    "4_axis_rotary_table": [
      "BEGIN PGM % MM",
      "TOOL CALL 0 Z",
      "M129 (Cancel TCPM)",
      "L Z+200 A+0 R0 FMAX M05 M09",
    ],
    "4_axis_trunnion": [
      "BEGIN PGM % MM",
      "TOOL CALL 0 Z",
      "M129",
      "L Z+200 A+0 R0 FMAX M05 M09",
    ],
    "5_axis_table_table": [
      "BEGIN PGM % MM",
      "TOOL CALL 0 Z",
      "M129 (Cancel TCPM)",
      "PLANE RESET STAY",
      "L Z+200 A+0 C+0 R0 FMAX M05 M09",
    ],
    "5_axis_head_head": [
      "BEGIN PGM % MM",
      "TOOL CALL 0 Z",
      "M129",
      "PLANE RESET STAY",
      "L Z+200 R0 FMAX M05 M09",
    ],
    "5_axis_table_head": [
      "BEGIN PGM % MM",
      "TOOL CALL 0 Z",
      "M129",
      "PLANE RESET STAY",
      "L Z+200 A+0 R0 FMAX M05 M09",
    ],
    "mill_turn": [
      "BEGIN PGM % MM",
      "M05 M09",
    ],
    "swiss_type": [
      "BEGIN PGM % MM",
      "M05 M09",
    ],
  },
  siemens_sinumerik: {
    "3_axis_vmc": [
      "G00 G17 G40 G49 G80 G90 G94",
      "G64 (Continuous path mode)",
      "CYCLE832() (Cancel HSM)",
      "TRAFOOF (Cancel TCP)",
      "D0 M05 M09",
    ],
    "4_axis_rotary_table": [
      "G00 G17 G40 G49 G80 G90 G94",
      "G64",
      "CYCLE832()",
      "TRAFOOF",
      "SUPA G00 A0",
      "D0 M05 M09",
    ],
    "4_axis_trunnion": [
      "G00 G17 G40 G49 G80 G90 G94",
      "G64",
      "CYCLE832()",
      "TRAFOOF",
      "SUPA G00 A0",
      "D0 M05 M09",
    ],
    "5_axis_table_table": [
      "G00 G17 G40 G49 G80 G90 G94",
      "G64",
      "CYCLE832()",
      "TRAFOOF (Cancel 5-axis TCP)",
      "CYCLE800() (Cancel tilted plane)",
      "SUPA G00 A0 C0",
      "D0 M05 M09",
    ],
    "5_axis_head_head": [
      "G00 G17 G40 G49 G80 G90 G94",
      "G64",
      "CYCLE832()",
      "TRAFOOF",
      "D0 M05 M09",
    ],
    "5_axis_table_head": [
      "G00 G17 G40 G49 G80 G90 G94",
      "G64",
      "CYCLE832()",
      "TRAFOOF",
      "CYCLE800()",
      "SUPA G00 A0",
      "D0 M05 M09",
    ],
    "mill_turn": [
      "G00 G40 G80 G90 G94",
      "TRAFOOF",
      "D0 M05 M09",
    ],
    "swiss_type": [
      "G00 G40 G80 G90",
      "M05 M09",
    ],
  },
  mazatrol: {
    "3_axis_vmc": [
      "G00 G17 G40 G49 G80 G90 G94",
      "M05 M09",
    ],
    "4_axis_rotary_table": [
      "G00 G17 G40 G49 G80 G90 G94",
      "G00 A0.",
      "M05 M09",
    ],
    "4_axis_trunnion": [
      "G00 G17 G40 G49 G80 G90 G94",
      "G00 A0.",
      "M05 M09",
    ],
    "5_axis_table_table": [
      "G00 G17 G40 G49 G80 G90 G94",
      "G69.1 (Cancel tilted plane)",
      "G00 A0. C0.",
      "M05 M09",
    ],
    "5_axis_head_head": [
      "G00 G17 G40 G49 G80 G90 G94",
      "G69.1",
      "M05 M09",
    ],
    "5_axis_table_head": [
      "G00 G17 G40 G49 G80 G90 G94",
      "G69.1",
      "G00 A0.",
      "M05 M09",
    ],
    "mill_turn": [
      "G00 G40 G80 G90",
      "M200 (Cancel C-axis)",
      "G97 S0 M05 M09",
    ],
    "swiss_type": [
      "G00 G40 G80 G90",
      "M05 M09",
    ],
  },
  brother_c00: {
    "3_axis_vmc": [
      "G00 G17 G40 G49 G80 G90 G94",
      "G20 (Inch) | G21 (Metric)",
      "M298 P0 (Cancel high accuracy mode)",
      "M05 M09 M495 (TSC off)",
    ],
    "4_axis_rotary_table": [
      "G00 G17 G40 G49 G80 G90 G94",
      "M298 P0",
      "G00 A0.",
      "M05 M09 M495",
    ],
    "4_axis_trunnion": [
      "G00 G17 G40 G49 G80 G90 G94",
      "M298 P0",
      "G00 A0.",
      "M05 M09 M495",
    ],
    "5_axis_table_table": [
      "G00 G17 G40 G49 G80 G90 G94",
      "M298 P0",
      "G00 A0. C0.",
      "M05 M09 M495",
    ],
    "5_axis_head_head": [
      "G00 G17 G40 G49 G80 G90 G94",
      "M298 P0",
      "M05 M09 M495",
    ],
    "5_axis_table_head": [
      "G00 G17 G40 G49 G80 G90 G94",
      "M298 P0",
      "G00 A0.",
      "M05 M09 M495",
    ],
    "mill_turn": [
      "G00 G40 G80 G90",
      "M05 M09",
    ],
    "swiss_type": [
      "G00 G40 G80 G90",
      "M05 M09",
    ],
  },
  mitsubishi: {
    "3_axis_vmc": [
      "G00 G17 G40 G49 G80 G90 G94",
      "G05 P0 (Cancel SSS Control)",
      "M05 M09",
    ],
    "4_axis_rotary_table": [
      "G00 G17 G40 G49 G80 G90 G94",
      "G05 P0",
      "G00 A0.",
      "M05 M09",
    ],
    "4_axis_trunnion": [
      "G00 G17 G40 G49 G80 G90 G94",
      "G05 P0",
      "G00 A0.",
      "M05 M09",
    ],
    "5_axis_table_table": [
      "G00 G17 G40 G49 G80 G90 G94",
      "G05 P0",
      "G00 A0. C0.",
      "M05 M09",
    ],
    "5_axis_head_head": [
      "G00 G17 G40 G49 G80 G90 G94",
      "G05 P0",
      "M05 M09",
    ],
    "5_axis_table_head": [
      "G00 G17 G40 G49 G80 G90 G94",
      "G05 P0",
      "G00 A0.",
      "M05 M09",
    ],
    "mill_turn": [
      "G00 G40 G80 G90",
      "M05 M09",
    ],
    "swiss_type": [
      "G00 G40 G80 G90",
      "M05 M09",
    ],
  },
  fagor: {
    "3_axis_vmc": [
      "G00 G17 G40 G49 G80 G90 G94",
      "M05 M09",
    ],
    "4_axis_rotary_table": [
      "G00 G17 G40 G49 G80 G90 G94",
      "G00 A0.",
      "M05 M09",
    ],
    "4_axis_trunnion": [
      "G00 G17 G40 G49 G80 G90 G94",
      "G00 A0.",
      "M05 M09",
    ],
    "5_axis_table_table": [
      "G00 G17 G40 G49 G80 G90 G94",
      "G00 A0. C0.",
      "M05 M09",
    ],
    "5_axis_head_head": [
      "G00 G17 G40 G49 G80 G90 G94",
      "M05 M09",
    ],
    "5_axis_table_head": [
      "G00 G17 G40 G49 G80 G90 G94",
      "G00 A0.",
      "M05 M09",
    ],
    "mill_turn": [
      "G00 G40 G80 G90",
      "M05 M09",
    ],
    "swiss_type": [
      "G00 G40 G80 G90",
      "M05 M09",
    ],
  },
  centroid: {
    "3_axis_vmc": [
      "G00 G17 G40 G49 G80 G90",
      "M05 M09",
    ],
    "4_axis_rotary_table": [
      "G00 G17 G40 G49 G80 G90",
      "G00 A0.",
      "M05 M09",
    ],
    "4_axis_trunnion": [
      "G00 G17 G40 G49 G80 G90",
      "G00 A0.",
      "M05 M09",
    ],
    "5_axis_table_table": [
      "G00 G17 G40 G49 G80 G90",
      "G00 A0. C0.",
      "M05 M09",
    ],
    "5_axis_head_head": [
      "G00 G17 G40 G49 G80 G90",
      "M05 M09",
    ],
    "5_axis_table_head": [
      "G00 G17 G40 G49 G80 G90",
      "G00 A0.",
      "M05 M09",
    ],
    "mill_turn": [
      "G00 G40 G80 G90",
      "M05 M09",
    ],
    "swiss_type": [
      "G00 G40 G80 G90",
      "M05 M09",
    ],
  },
  generic_iso: {
    "3_axis_vmc": [
      "G00 G17 G40 G49 G80 G90",
      "M05 M09",
    ],
    "4_axis_rotary_table": [
      "G00 G17 G40 G49 G80 G90",
      "G00 A0.",
      "M05 M09",
    ],
    "4_axis_trunnion": [
      "G00 G17 G40 G49 G80 G90",
      "G00 A0.",
      "M05 M09",
    ],
    "5_axis_table_table": [
      "G00 G17 G40 G49 G80 G90",
      "G00 A0. C0.",
      "M05 M09",
    ],
    "5_axis_head_head": [
      "G00 G17 G40 G49 G80 G90",
      "M05 M09",
    ],
    "5_axis_table_head": [
      "G00 G17 G40 G49 G80 G90",
      "G00 A0.",
      "M05 M09",
    ],
    "mill_turn": [
      "G00 G40 G80 G90",
      "M05 M09",
    ],
    "swiss_type": [
      "G00 G40 G80 G90",
      "M05 M09",
    ],
  },
};

// ============================================================================
// ENGINE CLASS
// ============================================================================

/**
 * Master Post Processor Generator Engine
 *
 * Generates complete, production-ready post processor code for any supported
 * CNC controller. Synthesizes controller knowledge, tribal tips, and
 * mathematical algorithms into functional post processors.
 */
export class MasterPostGeneratorEngine {
  /** Version of the generator */
  private readonly VERSION = "1.0.0";

  /**
   * Generate a complete post processor
   * @param config - Post generator configuration
   * @returns Complete post processor code and metadata
   */
  generateCompletePost(config: PostGeneratorConfig): PostProcessorCode {
    log.info(`[MasterPostGen] Generating post for ${config.controller} (${config.machine_config})`);

    // Get controller profile
    const profile = controllerKnowledgeEngine.getProfile(config.controller);
    if (!profile) {
      throw new Error(`Unknown controller family: ${config.controller}`);
    }

    // Generate components
    const safetyLine = this.generateSafetyLine(config.controller, config.machine_config);
    const encoderReset = this._generateEncoderReset(config.controller, config.machine_config);
    const cycles = this.generateCycleDefinitions(config.controller);
    const mCodes = this.generateMCodeMappings(config.controller);
    const properties = this.generateProperties(config.controller, config.features, config.machine_config);
    const tribalTips = this._collectTribalTips(config.controller);

    // Generate the actual post processor code
    const code = this._generatePostCode(config, profile, safetyLine, encoderReset, cycles, mCodes, properties, tribalTips);

    const result: PostProcessorCode = {
      code,
      properties,
      cycles,
      m_codes: mCodes,
      safety_line: safetyLine,
      encoder_reset: encoderReset,
      tribal_tips: tribalTips,
      metadata: {
        generator_version: this.VERSION,
        generated_at: new Date().toISOString(),
        controller: config.controller,
        machine_config: config.machine_config,
        cam_system: config.cam_system,
        lines_of_code: code.split("\n").length,
        cycles_count: cycles.length,
        mcodes_count: mCodes.length,
      },
    };

    log.info(`[MasterPostGen] Generated ${result.metadata.lines_of_code} lines, ${cycles.length} cycles, ${mCodes.length} M-codes`);
    return result;
  }

  /**
   * Generate safety line for controller and machine configuration
   * @param controller - Controller family
   * @param machineConfig - Machine configuration
   * @returns Formatted safety line string
   */
  generateSafetyLine(controller: ControllerFamily, machineConfig: MachineConfiguration): string {
    const lines = SAFETY_LINES[controller]?.[machineConfig];
    if (!lines) {
      // Fallback to 3-axis VMC safety line
      const fallback = SAFETY_LINES[controller]?.["3_axis_vmc"];
      if (fallback) {
        return fallback.join("\n");
      }
      // Generic fallback
      return "G00 G17 G40 G49 G80 G90\nM05 M09";
    }
    return lines.join("\n");
  }

  /**
   * Generate encoder reset lines for rotary machines
   * @param controller - Controller family
   * @param machineConfig - Machine configuration
   * @returns Encoder reset string or undefined
   */
  private _generateEncoderReset(controller: ControllerFamily, machineConfig: MachineConfiguration): string | undefined {
    // Only applicable for 4-axis and 5-axis machines
    const is4Or5Axis = machineConfig.includes("4_axis") || machineConfig.includes("5_axis");
    if (!is4Or5Axis) {
      return undefined;
    }

    // Controller-specific encoder reset
    switch (controller) {
      case "hurco_winmax":
        return "M31 (Encoder reset - Hurco)";
      case "haas_ngc":
        return "(No encoder reset needed - Haas uses absolute encoders)";
      case "fanuc":
        return "G28 (Machine zero return includes encoder sync)";
      case "okuma_osp":
        return "(No encoder reset needed - OSP uses absolute encoders)";
      case "heidenhain_tnc":
        return "M91 (Machine coordinate reference)";
      case "siemens_sinumerik":
        return "G74 (Machine datum return with encoder sync)";
      default:
        return undefined;
    }
  }

  /**
   * Generate cycle definitions from controller profile
   * @param controller - Controller family
   * @returns Array of cycle definitions
   */
  generateCycleDefinitions(controller: ControllerFamily): CycleDefinition[] {
    const profile = controllerKnowledgeEngine.getProfile(controller);
    if (!profile || !profile.cycleDefinitions) {
      return this._getDefaultCycles(controller);
    }
    return profile.cycleDefinitions;
  }

  /**
   * Generate M-code mappings from controller profile
   * @param controller - Controller family
   * @returns Array of M-code mappings
   */
  generateMCodeMappings(controller: ControllerFamily): MCodeMapping[] {
    const profile = controllerKnowledgeEngine.getProfile(controller);
    if (!profile || !profile.mCodeMappings) {
      return this._getDefaultMCodes(controller);
    }
    return profile.mCodeMappings;
  }

  /**
   * Generate post processor properties
   * @param controller - Controller family
   * @param features - Enabled features
   * @param machineConfig - Machine configuration
   * @returns Array of property definitions
   */
  generateProperties(
    controller: ControllerFamily,
    features: PostFeatures,
    machineConfig: MachineConfiguration
  ): PostProperty[] {
    const properties: PostProperty[] = [];

    // Common properties
    properties.push({
      name: "showSequenceNumbers",
      title: "Show Sequence Numbers",
      type: "boolean",
      default_value: true,
      description: "Include N-word line numbers in output",
      group: "formatting",
    });

    properties.push({
      name: "sequenceNumberIncrement",
      title: "Sequence Number Increment",
      type: "integer",
      default_value: 10,
      description: "Line number increment value",
      group: "formatting",
    });

    properties.push({
      name: "useRadius",
      title: "Use Radius for Arcs",
      type: "boolean",
      default_value: false,
      description: "Use R-word instead of IJK for arc interpolation",
      group: "formatting",
    });

    properties.push({
      name: "maximumSpindleSpeed",
      title: "Maximum Spindle Speed",
      type: "integer",
      default_value: 10000,
      description: "Maximum allowed spindle RPM",
      group: "machine",
    });

    // Controller-specific properties
    if (controller === "hurco_winmax") {
      properties.push({
        name: "useISNC",
        title: "Use ISNC Mode",
        type: "boolean",
        default_value: true,
        description: "Use Industry Standard NC mode (CAM compatible) vs BNC mode",
        group: "controller",
      });

      properties.push({
        name: "useUltiMotion",
        title: "Use UltiMotion",
        type: "boolean",
        default_value: features.high_speed_machining,
        description: "Enable UltiMotion (G64) for high-speed smoothing",
        group: "controller",
      });

      if (features.peck_tapping) {
        properties.push({
          name: "usePeckTapping",
          title: "Use Peck Tapping",
          type: "boolean",
          default_value: true,
          description: "Use G84.2/G84.3 for peck rigid tapping (ISNC mode)",
          group: "cycles",
        });
      }

      if (machineConfig.includes("5_axis")) {
        properties.push({
          name: "useM140Retract",
          title: "Use M140 Retract",
          type: "boolean",
          default_value: true,
          description: "Use M140 for tool-vector-aligned safe retract",
          group: "5-axis",
        });

        properties.push({
          name: "useTCPM",
          title: "Use TCPM (M128/M129)",
          type: "boolean",
          default_value: features.tcp_5axis,
          description: "Enable Tool Center Point Management",
          group: "5-axis",
        });
      }
    }

    if (controller === "haas_ngc") {
      properties.push({
        name: "smoothingLevel",
        title: "G187 Smoothing Level",
        type: "enum",
        default_value: "P2",
        enum_values: ["P1", "P2", "P3"],
        description: "HSM smoothing: P1=rough, P2=medium, P3=finish",
        group: "controller",
      });

      properties.push({
        name: "useG95",
        title: "Use G95 for Tapping",
        type: "boolean",
        default_value: true,
        description: "Use IPR/MPR mode for tapping (Setting 130=0)",
        group: "cycles",
      });

      if (machineConfig.includes("5_axis")) {
        properties.push({
          name: "useTCPC",
          title: "Use TCPC (G234)",
          type: "boolean",
          default_value: features.tcp_5axis,
          description: "Use G234 Tool Center Point Control for 5-axis",
          group: "5-axis",
        });
      }
    }

    if (controller === "okuma_osp") {
      properties.push({
        name: "useG15WorkOffset",
        title: "Use G15 H## Work Offsets",
        type: "boolean",
        default_value: true,
        description: "Use G15 H## instead of G54/G55 (native OSP)",
        group: "controller",
      });

      properties.push({
        name: "useSuperNURBS",
        title: "Use Super-NURBS",
        type: "boolean",
        default_value: features.high_speed_machining,
        description: "Enable G08 Super-NURBS for HSM",
        group: "controller",
      });

      if (machineConfig.includes("5_axis")) {
        properties.push({
          name: "useCAS",
          title: "Use Collision Avoidance System",
          type: "boolean",
          default_value: true,
          description: "Enable M510/M511 CAS control",
          group: "5-axis",
        });
      }
    }

    if (controller === "siemens_sinumerik") {
      properties.push({
        name: "useCYCLE832",
        title: "Use CYCLE832 HSM",
        type: "boolean",
        default_value: features.high_speed_machining,
        description: "Enable CYCLE832 high-speed smoothing",
        group: "controller",
      });

      properties.push({
        name: "cycle832Level",
        title: "CYCLE832 Level",
        type: "enum",
        default_value: "112002",
        enum_values: ["112001", "112002", "112003"],
        description: "HSM level: 112001=rough, 112002=semi, 112003=finish",
        group: "controller",
      });

      if (machineConfig.includes("5_axis")) {
        properties.push({
          name: "cycle800SwivelDataRecord",
          title: "CYCLE800 Swivel Data Record",
          type: "string",
          default_value: "SWIVEL",
          description: "Name of the swivel data record for CYCLE800",
          group: "5-axis",
        });
      }
    }

    if (controller === "heidenhain_tnc") {
      properties.push({
        name: "useCYCLDEF32",
        title: "Use CYCL DEF 32",
        type: "boolean",
        default_value: features.high_speed_machining,
        description: "Enable CYCL DEF 32 tolerance band for HSM",
        group: "controller",
      });

      if (machineConfig.includes("5_axis")) {
        properties.push({
          name: "usePLANESPATIAL",
          title: "Use PLANE SPATIAL",
          type: "boolean",
          default_value: features.tilted_work_plane,
          description: "Enable PLANE SPATIAL for tilted work planes",
          group: "5-axis",
        });

        properties.push({
          name: "useTCPM",
          title: "Use TCPM (M128)",
          type: "boolean",
          default_value: features.tcp_5axis,
          description: "Enable Tool Center Point Management",
          group: "5-axis",
        });
      }
    }

    if (controller === "brother_c00") {
      properties.push({
        name: "useG77G78Tapping",
        title: "Use G77/G78 Tapping",
        type: "boolean",
        default_value: true,
        description: "Use Brother pitch-based tapping (no F calculation needed)",
        group: "cycles",
      });

      properties.push({
        name: "highAccuracyMode",
        title: "High Accuracy Mode",
        type: "enum",
        default_value: "0",
        enum_values: ["0", "1", "2", "3", "4", "5", "6"],
        description: "M298 P level: 0=off, 1=standard, 2=rough, 3-6=finishing levels",
        group: "controller",
      });

      if (features.coolant_through_spindle) {
        properties.push({
          name: "useTSC",
          title: "Use Through-Spindle Coolant",
          type: "boolean",
          default_value: true,
          description: "Enable M494/M495 TSC control",
          group: "coolant",
        });
      }
    }

    // Coolant properties
    if (features.coolant_through_spindle) {
      properties.push({
        name: "useThroughSpindleCoolant",
        title: "Through-Spindle Coolant",
        type: "boolean",
        default_value: true,
        description: "Enable high-pressure through-spindle coolant",
        group: "coolant",
      });
    }

    // Chip conveyor
    if (features.chip_conveyor) {
      properties.push({
        name: "useChipConveyor",
        title: "Chip Conveyor Control",
        type: "boolean",
        default_value: true,
        description: "Include chip conveyor M-codes in program",
        group: "accessories",
      });
    }

    // Probing
    if (features.probing) {
      properties.push({
        name: "useProbing",
        title: "Enable Probing Cycles",
        type: "boolean",
        default_value: true,
        description: "Include probing support in post",
        group: "probing",
      });
    }

    return properties;
  }

  /**
   * Collect relevant tribal knowledge tips for the controller
   */
  private _collectTribalTips(controller: ControllerFamily): TribalTip[] {
    const tips: TribalTip[] = [];
    const controllerParts = controller.toLowerCase().split("_");

    for (const tip of CONTROLLER_KNOWLEDGE_TIPS) {
      // Check if tip is relevant to this controller
      const isRelevant = tip.tags?.some(tag => {
        const tagLower = tag.toLowerCase();
        return controllerParts.some(part => tagLower.includes(part) || part.includes(tagLower));
      });

      if (isRelevant) {
        let relevance: "critical" | "high" | "medium" | "low" = "medium";
        if (tip.confidence >= 90) relevance = "critical";
        else if (tip.confidence >= 80) relevance = "high";
        else if (tip.confidence >= 60) relevance = "medium";
        else relevance = "low";

        tips.push({
          id: tip.id,
          title: tip.title,
          body: tip.body,
          relevance,
        });

        // Limit to 10 most relevant tips
        if (tips.length >= 10) break;
      }
    }

    return tips;
  }

  /**
   * Generate the actual post processor code
   */
  private _generatePostCode(
    config: PostGeneratorConfig,
    profile: ControllerProfile,
    safetyLine: string,
    encoderReset: string | undefined,
    cycles: CycleDefinition[],
    mCodes: MCodeMapping[],
    properties: PostProperty[],
    tribalTips: TribalTip[]
  ): string {
    const lines: string[] = [];
    const timestamp = new Date().toISOString();

    // Header
    lines.push("/**");
    lines.push(` * Post Processor: ${profile.name}`);
    lines.push(` * Machine Configuration: ${config.machine_config}`);
    lines.push(` * Controller: ${profile.family} (${profile.versions?.join(", ") || "all versions"})`);
    lines.push(` * CAM System: ${config.cam_system}`);
    lines.push(` * Generated: ${timestamp}`);
    lines.push(` * Generator: PRISM MasterPostGeneratorEngine v${this.VERSION}`);
    lines.push(` *`);
    lines.push(` * Copyright JM Die Company - Generated for internal use`);
    lines.push(" */");
    lines.push("");

    // Description and vendor
    lines.push(`description = "${profile.name} Post Processor";`);
    lines.push(`vendor = "${profile.manufacturer}";`);
    lines.push(`vendorUrl = "https://www.${profile.manufacturer.toLowerCase().replace(/\s+/g, "")}.com";`);
    lines.push(`legal = "Copyright (C) JM Die Company";`);
    lines.push("");

    // File extension and capabilities
    const ext = config.output_options?.file_extension || this._getDefaultExtension(config.controller);
    lines.push(`extension = "${ext}";`);
    lines.push(`setCodePage("ascii");`);
    lines.push("");

    // Capabilities based on machine configuration
    lines.push("capabilities = CAPABILITY_MILLING;");
    if (config.machine_config === "mill_turn") {
      lines.push("capabilities |= CAPABILITY_TURNING;");
    }
    if (config.machine_config.includes("5_axis")) {
      lines.push("capabilities |= CAPABILITY_MULTITURN;");
    }
    lines.push("");

    // Units
    const tolerance = config.units === "metric" ? 0.001 : 0.0001;
    lines.push(`// Units: ${config.units === "metric" ? "Metric (mm)" : "Imperial (inch)"}`);
    lines.push(`tolerance = ${tolerance};`);
    lines.push(`minimumChordLength = ${config.units === "metric" ? 0.01 : 0.001};`);
    lines.push(`minimumCircularRadius = ${config.units === "metric" ? 0.01 : 0.001};`);
    lines.push(`maximumCircularRadius = ${config.units === "metric" ? 1000 : 40};`);
    lines.push(`minimumCircularSweep = toRad(0.01);`);
    lines.push(`maximumCircularSweep = toRad(180);`);
    lines.push(`allowHelicalMoves = ${profile.features?.supportsHelical ? "true" : "false"};`);
    lines.push(`allowedCircularPlanes = ${config.machine_config.includes("5_axis") ? "undefined" : "(1 << PLANE_XY) | (1 << PLANE_ZX) | (1 << PLANE_YZ)"};`);
    lines.push("");

    // Properties section
    lines.push("// ============================================================================");
    lines.push("// POST PROPERTIES");
    lines.push("// ============================================================================");
    lines.push("");
    lines.push("properties = {");
    for (const prop of properties) {
      const defaultVal = typeof prop.default_value === "string"
        ? `"${prop.default_value}"`
        : prop.default_value;

      if (prop.enum_values) {
        lines.push(`  ${prop.name}: {`);
        lines.push(`    title: "${prop.title}",`);
        lines.push(`    description: "${prop.description}",`);
        lines.push(`    type: "enum",`);
        lines.push(`    values: [${prop.enum_values.map(v => `"${v}"`).join(", ")}],`);
        lines.push(`    value: ${defaultVal}`);
        lines.push(`  },`);
      } else {
        lines.push(`  ${prop.name}: {`);
        lines.push(`    title: "${prop.title}",`);
        lines.push(`    description: "${prop.description}",`);
        lines.push(`    type: "${prop.type}",`);
        lines.push(`    value: ${defaultVal}`);
        lines.push(`  },`);
      }
    }
    lines.push("};");
    lines.push("");

    // Variables section
    lines.push("// ============================================================================");
    lines.push("// GLOBAL VARIABLES");
    lines.push("// ============================================================================");
    lines.push("");
    lines.push("var sequenceNumber;");
    lines.push("var currentWorkOffset;");
    lines.push("var retractPlane;");
    lines.push("var currentTool;");
    lines.push("var currentSpindleSpeed;");
    lines.push("var currentCoolant;");
    if (config.machine_config.includes("5_axis")) {
      lines.push("var currentA;");
      lines.push("var currentB;");
      lines.push("var currentC;");
      lines.push("var tcpActive = false;");
    }
    lines.push("");

    // Format definitions
    lines.push("// ============================================================================");
    lines.push("// FORMAT DEFINITIONS");
    lines.push("// ============================================================================");
    lines.push("");
    const precision = config.output_options?.coordinate_precision || 4;
    const feedPrecision = config.output_options?.feed_precision || 1;
    lines.push(`var gFormat = createFormat({prefix: "G", decimals: ${config.controller === "heidenhain_tnc" ? "0" : "1"}});`);
    lines.push(`var mFormat = createFormat({prefix: "M", decimals: 0});`);
    lines.push(`var hFormat = createFormat({prefix: "H", decimals: 0});`);
    lines.push(`var dFormat = createFormat({prefix: "D", decimals: 0});`);
    lines.push(`var nFormat = createFormat({prefix: "N", decimals: 0, width: 4, zeropad: true});`);
    lines.push(`var xyzFormat = createFormat({decimals: ${precision}, forceDecimal: true});`);
    lines.push(`var abcFormat = createFormat({decimals: ${precision}, forceDecimal: true});`);
    lines.push(`var feedFormat = createFormat({decimals: ${feedPrecision}, forceDecimal: true});`);
    lines.push(`var rpmFormat = createFormat({decimals: 0});`);
    lines.push(`var toolFormat = createFormat({decimals: 0});`);
    lines.push(`var taperFormat = createFormat({decimals: 1, scale: DEG});`);
    lines.push(`var pitchFormat = createFormat({decimals: 4, forceDecimal: true});`);
    lines.push("");

    // Output variables
    lines.push("// ============================================================================");
    lines.push("// OUTPUT VARIABLES");
    lines.push("// ============================================================================");
    lines.push("");
    lines.push('var xOutput = createVariable({prefix: "X"}, xyzFormat);');
    lines.push('var yOutput = createVariable({prefix: "Y"}, xyzFormat);');
    lines.push('var zOutput = createVariable({prefix: "Z"}, xyzFormat);');
    if (config.machine_config.includes("4_axis") || config.machine_config.includes("5_axis")) {
      lines.push('var aOutput = createVariable({prefix: "A"}, abcFormat);');
    }
    if (config.machine_config.includes("5_axis")) {
      lines.push('var bOutput = createVariable({prefix: "B"}, abcFormat);');
      lines.push('var cOutput = createVariable({prefix: "C"}, abcFormat);');
    }
    lines.push('var feedOutput = createVariable({prefix: "F"}, feedFormat);');
    lines.push('var sOutput = createVariable({prefix: "S", force: true}, rpmFormat);');
    lines.push('var toolOutput = createVariable({prefix: "T"}, toolFormat);');
    lines.push("");

    // M-code mappings
    lines.push("// ============================================================================");
    lines.push("// M-CODE MAPPINGS");
    lines.push("// ============================================================================");
    lines.push("//");
    for (const mCode of mCodes.slice(0, 30)) { // Limit to 30 most important
      const note = mCode.notes ? ` -- ${mCode.notes}` : "";
      lines.push(`// M${mCode.mCode.toString().padStart(2, "0")}: ${mCode.description}${note}`);
    }
    lines.push("");

    // Safety line
    lines.push("// ============================================================================");
    lines.push("// SAFETY LINE");
    lines.push("// ============================================================================");
    lines.push("//");
    for (const safeLine of safetyLine.split("\n")) {
      lines.push(`// ${safeLine}`);
    }
    if (encoderReset) {
      lines.push("//");
      lines.push(`// Encoder Reset: ${encoderReset}`);
    }
    lines.push("");

    // Tribal tips as comments
    if (tribalTips.length > 0) {
      lines.push("// ============================================================================");
      lines.push("// TRIBAL KNOWLEDGE TIPS");
      lines.push("// ============================================================================");
      lines.push("//");
      for (const tip of tribalTips.slice(0, 5)) {
        lines.push(`// [${tip.relevance.toUpperCase()}] ${tip.title}`);
        // Wrap body text
        const bodyLines = this._wrapText(tip.body, 75);
        for (const bodyLine of bodyLines) {
          lines.push(`//   ${bodyLine}`);
        }
        lines.push("//");
      }
      lines.push("");
    }

    // Cycle definitions
    lines.push("// ============================================================================");
    lines.push("// CYCLE DEFINITIONS");
    lines.push("// ============================================================================");
    lines.push("//");
    for (const cycle of cycles.slice(0, 15)) {
      lines.push(`// ${cycle.gCode}: ${cycle.name} - ${cycle.description}`);
      if (cycle.notes && cycle.notes.length > 0) {
        for (const note of cycle.notes.slice(0, 2)) {
          lines.push(`//   Note: ${note}`);
        }
      }
    }
    lines.push("");

    // onOpen function
    lines.push("// ============================================================================");
    lines.push("// PROGRAM INITIALIZATION");
    lines.push("// ============================================================================");
    lines.push("");
    lines.push("function onOpen() {");
    lines.push("  // Initialize sequence number");
    lines.push(`  sequenceNumber = properties.showSequenceNumbers ? ${config.output_options?.line_number_increment || 10} : undefined;`);
    lines.push("");
    lines.push("  // Write program header");
    if (config.controller !== "heidenhain_tnc") {
      lines.push('  writeln("%");');
      lines.push(`  writeln("O" + programNumber + " (" + (programComment ? programComment : "PRISM GENERATED") + ")");`);
    } else {
      lines.push('  writeln("BEGIN PGM " + programName + " MM");');
    }
    lines.push("");

    // JM Die specific header
    if (config.jm_die_options?.customer_header) {
      lines.push(`  writeln("(${config.jm_die_options.customer_header})");`);
    }

    lines.push("  // Write safety line");
    lines.push("  writeSafetyLine();");
    lines.push("}");
    lines.push("");

    // writeSafetyLine function
    lines.push("function writeSafetyLine() {");
    const safetyLines = safetyLine.split("\n");
    for (const sl of safetyLines) {
      if (sl.trim()) {
        lines.push(`  writeln("${sl.replace(/"/g, '\\"')}");`);
      }
    }
    lines.push("}");
    lines.push("");

    // onSection function
    lines.push("// ============================================================================");
    lines.push("// SECTION HANDLING");
    lines.push("// ============================================================================");
    lines.push("");
    lines.push("function onSection() {");
    lines.push("  var tool = section.getTool();");
    lines.push("  var insertToolCall = isFirstSection() || tool.number != currentTool;");
    lines.push("");
    lines.push("  if (insertToolCall) {");
    lines.push("    currentTool = tool.number;");
    lines.push("    writeToolChange(tool);");
    lines.push("  }");
    lines.push("");
    lines.push("  // Set work offset");
    lines.push("  var workOffset = section.workOffset;");
    lines.push("  if (workOffset != currentWorkOffset) {");
    if (config.controller === "okuma_osp") {
      lines.push('    writeBlock(gFormat.format(15) + " H" + workOffset);');
    } else {
      lines.push("    writeBlock(gFormat.format(53 + workOffset));");
    }
    lines.push("    currentWorkOffset = workOffset;");
    lines.push("  }");
    lines.push("");
    lines.push("  // Start spindle");
    lines.push("  var spindleSpeed = section.getSpindleSpeed();");
    lines.push("  writeBlock(sOutput.format(spindleSpeed), mFormat.format(section.spindle == SPINDLE_CW ? 3 : 4));");
    lines.push("  currentSpindleSpeed = spindleSpeed;");
    lines.push("}");
    lines.push("");

    // writeToolChange function
    lines.push("function writeToolChange(tool) {");
    lines.push("  // Retract to safe Z");
    lines.push("  writeBlock(gFormat.format(91), gFormat.format(28), zOutput.format(0));");
    lines.push("  writeBlock(gFormat.format(90));");
    lines.push("");
    lines.push("  // Tool change");
    lines.push("  writeBlock(");
    lines.push('    "T" + toolFormat.format(tool.number),');
    lines.push("    mFormat.format(6)");
    lines.push("  );");
    lines.push("");
    lines.push("  // Tool length compensation");
    lines.push("  writeBlock(gFormat.format(43), hFormat.format(tool.lengthOffset));");
    lines.push("}");
    lines.push("");

    // Cycle implementations
    lines.push("// ============================================================================");
    lines.push("// CANNED CYCLE IMPLEMENTATIONS");
    lines.push("// ============================================================================");
    lines.push("");
    this._generateCycleImplementations(lines, config, profile);

    // Motion functions
    lines.push("// ============================================================================");
    lines.push("// MOTION FUNCTIONS");
    lines.push("// ============================================================================");
    lines.push("");
    lines.push("function onRapid(x, y, z) {");
    lines.push("  writeBlock(gFormat.format(0), xOutput.format(x), yOutput.format(y), zOutput.format(z));");
    lines.push("}");
    lines.push("");
    lines.push("function onLinear(x, y, z, feed) {");
    lines.push("  writeBlock(gFormat.format(1), xOutput.format(x), yOutput.format(y), zOutput.format(z), feedOutput.format(feed));");
    lines.push("}");
    lines.push("");
    lines.push("function onCircular(clockwise, cx, cy, cz, x, y, z, feed) {");
    lines.push("  var gCode = clockwise ? 2 : 3;");
    lines.push("  if (properties.useRadius) {");
    lines.push("    var r = getCircularRadius();");
    lines.push('    writeBlock(gFormat.format(gCode), xOutput.format(x), yOutput.format(y), zOutput.format(z), "R" + xyzFormat.format(r), feedOutput.format(feed));');
    lines.push("  } else {");
    lines.push("    var i = cx - getCurrentPosition().x;");
    lines.push("    var j = cy - getCurrentPosition().y;");
    lines.push("    var k = cz - getCurrentPosition().z;");
    lines.push('    writeBlock(gFormat.format(gCode), xOutput.format(x), yOutput.format(y), zOutput.format(z), "I" + xyzFormat.format(i), "J" + xyzFormat.format(j), feedOutput.format(feed));');
    lines.push("  }");
    lines.push("}");
    lines.push("");

    // 5-axis motion if applicable
    if (config.machine_config.includes("5_axis")) {
      this._generate5AxisFunctions(lines, config, profile);
    }

    // onClose function
    lines.push("// ============================================================================");
    lines.push("// PROGRAM END");
    lines.push("// ============================================================================");
    lines.push("");
    lines.push("function onClose() {");
    lines.push("  // Cancel cycles and compensation");
    lines.push("  writeBlock(gFormat.format(80));");
    lines.push("  writeBlock(gFormat.format(49));");
    lines.push("  writeBlock(gFormat.format(40));");
    lines.push("");
    lines.push("  // Stop spindle and coolant");
    lines.push("  writeBlock(mFormat.format(5), mFormat.format(9));");
    lines.push("");
    lines.push("  // Return to home");
    lines.push("  writeBlock(gFormat.format(91), gFormat.format(28), zOutput.format(0));");
    lines.push("  writeBlock(gFormat.format(90));");
    if (config.machine_config.includes("4_axis") || config.machine_config.includes("5_axis")) {
      lines.push("  writeBlock(gFormat.format(28), aOutput.format(0));");
    }
    lines.push("");
    lines.push("  // Program end");
    if (config.controller === "heidenhain_tnc") {
      lines.push('  writeln("END PGM " + programName + " MM");');
    } else {
      lines.push("  writeBlock(mFormat.format(30));");
      lines.push('  writeln("%");');
    }
    lines.push("}");
    lines.push("");

    // Utility functions
    lines.push("// ============================================================================");
    lines.push("// UTILITY FUNCTIONS");
    lines.push("// ============================================================================");
    lines.push("");
    lines.push("function writeBlock() {");
    lines.push("  var text = formatWords(arguments);");
    lines.push("  if (text) {");
    lines.push("    if (sequenceNumber) {");
    lines.push("      writeln(nFormat.format(sequenceNumber) + \" \" + text);");
    lines.push("      sequenceNumber += properties.sequenceNumberIncrement;");
    lines.push("    } else {");
    lines.push("      writeln(text);");
    lines.push("    }");
    lines.push("  }");
    lines.push("}");
    lines.push("");

    return lines.join("\n");
  }

  /**
   * Generate cycle implementations
   */
  private _generateCycleImplementations(lines: string[], config: PostGeneratorConfig, profile: ControllerProfile): void {
    lines.push("function onCycle() {");
    lines.push("  // No action needed - cycle handling is in onCyclePoint");
    lines.push("}");
    lines.push("");
    lines.push("function onCyclePoint(x, y, z) {");
    lines.push("  var cycle = getCycleType();");
    lines.push("  var R = cycle.retract;");
    lines.push("  var F = cycle.feedrate;");
    lines.push("");
    lines.push("  switch (cycle.type) {");
    lines.push('    case "drilling":');
    lines.push("      writeBlock(gFormat.format(81),");
    lines.push('        "X" + xyzFormat.format(x),');
    lines.push('        "Y" + xyzFormat.format(y),');
    lines.push('        "Z" + xyzFormat.format(z),');
    lines.push('        "R" + xyzFormat.format(R),');
    lines.push("        feedOutput.format(F)");
    lines.push("      );");
    lines.push("      break;");
    lines.push("");
    lines.push('    case "counter-boring":');
    lines.push("      var P = cycle.dwell ? cycle.dwell * 1000 : 0;");
    lines.push("      writeBlock(gFormat.format(82),");
    lines.push('        "X" + xyzFormat.format(x),');
    lines.push('        "Y" + xyzFormat.format(y),');
    lines.push('        "Z" + xyzFormat.format(z),');
    lines.push('        "R" + xyzFormat.format(R),');
    lines.push('        P > 0 ? "P" + Math.round(P) : "",');
    lines.push("        feedOutput.format(F)");
    lines.push("      );");
    lines.push("      break;");
    lines.push("");
    lines.push('    case "deep-drilling":');
    lines.push("    case \"chip-breaking\":");
    lines.push("      var Q = cycle.incrementalDepth;");
    lines.push('      writeBlock(gFormat.format(cycle.type == "chip-breaking" ? 73 : 83),');
    lines.push('        "X" + xyzFormat.format(x),');
    lines.push('        "Y" + xyzFormat.format(y),');
    lines.push('        "Z" + xyzFormat.format(z),');
    lines.push('        "R" + xyzFormat.format(R),');
    lines.push('        "Q" + xyzFormat.format(Q),');
    lines.push("        feedOutput.format(F)");
    lines.push("      );");
    lines.push("      break;");
    lines.push("");

    // Tapping - controller specific
    lines.push('    case "tapping":');
    lines.push('    case "right-tapping":');
    if (config.controller === "brother_c00") {
      lines.push("      // Brother G77/G78 pitch-based tapping");
      lines.push("      var pitch = cycle.pitch;");
      lines.push("      var L = 1; // Retract speed multiplier (up to 6000 RPM)");
      lines.push("      writeBlock(gFormat.format(77),");
      lines.push('        "X" + xyzFormat.format(x),');
      lines.push('        "Y" + xyzFormat.format(y),');
      lines.push('        "Z" + xyzFormat.format(z),');
      lines.push('        "R" + xyzFormat.format(R),');
      lines.push('        "P" + pitchFormat.format(pitch),');
      lines.push('        "L" + L');
      lines.push("      );");
    } else if (config.controller === "hurco_winmax") {
      lines.push("      // Hurco ISNC rigid tapping");
      lines.push("      var pitch = cycle.pitch;");
      lines.push("      var F_tap = currentSpindleSpeed * pitch;");
      lines.push("      writeBlock(mFormat.format(29)); // Rigid tap mode");
      lines.push("      writeBlock(gFormat.format(84),");
      lines.push('        "X" + xyzFormat.format(x),');
      lines.push('        "Y" + xyzFormat.format(y),');
      lines.push('        "Z" + xyzFormat.format(z),');
      lines.push('        "R" + xyzFormat.format(R),');
      lines.push("        feedOutput.format(F_tap)");
      lines.push("      );");
    } else if (config.controller === "haas_ngc") {
      lines.push("      // Haas NGC rigid tapping - Setting 130=0 for IPR mode");
      lines.push("      var pitch = cycle.pitch;");
      lines.push("      writeBlock(gFormat.format(95)); // IPR mode");
      lines.push("      writeBlock(gFormat.format(84),");
      lines.push('        "X" + xyzFormat.format(x),');
      lines.push('        "Y" + xyzFormat.format(y),');
      lines.push('        "Z" + xyzFormat.format(z),');
      lines.push('        "R" + xyzFormat.format(R),');
      lines.push("        feedOutput.format(pitch)");
      lines.push("      );");
      lines.push("      writeBlock(gFormat.format(94)); // Return to IPM");
    } else if (config.controller === "okuma_osp") {
      lines.push("      // Okuma OSP - no M29 required");
      lines.push("      var pitch = cycle.pitch;");
      lines.push("      var F_tap = currentSpindleSpeed * pitch;");
      lines.push("      writeBlock(gFormat.format(84),");
      lines.push('        "X" + xyzFormat.format(x),');
      lines.push('        "Y" + xyzFormat.format(y),');
      lines.push('        "Z" + xyzFormat.format(z),');
      lines.push('        "R" + xyzFormat.format(R),');
      lines.push("        feedOutput.format(F_tap)");
      lines.push("      );");
    } else if (config.controller === "siemens_sinumerik") {
      lines.push("      // Siemens CYCLE84");
      lines.push("      var pitch = cycle.pitch;");
      lines.push("      writeBlock(");
      lines.push('        "CYCLE84(" +');
      lines.push('        xyzFormat.format(R) + ", " +');
      lines.push('        xyzFormat.format(z) + ", " +');
      lines.push('        "3, " +');
      lines.push('        pitchFormat.format(pitch) + ", " +');
      lines.push('        rpmFormat.format(currentSpindleSpeed) +');
      lines.push('        ")"');
      lines.push("      );");
    } else {
      lines.push("      // Standard Fanuc-style tapping with M29");
      lines.push("      var pitch = cycle.pitch;");
      lines.push("      var F_tap = currentSpindleSpeed * pitch;");
      lines.push("      writeBlock(mFormat.format(29), sOutput.format(currentSpindleSpeed));");
      lines.push("      writeBlock(gFormat.format(84),");
      lines.push('        "X" + xyzFormat.format(x),');
      lines.push('        "Y" + xyzFormat.format(y),');
      lines.push('        "Z" + xyzFormat.format(z),');
      lines.push('        "R" + xyzFormat.format(R),');
      lines.push("        feedOutput.format(F_tap)");
      lines.push("      );");
    }
    lines.push("      break;");
    lines.push("");

    lines.push('    case "left-tapping":');
    if (config.controller === "brother_c00") {
      lines.push("      // Brother G78 left-hand tapping");
      lines.push("      var pitch = cycle.pitch;");
      lines.push("      writeBlock(gFormat.format(78),");
      lines.push('        "X" + xyzFormat.format(x),');
      lines.push('        "Y" + xyzFormat.format(y),');
      lines.push('        "Z" + xyzFormat.format(z),');
      lines.push('        "R" + xyzFormat.format(R),');
      lines.push('        "P" + pitchFormat.format(pitch)');
      lines.push("      );");
    } else {
      lines.push("      // G74 left-hand tapping");
      lines.push("      var pitch = cycle.pitch;");
      lines.push("      var F_tap = currentSpindleSpeed * pitch;");
      lines.push("      writeBlock(gFormat.format(74),");
      lines.push('        "X" + xyzFormat.format(x),');
      lines.push('        "Y" + xyzFormat.format(y),');
      lines.push('        "Z" + xyzFormat.format(z),');
      lines.push('        "R" + xyzFormat.format(R),');
      lines.push("        feedOutput.format(F_tap)");
      lines.push("      );");
    }
    lines.push("      break;");
    lines.push("");

    lines.push('    case "reaming":');
    lines.push("      writeBlock(gFormat.format(85),");
    lines.push('        "X" + xyzFormat.format(x),');
    lines.push('        "Y" + xyzFormat.format(y),');
    lines.push('        "Z" + xyzFormat.format(z),');
    lines.push('        "R" + xyzFormat.format(R),');
    lines.push("        feedOutput.format(F)");
    lines.push("      );");
    lines.push("      break;");
    lines.push("");

    lines.push('    case "boring":');
    lines.push("      var P = cycle.dwell ? cycle.dwell * 1000 : 0;");
    lines.push("      writeBlock(gFormat.format(89),");
    lines.push('        "X" + xyzFormat.format(x),');
    lines.push('        "Y" + xyzFormat.format(y),');
    lines.push('        "Z" + xyzFormat.format(z),');
    lines.push('        "R" + xyzFormat.format(R),');
    lines.push('        P > 0 ? "P" + Math.round(P) : "",');
    lines.push("        feedOutput.format(F)");
    lines.push("      );");
    lines.push("      break;");
    lines.push("");

    lines.push('    case "fine-boring":');
    lines.push("      var Q = cycle.shift || 0.1;");
    lines.push("      var P = cycle.dwell ? cycle.dwell * 1000 : 0;");
    lines.push("      writeBlock(gFormat.format(76),");
    lines.push('        "X" + xyzFormat.format(x),');
    lines.push('        "Y" + xyzFormat.format(y),');
    lines.push('        "Z" + xyzFormat.format(z),');
    lines.push('        "R" + xyzFormat.format(R),');
    lines.push('        "Q" + xyzFormat.format(Q),');
    lines.push('        P > 0 ? "P" + Math.round(P) : "",');
    lines.push("        feedOutput.format(F)");
    lines.push("      );");
    lines.push("      break;");
    lines.push("");

    lines.push("    default:");
    lines.push('      error("Unsupported cycle type: " + cycle.type);');
    lines.push("  }");
    lines.push("}");
    lines.push("");
    lines.push("function onCycleEnd() {");
    lines.push("  writeBlock(gFormat.format(80));");
    lines.push("}");
    lines.push("");
  }

  /**
   * Generate 5-axis specific functions
   */
  private _generate5AxisFunctions(lines: string[], config: PostGeneratorConfig, profile: ControllerProfile): void {
    lines.push("// ============================================================================");
    lines.push("// 5-AXIS FUNCTIONS");
    lines.push("// ============================================================================");
    lines.push("");

    // TCP activation
    lines.push("function activateTCP() {");
    lines.push("  if (tcpActive) return;");
    if (config.controller === "hurco_winmax") {
      lines.push("  writeBlock(mFormat.format(128)); // TCPM ON");
      lines.push("  writeBlock(gFormat.format(43.4)); // TCP mode");
    } else if (config.controller === "haas_ngc") {
      lines.push("  writeBlock(gFormat.format(234), hFormat.format(currentTool)); // TCPC");
    } else if (config.controller === "heidenhain_tnc") {
      lines.push('  writeBlock("M128"); // TCPM ON');
      lines.push('  writeBlock("FUNCTION TCPM F TCP AXIS POS PATHCTRL AXIS");');
    } else if (config.controller === "siemens_sinumerik") {
      lines.push("  writeBlock(\"TRAORI\"); // TCP transformation ON");
    } else if (config.controller === "fanuc") {
      lines.push("  writeBlock(gFormat.format(43.4), hFormat.format(currentTool)); // TCP");
    } else {
      lines.push("  // TCP activation - controller specific");
    }
    lines.push("  tcpActive = true;");
    lines.push("}");
    lines.push("");

    // TCP deactivation
    lines.push("function deactivateTCP() {");
    lines.push("  if (!tcpActive) return;");
    if (config.controller === "hurco_winmax") {
      lines.push("  writeBlock(mFormat.format(129)); // TCPM OFF");
    } else if (config.controller === "haas_ngc") {
      lines.push("  writeBlock(gFormat.format(49)); // Cancel TCPC");
    } else if (config.controller === "heidenhain_tnc") {
      lines.push('  writeBlock("M129"); // TCPM OFF');
    } else if (config.controller === "siemens_sinumerik") {
      lines.push("  writeBlock(\"TRAFOOF\"); // Cancel TCP transformation");
    } else if (config.controller === "fanuc") {
      lines.push("  writeBlock(gFormat.format(49)); // Cancel TCP");
    } else {
      lines.push("  // TCP deactivation - controller specific");
    }
    lines.push("  tcpActive = false;");
    lines.push("}");
    lines.push("");

    // Tilted work plane
    lines.push("function setTiltedWorkPlane(a, b, c) {");
    if (config.controller === "hurco_winmax") {
      lines.push('  writeBlock(gFormat.format(68.2), "A" + abcFormat.format(a), "B" + abcFormat.format(b), "C" + abcFormat.format(c));');
    } else if (config.controller === "haas_ngc") {
      lines.push("  writeBlock(gFormat.format(254)); // DWO ON");
      lines.push('  writeBlock(gFormat.format(68.2), "A" + abcFormat.format(a), "B" + abcFormat.format(b), "C" + abcFormat.format(c));');
    } else if (config.controller === "heidenhain_tnc") {
      lines.push('  writeBlock("PLANE SPATIAL SPA" + abcFormat.format(a) + " SPB" + abcFormat.format(b) + " SPC" + abcFormat.format(c) + " STAY");');
    } else if (config.controller === "siemens_sinumerik") {
      lines.push('  writeBlock("CYCLE800(1, \\"SWIVEL\\", 0, 27, 0, 0, 0, " + abcFormat.format(a) + ", " + abcFormat.format(b) + ", " + abcFormat.format(c) + ", 0, 0, 0, -1)");');
    } else if (config.controller === "fanuc") {
      lines.push('  writeBlock(gFormat.format(68.2), "A" + abcFormat.format(a), "B" + abcFormat.format(b), "C" + abcFormat.format(c));');
    } else {
      lines.push("  // Tilted work plane - controller specific");
    }
    lines.push("}");
    lines.push("");

    lines.push("function cancelTiltedWorkPlane() {");
    if (config.controller === "hurco_winmax") {
      lines.push("  writeBlock(gFormat.format(69));");
    } else if (config.controller === "haas_ngc") {
      lines.push("  writeBlock(gFormat.format(255)); // DWO OFF");
      lines.push("  writeBlock(gFormat.format(69));");
    } else if (config.controller === "heidenhain_tnc") {
      lines.push('  writeBlock("PLANE RESET STAY");');
    } else if (config.controller === "siemens_sinumerik") {
      lines.push("  writeBlock(\"CYCLE800()\");");
    } else {
      lines.push("  writeBlock(gFormat.format(69));");
    }
    lines.push("}");
    lines.push("");

    // 5-axis motion
    lines.push("function onRapid5D(x, y, z, a, b, c) {");
    lines.push("  writeBlock(gFormat.format(0),");
    lines.push("    xOutput.format(x),");
    lines.push("    yOutput.format(y),");
    lines.push("    zOutput.format(z),");
    lines.push("    aOutput.format(a),");
    lines.push("    bOutput.format(b),");
    lines.push("    cOutput.format(c)");
    lines.push("  );");
    lines.push("  currentA = a; currentB = b; currentC = c;");
    lines.push("}");
    lines.push("");
    lines.push("function onLinear5D(x, y, z, a, b, c, feed) {");
    lines.push("  writeBlock(gFormat.format(1),");
    lines.push("    xOutput.format(x),");
    lines.push("    yOutput.format(y),");
    lines.push("    zOutput.format(z),");
    lines.push("    aOutput.format(a),");
    lines.push("    bOutput.format(b),");
    lines.push("    cOutput.format(c),");
    lines.push("    feedOutput.format(feed)");
    lines.push("  );");
    lines.push("  currentA = a; currentB = b; currentC = c;");
    lines.push("}");
    lines.push("");
  }

  /**
   * Get default file extension for controller
   */
  private _getDefaultExtension(controller: ControllerFamily): string {
    const extensions: Record<ControllerFamily, string> = {
      hurco_winmax: "nc",
      haas_ngc: "nc",
      fanuc: "nc",
      okuma_osp: "min",
      heidenhain_tnc: "h",
      siemens_sinumerik: "mpf",
      mazatrol: "eia",
      brother_c00: "nc",
      mitsubishi: "nc",
      fagor: "nc",
      centroid: "nc",
      generic_iso: "nc",
    };
    return extensions[controller] || "nc";
  }

  /**
   * Get default cycles if not available in profile
   */
  private _getDefaultCycles(controller: ControllerFamily): CycleDefinition[] {
    return [
      {
        name: "Drilling",
        gCode: "G81",
        description: "Basic drilling cycle",
        parameters: [
          { letter: "X", description: "X position", required: true },
          { letter: "Y", description: "Y position", required: true },
          { letter: "Z", description: "Z depth", required: true },
          { letter: "R", description: "Retract plane", required: true },
          { letter: "F", description: "Feedrate", required: true },
        ],
        notes: ["Standard ISO drilling cycle"],
      },
      {
        name: "Peck Drilling",
        gCode: "G83",
        description: "Deep hole peck drilling",
        parameters: [
          { letter: "X", description: "X position", required: true },
          { letter: "Y", description: "Y position", required: true },
          { letter: "Z", description: "Z depth", required: true },
          { letter: "R", description: "Retract plane", required: true },
          { letter: "Q", description: "Peck increment", required: true },
          { letter: "F", description: "Feedrate", required: true },
        ],
        notes: ["Full retract between pecks"],
      },
      {
        name: "Tapping",
        gCode: "G84",
        description: "Rigid tapping cycle",
        parameters: [
          { letter: "X", description: "X position", required: true },
          { letter: "Y", description: "Y position", required: true },
          { letter: "Z", description: "Z depth", required: true },
          { letter: "R", description: "Retract plane", required: true },
          { letter: "F", description: "Pitch feedrate", required: true },
        ],
        notes: ["Synchronized spindle/feed"],
      },
    ];
  }

  /**
   * Get default M-codes if not available in profile
   */
  private _getDefaultMCodes(controller: ControllerFamily): MCodeMapping[] {
    return [
      { mCode: 0, description: "Program Stop", category: "special" },
      { mCode: 1, description: "Optional Stop", category: "special" },
      { mCode: 3, description: "Spindle CW", category: "spindle" },
      { mCode: 4, description: "Spindle CCW", category: "spindle" },
      { mCode: 5, description: "Spindle Stop", category: "spindle" },
      { mCode: 6, description: "Tool Change", category: "tool" },
      { mCode: 8, description: "Coolant On", category: "coolant" },
      { mCode: 9, description: "Coolant Off", category: "coolant" },
      { mCode: 30, description: "Program End", category: "special" },
    ];
  }

  /**
   * Wrap text to specified width
   */
  private _wrapText(text: string, width: number): string[] {
    const words = text.split(" ");
    const lines: string[] = [];
    let currentLine = "";

    for (const word of words) {
      if ((currentLine + " " + word).length > width) {
        if (currentLine) lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = currentLine ? currentLine + " " + word : word;
      }
    }
    if (currentLine) lines.push(currentLine);

    return lines;
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const masterPostGeneratorEngine = new MasterPostGeneratorEngine();

// Default export for convenience
export default masterPostGeneratorEngine;
