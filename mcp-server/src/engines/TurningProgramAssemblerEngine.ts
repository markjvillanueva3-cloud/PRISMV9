/**
 * TurningProgramAssemblerEngine — Complete Turning/Lathe Program Generation Pipeline
 *
 * The lathe equivalent of CNCProgramAssemblerEngine. Accepts a part description
 * (OD/ID profile, features like grooves/threads/chamfers) and generates a complete
 * turning G-code program by orchestrating existing lathe engines into a single pipeline.
 *
 * Pipeline:
 *   1. Analyze part profile → determine required operations (OD/ID/special)
 *   2. Auto-assign tools to turret stations T01–T12 (or use user-provided)
 *   3. Sequence operations: face → OD rough (G71) → OD finish (G70) → OD grooves →
 *      OD threads → drill/bore ID → ID grooves → ID threads → chamfers → part-off
 *   4. Compute S/F per operation via inline material DB + Kienzle cutting force model
 *   5. Generate G-code blocks (Fanuc-style default, Haas/Mazak/Okuma variants)
 *   6. Safe start (G50 Smax, G28, T0100 home), CSS (G96/G97), TNRC (G41/G42)
 *   7. Bar-fed loop (M99) when applicable
 *   8. Estimate cycle time from MRR, rapid distances, tool changes
 *
 * Exhaustive Lathe Coverage (20 operation types):
 *   OD: roughing, finishing, facing, grooving, threading, parting, taper, contouring, knurling
 *   ID: center drill, drilling, boring, ID grooving, ID threading, reaming, tapping
 *   Special: chamfering, radius turning, live tooling (C/Y-axis), sub-spindle transfer
 *
 * Tool Types Recognized (30+):
 *   External: CNMG, DNMG, WNMG, VNMG, TNMG, CCMT/CCGT, DCMT/DCGT, VCMT/VCGT, RCMT/RCGT, Wiper
 *   Grooving/Parting: GX-series (2-6mm), cut-off blades (2-4mm)
 *   Threading: full profile 60°/55°, partial profile, thread whirl
 *   Boring: steel bars (L/D≤4), carbide (L/D≤6), anti-vibration (L/D≤10), mini bars (⌀6-12)
 *   Drilling: twist (HSS/carbide), indexable, gun drill (L/D>10), center drill A2 60°
 *   Special: knurling wheels, thread taps, reamers
 *
 * Pure computation — no filesystem, no external dependencies.
 *
 * @module engines/TurningProgramAssemblerEngine
 */

import { log } from "../utils/Logger.js";

// ============================================================================
// TYPES
// ============================================================================

/** Standard PRISM return wrapper with generic payload. */
export interface AtomicValue<T> {
  value: T;
  unit: string;
  formula?: string;
  confidence?: number;
}

/** Supported CNC controller families for turning. */
export type TurningController = "fanuc" | "haas" | "mazak" | "okuma";

/** OD profile point — defines the finished contour from right to left (Z+ to Z−). */
export interface ProfilePoint {
  z_mm: number;
  x_mm: number;
  /** If non-zero, interpolate an arc of this radius between this point and the next. */
  radius_mm?: number;
}

/**
 * Complete turning part description: bar stock, OD/ID profiles, and all features.
 * Z=0 is the part face (right end). Positive Z is toward the chuck.
 */
export interface TurningPartProfile {
  /** Raw bar stock outer diameter [mm]. */
  bar_diameter_mm: number;
  /** Raw bar stock length (cut-off length) [mm]. */
  bar_length_mm: number;
  /** Material name for speed/feed lookup. */
  material: string;

  /** OD finished profile points from right (Z=0) to left (Z negative = toward chuck). */
  od_profile: ProfilePoint[];

  /** OD grooves (radial plunge). */
  od_grooves?: { z_position_mm: number; width_mm: number; depth_mm: number; bottom_radius_mm?: number }[];
  /** OD single-point threads (G76). */
  od_threads?: { z_start_mm: number; z_end_mm: number; pitch_mm: number; major_dia_mm: number; thread_type?: string }[];
  /** OD chamfers at specific Z positions. */
  od_chamfers?: { z_position_mm: number; size_mm: number }[];
  /** OD knurling zones. */
  od_knurl?: { z_start_mm: number; z_end_mm: number; pitch_mm: number; pattern?: string }[];

  /** Whether to spot drill before main drilling. */
  center_drill?: boolean;
  /** Main drill diameter [mm]. */
  drill_diameter_mm?: number;
  /** Drill depth from face [mm] (positive value). */
  drill_depth_mm?: number;
  /** Through-drill flag — if true, drill exits part. */
  drill_through?: boolean;
  /** Bore (ID) finished profile for G71/G70 ID cycles. */
  bore_profile?: ProfilePoint[];
  /** ID groove features. */
  id_grooves?: { z_position_mm: number; width_mm: number; depth_mm: number }[];
  /** ID threads (G76 internal). */
  id_threads?: { z_start_mm: number; z_end_mm: number; pitch_mm: number; minor_dia_mm: number }[];
  /** Reaming finish hole diameter [mm]. */
  ream_diameter_mm?: number;
  /** Tap specification string, e.g. "M10x1.5". */
  tap_size?: string;

  /** Part tolerance for finishing passes [mm]. */
  finish_tolerance_mm?: number;
  /** Target surface finish [µm Ra]. */
  surface_finish_Ra_um?: number;

  /** Part-off blade width [mm]. If provided, a part-off operation is appended. */
  part_off_width_mm?: number;
}

/** Turret tool assignment for a single station. */
export interface TurningToolAssignment {
  /** Turret position 1–12. */
  station: number;
  /** Tool type key, e.g. "CNMG_roughing", "VNMG_finishing". */
  tool_type: string;
  /** Human-readable description. */
  description: string;
  /** ISO insert shape code, e.g. "C", "D", "V", "T". */
  insert_shape?: string;
  /** Nose radius [mm]. */
  nose_radius_mm: number;
  /** Tool orientation code 1–9 per ISO 1832 (for TNRC direction). */
  orientation: number;
  /** Geometry offset register number. */
  offset_number: number;
  /** Wear offset register number. */
  wear_offset_number: number;
}

/** A single turning operation within the program. */
export interface TurningOperation {
  /** Operation type key. */
  type: string;
  /** Human-readable name. */
  name: string;
  /** Tool station used. */
  tool_station: number;
  /** Spindle speed [RPM] or surface speed [m/min] for CSS. */
  speed_value: number;
  /** Whether CSS (G96) or direct RPM (G97). */
  css_mode: boolean;
  /** Feed rate [mm/rev] for turning, [mm/min] for drilling. */
  feed_rate: number;
  /** Feed unit. */
  feed_unit: "mm/rev" | "mm/min";
  /** Depth of cut per pass [mm]. */
  doc_mm: number;
  /** Generated G-code lines for this operation. */
  gcode_lines: string[];
  /** Estimated cutting time [s]. */
  estimated_time_s: number;
  /** Internal: stochastic S/F result for uncertainty aggregation. */
  _sf?: SFResult;
}

/** Stochastic uncertainty envelope for the assembled program. */
export interface TurningUncertainty {
  /** 95% CI on cutting force [N] across all operations. */
  force_ci95: [number, number];
  /** 95% CI on tool life [min] across all operations. */
  life_ci95: [number, number];
  /** 95% CI on surface finish Ra [µm]. */
  finish_ci95: [number, number];
  /** Probability of chatter (0–1). */
  p_chatter: number;
  /** 95% CI on max deflection [mm]. */
  deflection_ci95: [number, number];
  /** Dominant source of uncertainty. */
  dominant_uncertainty: string;
  /** Overall confidence score (0–1). */
  overall_confidence: number;
}

/** Stochastic S/F result from computeSF. */
interface SFResult {
  Vc: number;
  fn: number;
  confidence: number;
  force_ci95: [number, number];
  life_ci95: [number, number];
  p_chatter: number;
}

/** Complete assembled turning program. */
export interface TurningProgram {
  /** Program number string, e.g. "O0001". */
  program_number: string;
  /** Header comment lines. */
  header_comments: string[];
  /** Safe start block (G50, G28, etc.). */
  safe_start_block: string;
  /** Assigned tool list. */
  tool_list: TurningToolAssignment[];
  /** Sequenced operations with embedded G-code. */
  operations: TurningOperation[];
  /** Complete concatenated G-code output. */
  gcode: string;
  /** Estimated total cycle time [s]. */
  estimated_cycle_time_s: number;
  /** Warnings and advisories. */
  warnings: string[];
  /** Stochastic uncertainty envelope (Monte Carlo on Kienzle + Taylor). */
  uncertainty?: TurningUncertainty;
}

/** Input for assembleTurningProgram. */
export interface TurningAssemblyInput {
  /** Part geometry and features. */
  part: TurningPartProfile;
  /** Target controller dialect (default: fanuc). */
  controller?: TurningController;
  /** Machine max spindle RPM for G50 clamp. */
  machine_max_rpm?: number;
  /** Bar-fed mode — adds M99 loop at end. */
  bar_fed?: boolean;
  /** User-provided tool assignments (auto-assigned if omitted). */
  tools?: TurningToolAssignment[];
  /** Max machine power [kW] for power-limiting checks. */
  machine_power_kw?: number;
  /** Program number (default 1). */
  program_number?: number;
  /** Part name for header comments. */
  part_name?: string;
}

/** Input for autoSelectTools. */
export interface AutoSelectToolsInput {
  /** Part geometry and features. */
  part: TurningPartProfile;
  /** Available tool types to choose from (all if omitted). */
  available_tools?: string[];
}

/** Input for estimateCycleTime. */
export interface CycleTimeInput {
  /** Part geometry. */
  part: TurningPartProfile;
  /** Tool assignments. */
  tools: TurningToolAssignment[];
  /** Sequenced operations. */
  operations: TurningOperation[];
}

/** Cycle time breakdown result. */
export interface CycleTimeResult {
  /** Total cycle time [s]. */
  total_s: number;
  /** Total cutting (feed) time [s]. */
  cutting_s: number;
  /** Total rapid traverse time [s]. */
  rapid_s: number;
  /** Total tool change time [s]. */
  tool_change_s: number;
  /** Per-operation breakdown. */
  breakdown: Record<string, number>;
}

/** Input for validateProgram. */
export interface ValidateProgramInput {
  /** Part geometry. */
  part: TurningPartProfile;
  /** Tool assignments. */
  tools: TurningToolAssignment[];
  /** Max spindle RPM. */
  machine_max_rpm?: number;
  /** Chuck type. */
  chuck_type?: "3_jaw" | "collet" | "4_jaw" | "fixture";
  /** Max spindle power [kW]. */
  max_power_kw?: number;
}

/** Single validation check result. */
export interface ValidationCheck {
  name: string;
  pass: boolean;
  value: number;
  limit: number;
}

/** Validation result. */
export interface ValidationResult {
  /** Overall safe flag. */
  safe: boolean;
  /** Individual check results. */
  checks: ValidationCheck[];
  /** Warning messages. */
  warnings: string[];
}

// ============================================================================
// MATERIAL DATABASE — Inline turning speed/feed data
// ============================================================================

interface TurningMaterialData {
  /** Cutting speed for roughing [m/min]. */
  Vc_rough: number;
  /** Cutting speed for finishing [m/min]. */
  Vc_finish: number;
  /** Feed per rev for roughing [mm/rev]. */
  fn_rough: number;
  /** Feed per rev for finishing [mm/rev]. */
  fn_finish: number;
  /** Specific cutting force kc1.1 [N/mm²] for Kienzle. */
  kc1_1: number;
  /** Kienzle exponent mc. */
  mc: number;
  /** Drill speed [m/min]. */
  Vc_drill: number;
  /** Drill feed [mm/rev]. */
  fn_drill: number;
  /** Threading speed [m/min]. */
  Vc_thread: number;
  /** Grooving speed multiplier (fraction of Vc_rough). */
  groove_Vc_factor: number;
  /** Part-off speed multiplier. */
  partoff_Vc_factor: number;
}

const MATERIAL_DB: Record<string, TurningMaterialData> = {
  steel: {
    Vc_rough: 200, Vc_finish: 280, fn_rough: 0.25, fn_finish: 0.12,
    kc1_1: 1800, mc: 0.26, Vc_drill: 80, fn_drill: 0.18,
    Vc_thread: 60, groove_Vc_factor: 0.6, partoff_Vc_factor: 0.5,
  },
  aluminum: {
    Vc_rough: 500, Vc_finish: 600, fn_rough: 0.20, fn_finish: 0.08,
    kc1_1: 700, mc: 0.23, Vc_drill: 120, fn_drill: 0.20,
    Vc_thread: 80, groove_Vc_factor: 0.7, partoff_Vc_factor: 0.6,
  },
  titanium: {
    Vc_rough: 50, Vc_finish: 80, fn_rough: 0.15, fn_finish: 0.08,
    kc1_1: 1400, mc: 0.22, Vc_drill: 25, fn_drill: 0.10,
    Vc_thread: 20, groove_Vc_factor: 0.5, partoff_Vc_factor: 0.4,
  },
  stainless: {
    Vc_rough: 150, Vc_finish: 200, fn_rough: 0.20, fn_finish: 0.10,
    kc1_1: 2100, mc: 0.27, Vc_drill: 60, fn_drill: 0.15,
    Vc_thread: 40, groove_Vc_factor: 0.55, partoff_Vc_factor: 0.45,
  },
  cast_iron: {
    Vc_rough: 180, Vc_finish: 250, fn_rough: 0.25, fn_finish: 0.15,
    kc1_1: 1100, mc: 0.28, Vc_drill: 70, fn_drill: 0.20,
    Vc_thread: 50, groove_Vc_factor: 0.6, partoff_Vc_factor: 0.5,
  },
  inconel: {
    Vc_rough: 30, Vc_finish: 50, fn_rough: 0.12, fn_finish: 0.06,
    kc1_1: 2800, mc: 0.25, Vc_drill: 15, fn_drill: 0.08,
    Vc_thread: 12, groove_Vc_factor: 0.45, partoff_Vc_factor: 0.35,
  },
  brass: {
    Vc_rough: 300, Vc_finish: 400, fn_rough: 0.20, fn_finish: 0.10,
    kc1_1: 780, mc: 0.18, Vc_drill: 100, fn_drill: 0.18,
    Vc_thread: 70, groove_Vc_factor: 0.7, partoff_Vc_factor: 0.6,
  },
  copper: {
    Vc_rough: 250, Vc_finish: 350, fn_rough: 0.18, fn_finish: 0.08,
    kc1_1: 800, mc: 0.20, Vc_drill: 90, fn_drill: 0.16,
    Vc_thread: 60, groove_Vc_factor: 0.65, partoff_Vc_factor: 0.55,
  },
  plastic: {
    Vc_rough: 400, Vc_finish: 500, fn_rough: 0.15, fn_finish: 0.06,
    kc1_1: 300, mc: 0.15, Vc_drill: 80, fn_drill: 0.12,
    Vc_thread: 50, groove_Vc_factor: 0.7, partoff_Vc_factor: 0.6,
  },
};

// ============================================================================
// INSERT GEOMETRY DATA
// ============================================================================

interface InsertGeometry {
  /** Included angle [°]. */
  angle_deg: number;
  /** Max depth of cut capability [mm]. */
  max_doc_mm: number;
  /** Typical nose radius range [mm]. */
  typical_nose_r_mm: number;
  /** Suitable for roughing. */
  roughing: boolean;
  /** Suitable for finishing. */
  finishing: boolean;
  /** ISO orientation (external OD, typical). */
  orientation: number;
}

const INSERT_DB: Record<string, InsertGeometry> = {
  CNMG: { angle_deg: 80, max_doc_mm: 8.0, typical_nose_r_mm: 0.8, roughing: true, finishing: false, orientation: 3 },
  DNMG: { angle_deg: 55, max_doc_mm: 5.0, typical_nose_r_mm: 0.4, roughing: true, finishing: true, orientation: 3 },
  WNMG: { angle_deg: 80, max_doc_mm: 8.0, typical_nose_r_mm: 0.8, roughing: true, finishing: false, orientation: 3 },
  VNMG: { angle_deg: 35, max_doc_mm: 3.5, typical_nose_r_mm: 0.4, roughing: false, finishing: true, orientation: 3 },
  TNMG: { angle_deg: 60, max_doc_mm: 5.0, typical_nose_r_mm: 0.4, roughing: true, finishing: true, orientation: 3 },
  CCMT: { angle_deg: 80, max_doc_mm: 4.0, typical_nose_r_mm: 0.4, roughing: false, finishing: true, orientation: 3 },
  CCGT: { angle_deg: 80, max_doc_mm: 4.0, typical_nose_r_mm: 0.2, roughing: false, finishing: true, orientation: 3 },
  DCMT: { angle_deg: 55, max_doc_mm: 3.0, typical_nose_r_mm: 0.4, roughing: false, finishing: true, orientation: 3 },
  DCGT: { angle_deg: 55, max_doc_mm: 3.0, typical_nose_r_mm: 0.2, roughing: false, finishing: true, orientation: 3 },
  VCMT: { angle_deg: 35, max_doc_mm: 2.5, typical_nose_r_mm: 0.4, roughing: false, finishing: true, orientation: 3 },
  VCGT: { angle_deg: 35, max_doc_mm: 2.5, typical_nose_r_mm: 0.2, roughing: false, finishing: true, orientation: 3 },
  RCMT: { angle_deg: 360, max_doc_mm: 3.0, typical_nose_r_mm: 6.0, roughing: false, finishing: true, orientation: 7 },
  RCGT: { angle_deg: 360, max_doc_mm: 3.0, typical_nose_r_mm: 6.0, roughing: false, finishing: true, orientation: 7 },
};

// ============================================================================
// TOOL ORIENTATION MAP (ISO 1832 quadrant coding)
// ============================================================================
// Orientation 1: spindle right, tool above (OD rear)
// Orientation 2: spindle right, tool below (OD front, inverted)
// Orientation 3: spindle left, tool above (OD front — most common)
// Orientation 4: spindle left, tool below (OD rear, inverted)
// Orientation 5-8: ID boring orientations
// Orientation 9: on center-line (drilling/center)

// ============================================================================
// CONTROLLER DIALECT HELPERS
// ============================================================================

interface ControllerDialect {
  /** Program start format. */
  program_start: (num: number) => string;
  /** Program end codes. */
  program_end: string;
  /** Spindle speed clamp code. */
  speed_clamp: (rpm: number) => string;
  /** Home return. */
  home: string;
  /** CSS on. */
  css_on: (vc: number) => string;
  /** Direct RPM. */
  rpm_mode: (rpm: number) => string;
  /** Bar feed loop. */
  bar_loop: string;
  /** Comment wrapper. */
  comment: (text: string) => string;
  /** Coolant on. */
  coolant_on: string;
  /** Coolant off. */
  coolant_off: string;
  /** Spindle CW. */
  spindle_cw: string;
  /** Spindle stop. */
  spindle_stop: string;
  /** Optional stop. */
  optional_stop: string;
  /** Tool change format. */
  tool_change: (station: number, offset: number) => string;
}

const DIALECTS: Record<TurningController, ControllerDialect> = {
  fanuc: {
    program_start: (n) => `O${String(n).padStart(4, "0")}`,
    program_end: "M30",
    speed_clamp: (rpm) => `G50 S${rpm}`,
    home: "G28 U0 W0",
    css_on: (vc) => `G96 S${vc}`,
    rpm_mode: (rpm) => `G97 S${rpm}`,
    bar_loop: "M99",
    comment: (t) => `(${t})`,
    coolant_on: "M08",
    coolant_off: "M09",
    spindle_cw: "M03",
    spindle_stop: "M05",
    optional_stop: "M01",
    tool_change: (s, o) => `T${String(s).padStart(2, "0")}${String(o).padStart(2, "0")}`,
  },
  haas: {
    program_start: (n) => `O${String(n).padStart(5, "0")}`,
    program_end: "M30",
    speed_clamp: (rpm) => `G50 S${rpm}`,
    home: "G28 U0 W0",
    css_on: (vc) => `G96 S${vc}`,
    rpm_mode: (rpm) => `G97 S${rpm}`,
    bar_loop: "M99",
    comment: (t) => `(${t})`,
    coolant_on: "M08",
    coolant_off: "M09",
    spindle_cw: "M03",
    spindle_stop: "M05",
    optional_stop: "M01",
    tool_change: (s, o) => `T${String(s).padStart(2, "0")}${String(o).padStart(2, "0")}`,
  },
  mazak: {
    program_start: (n) => `O${String(n).padStart(4, "0")}`,
    program_end: "M30",
    speed_clamp: (rpm) => `G50 S${rpm}`,
    home: "G28 U0 W0",
    css_on: (vc) => `G96 S${Math.round(vc * 1000 / Math.PI)}`, // Mazak uses surface speed in mm/min internally
    rpm_mode: (rpm) => `G97 S${rpm}`,
    bar_loop: "M99",
    comment: (t) => `(${t})`,
    coolant_on: "M08",
    coolant_off: "M09",
    spindle_cw: "M03",
    spindle_stop: "M05",
    optional_stop: "M01",
    tool_change: (s, o) => `T${String(s).padStart(2, "0")}${String(o).padStart(2, "0")}`,
  },
  okuma: {
    program_start: (n) => `O${String(n).padStart(4, "0")}`,
    program_end: "M02",
    speed_clamp: (rpm) => `G92 S${rpm}`, // Okuma uses G92 for speed clamp
    home: "G28 U0 W0",
    css_on: (vc) => `G96 S${vc}`,
    rpm_mode: (rpm) => `G97 S${rpm}`,
    bar_loop: "M99",
    comment: (t) => `(${t})`,
    coolant_on: "M08",
    coolant_off: "M09",
    spindle_cw: "M03",
    spindle_stop: "M05",
    optional_stop: "M01",
    tool_change: (s, o) => `T${String(s).padStart(2, "0")}${String(o).padStart(2, "0")}`,
  },
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Look up material data by name. Falls back to steel if not found.
 * @param material - Material name (case-insensitive, supports common aliases)
 * @returns Material cutting data
 */
function lookupMaterial(material: string): TurningMaterialData {
  const key = material.toLowerCase().trim();
  // Direct match
  if (MATERIAL_DB[key]) return MATERIAL_DB[key];
  // Alias matching
  if (key.includes("alumin") || key.includes("6061") || key.includes("7075") || key.includes("2024")) return MATERIAL_DB.aluminum;
  if (key.includes("titan") || key.includes("ti-6al") || key.includes("ti6al")) return MATERIAL_DB.titanium;
  if (key.includes("stainless") || key.includes("304") || key.includes("316") || key.includes("17-4")) return MATERIAL_DB.stainless;
  if (key.includes("inconel") || key.includes("718") || key.includes("625") || key.includes("hastelloy") || key.includes("waspaloy")) return MATERIAL_DB.inconel;
  if (key.includes("cast") && key.includes("iron")) return MATERIAL_DB.cast_iron;
  if (key.includes("brass") || key.includes("bronze")) return MATERIAL_DB.brass;
  if (key.includes("copper")) return MATERIAL_DB.copper;
  if (key.includes("plastic") || key.includes("nylon") || key.includes("delrin") || key.includes("peek") || key.includes("acetal")) return MATERIAL_DB.plastic;
  if (key.includes("steel") || key.includes("1045") || key.includes("4140") || key.includes("4340") || key.includes("8620") || key.includes("1018") || key.includes("d2") || key.includes("a2")) return MATERIAL_DB.steel;
  // Default fallback
  return MATERIAL_DB.steel;
}

/**
 * Calculate RPM from cutting speed and diameter.
 * RPM = (Vc × 1000) / (π × D)
 * @param vc_mmin - Cutting speed [m/min]
 * @param diameter_mm - Workpiece diameter at cut [mm]
 * @param max_rpm - Maximum allowable RPM (G50 clamp)
 * @returns Clamped RPM
 */
function calcRPM(vc_mmin: number, diameter_mm: number, max_rpm: number): number {
  if (diameter_mm <= 0) return max_rpm;
  const rpm = (vc_mmin * 1000) / (Math.PI * diameter_mm);
  return Math.min(Math.round(rpm), max_rpm);
}

/**
 * Kienzle cutting force model: Fc = kc1.1 × b × h^(1-mc)
 * where b = ap/sin(κ), h = f × sin(κ), κ = lead angle (typ 90° for turning).
 * @param kc1_1 - Specific cutting force at h=1mm, b=1mm [N/mm²]
 * @param mc - Kienzle exponent
 * @param ap_mm - Depth of cut [mm]
 * @param fn_mm - Feed per revolution [mm/rev]
 * @param lead_angle_deg - Tool lead (approach) angle [°], default 90
 * @returns Cutting force [N]
 */
function kienzleForce(kc1_1: number, mc: number, ap_mm: number, fn_mm: number, lead_angle_deg: number = 90): number {
  const kappa = (lead_angle_deg * Math.PI) / 180;
  const h = fn_mm * Math.sin(kappa);
  const b = ap_mm / Math.sin(kappa);
  if (h <= 0 || b <= 0) return 0;
  const kc = kc1_1 * Math.pow(h, -mc);
  return kc * b * h; // Fc [N]
}

/**
 * Cutting power from Kienzle force.
 * P = Fc × Vc / (60 × 1000) [kW]
 */
function cuttingPower(fc_N: number, vc_mmin: number): number {
  return (fc_N * vc_mmin) / 60000;
}

/**
 * Format a coordinate value to 3 decimal places, stripping trailing zeros.
 */
function fmt(val: number): string {
  return val.toFixed(3).replace(/\.?0+$/, "");
}

/**
 * Parse tap specification string to extract pitch.
 * Supports "M10x1.5", "M8x1.25", "M6x1.0" etc.
 * @param tap_size - Tap spec string
 * @returns { diameter_mm, pitch_mm }
 */
function parseTapSize(tap_size: string): { diameter_mm: number; pitch_mm: number } {
  const match = tap_size.match(/[Mm](\d+(?:\.\d+)?)\s*[x×]\s*(\d+(?:\.\d+)?)/);
  if (match) {
    return { diameter_mm: parseFloat(match[1]), pitch_mm: parseFloat(match[2]) };
  }
  // Fallback: try M10 (coarse pitch table)
  const sizeMatch = tap_size.match(/[Mm](\d+)/);
  if (sizeMatch) {
    const d = parseFloat(sizeMatch[1]);
    const coarsePitch: Record<number, number> = {
      3: 0.5, 4: 0.7, 5: 0.8, 6: 1.0, 8: 1.25, 10: 1.5, 12: 1.75,
      14: 2.0, 16: 2.0, 18: 2.5, 20: 2.5, 22: 2.5, 24: 3.0, 27: 3.0, 30: 3.5,
    };
    return { diameter_mm: d, pitch_mm: coarsePitch[d] ?? 1.5 };
  }
  return { diameter_mm: 10, pitch_mm: 1.5 };
}

/**
 * Estimate distance for rapid traverse time calculation.
 */
function rapidDistance(x1: number, z1: number, x2: number, z2: number): number {
  // Lathe rapids are typically 45° simultaneous X+Z, then remainder
  const dx = Math.abs(x2 - x1);
  const dz = Math.abs(z2 - z1);
  return Math.max(dx, dz); // Simultaneous motion: time = max axis distance
}

// ============================================================================
// ENGINE IMPLEMENTATION
// ============================================================================

/**
 * TurningProgramAssemblerEngine — Orchestrates part description into complete
 * turning G-code with auto speed/feed, tool assignment, cycle time estimation,
 * and safety validation.
 *
 * Covers all 20 lathe operation types (OD/ID/special) and 30+ insert/tool types.
 */
class TurningProgramAssemblerEngineImpl {
  private readonly TOOL_CHANGE_TIME_S = 4.0;
  private readonly RAPID_RATE_MM_MIN = 30000; // Typical lathe rapid traverse
  private readonly DEFAULT_MAX_RPM = 4000;
  private readonly DEFAULT_POWER_KW = 15;

  // ──────────────────────────────────────────────────────────────────────
  // STOCHASTIC S/F + STOCK REMOVAL + DEFLECTION HELPERS
  // ──────────────────────────────────────────────────────────────────────

  /**
   * Compute speed/feed with Monte Carlo uncertainty on Kienzle force + Taylor life.
   * Returns Vc, fn from material DB plus 95% CI on cutting force and tool life.
   *
   * @param material - Material key for lookup
   * @param operation - Operation type string (e.g. "od_rough", "od_finish", "face")
   * @param diameter_mm - Workpiece diameter at cut location [mm]
   * @returns S/F values plus stochastic force/life CIs and chatter probability
   */
  private async computeSF(
    material: string, operation: string, diameter_mm: number
  ): Promise<SFResult> {
    const mat = lookupMaterial(material);
    const isRoughing = operation.includes("rough") || operation === "face";
    const Vc = isRoughing ? mat.Vc_rough : mat.Vc_finish;
    const fn = isRoughing ? mat.fn_rough : mat.fn_finish;

    // Wire SpeedFeedOrchestratorEngine for physics-backed S/F
    try {
      const mod = await import("./SpeedFeedOrchestratorEngine.js");
      const sfOrchestrator = mod.speedFeedOrchestratorEngine;
      if (sfOrchestrator) {
        const sfResult = sfOrchestrator.compute({
          material: material,
          operation: 'turning',
          tool_diameter_mm: diameter_mm,
          workpiece_diameter_mm: diameter_mm,
          cut_type: isRoughing ? 'roughing' : 'finishing',
          coolant_type: 'flood',
        });
        if (sfResult?.value) {
          const uq = sfResult.value.uncertainty as any;
          return {
            Vc: sfResult.value.cutting_speed_mpm ?? Vc,
            fn: sfResult.value.feed_per_tooth_mm ?? fn,
            confidence: sfResult.value.overall_confidence ?? 0.85,
            force_ci95: uq?.force_ci95 ?? [0, 0],
            life_ci95: uq?.life_ci95 ?? [0, 0],
            p_chatter: uq?.p_chatter ?? 0.05,
          };
        }
      }
    } catch { /* fallback to inline Monte Carlo */ }

    // Monte Carlo on Kienzle force + Taylor life (200 trials, PRNG for reproducibility)
    const kc_cv = 0.10; // CoV on kc1.1 (material batch scatter)
    const mc_cv = 0.07; // CoV on mc exponent
    const n_trials = 200;
    let seed = 42;
    const rng = () => { seed = (seed * 1664525 + 1013904223) & 0x7fffffff; return seed / 0x7fffffff; };
    const boxMuller = () => {
      const u1 = Math.max(1e-10, rng());
      return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * rng());
    };

    const forces: number[] = [];
    const lives: number[] = [];
    const ap = diameter_mm > 0 ? Math.min(2.0, diameter_mm * 0.1) : 2.0;

    for (let i = 0; i < n_trials; i++) {
      // Perturb Kienzle parameters
      const kc_s = mat.kc1_1 * (1 + kc_cv * boxMuller());
      const mc_s = mat.mc * (1 + mc_cv * boxMuller());
      const h = Math.max(0.01, fn);
      const Fc = kc_s * ap * Math.pow(h, 1 - mc_s);
      forces.push(Fc);

      // Taylor tool life: T = (C/V)^(1/n) with scatter on n and C
      const n_taylor = 0.25 * (1 + 0.08 * boxMuller());
      const C_taylor = Vc * 1.5 * (1 + 0.15 * boxMuller());
      const T = Math.pow(Math.max(1, C_taylor / Math.max(1, Vc)), 1 / Math.max(0.05, n_taylor));
      lives.push(Math.max(0.1, T));
    }

    forces.sort((a, b) => a - b);
    lives.sort((a, b) => a - b);
    const ci2 = Math.floor(n_trials * 0.025);
    const ci97 = Math.floor(n_trials * 0.975);

    // Chatter probability: higher for finishing (lower DOC, potentially less stable)
    // Base p_chatter is low for turning; increase if L/D or speed is high
    const p_chatter = isRoughing ? 0.03 : 0.07;

    return {
      Vc, fn, confidence: 0.75,
      force_ci95: [forces[ci2], forces[ci97]],
      life_ci95: [lives[ci2], lives[ci97]],
      p_chatter,
    };
  }

  /**
   * Stock removal optimization: constant-power passes.
   * Instead of fixed DOC, calculates optimal DOC per pass to maintain ~80% of max power.
   *
   * Uses Kienzle: P = kc × ap × fn^(1-mc) × Vc / 60000
   * Solve for ap_max: ap = P_target × 60000 / (kc_eff × Vc)
   *
   * @param stockToRemove_mm - Total radial stock to remove [mm]
   * @param maxDoc_mm - Maximum depth of cut [mm] (insert/tool limit)
   * @param maxPower_kw - Machine max spindle power [kW]
   * @param kc1_1 - Specific cutting force at h=1mm [N/mm²]
   * @param mc - Kienzle exponent
   * @param fn - Feed per rev [mm/rev]
   * @param Vc - Cutting speed [m/min]
   * @returns Array of DOC values per pass [mm]
   */
  private optimizeStockRemoval(
    stockToRemove_mm: number, maxDoc_mm: number, maxPower_kw: number,
    kc1_1: number, mc: number, fn: number, Vc: number
  ): number[] {
    const passes: number[] = [];
    let remaining = stockToRemove_mm;

    // Target 80% of max power per pass
    const targetPower = maxPower_kw * 0.8;
    // P = Fc × Vc / 60000, Fc = kc_eff × ap
    // kc_eff = kc1_1 × fn^(−mc) (force per unit width)
    // ap_max = targetPower × 60000 / (kc_eff × Vc)
    const kc_eff = kc1_1 * Math.pow(Math.max(0.01, fn), -mc);
    const ap_power_limited = (targetPower * 60000) / (kc_eff * Math.max(1, Vc));
    const ap_per_pass = Math.min(maxDoc_mm, Math.max(0.3, ap_power_limited));

    while (remaining > 0.05) { // leave 0.05mm for finish
      const thisPass = Math.min(ap_per_pass, remaining - 0.05);
      if (thisPass < 0.1) {
        passes.push(remaining);
        remaining = 0;
      } else {
        passes.push(thisPass);
        remaining -= thisPass;
      }
      if (passes.length > 50) break; // safety limit
    }

    return passes;
  }

  /**
   * Finish pass depth limited by tool deflection.
   *
   * δ = Fc × L³ / (3 × E × I) where E=200GPa (steel bar), I=πd⁴/64
   * If δ > tolerance/3, reduce ap until δ ≤ tolerance/3.
   *
   * @param Fc_per_mm - Cutting force per mm of DOC [N/mm]
   * @param stickout_mm - Tool stickout from holder [mm]
   * @param bar_diameter_mm - Boring bar or workpiece diameter [mm]
   * @param tolerance_mm - Part tolerance [mm]
   * @returns Optimal finish DOC [mm], clamped to [0.05, 0.5]
   */
  private computeFinishDepth(
    Fc_per_mm: number, stickout_mm: number, bar_diameter_mm: number,
    tolerance_mm: number
  ): number {
    const E = 200e3; // MPa (steel)
    const d = bar_diameter_mm;
    const I = Math.PI * Math.pow(d, 4) / 64; // mm⁴
    const L = stickout_mm;
    const maxDefl = (tolerance_mm || 0.05) / 3;

    // δ = Fc × L³ / (3EI), Fc = Fc_per_mm × ap
    // ap_max = maxDefl × 3 × E × I / (Fc_per_mm × L³)
    if (L <= 0 || Fc_per_mm <= 0 || I <= 0) return 0.3;
    const ap_max = (maxDefl * 3 * E * I) / (Fc_per_mm * Math.pow(L, 3));
    return Math.max(0.05, Math.min(0.5, ap_max));
  }

  // ──────────────────────────────────────────────────────────────────────
  // METHOD 1: assembleTurningProgram
  // ──────────────────────────────────────────────────────────────────────

  /**
   * Main pipeline: analyze part → assign tools → sequence ops → generate G-code.
   *
   * Steps:
   *   a. Analyze part profile to determine required operations
   *   b. Auto-assign tools to turret stations (if not user-provided)
   *   c. Sequence operations in canonical order
   *   d. Per operation: compute S/F via material DB + Kienzle inline
   *   e. Generate G-code blocks per controller dialect
   *   f. Add safe start (G50 Smax, G28, T0100 home)
   *   g. Add CSS blocks (G96/G97)
   *   h. Add TNRC (G41/G42 with nose radius)
   *   i. For bar-fed: add M99 loop
   *   j. Estimate cycle time
   *
   * @param input - Assembly input with part, controller, tools, constraints
   * @returns AtomicValue wrapping the complete TurningProgram
   */
  async assembleTurningProgram(input: TurningAssemblyInput): Promise<AtomicValue<TurningProgram>> {
    const controller = input.controller ?? "fanuc";
    const dialect = DIALECTS[controller];
    const maxRpm = input.machine_max_rpm ?? this.DEFAULT_MAX_RPM;
    const maxPower = input.machine_power_kw ?? this.DEFAULT_POWER_KW;
    const progNum = input.program_number ?? 1;
    const partName = input.part_name ?? "TURNING PART";
    const mat = lookupMaterial(input.part.material);
    const materialName = input.part.material;
    const warnings: string[] = [];
    const engines_called: string[] = [];

    // Wire SpeedFeedOrchestratorEngine for physics-backed S/F
    let orchestratorAvailable = false;
    let sfOrchestrator: any = null;
    try {
      const mod = await import("./SpeedFeedOrchestratorEngine.js");
      sfOrchestrator = mod.speedFeedOrchestratorEngine;
      orchestratorAvailable = true;
      engines_called.push("SpeedFeedOrchestratorEngine");
    } catch { /* fallback to inline */ }

    // Try LathePostProcessorEngine for controller-specific dialect
    let postProcessor: any = null;
    try {
      const mod = await import("./LathePostProcessorEngine.js");
      postProcessor = mod.lathePostProcessorEngine;
      engines_called.push("LathePostProcessorEngine");
    } catch { /* fallback to inline */ }

    // Step a: Determine required operations
    const requiredOps = this.analyzeRequiredOperations(input.part);

    // Step b: Assign tools
    let tools: TurningToolAssignment[];
    if (input.tools && input.tools.length > 0) {
      tools = input.tools;
    } else {
      const autoResult = this.autoSelectTools({ part: input.part });
      tools = autoResult.value;
    }

    // Build station→tool lookup
    const toolMap = new Map<number, TurningToolAssignment>();
    for (const t of tools) toolMap.set(t.station, t);

    // Step c-g: Generate operations in canonical order
    const operations: TurningOperation[] = [];
    let lineNum = 10;
    const lineInc = 10;
    const nl = () => { const n = lineNum; lineNum += lineInc; return `N${n}`; };

    // Helper: find tool by type substring
    const findTool = (typeSubstring: string): TurningToolAssignment | undefined =>
      tools.find(t => t.tool_type.toLowerCase().includes(typeSubstring.toLowerCase()));

    // ---- FACING ----
    if (requiredOps.includes("face")) {
      const tool = findTool("roughing") ?? findTool("CNMG") ?? tools[0];
      const op = await this.generateFacingOp(input.part, tool, mat, maxRpm, dialect, nl);
      operations.push(op);
    }

    // ---- OD ROUGHING (G71) ----
    if (requiredOps.includes("od_rough") && input.part.od_profile.length > 0) {
      const tool = findTool("roughing") ?? findTool("CNMG") ?? tools[0];
      const op = await this.generateOdRoughingOp(input.part, tool, mat, maxRpm, maxPower, dialect, nl, warnings);
      operations.push(op);
    }

    // ---- OD FINISHING (G70) ----
    if (requiredOps.includes("od_finish") && input.part.od_profile.length > 0) {
      const tool = findTool("finishing") ?? findTool("VNMG") ?? tools[0];
      const op = await this.generateOdFinishingOp(input.part, tool, mat, maxRpm, dialect, nl);
      operations.push(op);
    }

    // ---- OD CHAMFERS ----
    if (requiredOps.includes("od_chamfer") && input.part.od_chamfers) {
      const tool = findTool("finishing") ?? findTool("VNMG") ?? tools[0];
      for (const chamfer of input.part.od_chamfers) {
        const op = this.generateChamferOp(chamfer, "od", input.part, tool, mat, maxRpm, dialect, nl);
        operations.push(op);
      }
    }

    // ---- OD GROOVING (G75) ----
    if (requiredOps.includes("od_groove") && input.part.od_grooves) {
      const tool = findTool("grooving") ?? findTool("groove");
      if (tool) {
        for (const groove of input.part.od_grooves) {
          const op = this.generateGrooveOp(groove, "od", input.part, tool, mat, maxRpm, dialect, nl);
          operations.push(op);
        }
      }
    }

    // ---- OD THREADING (G76) ----
    if (requiredOps.includes("od_thread") && input.part.od_threads) {
      const tool = findTool("threading") ?? findTool("thread");
      if (tool) {
        for (const thread of input.part.od_threads) {
          const op = this.generateThreadOp(thread, "od", input.part, tool, mat, maxRpm, dialect, nl);
          operations.push(op);
        }
      }
    }

    // ---- OD KNURLING ----
    if (requiredOps.includes("od_knurl") && input.part.od_knurl) {
      const tool = findTool("knurl");
      if (tool) {
        for (const knurl of input.part.od_knurl) {
          const op = this.generateKnurlOp(knurl, input.part, tool, mat, maxRpm, dialect, nl);
          operations.push(op);
        }
      }
    }

    // ---- CENTER DRILLING ----
    if (requiredOps.includes("center_drill")) {
      const tool = findTool("center") ?? findTool("center_drill");
      if (tool) {
        const op = this.generateCenterDrillOp(input.part, tool, mat, maxRpm, dialect, nl);
        operations.push(op);
      }
    }

    // ---- DRILLING (G74) ----
    if (requiredOps.includes("drill")) {
      const tool = findTool("drill") && !findTool("drill")!.tool_type.includes("center")
        ? findTool("drill")
        : tools.find(t => t.tool_type.toLowerCase().includes("twist") || (t.tool_type.toLowerCase().includes("drill") && !t.tool_type.toLowerCase().includes("center")));
      if (tool) {
        const op = this.generateDrillingOp(input.part, tool, mat, maxRpm, dialect, nl);
        operations.push(op);
      }
    }

    // ---- BORING (G71 ID) ----
    if (requiredOps.includes("bore") && input.part.bore_profile) {
      const tool = findTool("boring") ?? findTool("bore");
      if (tool) {
        const op = this.generateBoringOp(input.part, tool, mat, maxRpm, dialect, nl, warnings);
        operations.push(op);
      }
    }

    // ---- REAMING ----
    if (requiredOps.includes("ream")) {
      const tool = findTool("ream");
      if (tool) {
        const op = this.generateReamingOp(input.part, tool, mat, maxRpm, dialect, nl);
        operations.push(op);
      }
    }

    // ---- TAPPING (G84) ----
    if (requiredOps.includes("tap")) {
      const tool = findTool("tap");
      if (tool) {
        const op = this.generateTappingOp(input.part, tool, mat, maxRpm, dialect, nl);
        operations.push(op);
      }
    }

    // ---- ID GROOVING ----
    if (requiredOps.includes("id_groove") && input.part.id_grooves) {
      const tool = findTool("id_grooving") ?? findTool("id_groove");
      if (tool) {
        for (const groove of input.part.id_grooves) {
          const op = this.generateGrooveOp(groove, "id", input.part, tool, mat, maxRpm, dialect, nl);
          operations.push(op);
        }
      }
    }

    // ---- ID THREADING ----
    if (requiredOps.includes("id_thread") && input.part.id_threads) {
      const tool = findTool("id_threading") ?? findTool("id_thread");
      if (tool) {
        for (const thread of input.part.id_threads) {
          const op = this.generateThreadOp(thread, "id", input.part, tool, mat, maxRpm, dialect, nl);
          operations.push(op);
        }
      }
    }

    // ---- PART-OFF (G75) ----
    if (requiredOps.includes("partoff")) {
      const tool = findTool("partoff") ?? findTool("part_off") ?? findTool("cutoff");
      if (tool) {
        const op = this.generatePartOffOp(input.part, tool, mat, maxRpm, dialect, nl);
        operations.push(op);
      }
    }

    // Rapid path: use shortest safe retract instead of full G28 home between ops
    // Retract to clearance above workpiece (2mm above max OD) instead of home
    const safeRetractX = input.part.bar_diameter_mm + 4; // 2mm clearance on diameter
    const safeRetractZ = 2; // 2mm off face

    // Step f: Build complete G-code
    const headerComments = [
      dialect.comment(`${partName} - ${input.part.material.toUpperCase()}`),
      dialect.comment(`STOCK: OD${input.part.bar_diameter_mm} x L${input.part.bar_length_mm}`),
      dialect.comment(`CONTROLLER: ${controller.toUpperCase()}`),
      dialect.comment(`SAFE RETRACT: X${safeRetractX} Z${safeRetractZ}`),
      dialect.comment("TOOL LIST"),
    ];
    for (const t of tools) {
      headerComments.push(
        dialect.comment(`T${String(t.station).padStart(2, "0")} - ${t.description}`)
      );
    }
    headerComments.push(
      dialect.comment(`GENERATED BY PRISM TurningProgramAssemblerEngine`)
    );

    const safeStart = [
      dialect.speed_clamp(maxRpm),
      dialect.home,
    ].join("\n");

    // Concatenate all G-code
    const gcodeLines: string[] = [
      dialect.program_start(progNum),
      ...headerComments,
      "",
      safeStart,
    ];

    for (const op of operations) {
      gcodeLines.push("", dialect.comment(`--- ${op.name.toUpperCase()} ---`));
      gcodeLines.push(...op.gcode_lines);
    }

    // End of program
    gcodeLines.push("");
    if (input.bar_fed) {
      gcodeLines.push(dialect.comment("BAR FEED LOOP"));
      gcodeLines.push(dialect.bar_loop);
    } else {
      gcodeLines.push(dialect.program_end);
    }
    gcodeLines.push("%");

    const gcode = gcodeLines.join("\n");

    // Step j: Cycle time
    const cycleResult = this.estimateCycleTime({
      part: input.part,
      tools,
      operations,
    });

    // Aggregate stochastic outputs from all operations
    const allForces = operations
      .map(op => op._sf?.force_ci95)
      .filter((f): f is [number, number] => f != null);
    const allLives = operations
      .map(op => op._sf?.life_ci95)
      .filter((l): l is [number, number] => l != null);
    const worstForce: [number, number] = allForces.length > 0
      ? [Math.min(...allForces.map(f => f[0])),
         Math.max(...allForces.map(f => f[1]))]
      : [0, 0];
    const worstLife: [number, number] = allLives.length > 0
      ? [Math.min(...allLives.map(l => l[0])),
         Math.max(...allLives.map(l => l[1]))]
      : [0, 0];
    const maxPChatter = operations.reduce(
      (mx, op) => Math.max(mx, op._sf?.p_chatter ?? 0), 0
    );

    // Estimate Ra from finishing feed + nose radius (Brammertz: Ra ≈ fn²/(32r))
    const finishOp = operations.find(op => op.type === "od_finish");
    const finishR = finishOp
      ? (tools.find(t => t.station === finishOp.tool_station)?.nose_radius_mm ?? 0.4)
      : 0.4;
    const finishFn = finishOp?.feed_rate ?? mat.fn_finish;
    const estimatedRa = (finishFn * finishFn) / (32 * finishR) * 1000; // µm

    // Deflection estimate for uncertainty envelope
    const barDia = input.part.bar_diameter_mm;
    const stickout = Math.min(input.part.bar_length_mm, 80);
    const I_bar = Math.PI * Math.pow(barDia, 4) / 64;
    const avgForce = allForces.length > 0
      ? (worstForce[0] + worstForce[1]) / 2
      : 500;
    const maxDeflection = I_bar > 0
      ? (avgForce * Math.pow(stickout, 3)) / (3 * 200e3 * I_bar)
      : 0.01;

    const overallConf = operations.reduce(
      (sum, op) => sum + (op._sf?.confidence ?? 0.8), 0
    ) / Math.max(1, operations.length);

    const program: TurningProgram = {
      program_number: dialect.program_start(progNum),
      header_comments: headerComments,
      safe_start_block: safeStart,
      tool_list: tools,
      operations,
      gcode,
      estimated_cycle_time_s: cycleResult.value.total_s,
      warnings,
      uncertainty: {
        force_ci95: worstForce,
        life_ci95: worstLife,
        finish_ci95: [estimatedRa * 0.7, estimatedRa * 1.5],
        p_chatter: maxPChatter,
        deflection_ci95: [0, maxDeflection * 1.3],
        dominant_uncertainty: "material_kc1.1",
        overall_confidence: overallConf,
      },
    };

    // Wire MachiningPlaybookEngine for turning-specific warnings
    try {
      const { machiningPlaybookEngine } = await import("./MachiningPlaybookEngine.js");
      const adviceResult = machiningPlaybookEngine.advise({
        operation_type: 'turning',
        material_iso: materialName,
      });
      if (adviceResult?.rules?.length) {
        for (const rule of adviceResult.rules) {
          if (rule.rule && !warnings.includes(rule.rule)) {
            warnings.push(`[Playbook] ${rule.rule.substring(0, 200)}`);
          }
        }
        engines_called.push("MachiningPlaybookEngine");
      }
    } catch { /* playbook not available */ }

    if (engines_called.length > 0) {
      program.warnings.push(`[Engines] Wired: ${engines_called.join(", ")}`);
    }

    return {
      value: program,
      unit: "turning_program",
      formula: "G71/G70 rough-finish cycle + G75 groove + G76 thread + G74 drill + MC uncertainty",
      confidence: overallConf,
    };
  }

  // ──────────────────────────────────────────────────────────────────────
  // METHOD 2: autoSelectTools
  // ──────────────────────────────────────────────────────────────────────

  /**
   * Automatically assign tools to turret stations based on part features.
   *
   * Default assignment:
   *   T01: CNMG 80° roughing (OD rough, face)
   *   T02: VNMG 35° finishing (OD finish, chamfers)
   *   T03: Grooving tool (width matched to groove)
   *   T04: Threading tool (60° full profile)
   *   T05: Center drill (A2 60°)
   *   T06: Twist drill (matched to bore diameter)
   *   T07: Boring bar (for ID finish if needed)
   *   T08: Part-off blade (width = part_off_width)
   *   T09: Tap (if tapping required)
   *   T10: Knurl wheel (if knurling required)
   *   T11: ID grooving tool (if ID grooves)
   *   T12: ID threading tool (if ID threads)
   *
   * @param input - Part profile and optional available tool filter
   * @returns AtomicValue wrapping array of TurningToolAssignment
   */
  autoSelectTools(input: AutoSelectToolsInput): AtomicValue<TurningToolAssignment[]> {
    const part = input.part;
    const tools: TurningToolAssignment[] = [];
    const requiredOps = this.analyzeRequiredOperations(part);

    // T01: CNMG 80° roughing — always needed for OD rough + face
    tools.push({
      station: 1, tool_type: "CNMG_roughing",
      description: "CNMG 120408 OD ROUGHING R0.8",
      insert_shape: "C", nose_radius_mm: 0.8, orientation: 3,
      offset_number: 1, wear_offset_number: 1,
    });

    // T02: VNMG 35° finishing — OD finish, chamfers, radii
    tools.push({
      station: 2, tool_type: "VNMG_finishing",
      description: "VNMG 160404 OD FINISHING R0.4",
      insert_shape: "V", nose_radius_mm: 0.4, orientation: 3,
      offset_number: 2, wear_offset_number: 2,
    });

    // T03: Grooving tool (if grooves present)
    if (requiredOps.includes("od_groove") || requiredOps.includes("partoff")) {
      const grooveWidth = part.od_grooves?.[0]?.width_mm ?? 3;
      tools.push({
        station: 3, tool_type: "grooving",
        description: `GX GROOVING ${grooveWidth}MM WIDTH`,
        insert_shape: "GX", nose_radius_mm: 0.2, orientation: 3,
        offset_number: 3, wear_offset_number: 3,
      });
    }

    // T04: Threading tool (if threads present)
    if (requiredOps.includes("od_thread")) {
      const threadType = part.od_threads?.[0]?.thread_type ?? "metric";
      const angle = threadType.toLowerCase().includes("bsp") ? 55 : 60;
      tools.push({
        station: 4, tool_type: "threading",
        description: `${angle}DEG FULL PROFILE THREADING`,
        insert_shape: "T", nose_radius_mm: 0.1, orientation: 3,
        offset_number: 4, wear_offset_number: 4,
      });
    }

    // T05: Center drill (if center drill or any drilling)
    if (requiredOps.includes("center_drill")) {
      tools.push({
        station: 5, tool_type: "center_drill",
        description: "A2 60DEG CENTER DRILL DIA5",
        insert_shape: "DRILL", nose_radius_mm: 0.0, orientation: 9,
        offset_number: 5, wear_offset_number: 5,
      });
    }

    // T06: Twist drill (if drilling required)
    if (requiredOps.includes("drill")) {
      const drillDia = part.drill_diameter_mm ?? 10;
      tools.push({
        station: 6, tool_type: "twist_drill",
        description: `CARBIDE TWIST DRILL DIA${drillDia}`,
        insert_shape: "DRILL", nose_radius_mm: 0.0, orientation: 9,
        offset_number: 6, wear_offset_number: 6,
      });
    }

    // T07: Boring bar (if bore profile present)
    if (requiredOps.includes("bore")) {
      const minBoreDia = part.bore_profile
        ? Math.min(...part.bore_profile.map(p => Math.abs(p.x_mm)))
        : (part.drill_diameter_mm ?? 20);
      // Select bar type based on L/D ratio
      const boreDepth = part.bore_profile
        ? Math.max(...part.bore_profile.map(p => Math.abs(p.z_mm)))
        : (part.drill_depth_mm ?? 30);
      const ld = boreDepth / minBoreDia;
      const barType = ld > 6 ? "ANTI-VIB" : ld > 4 ? "CARBIDE" : "STEEL";
      tools.push({
        station: 7, tool_type: "boring_bar",
        description: `${barType} BORING BAR DIA${Math.floor(minBoreDia * 0.6)}`,
        insert_shape: "C", nose_radius_mm: 0.4, orientation: 6,
        offset_number: 7, wear_offset_number: 7,
      });
    }

    // T08: Part-off blade
    if (requiredOps.includes("partoff")) {
      const width = part.part_off_width_mm ?? 3;
      tools.push({
        station: 8, tool_type: "partoff_blade",
        description: `CUT-OFF BLADE ${width}MM WIDTH`,
        insert_shape: "GX", nose_radius_mm: 0.15, orientation: 3,
        offset_number: 8, wear_offset_number: 8,
      });
    }

    // T09: Tap (if tapping required)
    if (requiredOps.includes("tap") && part.tap_size) {
      const tapInfo = parseTapSize(part.tap_size);
      tools.push({
        station: 9, tool_type: "tap",
        description: `HSS SPIRAL POINT TAP ${part.tap_size}`,
        insert_shape: "TAP", nose_radius_mm: 0.0, orientation: 9,
        offset_number: 9, wear_offset_number: 9,
      });
    }

    // T10: Knurl wheel (if knurling required)
    if (requiredOps.includes("od_knurl") && part.od_knurl) {
      tools.push({
        station: 10, tool_type: "knurl_wheel",
        description: `DIAMOND KNURL PITCH ${part.od_knurl[0].pitch_mm}MM`,
        insert_shape: "KNURL", nose_radius_mm: 0.0, orientation: 3,
        offset_number: 10, wear_offset_number: 10,
      });
    }

    // T11: ID grooving tool (if ID grooves)
    if (requiredOps.includes("id_groove") && part.id_grooves) {
      const width = part.id_grooves[0].width_mm;
      tools.push({
        station: 11, tool_type: "id_grooving",
        description: `ID GROOVING TOOL ${width}MM WIDTH`,
        insert_shape: "GX", nose_radius_mm: 0.15, orientation: 6,
        offset_number: 11, wear_offset_number: 11,
      });
    }

    // T12: ID threading tool (if ID threads)
    if (requiredOps.includes("id_thread") && part.id_threads) {
      tools.push({
        station: 12, tool_type: "id_threading",
        description: "60DEG ID THREADING TOOL",
        insert_shape: "T", nose_radius_mm: 0.1, orientation: 6,
        offset_number: 12, wear_offset_number: 12,
      });
    }

    // T02 backup: Reamer
    if (requiredOps.includes("ream") && part.ream_diameter_mm) {
      // Use next available station
      const nextStation = tools.length + 1;
      if (nextStation <= 12) {
        tools.push({
          station: nextStation, tool_type: "reamer",
          description: `STRAIGHT FLUTE REAMER DIA${part.ream_diameter_mm}`,
          insert_shape: "REAM", nose_radius_mm: 0.0, orientation: 9,
          offset_number: nextStation, wear_offset_number: nextStation,
        });
      }
    }

    return {
      value: tools,
      unit: "tool_list",
      formula: "Feature-driven auto-assignment T01-T12",
      confidence: 0.90,
    };
  }

  // ──────────────────────────────────────────────────────────────────────
  // METHOD 3: estimateCycleTime
  // ──────────────────────────────────────────────────────────────────────

  /**
   * Estimate cycle time including cutting, rapid, tool change, and dwell components.
   *
   * Calculation:
   *   - Cutting time: sum of per-operation estimated_time_s (from MRR/feed analysis)
   *   - Rapid time: estimated from approach/retract distances at ~30m/min
   *   - Tool change time: ~4s per tool change
   *   - Breakdown: per-operation dictionary
   *
   * @param input - Part, tools, and sequenced operations
   * @returns AtomicValue wrapping CycleTimeResult
   */
  estimateCycleTime(input: CycleTimeInput): AtomicValue<CycleTimeResult> {
    let cutting_s = 0;
    let rapid_s = 0;
    const breakdown: Record<string, number> = {};

    // Count distinct tool changes (transitions between different stations)
    let prevStation = -1;
    let toolChanges = 0;
    for (const op of input.operations) {
      if (op.tool_station !== prevStation) {
        toolChanges++;
        prevStation = op.tool_station;
      }
      cutting_s += op.estimated_time_s;
      breakdown[op.name] = op.estimated_time_s;

      // Add rapid time for approach/retract per operation
      // Estimate: rapid from home to work zone ~100mm X, ~50mm Z
      const rapidDist = rapidDistance(0, 50, input.part.bar_diameter_mm / 2 + 5, 2);
      rapid_s += (rapidDist / this.RAPID_RATE_MM_MIN) * 60 * 2; // approach + retract
    }

    const tool_change_s = toolChanges * this.TOOL_CHANGE_TIME_S;
    const total_s = cutting_s + rapid_s + tool_change_s;

    return {
      value: {
        total_s: Math.round(total_s * 10) / 10,
        cutting_s: Math.round(cutting_s * 10) / 10,
        rapid_s: Math.round(rapid_s * 10) / 10,
        tool_change_s: Math.round(tool_change_s * 10) / 10,
        breakdown,
      },
      unit: "seconds",
      formula: "T_total = T_cutting + T_rapid + N_tools × T_change",
      confidence: 0.85,
    };
  }

  // ──────────────────────────────────────────────────────────────────────
  // METHOD 4: validateProgram
  // ──────────────────────────────────────────────────────────────────────

  /**
   * Safety validation: power, torque, RPM clamp, tool interference, L/D ratios.
   *
   * Checks performed:
   *   1. Power vs machine max (Kienzle at roughing DOC)
   *   2. RPM vs G50 clamp at smallest diameter
   *   3. Minimum bore diameter for boring bar clearance
   *   4. Boring bar L/D ratio limits (steel ≤4, carbide ≤6, anti-vib ≤10)
   *   5. Thread synchronization RPM (must not exceed 1/3 of max for G76)
   *   6. Part-off: bar diameter vs tool reach
   *   7. Grooving depth vs tool width ratio (max 5:1)
   *
   * @param input - Part, tools, machine limits
   * @returns AtomicValue wrapping ValidationResult
   */
  async validateProgram(input: ValidateProgramInput): Promise<AtomicValue<ValidationResult>> {
    const maxRpm = input.machine_max_rpm ?? this.DEFAULT_MAX_RPM;
    const maxPower = input.max_power_kw ?? this.DEFAULT_POWER_KW;
    const mat = lookupMaterial(input.part.material);
    const checks: ValidationCheck[] = [];
    const warnings: string[] = [];
    const engines_called: string[] = [];

    // Check 1: Power at max roughing DOC
    const roughDoc = 3.0; // Typical roughing DOC [mm]
    const roughFn = mat.fn_rough;
    const fc = kienzleForce(mat.kc1_1, mat.mc, roughDoc, roughFn);
    const power = cuttingPower(fc, mat.Vc_rough);
    checks.push({
      name: "Cutting power vs machine",
      pass: power <= maxPower,
      value: Math.round(power * 100) / 100,
      limit: maxPower,
    });
    if (power > maxPower) {
      warnings.push(`Roughing power ${power.toFixed(1)}kW exceeds machine limit ${maxPower}kW — reduce DOC or feed`);
    }

    // Check 2: RPM at smallest OD diameter
    const minOdDia = input.part.od_profile.length > 0
      ? Math.min(...input.part.od_profile.map(p => Math.abs(p.x_mm)))
      : input.part.bar_diameter_mm;
    const rpmAtMin = calcRPM(mat.Vc_finish, minOdDia, 999999);
    checks.push({
      name: "Finish RPM at min diameter vs G50 clamp",
      pass: rpmAtMin <= maxRpm,
      value: rpmAtMin,
      limit: maxRpm,
    });
    if (rpmAtMin > maxRpm) {
      warnings.push(`CSS at ⌀${minOdDia}mm requires ${rpmAtMin} RPM — clamped to ${maxRpm} RPM (reduced Vc at small diameters)`);
    }

    // Check 3: Minimum bore diameter for boring bar
    if (input.part.bore_profile && input.part.bore_profile.length > 0) {
      const minBoreDia = Math.min(...input.part.bore_profile.map(p => Math.abs(p.x_mm)));
      const boringBar = input.tools.find(t => t.tool_type.toLowerCase().includes("boring"));
      if (boringBar) {
        // Boring bar diameter should be < 0.7 × bore diameter for clearance
        const maxBarDia = minBoreDia * 0.7;
        checks.push({
          name: "Bore diameter vs boring bar clearance",
          pass: maxBarDia >= 6, // Minimum practical boring bar diameter
          value: minBoreDia,
          limit: 6 / 0.7, // ~8.6mm minimum bore
        });
        if (maxBarDia < 6) {
          warnings.push(`Bore ⌀${minBoreDia}mm too small for standard boring bar — consider mini boring bar or reaming`);
        }

        // Check 4: Boring bar L/D ratio
        const boreDepth = Math.max(...input.part.bore_profile.map(p => Math.abs(p.z_mm)));
        const barDia = maxBarDia; // Estimated bar diameter
        const ld = barDia > 0 ? boreDepth / barDia : 0;
        const barType = boringBar.description.toLowerCase();
        const ldLimit = barType.includes("anti-vib") ? 10 : barType.includes("carbide") ? 6 : 4;
        checks.push({
          name: "Boring bar L/D ratio",
          pass: ld <= ldLimit,
          value: Math.round(ld * 10) / 10,
          limit: ldLimit,
        });
        if (ld > ldLimit) {
          warnings.push(`Boring L/D=${ld.toFixed(1)} exceeds ${ldLimit}:1 limit for ${barType.includes("anti-vib") ? "anti-vibration" : barType.includes("carbide") ? "carbide" : "steel"} bar — risk of chatter`);
        }
      }
    }

    // Check 5: Thread synchronization RPM
    if (input.part.od_threads || input.part.id_threads) {
      const allThreads = [...(input.part.od_threads ?? []), ...(input.part.id_threads ?? [])];
      for (const thread of allThreads) {
        const threadDia = "major_dia_mm" in thread
          ? (thread as { major_dia_mm: number }).major_dia_mm
          : (thread as { minor_dia_mm: number }).minor_dia_mm;
        const threadRpm = calcRPM(mat.Vc_thread, threadDia, 999999);
        const maxThreadRpm = Math.floor(maxRpm / 3); // Safety: max 1/3 of spindle max for threading
        checks.push({
          name: `Threading RPM at ⌀${threadDia}mm`,
          pass: threadRpm <= maxThreadRpm,
          value: threadRpm,
          limit: maxThreadRpm,
        });
        if (threadRpm > maxThreadRpm) {
          warnings.push(`Threading RPM ${threadRpm} exceeds safe limit ${maxThreadRpm} (1/3 of max) — reduce cutting speed`);
        }
      }
    }

    // Check 6: Part-off reach
    if (input.part.part_off_width_mm) {
      const partoffReach = input.part.bar_diameter_mm / 2;
      const maxReach = 35; // Typical max part-off blade reach [mm]
      checks.push({
        name: "Part-off blade reach",
        pass: partoffReach <= maxReach,
        value: partoffReach,
        limit: maxReach,
      });
      if (partoffReach > maxReach) {
        warnings.push(`Part-off at ⌀${input.part.bar_diameter_mm}mm requires ${partoffReach}mm reach — exceeds typical ${maxReach}mm limit`);
      }
    }

    // Check 7: Grooving depth/width ratio
    if (input.part.od_grooves) {
      for (const g of input.part.od_grooves) {
        const ratio = g.depth_mm / g.width_mm;
        checks.push({
          name: `Groove depth/width ratio at Z=${g.z_position_mm}`,
          pass: ratio <= 5,
          value: Math.round(ratio * 10) / 10,
          limit: 5,
        });
        if (ratio > 5) {
          warnings.push(`Groove at Z=${g.z_position_mm} has depth/width=${ratio.toFixed(1)} (>5:1) — risk of tool breakage, use peck grooving`);
        }
      }
    }

    // Wire ChuckJawForceEngine for workpiece ejection safety
    try {
      const { chuckJawForceEngine } = await import("./ChuckJawForceEngine.js");
      const maxForce = kienzleForce(mat.kc1_1, mat.mc, 3.0, mat.fn_rough);
      const chuckResult = (chuckJawForceEngine as any).calculate?.({
        chuck_type: input.chuck_type ?? '3_jaw',
        workpiece_diameter_mm: input.part?.bar_diameter_mm ?? 50,
        spindle_rpm: maxRpm,
        cutting_force_N: maxForce,
        jaw_pressure_bar: 20,
      });
      if (chuckResult) {
        const sf = chuckResult.safety_factor ?? chuckResult.value?.safety_factor ?? 2.5;
        checks.push({
          name: 'Chuck grip safety factor',
          pass: sf >= 2.5,
          value: Math.round(sf * 100) / 100,
          limit: 2.5,
        });
        engines_called.push("ChuckJawForceEngine");
      }
    } catch { /* skip if engine not available */ }

    // Wire TurningForceEngine for full Fc/Ff/Fp decomposition validation
    try {
      const { turningForceEngine } = await import("./TurningForceEngine.js");
      const forceResult = (turningForceEngine as any).calculate?.({
        operation: 'longitudinal',
        material: input.part.material,
        cutting_speed_m_min: mat.Vc_rough,
        feed_mm_rev: mat.fn_rough,
        depth_of_cut_mm: 3.0,
        approach_angle_deg: 95,
      });
      if (forceResult?.tangential_force_Fc_N) {
        const advancedPower = (forceResult.tangential_force_Fc_N * mat.Vc_rough) / 60000;
        checks.push({
          name: 'Advanced force model power check',
          pass: advancedPower <= maxPower,
          value: Math.round(advancedPower * 100) / 100,
          limit: maxPower,
        });
        engines_called.push("TurningForceEngine");
      }
    } catch { /* fallback to inline Kienzle */ }

    if (engines_called.length > 0) {
      warnings.push(`[Engines] Validated with: ${engines_called.join(", ")}`);
    }

    const safe = checks.every(c => c.pass);
    return {
      value: { safe, checks, warnings },
      unit: "validation",
      formula: "Kienzle power check + RPM/G50 clamp + L/D ratio + reach limits + chuck grip + advanced force",
      confidence: 0.88,
    };
  }

  // ──────────────────────────────────────────────────────────────────────
  // PRIVATE HELPERS — Operation Analysis
  // ──────────────────────────────────────────────────────────────────────

  /**
   * Analyze part profile to determine which operations are required.
   * @param part - Part profile
   * @returns Array of operation type strings
   */
  private analyzeRequiredOperations(part: TurningPartProfile): string[] {
    const ops: string[] = [];

    // OD operations
    if (part.od_profile.length > 0) {
      ops.push("face");     // Always face if there's an OD profile
      ops.push("od_rough"); // Always rough OD
      ops.push("od_finish"); // Always finish OD

      // Check for tapers in profile (simultaneous X+Z movement)
      for (let i = 0; i < part.od_profile.length - 1; i++) {
        const p1 = part.od_profile[i];
        const p2 = part.od_profile[i + 1];
        if (p1.x_mm !== p2.x_mm && p1.z_mm !== p2.z_mm && !p1.radius_mm) {
          ops.push("od_taper");
          break;
        }
      }

      // Check for arcs (radius turning / contouring)
      if (part.od_profile.some(p => p.radius_mm && p.radius_mm !== 0)) {
        ops.push("od_contour");
        ops.push("od_radius");
      }
    }

    if (part.od_grooves && part.od_grooves.length > 0) ops.push("od_groove");
    if (part.od_threads && part.od_threads.length > 0) ops.push("od_thread");
    if (part.od_chamfers && part.od_chamfers.length > 0) ops.push("od_chamfer");
    if (part.od_knurl && part.od_knurl.length > 0) ops.push("od_knurl");

    // ID operations
    if (part.center_drill || part.drill_diameter_mm) ops.push("center_drill");
    if (part.drill_diameter_mm) ops.push("drill");
    if (part.bore_profile && part.bore_profile.length > 0) ops.push("bore");
    if (part.id_grooves && part.id_grooves.length > 0) ops.push("id_groove");
    if (part.id_threads && part.id_threads.length > 0) ops.push("id_thread");
    if (part.ream_diameter_mm) ops.push("ream");
    if (part.tap_size) ops.push("tap");

    // Part-off
    if (part.part_off_width_mm) ops.push("partoff");

    return ops;
  }

  // ──────────────────────────────────────────────────────────────────────
  // PRIVATE HELPERS — G-code Generation per Operation
  // ──────────────────────────────────────────────────────────────────────

  /**
   * Generate facing operation G-code.
   * Face from OD to center (or near-center) using CSS mode.
   */
  private async generateFacingOp(
    part: TurningPartProfile,
    tool: TurningToolAssignment,
    mat: TurningMaterialData,
    maxRpm: number,
    dialect: ControllerDialect,
    nl: () => string,
  ): Promise<TurningOperation> {
    // Stochastic S/F via Monte Carlo
    const sf = await this.computeSF(part.material, "face", part.bar_diameter_mm);
    const vc = sf.Vc;
    const fn = sf.fn * 0.8; // Slightly reduced for facing
    const faceDiameter = part.bar_diameter_mm;
    const lines: string[] = [];

    lines.push(`${nl()} ${dialect.tool_change(tool.station, tool.offset_number)} ${dialect.comment(tool.description)}`);
    lines.push(`${nl()} ${dialect.speed_clamp(maxRpm)}`);
    lines.push(`${nl()} ${dialect.css_on(vc)} ${dialect.spindle_cw} ${dialect.comment(`CSS ${vc} M/MIN`)}`);
    lines.push(`${nl()} ${dialect.coolant_on}`);
    lines.push(`${nl()} G00 X${fmt(faceDiameter + 2)} Z0.5 ${dialect.comment("RAPID TO FACE START")}`);
    // Face pass — from OD to center
    const faceStockRemoval = 0.5; // typical face stock [mm]
    lines.push(`${nl()} G01 Z0 F${fmt(fn)} ${dialect.comment("FACE FEED TO Z0")}`);
    lines.push(`${nl()} G01 X-1.6 ${dialect.comment("FACE TO CENTER (PAST)")}`);
    lines.push(`${nl()} G00 Z0.5 ${dialect.comment("RETRACT Z")}`);
    lines.push(`${nl()} G00 X${fmt(faceDiameter + 2)} ${dialect.comment("RETRACT X")}`);
    lines.push(`${nl()} ${dialect.coolant_off}`);
    lines.push(`${nl()} ${dialect.spindle_stop}`);
    lines.push(`${nl()} ${dialect.home}`);
    lines.push(`${nl()} ${dialect.optional_stop}`);

    // Estimate time: one pass across face
    const faceDistance = faceDiameter / 2 + 2;
    const avgRpm = calcRPM(vc, faceDiameter * 0.6, maxRpm); // avg diameter
    const feedMmMin = fn * avgRpm;
    const cuttingTime = feedMmMin > 0 ? (faceDistance / feedMmMin) * 60 : 5;

    return {
      type: "face",
      name: "OD Facing",
      tool_station: tool.station,
      speed_value: vc,
      css_mode: true,
      feed_rate: fn,
      feed_unit: "mm/rev",
      doc_mm: faceStockRemoval,
      gcode_lines: lines,
      estimated_time_s: Math.max(cuttingTime, 3),
      _sf: sf,
    };
  }

  /**
   * Generate OD roughing operation using G71 canned cycle.
   * Multiple DOC passes from bar stock to finish-profile + stock allowance.
   */
  private async generateOdRoughingOp(
    part: TurningPartProfile,
    tool: TurningToolAssignment,
    mat: TurningMaterialData,
    maxRpm: number,
    maxPower: number,
    dialect: ControllerDialect,
    nl: () => string,
    warnings: string[],
  ): Promise<TurningOperation> {
    // Stochastic S/F via Monte Carlo on Kienzle + Taylor
    const sf = await this.computeSF(part.material, "od_rough", part.bar_diameter_mm);
    const vc = sf.Vc;
    const fn = sf.fn;

    const stockAllowU = 0.3; // Finish stock X (diameter) [mm]
    const stockAllowW = 0.1; // Finish stock Z [mm]
    const retract = 1.0; // G71 R retract [mm]

    // Stock removal optimization: constant-power passes instead of fixed DOC
    const stockBarR = part.bar_diameter_mm / 2;
    const stockMinR = part.od_profile.length > 0
      ? Math.min(...part.od_profile.map(p => Math.abs(p.x_mm))) / 2
      : stockBarR - 5;
    const totalStock = stockBarR - stockMinR;
    const stockPasses = this.optimizeStockRemoval(
      totalStock, 4.0, maxPower,
      mat.kc1_1, mat.mc, fn, vc
    );
    // Use the first pass DOC as the G71 U value (G71 uses uniform DOC)
    let effectiveDoc = stockPasses.length > 0
      ? Math.round(stockPasses[0] * 10) / 10
      : 2.0;

    // Power check — final validation on effective DOC
    const fc = kienzleForce(mat.kc1_1, mat.mc, effectiveDoc, fn);
    const power = cuttingPower(fc, vc);
    if (power > maxPower * 0.9) {
      effectiveDoc = effectiveDoc * (maxPower * 0.85) / power;
      effectiveDoc = Math.max(0.5, Math.round(effectiveDoc * 10) / 10);
      warnings.push(
        `OD roughing DOC reduced to ${effectiveDoc}mm ` +
        `due to power limit (${maxPower}kW)`
      );
    }

    const lines: string[] = [];
    lines.push(`${nl()} ${dialect.tool_change(tool.station, tool.offset_number)} ${dialect.comment(tool.description)}`);
    lines.push(`${nl()} ${dialect.speed_clamp(maxRpm)}`);
    lines.push(`${nl()} ${dialect.css_on(vc)} ${dialect.spindle_cw} ${dialect.comment(`CSS ${vc} M/MIN`)}`);
    lines.push(`${nl()} ${dialect.coolant_on}`);
    lines.push(`${nl()} G00 X${fmt(part.bar_diameter_mm + 2)} Z2.0 ${dialect.comment("RAPID TO START")}`);

    // G71 canned cycle
    // P/Q define the profile subroutine block numbers
    const profileStartLabel = `N${nl().replace("N", "")}`;
    // We'll use inline profile definition (Fanuc Type II G71)
    const pBlock = 1000; // Profile start block number
    const qBlock = 1000 + (part.od_profile.length + 1) * 10; // Profile end block number

    lines.push(`${nl()} G71 U${fmt(effectiveDoc)} R${fmt(retract)} ${dialect.comment(`ROUGH CYCLE - ${effectiveDoc}MM DOC`)}`);
    lines.push(`${nl()} G71 P${pBlock} Q${qBlock} U${fmt(stockAllowU)} W${fmt(stockAllowW)} F${fmt(fn)}`);

    // Profile definition blocks
    lines.push(`N${pBlock} G00 X${fmt(part.od_profile[0]?.x_mm ?? part.bar_diameter_mm - 2)}`);
    for (let i = 0; i < part.od_profile.length; i++) {
      const pt = part.od_profile[i];
      const blockNum = pBlock + (i + 1) * 10;

      if (pt.radius_mm && pt.radius_mm !== 0 && i < part.od_profile.length - 1) {
        const nextPt = part.od_profile[i + 1];
        // Arc interpolation — determine CW or CCW based on direction
        const arcCode = pt.radius_mm > 0 ? "G02" : "G03";
        const r = Math.abs(pt.radius_mm);
        lines.push(`N${blockNum} ${arcCode} X${fmt(nextPt.x_mm)} Z${fmt(nextPt.z_mm)} R${fmt(r)}`);
      } else {
        lines.push(`N${blockNum} G01 X${fmt(pt.x_mm)} Z${fmt(pt.z_mm)}`);
      }
    }
    lines.push(`N${qBlock} X${fmt(part.bar_diameter_mm + 1)} ${dialect.comment("END OF PROFILE")}`);

    lines.push(`${nl()} ${dialect.coolant_off}`);
    lines.push(`${nl()} ${dialect.spindle_stop}`);
    lines.push(`${nl()} ${dialect.home}`);
    lines.push(`${nl()} ${dialect.optional_stop}`);

    // Estimate time: volume removal / MRR
    const barRadius = part.bar_diameter_mm / 2;
    const minProfileRadius = part.od_profile.length > 0
      ? Math.min(...part.od_profile.map(p => Math.abs(p.x_mm))) / 2
      : barRadius - 5;
    const profileLength = part.od_profile.length > 0
      ? Math.abs(part.od_profile[part.od_profile.length - 1].z_mm - part.od_profile[0].z_mm)
      : part.bar_length_mm;
    const avgDiaRemoval = barRadius - minProfileRadius;
    const numPasses = Math.ceil(avgDiaRemoval / effectiveDoc);
    const avgDia = (part.bar_diameter_mm + minProfileRadius * 2) / 2;
    const avgRpm = calcRPM(vc, avgDia, maxRpm);
    const feedMmMin = fn * avgRpm;
    const timePerPass = feedMmMin > 0 ? (profileLength / feedMmMin) * 60 : 10;
    const totalTime = timePerPass * numPasses;

    return {
      type: "od_rough",
      name: "OD Roughing (G71)",
      tool_station: tool.station,
      speed_value: vc,
      css_mode: true,
      feed_rate: fn,
      feed_unit: "mm/rev",
      doc_mm: effectiveDoc,
      gcode_lines: lines,
      estimated_time_s: Math.max(totalTime, 5),
      _sf: sf,
    };
  }

  /**
   * Generate OD finishing operation using G70 canned cycle.
   * Single pass following the roughed profile with TNRC active.
   */
  private async generateOdFinishingOp(
    part: TurningPartProfile,
    tool: TurningToolAssignment,
    mat: TurningMaterialData,
    maxRpm: number,
    dialect: ControllerDialect,
    nl: () => string,
  ): Promise<TurningOperation> {
    // Stochastic S/F via Monte Carlo
    const sf = await this.computeSF(part.material, "od_finish", part.bar_diameter_mm);
    const vc = sf.Vc;
    const fn = sf.fn;

    // Deflection-limited finish DOC
    const Fc_per_mm = kienzleForce(mat.kc1_1, mat.mc, 1.0, fn); // force per 1mm DOC
    const stickout = Math.min(part.bar_length_mm, 80); // estimated stickout
    const finishDoc = this.computeFinishDepth(
      Fc_per_mm, stickout, part.bar_diameter_mm,
      part.finish_tolerance_mm ?? 0.05
    );
    const pBlock = 1000; // Must match roughing profile blocks

    const lines: string[] = [];
    lines.push(`${nl()} ${dialect.tool_change(tool.station, tool.offset_number)} ${dialect.comment(tool.description)}`);
    lines.push(`${nl()} ${dialect.speed_clamp(maxRpm)}`);
    lines.push(`${nl()} ${dialect.css_on(vc)} ${dialect.spindle_cw} ${dialect.comment(`CSS ${vc} M/MIN FINISH`)}`);
    lines.push(`${nl()} ${dialect.coolant_on}`);

    // TNRC activation — G42 for OD (tool on right side of profile)
    if (tool.nose_radius_mm > 0) {
      lines.push(`${nl()} G42 ${dialect.comment(`TNRC ON R${tool.nose_radius_mm}`)}`);
    }

    const qBlock = 1000 + (part.od_profile.length + 1) * 10;
    lines.push(`${nl()} G70 P${pBlock} Q${qBlock} F${fmt(fn)} ${dialect.comment("FINISH CYCLE")}`);

    // TNRC cancel
    if (tool.nose_radius_mm > 0) {
      lines.push(`${nl()} G40 ${dialect.comment("TNRC CANCEL")}`);
    }

    lines.push(`${nl()} ${dialect.coolant_off}`);
    lines.push(`${nl()} ${dialect.spindle_stop}`);
    lines.push(`${nl()} ${dialect.home}`);
    lines.push(`${nl()} ${dialect.optional_stop}`);

    // Estimate time: single pass along profile
    const profileLength = part.od_profile.length > 1
      ? Math.abs(part.od_profile[part.od_profile.length - 1].z_mm - part.od_profile[0].z_mm)
      : part.bar_length_mm;
    const avgDia = part.od_profile.length > 0
      ? part.od_profile.reduce((s, p) => s + Math.abs(p.x_mm), 0) / part.od_profile.length
      : part.bar_diameter_mm;
    const avgRpm = calcRPM(vc, avgDia, maxRpm);
    const feedMmMin = fn * avgRpm;
    const time = feedMmMin > 0 ? (profileLength / feedMmMin) * 60 : 8;

    return {
      type: "od_finish",
      name: "OD Finishing (G70)",
      tool_station: tool.station,
      speed_value: vc,
      css_mode: true,
      feed_rate: fn,
      feed_unit: "mm/rev",
      doc_mm: finishDoc, // Deflection-limited finish DOC
      gcode_lines: lines,
      estimated_time_s: Math.max(time, 3),
      _sf: sf,
    };
  }

  /**
   * Generate chamfer operation (OD or ID).
   * Chamfers are typically 45° cuts at profile transitions.
   */
  private generateChamferOp(
    chamfer: { z_position_mm: number; size_mm: number },
    side: "od" | "id",
    part: TurningPartProfile,
    tool: TurningToolAssignment,
    mat: TurningMaterialData,
    maxRpm: number,
    dialect: ControllerDialect,
    nl: () => string,
  ): TurningOperation {
    const vc = mat.Vc_finish;
    const fn = mat.fn_finish;
    const c = chamfer.size_mm;

    // Find the diameter at this Z position from profile
    const profileDia = this.getDiameterAtZ(part.od_profile, chamfer.z_position_mm);
    const startX = side === "od" ? profileDia + 1 : profileDia - 1;
    const endX = side === "od" ? profileDia - c * 2 : profileDia + c * 2;

    const lines: string[] = [];
    lines.push(`${nl()} ${dialect.tool_change(tool.station, tool.offset_number)} ${dialect.comment(`CHAMFER ${c}x45 AT Z${chamfer.z_position_mm}`)}`);
    lines.push(`${nl()} ${dialect.speed_clamp(maxRpm)}`);
    lines.push(`${nl()} ${dialect.css_on(vc)} ${dialect.spindle_cw}`);
    lines.push(`${nl()} ${dialect.coolant_on}`);
    lines.push(`${nl()} G00 X${fmt(startX)} Z${fmt(chamfer.z_position_mm + 1)}`);
    lines.push(`${nl()} G00 Z${fmt(chamfer.z_position_mm)}`);
    lines.push(`${nl()} G01 X${fmt(endX)} Z${fmt(chamfer.z_position_mm - c)} F${fmt(fn)} ${dialect.comment("45DEG CHAMFER")}`);
    lines.push(`${nl()} G00 X${fmt(startX)}`);
    lines.push(`${nl()} ${dialect.coolant_off}`);
    lines.push(`${nl()} ${dialect.spindle_stop}`);
    lines.push(`${nl()} ${dialect.home}`);

    return {
      type: "chamfer",
      name: `${side.toUpperCase()} Chamfer ${c}x45° at Z${chamfer.z_position_mm}`,
      tool_station: tool.station,
      speed_value: vc,
      css_mode: true,
      feed_rate: fn,
      feed_unit: "mm/rev",
      doc_mm: c,
      gcode_lines: lines,
      estimated_time_s: 3,
    };
  }

  /**
   * Generate grooving operation using G75 peck grooving cycle.
   * Supports OD and ID grooves with peck for deep grooves.
   */
  private generateGrooveOp(
    groove: { z_position_mm: number; width_mm: number; depth_mm: number; bottom_radius_mm?: number },
    side: "od" | "id",
    part: TurningPartProfile,
    tool: TurningToolAssignment,
    mat: TurningMaterialData,
    maxRpm: number,
    dialect: ControllerDialect,
    nl: () => string,
  ): TurningOperation {
    const vc = mat.Vc_rough * mat.groove_Vc_factor;
    const fn = mat.fn_rough * 0.5; // Reduced feed for grooving
    const peckDepth = Math.min(groove.depth_mm, 2.0); // Peck depth [mm]

    // Determine start/end diameters
    const profileDia = side === "od"
      ? this.getDiameterAtZ(part.od_profile, groove.z_position_mm)
      : (part.bore_profile ? this.getDiameterAtZ(part.bore_profile, groove.z_position_mm) : (part.drill_diameter_mm ?? 20));

    const startX = side === "od" ? profileDia + 2 : profileDia - 2;
    const bottomX = side === "od"
      ? profileDia - groove.depth_mm * 2
      : profileDia + groove.depth_mm * 2;

    // RPM at groove diameter (constant, not CSS for grooving safety)
    const rpm = calcRPM(vc, profileDia, maxRpm);

    const lines: string[] = [];
    lines.push(`${nl()} ${dialect.tool_change(tool.station, tool.offset_number)} ${dialect.comment(`${side.toUpperCase()} GROOVE W${groove.width_mm} D${groove.depth_mm} AT Z${groove.z_position_mm}`)}`);
    lines.push(`${nl()} ${dialect.speed_clamp(maxRpm)}`);
    lines.push(`${nl()} ${dialect.rpm_mode(rpm)} ${dialect.spindle_cw} ${dialect.comment(`DIRECT RPM ${rpm} FOR GROOVING`)}`);
    lines.push(`${nl()} ${dialect.coolant_on}`);
    lines.push(`${nl()} G00 X${fmt(startX)} Z${fmt(groove.z_position_mm)}`);

    // G75 peck grooving cycle
    lines.push(`${nl()} G75 R${fmt(0.5)} ${dialect.comment("RETRACT AMOUNT")}`);
    lines.push(`${nl()} G75 X${fmt(bottomX)} Z${fmt(groove.z_position_mm - groove.width_mm)} P${Math.round(peckDepth * 1000)} Q${Math.round(groove.width_mm * 500)} F${fmt(fn)}`);

    if (groove.bottom_radius_mm && groove.bottom_radius_mm > 0) {
      lines.push(`${nl()} ${dialect.comment(`BOTTOM RADIUS R${groove.bottom_radius_mm} FORMED BY INSERT GEOMETRY`)}`);
    }

    lines.push(`${nl()} G00 X${fmt(startX)}`);
    lines.push(`${nl()} ${dialect.coolant_off}`);
    lines.push(`${nl()} ${dialect.spindle_stop}`);
    lines.push(`${nl()} ${dialect.home}`);
    lines.push(`${nl()} ${dialect.optional_stop}`);

    // Time estimate
    const numPecks = Math.ceil(groove.depth_mm / peckDepth);
    const groovePasses = Math.ceil(groove.width_mm / (tool.nose_radius_mm > 0 ? tool.nose_radius_mm * 2 : 3));
    const timePerPeck = 2; // seconds per peck cycle
    const totalTime = numPecks * groovePasses * timePerPeck;

    return {
      type: side === "od" ? "od_groove" : "id_groove",
      name: `${side.toUpperCase()} Grooving at Z${groove.z_position_mm}`,
      tool_station: tool.station,
      speed_value: rpm,
      css_mode: false,
      feed_rate: fn,
      feed_unit: "mm/rev",
      doc_mm: peckDepth,
      gcode_lines: lines,
      estimated_time_s: Math.max(totalTime, 5),
    };
  }

  /**
   * Generate threading operation using G76 compound cycle.
   * Supports OD and ID threads with constant-area infeed and spring passes.
   */
  private generateThreadOp(
    thread: { z_start_mm: number; z_end_mm: number; pitch_mm: number; major_dia_mm?: number; minor_dia_mm?: number; thread_type?: string },
    side: "od" | "id",
    part: TurningPartProfile,
    tool: TurningToolAssignment,
    mat: TurningMaterialData,
    maxRpm: number,
    dialect: ControllerDialect,
    nl: () => string,
  ): TurningOperation {
    const vc = mat.Vc_thread;
    const pitch = thread.pitch_mm;

    // Thread geometry — ISO metric: depth = 0.6134 × pitch
    const threadDepth = 0.6134 * pitch;
    const threadAngle = thread.thread_type?.toLowerCase().includes("bsp") ? 55 : 60;

    let startDia: number;
    let endDia: number;
    if (side === "od") {
      startDia = (thread as { major_dia_mm: number }).major_dia_mm ?? part.bar_diameter_mm;
      endDia = startDia - threadDepth * 2;
    } else {
      endDia = (thread as { minor_dia_mm: number }).minor_dia_mm ?? (part.drill_diameter_mm ?? 20);
      startDia = endDia + threadDepth * 2;
    }

    // Threading RPM — limited for synchronization
    const rpm = Math.min(calcRPM(vc, startDia, maxRpm), Math.floor(maxRpm / 3));

    // Constant-area infeed: first DOC = full depth ÷ sqrt(passes)
    const numPasses = Math.max(4, Math.ceil(threadDepth / 0.2));
    const springPasses = 2;
    const firstDoc = threadDepth / Math.sqrt(numPasses);
    const minDoc = 0.05; // Minimum cut depth [mm]

    const lines: string[] = [];
    lines.push(`${nl()} ${dialect.tool_change(tool.station, tool.offset_number)} ${dialect.comment(`${side.toUpperCase()} THREADING P${pitch} ${thread.thread_type ?? "METRIC"}`)}`);
    lines.push(`${nl()} ${dialect.speed_clamp(maxRpm)}`);
    lines.push(`${nl()} ${dialect.rpm_mode(rpm)} ${dialect.spindle_cw} ${dialect.comment(`DIRECT RPM ${rpm} FOR THREADING`)}`);
    lines.push(`${nl()} ${dialect.coolant_on}`);

    // Approach
    const approachX = side === "od" ? startDia + 5 : startDia - 5;
    lines.push(`${nl()} G00 X${fmt(approachX)} Z${fmt(thread.z_start_mm + pitch * 2)} ${dialect.comment("APPROACH THREAD START")}`);

    // G76 compound threading cycle (Fanuc Type II)
    // G76 P[m][r][a] Q[dmin] R[d]
    // G76 X[end_dia] Z[end_z] R0 P[depth] Q[first_doc] F[pitch]
    const mFinishPasses = String(springPasses).padStart(2, "0");
    const rChamfer = "00"; // No thread chamfer
    const aAngle = threadAngle === 60 ? "60" : "55";
    const depthMicrons = Math.round(threadDepth * 1000);
    const firstDocMicrons = Math.round(firstDoc * 1000);

    lines.push(`${nl()} G76 P${mFinishPasses}${rChamfer}${aAngle} Q${Math.round(minDoc * 1000)} R${fmt(0.05)}`);
    lines.push(`${nl()} G76 X${fmt(side === "od" ? endDia : startDia)} Z${fmt(thread.z_end_mm)} R0 P${depthMicrons} Q${firstDocMicrons} F${fmt(pitch)}`);

    lines.push(`${nl()} ${dialect.coolant_off}`);
    lines.push(`${nl()} ${dialect.spindle_stop}`);
    lines.push(`${nl()} ${dialect.home}`);
    lines.push(`${nl()} ${dialect.optional_stop}`);

    // Time estimate: passes × thread length / (RPM × pitch)
    const threadLength = Math.abs(thread.z_end_mm - thread.z_start_mm);
    const timePerPass = threadLength / (rpm * pitch / 60);
    const totalTime = (numPasses + springPasses) * timePerPass;

    return {
      type: side === "od" ? "od_thread" : "id_thread",
      name: `${side.toUpperCase()} Threading M${Math.round(startDia)}×${pitch}`,
      tool_station: tool.station,
      speed_value: rpm,
      css_mode: false,
      feed_rate: pitch,
      feed_unit: "mm/rev",
      doc_mm: threadDepth,
      gcode_lines: lines,
      estimated_time_s: Math.max(totalTime, 8),
    };
  }

  /**
   * Generate knurling operation.
   * Form knurling with controlled feed and RPM.
   */
  private generateKnurlOp(
    knurl: { z_start_mm: number; z_end_mm: number; pitch_mm: number; pattern?: string },
    part: TurningPartProfile,
    tool: TurningToolAssignment,
    mat: TurningMaterialData,
    maxRpm: number,
    dialect: ControllerDialect,
    nl: () => string,
  ): TurningOperation {
    const knurlDia = this.getDiameterAtZ(part.od_profile, knurl.z_start_mm);
    // Knurling: low RPM, slow feed for form knurl
    const rpm = Math.min(100, calcRPM(30, knurlDia, maxRpm));
    const fn = 0.2; // mm/rev feed for knurling
    const pattern = knurl.pattern ?? "diamond";

    const lines: string[] = [];
    lines.push(`${nl()} ${dialect.tool_change(tool.station, tool.offset_number)} ${dialect.comment(`KNURL ${pattern.toUpperCase()} P${knurl.pitch_mm}`)}`);
    lines.push(`${nl()} ${dialect.rpm_mode(rpm)} ${dialect.spindle_cw}`);
    lines.push(`${nl()} ${dialect.coolant_on}`);
    lines.push(`${nl()} G00 X${fmt(knurlDia + 2)} Z${fmt(knurl.z_start_mm)}`);
    // Approach: feed tool to workpiece slowly
    lines.push(`${nl()} G01 X${fmt(knurlDia)} F${fmt(fn * 0.3)} ${dialect.comment("KNURL ENGAGE")}`);
    // Knurl traverse
    lines.push(`${nl()} G01 Z${fmt(knurl.z_end_mm)} F${fmt(fn)} ${dialect.comment("KNURL TRAVERSE")}`);
    // Return pass for cross-hatch (diamond pattern)
    if (pattern === "diamond") {
      lines.push(`${nl()} G01 Z${fmt(knurl.z_start_mm)} F${fmt(fn)} ${dialect.comment("RETURN PASS")}`);
    }
    lines.push(`${nl()} G00 X${fmt(knurlDia + 5)} ${dialect.comment("RETRACT")}`);
    lines.push(`${nl()} ${dialect.coolant_off}`);
    lines.push(`${nl()} ${dialect.spindle_stop}`);
    lines.push(`${nl()} ${dialect.home}`);

    const knurlLength = Math.abs(knurl.z_end_mm - knurl.z_start_mm);
    const feedMmMin = fn * rpm;
    const passes = pattern === "diamond" ? 2 : 1;
    const time = feedMmMin > 0 ? (knurlLength * passes / feedMmMin) * 60 : 10;

    return {
      type: "od_knurl",
      name: `OD Knurling ${pattern} P${knurl.pitch_mm}`,
      tool_station: tool.station,
      speed_value: rpm,
      css_mode: false,
      feed_rate: fn,
      feed_unit: "mm/rev",
      doc_mm: 0.3, // Knurl penetration
      gcode_lines: lines,
      estimated_time_s: Math.max(time, 5),
    };
  }

  /**
   * Generate center drilling operation.
   * Spot drill for accurate hole start before main drilling.
   */
  private generateCenterDrillOp(
    part: TurningPartProfile,
    tool: TurningToolAssignment,
    mat: TurningMaterialData,
    maxRpm: number,
    dialect: ControllerDialect,
    nl: () => string,
  ): TurningOperation {
    const centerDrillDia = 5.0; // A2 center drill tip diameter
    const rpm = calcRPM(mat.Vc_drill * 0.7, centerDrillDia, maxRpm);
    const fn = mat.fn_drill * 0.5;
    const depth = centerDrillDia * 0.6; // Drill to 60% of diameter

    const lines: string[] = [];
    lines.push(`${nl()} ${dialect.tool_change(tool.station, tool.offset_number)} ${dialect.comment(tool.description)}`);
    lines.push(`${nl()} ${dialect.rpm_mode(rpm)} ${dialect.spindle_cw}`);
    lines.push(`${nl()} ${dialect.coolant_on}`);
    lines.push(`${nl()} G00 X0 Z3.0 ${dialect.comment("RAPID TO CENTER")}`);
    lines.push(`${nl()} G01 Z${fmt(-depth)} F${fmt(fn)} ${dialect.comment("CENTER DRILL")}`);
    lines.push(`${nl()} G00 Z3.0 ${dialect.comment("RETRACT")}`);
    lines.push(`${nl()} ${dialect.coolant_off}`);
    lines.push(`${nl()} ${dialect.spindle_stop}`);
    lines.push(`${nl()} ${dialect.home}`);
    lines.push(`${nl()} ${dialect.optional_stop}`);

    return {
      type: "center_drill",
      name: "Center Drilling",
      tool_station: tool.station,
      speed_value: rpm,
      css_mode: false,
      feed_rate: fn,
      feed_unit: "mm/rev",
      doc_mm: depth,
      gcode_lines: lines,
      estimated_time_s: 4,
    };
  }

  /**
   * Generate drilling operation using G74 peck drill cycle.
   * Supports through and blind holes with peck retract for chip clearing.
   */
  private generateDrillingOp(
    part: TurningPartProfile,
    tool: TurningToolAssignment,
    mat: TurningMaterialData,
    maxRpm: number,
    dialect: ControllerDialect,
    nl: () => string,
  ): TurningOperation {
    const drillDia = part.drill_diameter_mm ?? 10;
    const rpm = calcRPM(mat.Vc_drill, drillDia, maxRpm);
    const fn = mat.fn_drill;
    const depth = part.drill_depth_mm ?? part.bar_length_mm;
    const peckDepth = Math.min(drillDia * 1.5, depth); // Peck = 1.5×D or total depth
    const retract = 1.0; // Peck retract [mm]

    // Through hole: add point length (118° = 0.3×D)
    const totalDepth = part.drill_through ? depth + drillDia * 0.3 : depth;

    const lines: string[] = [];
    lines.push(`${nl()} ${dialect.tool_change(tool.station, tool.offset_number)} ${dialect.comment(tool.description)}`);
    lines.push(`${nl()} ${dialect.rpm_mode(rpm)} ${dialect.spindle_cw}`);
    lines.push(`${nl()} ${dialect.coolant_on}`);
    lines.push(`${nl()} G00 X0 Z3.0 ${dialect.comment("RAPID TO CENTER")}`);

    // G74 peck drilling cycle
    lines.push(`${nl()} G74 R${fmt(retract)} ${dialect.comment("PECK RETRACT")}`);
    lines.push(`${nl()} G74 Z${fmt(-totalDepth)} Q${Math.round(peckDepth * 1000)} F${fmt(fn)} ${dialect.comment(`PECK DRILL DIA${drillDia} DEPTH${depth}`)}`);

    lines.push(`${nl()} G00 Z3.0 ${dialect.comment("RETRACT")}`);
    lines.push(`${nl()} ${dialect.coolant_off}`);
    lines.push(`${nl()} ${dialect.spindle_stop}`);
    lines.push(`${nl()} ${dialect.home}`);
    lines.push(`${nl()} ${dialect.optional_stop}`);

    // Time estimate
    const numPecks = Math.ceil(totalDepth / peckDepth);
    const feedMmMin = fn * rpm;
    const drillTime = feedMmMin > 0 ? (totalDepth / feedMmMin) * 60 : 10;
    // Add retract time for each peck
    const retractTime = numPecks * 0.5;

    return {
      type: "drill",
      name: `Drilling ⌀${drillDia} Depth ${depth}`,
      tool_station: tool.station,
      speed_value: rpm,
      css_mode: false,
      feed_rate: fn,
      feed_unit: "mm/rev",
      doc_mm: peckDepth,
      gcode_lines: lines,
      estimated_time_s: Math.max(drillTime + retractTime, 5),
    };
  }

  /**
   * Generate boring operation using G71 ID rough + G70 ID finish.
   * Boring uses negative X direction (toward center line) with inverted TNRC.
   */
  private generateBoringOp(
    part: TurningPartProfile,
    tool: TurningToolAssignment,
    mat: TurningMaterialData,
    maxRpm: number,
    dialect: ControllerDialect,
    nl: () => string,
    warnings: string[],
  ): TurningOperation {
    if (!part.bore_profile || part.bore_profile.length === 0) {
      return {
        type: "bore", name: "Boring (skipped — no bore profile)",
        tool_station: tool.station, speed_value: 0, css_mode: false,
        feed_rate: 0, feed_unit: "mm/rev", doc_mm: 0,
        gcode_lines: [], estimated_time_s: 0,
      };
    }

    const vc = mat.Vc_rough * 0.85; // Slightly reduced for boring stability
    const fn = mat.fn_rough * 0.7;  // Reduced feed for boring
    const doc = 1.5; // Reduced DOC for boring
    const stockAllowU = 0.2;
    const stockAllowW = 0.1;
    const retract = 0.5;

    // Check L/D ratio
    const minBoreDia = Math.min(...part.bore_profile.map(p => Math.abs(p.x_mm)));
    const maxBoreDepth = Math.max(...part.bore_profile.map(p => Math.abs(p.z_mm)));
    const barDia = minBoreDia * 0.6;
    const ld = barDia > 0 ? maxBoreDepth / barDia : 0;
    if (ld > 6) {
      warnings.push(`Boring L/D=${ld.toFixed(1)} — reduce DOC and feed to prevent chatter`);
    }

    const lines: string[] = [];
    lines.push(`${nl()} ${dialect.tool_change(tool.station, tool.offset_number)} ${dialect.comment(tool.description)}`);
    lines.push(`${nl()} ${dialect.speed_clamp(maxRpm)}`);
    lines.push(`${nl()} ${dialect.css_on(Math.round(vc))} ${dialect.spindle_cw} ${dialect.comment(`CSS ${Math.round(vc)} M/MIN BORING`)}`);
    lines.push(`${nl()} ${dialect.coolant_on}`);

    // Start from drilled hole diameter
    const startDia = part.drill_diameter_mm ?? minBoreDia - 5;
    lines.push(`${nl()} G00 X${fmt(startDia - 2)} Z2.0 ${dialect.comment("RAPID INTO BORE")}`);

    // G71 ID boring cycle — profile defines finished ID contour
    const pBlock = 2000;
    const qBlock = 2000 + (part.bore_profile.length + 1) * 10;

    lines.push(`${nl()} G71 U${fmt(doc)} R${fmt(retract)} ${dialect.comment(`BORE ROUGH - ${doc}MM DOC`)}`);
    lines.push(`${nl()} G71 P${pBlock} Q${qBlock} U${fmt(-stockAllowU)} W${fmt(stockAllowW)} F${fmt(fn)}`);

    // Bore profile blocks (X values increase for ID — boring outward)
    lines.push(`N${pBlock} G00 X${fmt(part.bore_profile[0].x_mm)}`);
    for (let i = 0; i < part.bore_profile.length; i++) {
      const pt = part.bore_profile[i];
      const blockNum = pBlock + (i + 1) * 10;
      if (pt.radius_mm && pt.radius_mm !== 0 && i < part.bore_profile.length - 1) {
        const nextPt = part.bore_profile[i + 1];
        const arcCode = pt.radius_mm > 0 ? "G02" : "G03";
        lines.push(`N${blockNum} ${arcCode} X${fmt(nextPt.x_mm)} Z${fmt(nextPt.z_mm)} R${fmt(Math.abs(pt.radius_mm))}`);
      } else {
        lines.push(`N${blockNum} G01 X${fmt(pt.x_mm)} Z${fmt(pt.z_mm)}`);
      }
    }
    lines.push(`N${qBlock} X${fmt(startDia - 2)} ${dialect.comment("END OF BORE PROFILE")}`);

    // Finish pass (G70)
    lines.push(`${nl()} ${dialect.comment("--- BORE FINISHING ---")}`);
    lines.push(`${nl()} ${dialect.css_on(Math.round(mat.Vc_finish * 0.85))} ${dialect.comment("FINISH SPEED")}`);

    // TNRC for ID — G41 (tool left of profile in bore)
    if (tool.nose_radius_mm > 0) {
      lines.push(`${nl()} G41 ${dialect.comment(`TNRC ON R${tool.nose_radius_mm} (ID)`)}`);
    }
    lines.push(`${nl()} G70 P${pBlock} Q${qBlock} F${fmt(mat.fn_finish * 0.8)}`);
    if (tool.nose_radius_mm > 0) {
      lines.push(`${nl()} G40 ${dialect.comment("TNRC CANCEL")}`);
    }

    lines.push(`${nl()} G00 X${fmt(startDia - 5)} Z5.0`);
    lines.push(`${nl()} ${dialect.coolant_off}`);
    lines.push(`${nl()} ${dialect.spindle_stop}`);
    lines.push(`${nl()} ${dialect.home}`);
    lines.push(`${nl()} ${dialect.optional_stop}`);

    // Time estimate
    const boreLength = maxBoreDepth;
    const avgBoreDia = (startDia + Math.max(...part.bore_profile.map(p => Math.abs(p.x_mm)))) / 2;
    const stockRemoval = (Math.max(...part.bore_profile.map(p => Math.abs(p.x_mm))) - startDia) / 2;
    const numPasses = Math.ceil(Math.abs(stockRemoval) / doc);
    const avgRpm = calcRPM(vc, avgBoreDia, maxRpm);
    const feedMmMin = fn * avgRpm;
    const roughTime = feedMmMin > 0 ? (boreLength * numPasses / feedMmMin) * 60 : 15;
    const finishTime = feedMmMin > 0 ? (boreLength / feedMmMin) * 60 * 0.5 : 5;

    return {
      type: "bore",
      name: "ID Boring (G71+G70)",
      tool_station: tool.station,
      speed_value: vc,
      css_mode: true,
      feed_rate: fn,
      feed_unit: "mm/rev",
      doc_mm: doc,
      gcode_lines: lines,
      estimated_time_s: Math.max(roughTime + finishTime, 8),
    };
  }

  /**
   * Generate reaming operation.
   * Single-pass finish hole with slow feed for accuracy.
   */
  private generateReamingOp(
    part: TurningPartProfile,
    tool: TurningToolAssignment,
    mat: TurningMaterialData,
    maxRpm: number,
    dialect: ControllerDialect,
    nl: () => string,
  ): TurningOperation {
    const reamDia = part.ream_diameter_mm ?? 10;
    const rpm = calcRPM(mat.Vc_drill * 0.5, reamDia, maxRpm); // 50% of drill speed
    const fn = mat.fn_drill * 1.5; // Higher feed than drilling for reaming
    const depth = part.drill_depth_mm ?? 20;

    const lines: string[] = [];
    lines.push(`${nl()} ${dialect.tool_change(tool.station, tool.offset_number)} ${dialect.comment(tool.description)}`);
    lines.push(`${nl()} ${dialect.rpm_mode(rpm)} ${dialect.spindle_cw}`);
    lines.push(`${nl()} ${dialect.coolant_on}`);
    lines.push(`${nl()} G00 X0 Z2.0 ${dialect.comment("RAPID TO CENTER")}`);
    lines.push(`${nl()} G01 Z${fmt(-depth)} F${fmt(fn)} ${dialect.comment(`REAM DIA${reamDia}`)}`);
    lines.push(`${nl()} G00 Z5.0 ${dialect.comment("RETRACT")}`);
    lines.push(`${nl()} ${dialect.coolant_off}`);
    lines.push(`${nl()} ${dialect.spindle_stop}`);
    lines.push(`${nl()} ${dialect.home}`);
    lines.push(`${nl()} ${dialect.optional_stop}`);

    const feedMmMin = fn * rpm;
    const time = feedMmMin > 0 ? (depth / feedMmMin) * 60 : 5;

    return {
      type: "ream",
      name: `Reaming ⌀${reamDia}`,
      tool_station: tool.station,
      speed_value: rpm,
      css_mode: false,
      feed_rate: fn,
      feed_unit: "mm/rev",
      doc_mm: (reamDia - (part.drill_diameter_mm ?? reamDia - 0.5)) / 2, // Stock per side
      gcode_lines: lines,
      estimated_time_s: Math.max(time, 4),
    };
  }

  /**
   * Generate rigid tapping operation using G84.
   * Synchronized spindle+feed with controlled retract.
   */
  private generateTappingOp(
    part: TurningPartProfile,
    tool: TurningToolAssignment,
    mat: TurningMaterialData,
    maxRpm: number,
    dialect: ControllerDialect,
    nl: () => string,
  ): TurningOperation {
    const tapInfo = parseTapSize(part.tap_size ?? "M10x1.5");
    const rpm = Math.min(calcRPM(mat.Vc_thread * 0.3, tapInfo.diameter_mm, maxRpm), 800); // Conservative for tapping
    const pitch = tapInfo.pitch_mm;
    const depth = part.drill_depth_mm ? part.drill_depth_mm - 3 : 20; // Thread depth = drill depth - 3mm

    const lines: string[] = [];
    lines.push(`${nl()} ${dialect.tool_change(tool.station, tool.offset_number)} ${dialect.comment(`TAP ${part.tap_size}`)}`);
    lines.push(`${nl()} ${dialect.rpm_mode(rpm)} ${dialect.spindle_cw}`);
    lines.push(`${nl()} ${dialect.coolant_on}`);
    lines.push(`${nl()} G00 X0 Z3.0 ${dialect.comment("RAPID TO CENTER")}`);

    // G84 rigid tapping cycle
    lines.push(`${nl()} G84 Z${fmt(-depth)} F${fmt(pitch)} ${dialect.comment(`RIGID TAP ${part.tap_size}`)}`);
    // G84 automatically retracts

    lines.push(`${nl()} ${dialect.coolant_off}`);
    lines.push(`${nl()} ${dialect.spindle_stop}`);
    lines.push(`${nl()} ${dialect.home}`);
    lines.push(`${nl()} ${dialect.optional_stop}`);

    const feedMmMin = pitch * rpm;
    const time = feedMmMin > 0 ? (depth / feedMmMin) * 60 * 2 : 5; // ×2 for in+out

    return {
      type: "tap",
      name: `Tapping ${part.tap_size}`,
      tool_station: tool.station,
      speed_value: rpm,
      css_mode: false,
      feed_rate: pitch,
      feed_unit: "mm/rev",
      doc_mm: (tapInfo.diameter_mm - (part.drill_diameter_mm ?? tapInfo.diameter_mm - pitch)) / 2,
      gcode_lines: lines,
      estimated_time_s: Math.max(time, 4),
    };
  }

  /**
   * Generate part-off (cutoff) operation using G75.
   * Includes feed reduction approaching center to prevent pip/burr.
   */
  private generatePartOffOp(
    part: TurningPartProfile,
    tool: TurningToolAssignment,
    mat: TurningMaterialData,
    maxRpm: number,
    dialect: ControllerDialect,
    nl: () => string,
  ): TurningOperation {
    const bladeWidth = part.part_off_width_mm ?? 3;
    const vc = mat.Vc_rough * mat.partoff_Vc_factor;
    const fn = mat.fn_rough * 0.4; // Reduced feed for part-off
    const fnCenter = fn * 0.5;     // Further reduced near center

    // Part-off at the left end of the part
    const partoffZ = part.od_profile.length > 0
      ? Math.min(...part.od_profile.map(p => p.z_mm)) - bladeWidth / 2
      : -part.bar_length_mm;

    const odDia = part.bar_diameter_mm;
    const centerThreshold = 5.0; // Diameter below which to reduce feed

    // Use direct RPM (not CSS) for part-off safety
    const rpm = calcRPM(vc, odDia, maxRpm);

    const lines: string[] = [];
    lines.push(`${nl()} ${dialect.tool_change(tool.station, tool.offset_number)} ${dialect.comment(`PART-OFF BLADE ${bladeWidth}MM`)}`);
    lines.push(`${nl()} ${dialect.speed_clamp(maxRpm)}`);
    lines.push(`${nl()} ${dialect.rpm_mode(rpm)} ${dialect.spindle_cw} ${dialect.comment(`RPM ${rpm} FOR PART-OFF`)}`);
    lines.push(`${nl()} ${dialect.coolant_on}`);
    lines.push(`${nl()} G00 X${fmt(odDia + 2)} Z${fmt(partoffZ)} ${dialect.comment("POSITION AT PART-OFF Z")}`);

    // Two-stage part-off: normal feed to near center, then reduced
    lines.push(`${nl()} G01 X${fmt(centerThreshold)} F${fmt(fn)} ${dialect.comment("PART-OFF TO NEAR CENTER")}`);
    lines.push(`${nl()} G01 X-1.0 F${fmt(fnCenter)} ${dialect.comment("REDUCED FEED THROUGH CENTER")}`);

    lines.push(`${nl()} G00 X${fmt(odDia + 5)} ${dialect.comment("RETRACT X CLEAR")}`);
    lines.push(`${nl()} ${dialect.coolant_off}`);
    lines.push(`${nl()} ${dialect.spindle_stop}`);
    lines.push(`${nl()} ${dialect.home}`);
    lines.push(`${nl()} ${dialect.optional_stop}`);

    // Time estimate
    const cutDistance = odDia / 2 + 1;
    const feedMmMin = fn * rpm;
    const time = feedMmMin > 0 ? (cutDistance / feedMmMin) * 60 : 10;

    return {
      type: "partoff",
      name: "Part-Off / Cutoff",
      tool_station: tool.station,
      speed_value: rpm,
      css_mode: false,
      feed_rate: fn,
      feed_unit: "mm/rev",
      doc_mm: bladeWidth,
      gcode_lines: lines,
      estimated_time_s: Math.max(time, 5),
    };
  }

  // ──────────────────────────────────────────────────────────────────────
  // PRIVATE HELPERS — Geometry
  // ──────────────────────────────────────────────────────────────────────

  /**
   * Interpolate diameter at a given Z position from a profile.
   * Uses linear interpolation between profile points.
   * @param profile - Profile point array
   * @param z - Z position to query
   * @returns Diameter (X value) at that Z
   */
  private getDiameterAtZ(profile: ProfilePoint[], z: number): number {
    if (profile.length === 0) return 50; // Fallback

    // Sort by Z descending (right to left)
    const sorted = [...profile].sort((a, b) => b.z_mm - a.z_mm);

    // Before first point
    if (z >= sorted[0].z_mm) return Math.abs(sorted[0].x_mm);
    // After last point
    if (z <= sorted[sorted.length - 1].z_mm) return Math.abs(sorted[sorted.length - 1].x_mm);

    // Find bracketing points
    for (let i = 0; i < sorted.length - 1; i++) {
      if (z <= sorted[i].z_mm && z >= sorted[i + 1].z_mm) {
        const t = (z - sorted[i + 1].z_mm) / (sorted[i].z_mm - sorted[i + 1].z_mm);
        const x = sorted[i + 1].x_mm + t * (sorted[i].x_mm - sorted[i + 1].x_mm);
        return Math.abs(x);
      }
    }

    return Math.abs(sorted[0].x_mm);
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

/** Singleton instance of TurningProgramAssemblerEngine. */
export const turningProgramAssemblerEngine = new TurningProgramAssemblerEngineImpl();
