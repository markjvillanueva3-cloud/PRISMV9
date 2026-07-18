/**
 * PPG Test Fixture Schema — PPG Test Infrastructure (Part A2)
 *
 * Canonical interfaces for PPG test fixtures. Every test uses these types
 * to ensure parameterized, controller-agnostic test specifications.
 *
 * Same geometry + material + tool → different controller output.
 */

import type { MachineConfig } from "./gcode-comparator.js";

// ============================================================================
// CONTROLLER DEFINITION
// ============================================================================

export interface ControllerDef {
  id: string;
  name: string;
  base_family: "fanuc" | "siemens" | "heidenhain" | "mazak" | "okuma" | "other";
  safe_start: string;
  program_start: string[];
  program_end: string[];
  tool_change: string;       // template: T{t} M06\nG43 H{h}
  comment_open: string;
  comment_close: string;
  canned_cycles: {
    drill: string;
    peck_drill: string;
    tap: string;
    bore: string;
    cancel: string;
  };
}

// ============================================================================
// GEOMETRY & FEATURES
// ============================================================================

export type FeatureType =
  | "pocket_2d" | "pocket_3d" | "contour" | "face"
  | "hole_drill" | "hole_peck" | "hole_tap" | "hole_bore" | "hole_ream"
  | "chamfer" | "engrave" | "slot" | "thread_mill"
  | "3d_parallel" | "3d_scallop" | "3d_pencil" | "3d_steep_shallow" | "swarf"
  | "4th_axis_index" | "3plus2_positional" | "5axis_simultaneous"
  | "turning_rough" | "turning_finish" | "turning_thread" | "turning_groove" | "turning_parting";

export interface Feature {
  type: FeatureType;
  description: string;
  depth?: number;
  width?: number;
  length?: number;
  diameter?: number;
  pitch?: number;           // for threads/taps
  tolerance?: string;       // e.g., "H7", "±0.025mm"
}

export interface CanonicalGeometry {
  description: string;        // e.g., "4x4x1 inch block, 0.5 deep pocket"
  stock: [number, number, number]; // L, W, H in mm
  features: Feature[];
  unit: "mm" | "inch";
}

// ============================================================================
// TOOL FIXTURE
// ============================================================================

export type ToolType =
  | "endmill" | "ball_endmill" | "bull_nose" | "face_mill"
  | "drill" | "peck_drill" | "tap" | "reamer" | "boring_bar"
  | "chamfer_mill" | "thread_mill" | "insert_mill" | "slot_drill"
  | "turning_insert" | "grooving_insert" | "threading_insert" | "parting_blade";

export interface ToolFixture {
  number: number;             // T1, T2, ...
  type: ToolType;
  diameter: number;           // mm
  flutes: number;
  description: string;        // e.g., "1/2 4FL CARBIDE EM"
  offset_number: number;      // H1, H2, ... MUST match T number
  expected_rpm: number;
  expected_feed: number;      // mm/min for milling, mm/rev for turning
  expected_sfm?: number;      // surface feet/min (reference)
  expected_ipt?: number;      // inches per tooth (reference)
  material?: "carbide" | "hss" | "cermet" | "ceramic" | "cbn" | "pcd";
  coating?: string;
  corner_radius?: number;     // mm
  flute_length?: number;      // mm
  overall_length?: number;    // mm
}

// ============================================================================
// OPERATION FIXTURE
// ============================================================================

export type OperationType =
  | "face_mill" | "pocket_2d" | "contour_2d" | "adaptive_2d" | "slot"
  | "chamfer" | "engrave" | "drill" | "peck_drill" | "chip_break"
  | "tap_rigid" | "bore" | "ream" | "thread_mill"
  | "3d_parallel" | "3d_scallop" | "3d_pencil" | "3d_steep_shallow" | "swarf"
  | "4th_axis_index" | "3plus2_positional" | "5axis_simultaneous"
  | "css_turning" | "rough_turning_g71" | "finish_turning_g70"
  | "threading_g76" | "grooving" | "parting";

export interface OperationFixture {
  id: string;                 // e.g., "op1-face-mill"
  type: OperationType;
  tool_number: number;
  wcs?: string;               // e.g., "G54"
  depth_of_cut?: number;      // ap in mm
  width_of_cut?: number;      // ae in mm
  stepover?: number;          // percent or mm
  coolant?: "flood" | "mist" | "tsc" | "air" | "none";
  notes?: string;
}

// ============================================================================
// MATERIAL FIXTURE
// ============================================================================

export interface MaterialFixture {
  name: string;               // e.g., "AISI 4140"
  iso_group: "P" | "M" | "K" | "N" | "S" | "H";
  hardness_HB?: number;
  hardness_HRC?: number;
  kc1_1: number;              // Kienzle specific cutting force (N/mm²)
  mc: number;                 // Kienzle exponent
  source: string;             // e.g., "Altintas Table 2.1"
}

// ============================================================================
// EXPECTED OUTPUT
// ============================================================================

export interface ExpectedProperties {
  no_nan: boolean;
  feeds_integer_milling: boolean;
  feeds_precise_tapping: boolean;
  within_machine_limits: boolean;
  safe_start_present: boolean;
  program_end_present: boolean;
}

// ============================================================================
// MAIN FIXTURE INTERFACE
// ============================================================================

export interface PPGTestFixture {
  id: string;                               // e.g., "face-mill-4140-haas"
  description: string;
  geometry: CanonicalGeometry;
  machine: MachineConfig & {
    brand: string;
    model: string;
    controller: string;
    travel: [number, number, number];
  };
  material: MaterialFixture;
  tools: ToolFixture[];
  operations: OperationFixture[];
  expected_output?: Record<string, string>;  // golden G-code per controller ID
  expected_properties: ExpectedProperties;
}

// ============================================================================
// CANONICAL FIXTURES — Reusable across tests
// ============================================================================

/** Haas VF-2 machine config — fully populated from MachineRegistry */
export const HAAS_VF2: PPGTestFixture["machine"] = {
  brand: "Haas",
  model: "VF-2",
  controller: "haas_ngc",
  max_rpm: 8100,
  max_feed: 16510,    // mm/min (650 IPM)
  max_power_kw: 22.4,
  travel: [762, 406, 508], // mm
};

/** Fanuc-controlled generic 3-axis VMC */
export const FANUC_VMC: PPGTestFixture["machine"] = {
  brand: "Generic",
  model: "VMC-3AX",
  controller: "fanuc_31i",
  max_rpm: 12000,
  max_feed: 15000,
  max_power_kw: 18.5,
  travel: [800, 500, 500],
};

/** Siemens 840D 5-axis config */
export const SIEMENS_5AX: PPGTestFixture["machine"] = {
  brand: "DMG MORI",
  model: "DMU 50",
  controller: "siemens_840d",
  max_rpm: 18000,
  max_feed: 20000,
  max_power_kw: 25,
  travel: [650, 520, 475],
};

/** AISI 4140 pre-hard (28-32 HRC) — most common job shop material */
export const MATERIAL_4140: MaterialFixture = {
  name: "AISI 4140",
  iso_group: "P",
  hardness_HB: 285,
  hardness_HRC: 30,
  kc1_1: 1700,   // N/mm² — Altintas Table 2.1 p.37-38
  mc: 0.25,      // Kienzle exponent
  source: "Altintas Manufacturing Automation 2nd Ed 2012 Table 2.1",
};

/** 6061-T6 Aluminum — high-speed machining reference */
export const MATERIAL_6061: MaterialFixture = {
  name: "6061-T6",
  iso_group: "N",
  hardness_HB: 95,
  kc1_1: 600,    // N/mm²
  mc: 0.23,
  source: "Machining Data Handbook 3rd Ed 1980",
};

/** 316L Stainless — difficult to machine, tests aggressive S/F limits */
export const MATERIAL_316L: MaterialFixture = {
  name: "316L Stainless",
  iso_group: "M",
  hardness_HB: 217,
  kc1_1: 2100,   // N/mm²
  mc: 0.26,
  source: "Sharman 2004 Table 3",
};

/** Ti-6Al-4V — aerospace reference, mandatory flood coolant */
export const MATERIAL_TI64: MaterialFixture = {
  name: "Ti-6Al-4V",
  iso_group: "S",
  hardness_HB: 334,
  hardness_HRC: 36,
  kc1_1: 1350,   // N/mm²
  mc: 0.22,
  source: "Altintas Manufacturing Automation 2nd Ed 2012 Table 2.1",
};

/** Default expected properties — all safety checks enabled */
export const DEFAULT_EXPECTED_PROPERTIES: ExpectedProperties = {
  no_nan: true,
  feeds_integer_milling: true,
  feeds_precise_tapping: true,
  within_machine_limits: true,
  safe_start_present: true,
  program_end_present: true,
};

/** Standard 3-tool milling setup: face mill, endmill, drill */
export const STANDARD_3TOOL_SETUP: ToolFixture[] = [
  {
    number: 1, type: "face_mill", diameter: 50.8, flutes: 5,
    description: "2in 5FL INSERT FACE MILL", offset_number: 1,
    expected_rpm: 2400, expected_feed: 1200,
    material: "carbide", coating: "TiAlN",
  },
  {
    number: 2, type: "endmill", diameter: 12.7, flutes: 4,
    description: "1/2in 4FL CARBIDE EM", offset_number: 2,
    expected_rpm: 6000, expected_feed: 960,
    material: "carbide", coating: "AlTiN", corner_radius: 0,
    flute_length: 25.4, overall_length: 76.2,
  },
  {
    number: 3, type: "drill", diameter: 8.5, flutes: 2,
    description: "8.5mm CARBIDE DRILL", offset_number: 3,
    expected_rpm: 4000, expected_feed: 480,
    material: "carbide", coating: "TiN",
  },
];
