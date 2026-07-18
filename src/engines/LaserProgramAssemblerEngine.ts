/**
 * LaserProgramAssemblerEngine — Complete Laser Program Generation Pipeline
 *
 * Laser equivalent of TurningProgramAssemblerEngine / CNCProgramAssemblerEngine.
 * Accepts a laser process description and generates a complete, controller-specific
 * program with physics-backed parameters, Monte Carlo uncertainty, and G-code output.
 *
 * Pipeline:
 *   1. Resolve material DB → get reflectivity, absorption coeff, thermal props
 *   2. Select laser process mode (cutting/marking/welding/drilling/cladding/texturing)
 *   3. Compute physics: Beer-Lambert absorption, Schulz/Steen cutting speed,
 *      kerf width, HAZ, Rz roughness, gas flow, Swift-Hook weld penetration
 *   4. Monte Carlo uncertainty (500 samples) — CI95 for quality metrics
 *   5. Generate controller-dialect G-code (Fanuc, Siemens, TRUMPF, Bystronic,
 *      Mazak, Amada, Generic) with correct M-codes per dialect
 *   6. Emit program header, pierce sequence, cut path, safe end, cycle time, cost
 *
 * Laser Process Coverage (exhaustive):
 *   Cutting:  CO2 / fiber thin / fiber thick / pulsed / fusion-N2 / flame-O2 / sublimation
 *   Marking:  annealing / engraving / etching / foaming / carbonizing / day-night
 *   Welding:  keyhole / conduction / wobble / seam / spot
 *   Special:  LAM / texturing / percussion-drill / trepan-drill / cladding/DED
 *
 * Physics Models (with citations):
 *   Beer-Lambert:        I(z) = I₀×(1-R)×exp(-αz)                  [Born & Wolf 1999]
 *   Schulz cutting speed: V = K×P / (t^n × ρ×c×ΔT)                 [Schulz 1999]
 *   Steen thick plate:   V = A×P / (t^1.5)                          [Steen 2003]
 *   Kerf width:          w = d_spot + 2×δ_melt                       [Powell 1993]
 *   HAZ:                 δ = √(4×α_diff×τ_i)                         [Carslaw & Jaeger 1959]
 *   Surface roughness:   Rz = C×t^0.4×V^0.3/P^0.5 (CW)             [Yilbas 2001]
 *   Gas flow:            Q = π/4×d²×√(2×ΔP/ρ)                       [ISO 11145]
 *   Weld penetration:    d = P×η/(v×w×ρ×(c×ΔT+Lf))                 [Swift-Hook & Gick 1973]
 *   Percussion drill:    t_drill = ρ×L×(π×d²/4)/(P×η)              [Dausinger 2000]
 *   LIPSS period:        Λ = λ/n_eff                                  [Bonse & Gräf 2020]
 *   Plasma IB absorption: α_IB ∝ n_e²/(ω²×T^1.5)                   [Popov 2011]
 *
 * Pure computation — no filesystem, no external dependencies.
 *
 * @module engines/LaserProgramAssemblerEngine
 */

import { log } from "../utils/Logger.js";
import { PipelineCheckpointManager } from "../utils/pipelineCheckpoint.js";
import { resolveMaterial, resolveMachine, type ResolvedMaterialContext, type ResolvedMachineContext } from "./PipelineRegistryBridge.js";
import { machineEnvelopeGuardEngine } from "./MachineEnvelopeGuardEngine.js";

// Lazy-loaded nesting engine — avoids circular imports
let _sheetNestingEngine: import("./SheetNestingEngine.js").SheetNestingEngine | null = null;
async function getSheetNestingEngine(): Promise<import("./SheetNestingEngine.js").SheetNestingEngine> {
  if (!_sheetNestingEngine) {
    const mod = await import("./SheetNestingEngine.js");
    _sheetNestingEngine = new mod.SheetNestingEngine();
  }
  return _sheetNestingEngine;
}

// ============================================================================
// ATOMIC VALUE WRAPPER
// ============================================================================

/** Standard PRISM return wrapper with generic payload. */
export interface AtomicValue<T> {
  value: T;
  unit: string;
  formula?: string;
  confidence?: number;
}

// ============================================================================
// MATERIAL DATABASE (12 materials, laser-specific properties)
// ============================================================================

interface LaserMaterialDB {
  name: string;
  /** Reflectivity at 1.06 µm (fiber/disk) */
  R_fiber: number;
  /** Reflectivity at 10.6 µm (CO2) */
  R_co2: number;
  /** Absorption coefficient [m⁻¹] at 1.06 µm */
  alpha_fiber: number;
  /** Absorption coefficient [m⁻¹] at 10.6 µm */
  alpha_co2: number;
  /** Thermal diffusivity [m²/s] */
  thermal_diffusivity: number;
  /** Melting point [°C] */
  T_melt: number;
  /** Boiling/vaporisation point [°C] */
  T_boil: number;
  /** Specific heat [J/(kg·K)] */
  cp: number;
  /** Density [kg/m³] */
  rho: number;
  /** Latent heat of fusion [J/kg] */
  L_fusion: number;
  /** Thermal conductivity [W/(m·K)] */
  k_therm: number;
  /** Schulz speed constant K */
  K_schulz: number;
  /** Schulz exponent n */
  n_schulz: number;
  /** Recommended assist gas(es) */
  recommended_gas: string[];
  /** Max thickness fiber [mm] */
  max_t_fiber: number;
  /** Max thickness CO2 [mm] */
  max_t_co2: number;
  /** Marking annealing suitable */
  anneal_ok: boolean;
  /** Notes */
  notes: string;
}

const LASER_MAT_DB: Record<string, LaserMaterialDB> = {
  mild_steel: {
    name: "Mild Steel (S235/A36)",
    R_fiber: 0.60, R_co2: 0.05,
    alpha_fiber: 6.5e6, alpha_co2: 8.0e5,
    thermal_diffusivity: 1.17e-5,
    T_melt: 1510, T_boil: 2750,
    cp: 490, rho: 7850, L_fusion: 2.72e5, k_therm: 50,
    K_schulz: 4200, n_schulz: 1.25,
    recommended_gas: ["oxygen", "nitrogen"],
    max_t_fiber: 30, max_t_co2: 25,
    anneal_ok: false,
    notes: "O2 assist gives exothermic boost for thick sections; N2 for clean edge"
  },
  stainless_304: {
    name: "Stainless Steel 304",
    R_fiber: 0.62, R_co2: 0.06,
    alpha_fiber: 6.0e6, alpha_co2: 7.5e5,
    thermal_diffusivity: 3.9e-6,
    T_melt: 1450, T_boil: 2750,
    cp: 500, rho: 8000, L_fusion: 2.77e5, k_therm: 16,
    K_schulz: 3800, n_schulz: 1.30,
    recommended_gas: ["nitrogen"],
    max_t_fiber: 25, max_t_co2: 16,
    anneal_ok: true,
    notes: "N2 only for oxide-free edge; annealing gives black/gold/blue colour marks"
  },
  stainless_316: {
    name: "Stainless Steel 316",
    R_fiber: 0.62, R_co2: 0.06,
    alpha_fiber: 5.8e6, alpha_co2: 7.2e5,
    thermal_diffusivity: 3.7e-6,
    T_melt: 1390, T_boil: 2750,
    cp: 502, rho: 8000, L_fusion: 2.77e5, k_therm: 14,
    K_schulz: 3600, n_schulz: 1.30,
    recommended_gas: ["nitrogen"],
    max_t_fiber: 22, max_t_co2: 14,
    anneal_ok: true,
    notes: "Similar to 304; slightly lower conductivity, use same N2 params"
  },
  aluminum_5052: {
    name: "Aluminum 5052",
    R_fiber: 0.91, R_co2: 0.97,
    alpha_fiber: 1.5e7, alpha_co2: 2.5e5,
    thermal_diffusivity: 5.8e-5,
    T_melt: 607, T_boil: 2519,
    cp: 880, rho: 2680, L_fusion: 3.87e5, k_therm: 138,
    K_schulz: 5500, n_schulz: 1.15,
    recommended_gas: ["nitrogen", "air"],
    max_t_fiber: 15, max_t_co2: 6,
    anneal_ok: false,
    notes: "High reflectivity at 1.06µm — needs high peak power or green/UV for thin gauge; fiber works well at high power"
  },
  aluminum_6061: {
    name: "Aluminum 6061",
    R_fiber: 0.91, R_co2: 0.97,
    alpha_fiber: 1.5e7, alpha_co2: 2.4e5,
    thermal_diffusivity: 6.8e-5,
    T_melt: 652, T_boil: 2519,
    cp: 897, rho: 2700, L_fusion: 3.97e5, k_therm: 167,
    K_schulz: 5700, n_schulz: 1.15,
    recommended_gas: ["nitrogen", "air"],
    max_t_fiber: 15, max_t_co2: 6,
    anneal_ok: false,
    notes: "Very high thermal conductivity — fast heat dissipation; use higher power density"
  },
  copper: {
    name: "Copper (ETP)",
    R_fiber: 0.95, R_co2: 0.98,
    alpha_fiber: 7.5e6, alpha_co2: 2.0e5,
    thermal_diffusivity: 1.17e-4,
    T_melt: 1085, T_boil: 2562,
    cp: 385, rho: 8960, L_fusion: 2.09e5, k_therm: 401,
    K_schulz: 2000, n_schulz: 1.40,
    recommended_gas: ["nitrogen"],
    max_t_fiber: 10, max_t_co2: 2,
    anneal_ok: false,
    notes: "Extremely high reflectivity — green (515nm) or UV preferred; fiber requires very high power to couple"
  },
  brass: {
    name: "Brass (CuZn37)",
    R_fiber: 0.93, R_co2: 0.97,
    alpha_fiber: 8.0e6, alpha_co2: 2.2e5,
    thermal_diffusivity: 3.4e-5,
    T_melt: 900, T_boil: 1400,
    cp: 377, rho: 8500, L_fusion: 1.68e5, k_therm: 120,
    K_schulz: 2500, n_schulz: 1.35,
    recommended_gas: ["nitrogen", "air"],
    max_t_fiber: 12, max_t_co2: 3,
    anneal_ok: false,
    notes: "Lower boiling point than Cu — easier sublimation; Zn fumes require good extraction"
  },
  titanium: {
    name: "Titanium Ti-6Al-4V",
    R_fiber: 0.55, R_co2: 0.18,
    alpha_fiber: 4.8e6, alpha_co2: 6.5e5,
    thermal_diffusivity: 2.9e-6,
    T_melt: 1660, T_boil: 3287,
    cp: 526, rho: 4430, L_fusion: 3.65e5, k_therm: 6.7,
    K_schulz: 3200, n_schulz: 1.20,
    recommended_gas: ["argon", "nitrogen"],
    max_t_fiber: 20, max_t_co2: 10,
    anneal_ok: true,
    notes: "Inert gas (Ar/N2) mandatory — Ti ignites in O2 above ~600°C; excellent annealing colour range"
  },
  inconel_718: {
    name: "Inconel 718",
    R_fiber: 0.58, R_co2: 0.10,
    alpha_fiber: 5.2e6, alpha_co2: 7.0e5,
    thermal_diffusivity: 2.5e-6,
    T_melt: 1336, T_boil: 3100,
    cp: 435, rho: 8190, L_fusion: 2.27e5, k_therm: 11.4,
    K_schulz: 2800, n_schulz: 1.35,
    recommended_gas: ["nitrogen", "argon"],
    max_t_fiber: 15, max_t_co2: 8,
    anneal_ok: false,
    notes: "Low thermal conductivity → localised HAZ; precipitation hardening — monitor thermal cycle"
  },
  galvanized_steel: {
    name: "Galvanized Steel",
    R_fiber: 0.65, R_co2: 0.08,
    alpha_fiber: 6.0e6, alpha_co2: 7.8e5,
    thermal_diffusivity: 1.10e-5,
    T_melt: 1480, T_boil: 2700,
    cp: 490, rho: 7800, L_fusion: 2.65e5, k_therm: 48,
    K_schulz: 4000, n_schulz: 1.25,
    recommended_gas: ["nitrogen", "oxygen"],
    max_t_fiber: 20, max_t_co2: 16,
    anneal_ok: false,
    notes: "Zn coating vaporises at 907°C — porous dross likely; increased fume extraction required"
  },
  carbon_steel: {
    name: "Carbon Steel (1045)",
    R_fiber: 0.59, R_co2: 0.05,
    alpha_fiber: 6.3e6, alpha_co2: 7.9e5,
    thermal_diffusivity: 1.14e-5,
    T_melt: 1480, T_boil: 2730,
    cp: 486, rho: 7840, L_fusion: 2.70e5, k_therm: 49,
    K_schulz: 4100, n_schulz: 1.25,
    recommended_gas: ["oxygen", "nitrogen"],
    max_t_fiber: 28, max_t_co2: 22,
    anneal_ok: false,
    notes: "High carbon → harder HAZ; O2 exothermic useful for thick; preheat >12mm"
  },
  acrylic: {
    name: "Acrylic / PMMA",
    R_fiber: 0.04, R_co2: 0.02,
    alpha_fiber: 1.0e4, alpha_co2: 8.5e5,
    thermal_diffusivity: 1.1e-7,
    T_melt: 160, T_boil: 390,
    cp: 1465, rho: 1190, L_fusion: 1.55e5, k_therm: 0.19,
    K_schulz: 8000, n_schulz: 0.90,
    recommended_gas: ["air", "nitrogen"],
    max_t_fiber: 3, max_t_co2: 25,
    anneal_ok: false,
    notes: "CO2 is ideal (very high α at 10.6µm); sublimation cutting gives flame-polished edge; vents MMA monomer"
  }
};

// ============================================================================
// CONTROLLER DIALECT DATABASE
// ============================================================================

type LaserController =
  | "fanuc_laser"
  | "siemens_laser"
  | "trumpf"
  | "bystronic"
  | "mazak_laser"
  | "amada"
  | "generic_laser";

interface LaserDialect {
  name: string;
  brand: string;
  /** M-code to set laser power (use {P} placeholder for watts) */
  m_power_set: string;
  /** M-code or command to turn laser ON */
  m_laser_on: string;
  /** M-code to turn laser OFF */
  m_laser_off: string;
  /** M-code to turn assist gas ON */
  m_gas_on: string;
  /** M-code to turn assist gas OFF */
  m_gas_off: string;
  /** M-code for pierce (dwell at pierce point) */
  m_pierce: string;
  /** M-code / command for pulsed mode ON */
  m_pulse_on: string;
  /** M-code for pulsed mode OFF */
  m_pulse_off: string;
  /** Program start marker */
  prog_start: string;
  /** Program end command */
  prog_end: string;
  /** Comment style: "paren" | "semicolon" | "slash" */
  comment_style: "paren" | "semicolon" | "slash";
  /** Feed mode command (e.g. G94=mm/min) */
  feed_mode: string;
  /** Extra notes */
  notes: string;
}

const LASER_DIALECTS: Record<LaserController, LaserDialect> = {
  fanuc_laser: {
    name: "Fanuc Laser CNC (30i-LB / 31i-LB)",
    brand: "Fanuc",
    m_power_set:  "M10 P{P}",
    m_laser_on:   "M03",
    m_laser_off:  "M05",
    m_gas_on:     "M11",
    m_gas_off:    "M12",
    m_pierce:     "G04 P{pierce_ms}",
    m_pulse_on:   "M68",
    m_pulse_off:  "M69",
    prog_start:   "%\nO{PROG_NO}",
    prog_end:     "M30\n%",
    comment_style: "paren",
    feed_mode:    "G94",
    notes:        "Fanuc 30i-LB / 31i-LB — standard for OEM laser integrations"
  },
  siemens_laser: {
    name: "Siemens 840D sl / 828D (Laser)",
    brand: "Siemens",
    m_power_set:  "$AC_LASER_POWER={P}",
    m_laser_on:   "LASERON",
    m_laser_off:  "LASEROFF",
    m_gas_on:     "GASON",
    m_gas_off:    "GASOFF",
    m_pierce:     "G4 F{pierce_s}",
    m_pulse_on:   "PULSEON",
    m_pulse_off:  "PULSEOFF",
    prog_start:   "; {PROG_NAME}\n; SIEMENS 840D LASER",
    prog_end:     "M30",
    comment_style: "semicolon",
    feed_mode:    "G94",
    notes:        "Siemens 840D sl with LaserFusion / Cut3D option"
  },
  trumpf: {
    name: "TRUMPF TruControl / TruTops",
    brand: "TRUMPF",
    m_power_set:  "M10={P}",
    m_laser_on:   "M12",
    m_laser_off:  "M13",
    m_gas_on:     "M20",
    m_gas_off:    "M21",
    m_pierce:     "M14 T{pierce_ms}",
    m_pulse_on:   "M30",
    m_pulse_off:  "M31",
    prog_start:   "H{PROG_NO}",
    prog_end:     "M02",
    comment_style: "paren",
    feed_mode:    "G94",
    notes:        "TRUMPF TruControl 8000 series; TruTops post generates this dialect"
  },
  bystronic: {
    name: "Bystronic Bypos / BySmart",
    brand: "Bystronic",
    m_power_set:  "M200 S{P}",
    m_laser_on:   "M04",
    m_laser_off:  "M05",
    m_gas_on:     "M06",
    m_gas_off:    "M07",
    m_pierce:     "G04 X{pierce_s}",
    m_pulse_on:   "M210",
    m_pulse_off:  "M211",
    prog_start:   "%\nO{PROG_NO} (BYSTRONIC)",
    prog_end:     "M30\n%",
    comment_style: "paren",
    feed_mode:    "G94",
    notes:        "Bystronic Bypos CNC; BySmart / ByStar family"
  },
  mazak_laser: {
    name: "Mazak Optiplex / SmoothLX",
    brand: "Mazak",
    m_power_set:  "E1={P}",
    m_laser_on:   "M03",
    m_laser_off:  "M05",
    m_gas_on:     "M08",
    m_gas_off:    "M09",
    m_pierce:     "G04 P{pierce_ms}",
    m_pulse_on:   "M60",
    m_pulse_off:  "M61",
    prog_start:   "%\nO{PROG_NO} (MAZAK OPTIPLEX)",
    prog_end:     "M30\n%",
    comment_style: "paren",
    feed_mode:    "G94",
    notes:        "Mazak Optiplex 3015 / 4020 SmoothLX controller"
  },
  amada: {
    name: "Amada AMNC 3i / FO-NT",
    brand: "Amada",
    m_power_set:  "SPW {P}",
    m_laser_on:   "SON",
    m_laser_off:  "SOFF",
    m_gas_on:     "GON",
    m_gas_off:    "GOFF",
    m_pierce:     "PRC {pierce_ms}",
    m_pulse_on:   "PLS ON",
    m_pulse_off:  "PLS OFF",
    prog_start:   "N1 G92 X0 Y0",
    prog_end:     "END",
    comment_style: "paren",
    feed_mode:    "G94",
    notes:        "Amada AMNC 3i / FO-NT series — unique keyword-style commands"
  },
  generic_laser: {
    name: "Generic ISO Laser",
    brand: "Generic",
    m_power_set:  "M100 P{P}",
    m_laser_on:   "M101",
    m_laser_off:  "M104",
    m_gas_on:     "M103",
    m_gas_off:    "M102",
    m_pierce:     "G04 P{pierce_ms}",
    m_pulse_on:   "M106",
    m_pulse_off:  "M107",
    prog_start:   "%\nO{PROG_NO}",
    prog_end:     "M30\n%",
    comment_style: "paren",
    feed_mode:    "G94",
    notes:        "Generic ISO-style laser CNC — safe fallback for unknown controllers"
  }
};

// ============================================================================
// INPUT / OUTPUT TYPES
// ============================================================================

/** Laser process type */
export type LaserProcessType =
  | "cut_co2"
  | "cut_fiber_thin"
  | "cut_fiber_thick"
  | "cut_pulsed"
  | "cut_fusion_n2"
  | "cut_flame_o2"
  | "cut_sublimation"
  | "mark_anneal"
  | "mark_engrave"
  | "mark_etch"
  | "mark_foam"
  | "mark_carbonize"
  | "mark_daynight"
  | "weld_keyhole"
  | "weld_conduction"
  | "weld_wobble"
  | "weld_seam"
  | "weld_spot"
  | "drill_percussion"
  | "drill_trepan"
  | "lam_preheat"
  | "texture_surface"
  | "clad_ded";

/** Laser type */
export type LaserType = "fiber" | "co2" | "disk" | "pulsed_fiber" | "pulsed_co2" | "green" | "uv";

/** Assist gas */
export type AssistGas = "oxygen" | "nitrogen" | "argon" | "air" | "helium";

/** Geometry for cut path */
export interface LaserCutGeometry {
  /** Contour points [mm] — closed loop if first == last */
  points: Array<{ x: number; y: number }>;
  /** Optional arcs: index of start point + radius + direction */
  arcs?: Array<{ start_idx: number; radius: number; ccw: boolean }>;
  /** True if contour is a closed loop (part cutout) */
  closed: boolean;
  /** Lead-in length [mm] */
  lead_in_mm?: number;
  /** Lead-out length [mm] */
  lead_out_mm?: number;
}

/** Nesting input — optional multi-part sheet nesting for laser cutting */
export interface LaserNestingInput {
  /** Sheet width [mm] */
  sheet_width: number;
  /** Sheet height [mm] */
  sheet_height: number;
  /** Parts to nest — each with geometry and optional quantity */
  parts: Array<{
    id: string;
    geometry: LaserCutGeometry;
    quantity?: number;
  }>;
  /** Spacing between parts [mm] — default kerf + 5mm */
  spacing_mm?: number;
  /** Allow 0/90/180/270 rotation — default true */
  rotation_allowed?: boolean;
  /** Grain direction constraint — "X" | "Y" | null */
  grain_direction?: "X" | "Y" | null;
  /** Tab/micro-joint width [mm] for part retention — 0 = no tabs. Default: 2.0 */
  tab_width_mm?: number;
  /** Tab spacing along contour [mm] — default 80 */
  tab_spacing_mm?: number;
  /** Enable common-line cutting detection — default true */
  common_line_enabled?: boolean;
}

/** Nesting result appended to LaserProgram when nesting is active */
export interface LaserNestingResult {
  parts_per_sheet: number;
  utilization_pct: number;
  waste_pct: number;
  sheets_used: number;
  nested_positions: Array<{
    part_id: string;
    instance: number;
    x: number;
    y: number;
    rotation_deg: number;
  }>;
  common_line_pairs: Array<{ part_a: string; part_b: string; shared_edge_mm: number }>;
  tabs_placed: number;
}

/** Input profile for laser cutting */
export interface LaserCutProfile {
  process: LaserProcessType;
  material: string;
  thickness_mm: number;
  laser_type: LaserType;
  power_w: number;
  /** Beam diameter at focus [mm] — default 0.1 for fiber, 0.3 for CO2 */
  focus_diameter_mm?: number;
  /** Focus position relative to top surface [mm] — negative = below surface */
  focus_z_mm?: number;
  assist_gas: AssistGas;
  /** Gas pressure [bar] */
  gas_pressure_bar: number;
  /** Nozzle diameter [mm] — default 1.5 */
  nozzle_diameter_mm?: number;
  geometry?: LaserCutGeometry;
  controller?: LaserController;
  /** Override cutting speed [mm/min] — if provided, skips physics calc */
  speed_override_mmpm?: number;
  /** Program number */
  program_number?: number;
  /** Part name */
  part_name?: string;
  /** Multi-part nesting input — if provided, triggers nested multi-part program */
  nesting?: LaserNestingInput;
  /** Quantity of the single part (used with nesting when parts[] not provided) */
  quantity?: number;
  /** Machine brand for registry resolution (U-ARCH3). */
  machine_brand?: string;
  /** Machine model for registry resolution (U-ARCH3). */
  machine_model?: string;
}

/** Input profile for laser marking */
export interface LaserMarkProfile {
  process: LaserProcessType;
  material: string;
  laser_type: LaserType;
  power_w: number;
  /** Pulse frequency [kHz] */
  frequency_khz: number;
  /** Pulse duration [ns] */
  pulse_duration_ns: number;
  /** Scan speed [mm/s] */
  scan_speed_mmps: number;
  /** Hatch spacing [mm] */
  hatch_spacing_mm: number;
  /** Number of passes */
  passes?: number;
  /** Mark area [mm²] */
  area_mm2?: number;
  /** Target depth for engraving [mm] */
  target_depth_mm?: number;
  controller?: LaserController;
  program_number?: number;
  part_name?: string;
  /** Machine brand for registry resolution (U-ARCH3). */
  machine_brand?: string;
  /** Machine model for registry resolution (U-ARCH3). */
  machine_model?: string;
}

/** Input profile for laser welding */
export interface LaserWeldProfile {
  process: LaserProcessType;
  material: string;
  thickness_mm: number;
  laser_type: LaserType;
  power_w: number;
  /** Weld speed [mm/min] */
  weld_speed_mmpm: number;
  /** Beam diameter at focus [mm] */
  focus_diameter_mm?: number;
  /** Wobble amplitude [mm] — for weld_wobble */
  wobble_amplitude_mm?: number;
  /** Wobble frequency [Hz] */
  wobble_freq_hz?: number;
  /** Shielding gas */
  shield_gas: AssistGas;
  /** Shield gas flow [L/min] */
  shield_flow_lpm: number;
  /** Weld seam length [mm] — for cycle time */
  seam_length_mm?: number;
  /** Joint type: butt | lap | fillet | edge */
  joint_type?: string;
  controller?: LaserController;
  program_number?: number;
  part_name?: string;
  /** Machine brand for registry resolution (U-ARCH3). */
  machine_brand?: string;
  /** Machine model for registry resolution (U-ARCH3). */
  machine_model?: string;
}

/** Input profile for laser drilling */
export interface LaserDrillProfile {
  process: "drill_percussion" | "drill_trepan";
  material: string;
  thickness_mm: number;
  laser_type: LaserType;
  power_w: number;
  /** Pulse frequency [kHz] for percussion */
  frequency_khz?: number;
  /** Pulse duration [ns] */
  pulse_duration_ns?: number;
  /** Target hole diameter [mm] */
  hole_diameter_mm: number;
  /** Number of holes */
  n_holes: number;
  /** Hole positions [mm] */
  positions?: Array<{ x: number; y: number }>;
  /** Trepan radius [mm] for trepanning mode */
  trepan_radius_mm?: number;
  /** Assist gas */
  assist_gas?: AssistGas;
  controller?: LaserController;
  program_number?: number;
  part_name?: string;
  /** Machine brand for registry resolution (U-ARCH3). */
  machine_brand?: string;
  /** Machine model for registry resolution (U-ARCH3). */
  machine_model?: string;
}

/** Generated laser program output */
export interface LaserProgram {
  /** Process type that generated this program */
  process: LaserProcessType;
  /** Controller dialect used */
  controller: LaserController;
  /** Material name */
  material_name: string;

  // Physics results
  cutting_speed:   AtomicValue<number>;
  kerf_width:      AtomicValue<number>;
  haz_depth:       AtomicValue<number>;
  surface_roughness: AtomicValue<number>;
  gas_flow_lpm:    AtomicValue<number>;
  pierce_time_s:   AtomicValue<number>;
  cycle_time_s:    AtomicValue<number>;
  absorbed_power:  AtomicValue<number>;

  // Process-specific extras
  weld_penetration?: AtomicValue<number>;
  drill_time_s?:     AtomicValue<number>;
  mark_depth_mm?:    AtomicValue<number>;
  mrr_mm3s?:         AtomicValue<number>;

  // Cost & energy
  energy_kwh:      AtomicValue<number>;
  gas_cost_usd:    AtomicValue<number>;

  // G-code
  gcode: string;
  gcode_lines: number;

  // Uncertainty (Monte Carlo 500 samples)
  uncertainty?: LaserUncertainty;

  // Nesting result (present when multi-part nesting was used)
  nesting_result?: LaserNestingResult;

  warnings: string[];
  recommendations: string[];
}

/** Monte Carlo uncertainty output */
export interface LaserUncertainty {
  cutting_speed_ci95:    [number, number];
  kerf_width_ci95:       [number, number];
  haz_depth_ci95:        [number, number];
  surface_roughness_ci95:[number, number];
  p_incomplete_cut:      number;
  p_dross:               number;
  p_burn_through:        number;
  n_samples:             number;
  method:                string;
}

// ============================================================================
// INTERNAL HELPERS
// ============================================================================

/** Box-Muller normal sample — pure, no external dep */
function randn(): number {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

/** Format a comment in the correct dialect style */
function comment(text: string, style: "paren" | "semicolon" | "slash"): string {
  if (style === "semicolon") return `; ${text}`;
  if (style === "slash")     return `/ ${text}`;
  return `(${text})`;
}

/** Replace M-code placeholders */
function fillMCode(template: string, vars: Record<string, string | number>): string {
  let out = template;
  for (const [k, v] of Object.entries(vars)) {
    out = out.replace(new RegExp(`\\{${k}\\}`, "g"), String(v));
  }
  return out;
}

/** Clamp a value to [min, max] */
function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

/** Format number to N decimal places */
function fmt(v: number, dp = 3): string {
  return v.toFixed(dp);
}

// ============================================================================
// PHYSICS KERNEL
// ============================================================================

interface CutPhysicsResult {
  V_cut_mmpm:   number;  // cutting speed [mm/min]
  w_kerf_mm:    number;  // kerf width [mm]
  haz_mm:       number;  // HAZ depth [mm]
  Rz_um:        number;  // surface roughness Rz [µm]
  Q_gas_lpm:    number;  // assist gas flow [L/min]
  t_pierce_s:   number;  // pierce time [s]
  I_absorbed_w: number;  // absorbed irradiance [W]
}

/**
 * Core cutting physics kernel.
 * Schulz (1999) cutting speed model with Beer-Lambert absorbed power.
 */
function computeCutPhysics(
  mat: LaserMaterialDB,
  power_w: number,
  thickness_mm: number,
  focus_d_mm: number,
  gas_pressure_bar: number,
  nozzle_d_mm: number,
  laser_type: LaserType,
  process: LaserProcessType
): CutPhysicsResult {

  // 1. Reflectivity & absorbed power
  // Beer-Lambert: I(z) = I₀×(1-R)×exp(-αz)  [Born & Wolf 1999]
  const R = (laser_type === "co2" || laser_type === "pulsed_co2")
    ? mat.R_co2 : mat.R_fiber;
  const alpha = (laser_type === "co2" || laser_type === "pulsed_co2")
    ? mat.alpha_co2 : mat.alpha_fiber;
  const z_m = (thickness_mm * 0.5) / 1000; // mid-thickness absorption depth
  const I_absorbed_w = power_w * (1 - R) * Math.exp(-alpha * z_m);

  // 2. Cutting speed — Schulz (1999) empirical model
  // V = K×P / (t^n × ρ×cp×ΔT)
  // For thick plate (t>12mm) use Steen model: V = A×P / t^1.5  [Steen 2003]
  const ΔT = mat.T_melt - 20; // ambient to melt [°C]
  let V_cut_mms: number;

  if (thickness_mm > 12 && (process === "cut_flame_o2" || process === "cut_fiber_thick")) {
    // Steen thick-plate model [Steen 2003 — Laser Material Processing, 3rd ed]
    const A = mat.K_schulz * 0.18;
    V_cut_mms = A * I_absorbed_w / Math.pow(thickness_mm, 1.5);
  } else {
    // Schulz model [Schulz & Kostyk 1999, J. Phys. D: Appl. Phys. 32]
    const denom = Math.pow(thickness_mm, mat.n_schulz) * mat.rho * mat.cp * ΔT;
    V_cut_mms = (mat.K_schulz * I_absorbed_w) / denom;
  }

  // O2 exothermic boost: ~1.4× speed for mild/carbon steel [Arata et al. 1979]
  if (process === "cut_flame_o2") {
    V_cut_mms *= 1.4;
  }

  // Sublimation process (wood/acrylic): speed governed by boiling point not melt
  if (process === "cut_sublimation") {
    const ΔT_boil = mat.T_boil - 20;
    const denom2 = Math.pow(thickness_mm, mat.n_schulz * 0.85) * mat.rho * mat.cp * ΔT_boil;
    V_cut_mms = (mat.K_schulz * 1.2 * I_absorbed_w) / denom2;
  }

  // Clamp to physically reasonable range
  V_cut_mms = clamp(V_cut_mms, 0.1, 600); // [mm/s]
  const V_cut_mmpm = V_cut_mms * 60;

  // 3. Kerf width  [Powell 1993 — CO2 Laser Cutting, Springer]
  // w_kerf = d_spot + 2×δ_melt
  // δ_melt ≈ α_diff × (d_spot / V_cut)   (melt front half-width estimate)
  const alpha_diff = mat.thermal_diffusivity; // m²/s
  const tau_i = (focus_d_mm / 1000) / (V_cut_mms + 1e-9); // interaction time [s]
  const delta_melt_m = Math.sqrt(alpha_diff * tau_i);
  const w_kerf_mm = focus_d_mm + 2 * delta_melt_m * 1000;

  // 4. HAZ depth [Carslaw & Jaeger 1959 — Conduction of Heat in Solids]
  // HAZ = √(4 × α_diff × τ_interaction)
  const haz_mm = Math.sqrt(4 * alpha_diff * tau_i) * 1000;

  // 5. Surface roughness Rz [Yilbas 2001, Int. J. Adv. Manuf. Technol.]
  // CW mode: Rz = C × t^0.4 × V^0.3 / P^0.5  [µm]
  const C_rz = 12.5;
  const Rz_um = C_rz
    * Math.pow(thickness_mm, 0.40)
    * Math.pow(V_cut_mmpm / 1000, 0.30)
    / Math.pow(power_w / 1000, 0.50);

  // 6. Assist gas flow [ISO 11145 / Bernoulli orifice]
  // Q = π/4 × d_nozzle² × √(2×ΔP/ρ_gas)
  const d_m = nozzle_d_mm / 1000;
  const ΔP_pa = gas_pressure_bar * 1e5;
  // N2 density at nozzle ≈ 1.25 kg/m³ (slightly elevated by pressure, simplified)
  const rho_gas = 1.25;
  const Q_m3s = (Math.PI / 4) * d_m * d_m * Math.sqrt(2 * ΔP_pa / rho_gas);
  const Q_gas_lpm = Q_m3s * 1000 * 60;

  // 7. Pierce time — empirical model [Wandera et al. 2011]
  // t_pierce ∝ t^1.5 / P  (dwell required to perforate before traverse)
  const t_pierce_s = 0.012 * Math.pow(thickness_mm, 1.5) / (power_w / 1000);

  return { V_cut_mmpm, w_kerf_mm, haz_mm, Rz_um, Q_gas_lpm, t_pierce_s, I_absorbed_w };
}

// ============================================================================
// MONTE CARLO UNCERTAINTY  (500 samples, Box-Muller)
// ============================================================================

/**
 * Monte Carlo uncertainty quantification for laser cutting quality.
 * Perturbs: power ±2%, focus position ±0.1mm, gas pressure ±5%, speed ±3%.
 * Ref: Stournaras et al. (2009), Int. J. Adv. Manuf. Technol.
 */
function runMonteCarlo(
  mat: LaserMaterialDB,
  base: CutPhysicsResult,
  power_w: number,
  thickness_mm: number,
  focus_d_mm: number,
  gas_pressure_bar: number,
  nozzle_d_mm: number,
  laser_type: LaserType,
  process: LaserProcessType,
  n_samples = 500
): LaserUncertainty {

  const speeds: number[] = [];
  const kerfs: number[]  = [];
  const hazs: number[]   = [];
  const rzs: number[]    = [];
  let n_incomplete = 0;
  let n_dross = 0;
  let n_burn = 0;

  for (let i = 0; i < n_samples; i++) {
    const P_s  = power_w        * (1 + 0.02  * randn());
    const t_s  = thickness_mm;
    const d_s  = focus_d_mm     * (1 + 0.05  * randn()); // ±5% focus shift
    const gp_s = gas_pressure_bar * (1 + 0.05 * randn());
    const nd_s = nozzle_d_mm;

    const r = computeCutPhysics(mat, P_s, t_s, d_s, gp_s, nd_s, laser_type, process);

    // Speed perturbation
    const V_s = r.V_cut_mmpm * (1 + 0.03 * randn());
    speeds.push(V_s);
    kerfs.push(r.w_kerf_mm);
    hazs.push(r.haz_mm);
    rzs.push(r.Rz_um);

    // P(incomplete cut): speed too fast or power too low
    const min_viable_V = base.V_cut_mmpm * 0.4;
    if (V_s < min_viable_V || P_s < power_w * 0.85) n_incomplete++;

    // P(dross): typically occurs at intermediate speed with O2 or high gas pressure
    if (gp_s < gas_pressure_bar * 0.80 && V_s > base.V_cut_mmpm * 0.85) n_dross++;

    // P(burn-through): excessive power density on thin material
    const power_density = P_s / (Math.PI / 4 * d_s * d_s); // W/mm²
    if (power_density > 1.5e6 && thickness_mm < 1.5) n_burn++;
  }

  const sorted = (arr: number[]) => [...arr].sort((a, b) => a - b);
  const ci95 = (arr: number[]): [number, number] => {
    const s = sorted(arr);
    return [s[Math.floor(0.025 * n_samples)], s[Math.floor(0.975 * n_samples)]];
  };

  return {
    cutting_speed_ci95:     ci95(speeds),
    kerf_width_ci95:        ci95(kerfs),
    haz_depth_ci95:         ci95(hazs),
    surface_roughness_ci95: ci95(rzs),
    p_incomplete_cut: n_incomplete / n_samples,
    p_dross:          n_dross      / n_samples,
    p_burn_through:   n_burn       / n_samples,
    n_samples,
    method: "Monte Carlo Box-Muller, 500 samples; σ: power ±2%, focus ±5%, gas ±5%, speed ±3%"
  };
}

// ============================================================================
// G-CODE BUILDERS
// ============================================================================

function buildGCodeCut(
  dialect: LaserDialect,
  prog_no: number,
  part_name: string,
  mat: LaserMaterialDB,
  phys: CutPhysicsResult,
  profile: LaserCutProfile,
  processLabel: string
): string {
  const cs = dialect.comment_style;
  const C = (t: string) => comment(t, cs);
  const F_feed = Math.round(phys.V_cut_mmpm);
  const pierce_ms = Math.round(phys.t_pierce_s * 1000);
  const pierce_s  = (phys.t_pierce_s).toFixed(3);

  const powerLine = fillMCode(dialect.m_power_set, { P: Math.round(profile.power_w) });
  const pierceCmd = fillMCode(dialect.m_pierce, { pierce_ms, pierce_s });
  const progStart = fillMCode(dialect.prog_start, {
    PROG_NO:   prog_no.toString().padStart(4, "0"),
    PROG_NAME: part_name.toUpperCase().replace(/\s/g, "_")
  });

  const geom = profile.geometry;
  const lines: string[] = [];

  lines.push(progStart);
  lines.push(C(`LASER CUTTING PROGRAM — ${processLabel}`));
  lines.push(C(`MATERIAL : ${mat.name.toUpperCase()}`));
  lines.push(C(`THICKNESS: ${profile.thickness_mm}mm`));
  lines.push(C(`LASER    : ${profile.laser_type.toUpperCase()} ${profile.power_w}W`));
  lines.push(C(`GAS      : ${profile.assist_gas.toUpperCase()} ${profile.gas_pressure_bar}BAR`));
  lines.push(C(`SPEED    : ${F_feed} MM/MIN  KERF: ${fmt(phys.w_kerf_mm, 2)}mm  HAZ: ${fmt(phys.haz_mm, 2)}mm`));
  lines.push(C(`RZ       : ${fmt(phys.Rz_um, 1)} µm  GAS FLOW: ${fmt(phys.Q_gas_lpm, 1)} L/MIN`));
  lines.push("");

  // Safe start
  lines.push("G90 G21 G54");
  lines.push(dialect.feed_mode);
  lines.push("G00 Z5.0");

  // Power + gas on
  lines.push(powerLine);
  lines.push(dialect.m_gas_on + "  " + C("ASSIST GAS ON"));

  if (geom && geom.points.length >= 2) {
    const pts = geom.points;
    const lead_in = geom.lead_in_mm ?? 3.0;

    // Rapid to pierce position (first point + lead-in offset)
    const p0 = pts[0];
    const p1 = pts[1];
    const dx = p1.x - p0.x; const dy = p1.y - p0.y;
    const len = Math.sqrt(dx * dx + dy * dy) || 1;
    const pierce_x = p0.x - (dx / len) * lead_in;
    const pierce_y = p0.y - (dy / len) * lead_in;

    lines.push(`G00 X${fmt(pierce_x)} Y${fmt(pierce_y)}  ${C("RAPID TO PIERCE START")}`);
    lines.push("G00 Z0.5  " + C("CUT HEIGHT"));
    lines.push(dialect.m_laser_on + "  " + C("LASER ON — PIERCE"));
    lines.push(pierceCmd + "  " + C("PIERCE DWELL"));

    // Lead-in to first contour point
    lines.push(`G01 X${fmt(p0.x)} Y${fmt(p0.y)} F${F_feed}  ${C("LEAD-IN")}`);

    // PIPELINE-VAR U-PV06: Per-segment speed variation at corners
    // Sharp corners require reduced feed to prevent kerf widening + dross buildup
    // Ref: Schulz (1999), Yilbas et al. (2008) — corner velocity limiting
    for (let i = 1; i < pts.length; i++) {
      let segFeed = F_feed;
      // Detect corner angle between segments i-1→i and i→i+1
      if (i < pts.length - 1) {
        const ax = pts[i].x - pts[i - 1].x;
        const ay = pts[i].y - pts[i - 1].y;
        const bx = pts[i + 1].x - pts[i].x;
        const by = pts[i + 1].y - pts[i].y;
        const lenA = Math.sqrt(ax * ax + ay * ay);
        const lenB = Math.sqrt(bx * bx + by * by);
        if (lenA > 0.001 && lenB > 0.001) {
          const cosAngle = (ax * bx + ay * by) / (lenA * lenB);
          const angleDeg = Math.acos(Math.max(-1, Math.min(1, cosAngle))) * (180 / Math.PI);
          if (angleDeg > 90) {
            // Sharp corner (>90° deviation): reduce speed 50%
            segFeed = Math.round(F_feed * 0.5);
          } else if (angleDeg > 45) {
            // Moderate corner: reduce speed 30%
            segFeed = Math.round(F_feed * 0.7);
          }
        }
      }
      const feedComment = segFeed < F_feed ? `  ${C(`CORNER SLOW ${Math.round((1 - segFeed / F_feed) * 100)}%`)}` : "";
      lines.push(`G01 X${fmt(pts[i].x)} Y${fmt(pts[i].y)} F${segFeed}${feedComment}`);
    }

    // Close if closed contour (corner speed at closing joint)
    if (geom.closed) {
      // Closing segment back to first point — check angle at closure
      let closeFeed = F_feed;
      const lastPt = pts[pts.length - 1];
      const ax = lastPt.x - pts[pts.length - 2].x;
      const ay = lastPt.y - pts[pts.length - 2].y;
      const bx = pts[0].x - lastPt.x;
      const by = pts[0].y - lastPt.y;
      const lenA = Math.sqrt(ax * ax + ay * ay);
      const lenB = Math.sqrt(bx * bx + by * by);
      if (lenA > 0.001 && lenB > 0.001) {
        const cosAngle = (ax * bx + ay * by) / (lenA * lenB);
        const angleDeg = Math.acos(Math.max(-1, Math.min(1, cosAngle))) * (180 / Math.PI);
        if (angleDeg > 45) closeFeed = Math.round(F_feed * 0.7);
      }
      lines.push(`G01 X${fmt(pts[0].x)} Y${fmt(pts[0].y)} F${closeFeed}  ${C("CLOSE CONTOUR")}`);
    }

    // Lead-out
    const pLast = pts[pts.length - 1];
    const lead_out = geom.lead_out_mm ?? 2.0;
    lines.push(`G01 X${fmt(pLast.x + (dx / len) * lead_out)} Y${fmt(pLast.y + (dy / len) * lead_out)} F${F_feed}  ${C("LEAD-OUT")}`);
  } else {
    throw new Error("geometry with at least 2 points is required for laser cut G-code generation");
  }

  lines.push(dialect.m_laser_off + "  " + C("LASER OFF"));
  lines.push(dialect.m_gas_off  + "  " + C("GAS OFF"));
  lines.push("G00 Z50.0  " + C("RETRACT"));
  lines.push("G00 X0.000 Y0.000  " + C("HOME"));
  lines.push(dialect.prog_end);

  return lines.join("\n");
}

function buildGCodeMark(
  dialect: LaserDialect,
  prog_no: number,
  part_name: string,
  mat: LaserMaterialDB,
  profile: LaserMarkProfile,
  processLabel: string
): string {
  const cs = dialect.comment_style;
  const C = (t: string) => comment(t, cs);
  const F_scan = Math.round(profile.scan_speed_mmps * 60); // convert mm/s → mm/min

  const powerLine = fillMCode(dialect.m_power_set, { P: Math.round(profile.power_w) });
  const progStart = fillMCode(dialect.prog_start, {
    PROG_NO:   prog_no.toString().padStart(4, "0"),
    PROG_NAME: part_name.toUpperCase().replace(/\s/g, "_")
  });

  // Estimate mark area extent (square root → side length)
  const area = profile.area_mm2 ?? 100;
  const side = Math.sqrt(area);
  const n_lines = Math.max(1, Math.round(side / profile.hatch_spacing_mm));
  const passes = profile.passes ?? 1;

  const lines: string[] = [];
  lines.push(progStart);
  lines.push(C(`LASER MARKING PROGRAM — ${processLabel}`));
  lines.push(C(`MATERIAL  : ${mat.name.toUpperCase()}`));
  lines.push(C(`LASER TYPE: ${profile.laser_type.toUpperCase()} ${profile.power_w}W`));
  lines.push(C(`FREQ      : ${profile.frequency_khz}kHz  PULSE: ${profile.pulse_duration_ns}ns`));
  lines.push(C(`SCAN SPEED: ${profile.scan_speed_mmps} mm/s  HATCH: ${profile.hatch_spacing_mm}mm`));
  lines.push(C(`PASSES    : ${passes}  AREA: ${area}mm²`));
  lines.push("");

  lines.push("G90 G21 G54");
  lines.push(dialect.feed_mode);
  lines.push("G00 Z2.0  " + C("FOCUS HEIGHT FOR MARKING"));
  lines.push(powerLine);

  // Pulsed mode for marking
  lines.push(dialect.m_pulse_on + "  " + C("PULSED MODE ON"));

  // Freq/duty for Fanuc-style: M100 P[w] Q[kHz] D[duty%]
  const duty_pct = clamp(profile.pulse_duration_ns * profile.frequency_khz * 1e3 / 1e9 * 100, 1, 95);
  if (dialect.name.includes("Fanuc")) {
    lines.push(`M100 P${Math.round(profile.power_w)} Q${profile.frequency_khz.toFixed(1)} D${duty_pct.toFixed(1)}  ${C("POWER/FREQ/DUTY")}`);
  }

  for (let p = 0; p < passes; p++) {
    lines.push(C(`PASS ${p + 1} OF ${passes}`));
    for (let i = 0; i < n_lines; i++) {
      const y = i * profile.hatch_spacing_mm;
      const x_start = (i % 2 === 0) ? 0 : side;
      const x_end   = (i % 2 === 0) ? side : 0;
      lines.push(`G00 X${fmt(x_start)} Y${fmt(y)}`);
      lines.push(dialect.m_laser_on);
      lines.push(`G01 X${fmt(x_end)} Y${fmt(y)} F${F_scan}`);
      lines.push(dialect.m_laser_off);
    }
  }

  lines.push(dialect.m_pulse_off + "  " + C("PULSED MODE OFF"));
  lines.push("G00 Z50.0  " + C("RETRACT"));
  lines.push("G00 X0.000 Y0.000  " + C("HOME"));
  lines.push(dialect.prog_end);

  return lines.join("\n");
}

function buildGCodeWeld(
  dialect: LaserDialect,
  prog_no: number,
  part_name: string,
  mat: LaserMaterialDB,
  profile: LaserWeldProfile,
  pen_mm: number,
  processLabel: string
): string {
  const cs = dialect.comment_style;
  const C = (t: string) => comment(t, cs);
  const F_weld = Math.round(profile.weld_speed_mmpm);
  const seam_len = profile.seam_length_mm ?? 100;

  const powerLine = fillMCode(dialect.m_power_set, { P: Math.round(profile.power_w) });
  const progStart = fillMCode(dialect.prog_start, {
    PROG_NO:   prog_no.toString().padStart(4, "0"),
    PROG_NAME: part_name.toUpperCase().replace(/\s/g, "_")
  });

  const lines: string[] = [];
  lines.push(progStart);
  lines.push(C(`LASER WELDING PROGRAM — ${processLabel}`));
  lines.push(C(`MATERIAL   : ${mat.name.toUpperCase()}`));
  lines.push(C(`THICKNESS  : ${profile.thickness_mm}mm`));
  lines.push(C(`LASER      : ${profile.laser_type.toUpperCase()} ${profile.power_w}W`));
  lines.push(C(`WELD SPEED : ${F_weld} MM/MIN`));
  lines.push(C(`PENETRATION: ${fmt(pen_mm, 2)}mm`));
  lines.push(C(`SHIELD GAS : ${profile.shield_gas.toUpperCase()} ${profile.shield_flow_lpm}L/MIN`));
  if (profile.joint_type) lines.push(C(`JOINT TYPE : ${profile.joint_type.toUpperCase()}`));
  lines.push("");

  lines.push("G90 G21 G54");
  lines.push(dialect.feed_mode);
  lines.push(powerLine);
  lines.push(dialect.m_gas_on + "  " + C("SHIELDING GAS ON"));
  lines.push("G00 X0.000 Y0.000 Z2.0  " + C("RAPID TO WELD START"));
  lines.push("G00 Z0.0  " + C("FOCUS ON JOINT"));
  lines.push(dialect.m_laser_on + "  " + C("LASER ON — BEGIN WELD"));

  if (profile.process === "weld_wobble" && profile.wobble_amplitude_mm) {
    // Wobble welding: sinusoidal transverse motion emitted as G-code macro hint
    lines.push(C(`WOBBLE: AMP=${profile.wobble_amplitude_mm}mm FREQ=${profile.wobble_freq_hz ?? 200}Hz`));
    lines.push(C("NOTE: Enable oscillation function on controller (e.g. OSCIL ON)"));
  }

  lines.push(`G01 X${fmt(seam_len)} Y0.000 F${F_weld}  ${C("WELD SEAM")}`);
  lines.push(dialect.m_laser_off + "  " + C("LASER OFF — END WELD"));

  // Crater fill (ramp down power at end)
  lines.push(fillMCode(dialect.m_power_set, { P: Math.round(profile.power_w * 0.4) }) + "  " + C("CRATER FILL POWER 40%"));
  lines.push(`G01 X${fmt(seam_len + 3)} Y0.000 F${Math.round(F_weld * 0.5)}  ${C("CRATER FILL")}`);
  lines.push(dialect.m_laser_off);

  lines.push(dialect.m_gas_off  + "  " + C("GAS OFF"));
  lines.push("G00 Z50.0  " + C("RETRACT"));
  lines.push("G00 X0.000 Y0.000");
  lines.push(dialect.prog_end);

  return lines.join("\n");
}

function buildGCodeDrill(
  dialect: LaserDialect,
  prog_no: number,
  part_name: string,
  mat: LaserMaterialDB,
  profile: LaserDrillProfile,
  drill_time_s: number,
  processLabel: string
): string {
  const cs = dialect.comment_style;
  const C = (t: string) => comment(t, cs);
  const pierce_ms = Math.round(drill_time_s * 1000 / Math.max(1, profile.n_holes));

  const powerLine = fillMCode(dialect.m_power_set, { P: Math.round(profile.power_w) });
  const progStart = fillMCode(dialect.prog_start, {
    PROG_NO:   prog_no.toString().padStart(4, "0"),
    PROG_NAME: part_name.toUpperCase().replace(/\s/g, "_")
  });

  const positions = profile.positions ??
    Array.from({ length: profile.n_holes }, (_, i) => ({ x: i * 10.0, y: 0 }));

  const lines: string[] = [];
  lines.push(progStart);
  lines.push(C(`LASER DRILLING — ${processLabel}`));
  lines.push(C(`MATERIAL  : ${mat.name.toUpperCase()}`));
  lines.push(C(`THICKNESS : ${profile.thickness_mm}mm`));
  lines.push(C(`HOLE DIA  : ${profile.hole_diameter_mm}mm  N_HOLES: ${profile.n_holes}`));
  lines.push(C(`LASER     : ${profile.laser_type.toUpperCase()} ${profile.power_w}W`));
  if (profile.frequency_khz) lines.push(C(`FREQ: ${profile.frequency_khz}kHz  PULSE: ${profile.pulse_duration_ns ?? "—"}ns`));
  lines.push("");

  lines.push("G90 G21 G54");
  lines.push(dialect.feed_mode);
  lines.push(powerLine);
  lines.push(dialect.m_gas_on + "  " + C("ASSIST GAS ON"));

  if (profile.process === "drill_percussion") {
    lines.push(dialect.m_pulse_on + "  " + C("PULSED MODE ON"));
    for (let i = 0; i < positions.length; i++) {
      const pos = positions[i];
      lines.push(`G00 X${fmt(pos.x)} Y${fmt(pos.y)}  ${C(`HOLE ${i + 1}`)}`);
      lines.push("G00 Z0.5");
      lines.push(dialect.m_laser_on);
      lines.push(`G04 P${pierce_ms}  ${C("PERCUSSION DWELL")}`);
      lines.push(dialect.m_laser_off);
    }
    lines.push(dialect.m_pulse_off);
  } else {
    // Trepanning: circular interpolation around each hole centre
    const r = (profile.trepan_radius_mm ?? profile.hole_diameter_mm / 2);
    const F_trepan = Math.round(profile.power_w / profile.thickness_mm * 0.05 * 60);
    lines.push(C(`TREPANNING RADIUS: ${r}mm`));
    for (let i = 0; i < positions.length; i++) {
      const pos = positions[i];
      lines.push(`G00 X${fmt(pos.x + r)} Y${fmt(pos.y)}  ${C(`HOLE ${i + 1} APPROACH`)}`);
      lines.push("G00 Z0.5");
      lines.push(dialect.m_laser_on);
      // Full circle with I/J arc (Fanuc-style G02 = CW full circle)
      lines.push(`G02 X${fmt(pos.x + r)} Y${fmt(pos.y)} I${fmt(-r)} J0.000 F${F_trepan}  ${C("TREPAN CIRCLE")}`);
      lines.push(dialect.m_laser_off);
    }
  }

  lines.push(dialect.m_gas_off);
  lines.push("G00 Z50.0  " + C("RETRACT"));
  lines.push("G00 X0.000 Y0.000");
  lines.push(dialect.prog_end);

  return lines.join("\n");
}

// ============================================================================
// PROCESS LABEL MAP
// ============================================================================

const PROCESS_LABELS: Record<LaserProcessType, string> = {
  cut_co2:          "CO2 LASER CUTTING",
  cut_fiber_thin:   "FIBER LASER CUTTING (THIN ≤6mm)",
  cut_fiber_thick:  "FIBER LASER CUTTING (THICK >6mm)",
  cut_pulsed:       "PULSED LASER CUTTING",
  cut_fusion_n2:    "FUSION CUTTING (N2 ASSIST)",
  cut_flame_o2:     "FLAME CUTTING (O2 ASSIST)",
  cut_sublimation:  "SUBLIMATION CUTTING",
  mark_anneal:      "LASER ANNEALING (COLOUR CHANGE)",
  mark_engrave:     "LASER ENGRAVING (MATERIAL REMOVAL)",
  mark_etch:        "LASER ETCHING (SHALLOW)",
  mark_foam:        "LASER FOAMING (PLASTIC)",
  mark_carbonize:   "LASER CARBONIZING",
  mark_daynight:    "DAY/NIGHT LASER MARKING",
  weld_keyhole:     "KEYHOLE WELDING (DEEP PENETRATION)",
  weld_conduction:  "CONDUCTION WELDING (COSMETIC)",
  weld_wobble:      "WOBBLE/OSCILLATION WELDING",
  weld_seam:        "SEAM WELDING (CONTINUOUS)",
  weld_spot:        "SPOT WELDING (TACK/STRUCTURAL)",
  drill_percussion: "PERCUSSION DRILLING",
  drill_trepan:     "TREPANNING DRILLING",
  lam_preheat:      "LASER-ASSISTED MACHINING (PREHEAT)",
  texture_surface:  "LASER SURFACE TEXTURING",
  clad_ded:         "LASER CLADDING / DED"
};

// ============================================================================
// MAIN ENGINE CLASS
// ============================================================================

/**
 * LaserProgramAssemblerEngine
 *
 * Complete laser program generator: physics → G-code → uncertainty.
 * Supports cutting, marking, welding, drilling and special processes
 * across 7 controller dialects and 12 materials.
 */
export class LaserProgramAssemblerEngine {

  private readonly engineName = "LaserProgramAssemblerEngine";

  // -------------------------------------------------------------------------
  // CUTTING
  // -------------------------------------------------------------------------

  /**
   * Generate a complete laser cutting program.
   *
   * Physics: Beer-Lambert absorption, Schulz/Steen cutting speed,
   * kerf width (Powell), HAZ (Carslaw-Jaeger), Rz (Yilbas), gas flow (ISO 11145).
   * Monte Carlo: 500 samples, CI95 for speed/kerf/HAZ/Rz, P(fail) metrics.
   */
  assembleLaserCut(input: LaserCutProfile): LaserProgram {
    this._fireResolveMachine(input);
    log.debug(`[${this.engineName}] assembleLaserCut: ${input.process} material=${input.material}`);
    const cpm = new PipelineCheckpointManager("laser-cut", (input as any).runId);
    cpm.checkpoint("intake", 0, { material: input.material, process: input.process });

    if (!input.assist_gas) {
      throw new Error("assist_gas is required for laser cut program generation");
    }
    if (!Number.isFinite(input.gas_pressure_bar)) {
      throw new Error("gas_pressure_bar is required for laser cut program generation");
    }
    if (!input.geometry || !Array.isArray(input.geometry.points) || input.geometry.points.length < 2) {
      throw new Error("geometry with at least 2 points is required for laser cut program generation");
    }

    const mat = this._resolveMaterial(input.material);
    const focus_d   = input.focus_diameter_mm  ?? (input.laser_type === "co2" ? 0.30 : 0.10);
    const nozzle_d  = input.nozzle_diameter_mm ?? 1.5;
    const ctrl      = input.controller         ?? "generic_laser";
    const dialect   = LASER_DIALECTS[ctrl];
    const prog_no   = input.program_number     ?? 1001;
    const part_name = input.part_name          ?? "LASER_PART";

    // Physics
    const phys = computeCutPhysics(
      mat, input.power_w, input.thickness_mm,
      focus_d, input.gas_pressure_bar, nozzle_d,
      input.laser_type, input.process
    );

    // Override speed if explicitly specified
    if (input.speed_override_mmpm) phys.V_cut_mmpm = input.speed_override_mmpm;

    // Contour length for cycle time
    const contour_len_mm = this._contourLength(input.geometry);
    const traverse_time_s = (contour_len_mm / phys.V_cut_mmpm) * 60;
    const cycle_time_s    = phys.t_pierce_s + traverse_time_s + 5; // +5s overhead

    // Energy: P × t / 3600 kWh
    const energy_kwh = (input.power_w / 1000) * (cycle_time_s / 3600);

    // Gas cost: flow [L/min] × time [min] / 1000 → m³ × cost/m³
    const gas_costs: Record<AssistGas, number> = {
      nitrogen: 0.30, oxygen: 0.25, argon: 0.80, air: 0.02, helium: 2.50
    };
    const gas_cost = (phys.Q_gas_lpm * (cycle_time_s / 60) / 1000) * (gas_costs[input.assist_gas] ?? 0.30);

    // Monte Carlo
    const unc = runMonteCarlo(
      mat, phys, input.power_w, input.thickness_mm,
      focus_d, input.gas_pressure_bar, nozzle_d,
      input.laser_type, input.process
    );

    // Warnings
    const warnings: string[] = [];
    const recs: string[] = [];
    if (input.thickness_mm > mat.max_t_fiber && (input.laser_type === "fiber" || input.laser_type === "pulsed_fiber")) {
      warnings.push(`Material thickness ${input.thickness_mm}mm exceeds fiber laser max (${mat.max_t_fiber}mm) for ${mat.name}`);
    }
    if (input.thickness_mm > mat.max_t_co2 && (input.laser_type === "co2" || input.laser_type === "pulsed_co2")) {
      warnings.push(`Material thickness ${input.thickness_mm}mm exceeds CO2 laser max (${mat.max_t_co2}mm) for ${mat.name}`);
    }
    if (mat.recommended_gas.length > 0 && !mat.recommended_gas.includes(input.assist_gas)) {
      warnings.push(`Assist gas '${input.assist_gas}' not recommended for ${mat.name}. Use: ${mat.recommended_gas.join(" or ")}`);
    }
    // PIPELINE-VAR U-PV10a: Power limit safety per material
    // Max power scales with thickness × material thermal capacity
    // Excessive power → vaporization, fire risk, workpiece damage
    const maxPowerForMaterial = (1 - mat.R_fiber) * 15000; // rough upper bound [W] — absorption ≈ 1 − reflectivity
    if (input.power_w > maxPowerForMaterial) {
      warnings.push(`SAFETY BLOCK: Power ${input.power_w}W exceeds estimated max ${Math.round(maxPowerForMaterial)}W for ${mat.name} — reduce power to prevent material damage`);
    }
    // Assist gas pressure minimum for safe chip evacuation
    if (input.gas_pressure_bar !== undefined && input.gas_pressure_bar < 2) {
      warnings.push(`SAFETY WARN: Assist gas pressure ${input.gas_pressure_bar} bar is low — risk of dross buildup and fire`);
    }
    if (unc.p_dross > 0.20) recs.push(`P(dross)=${(unc.p_dross * 100).toFixed(0)}% — increase gas pressure or reduce speed by 10%`);
    if (unc.p_incomplete_cut > 0.10) recs.push(`P(incomplete cut)=${(unc.p_incomplete_cut * 100).toFixed(0)}% — reduce speed or increase power`);
    if (phys.haz_mm > input.thickness_mm * 0.15) recs.push(`HAZ ${fmt(phys.haz_mm, 2)}mm is >15% of thickness — consider pulsed mode or faster traverse`);
    recs.push(mat.notes);

    // G-code
    const gcode = buildGCodeCut(dialect, prog_no, part_name, mat, phys, input, PROCESS_LABELS[input.process]);

    // Machine envelope guard — validate cutting speed, power, and work area
    warnings.push(...this._checkEnvelope({
      feed_mm_min: phys.V_cut_mmpm,
      power_kW: input.power_w / 1000,
    }));

    return {
      process: input.process,
      controller: ctrl,
      material_name: mat.name,
      cutting_speed:     { value: phys.V_cut_mmpm, unit: "mm/min",  formula: "V=K×P/(t^n×ρ×cp×ΔT) [Schulz 1999]", confidence: 0.88 },
      kerf_width:        { value: phys.w_kerf_mm,  unit: "mm",      formula: "w=d_spot+2×√(α_diff×τ_i) [Powell 1993]", confidence: 0.85 },
      haz_depth:         { value: phys.haz_mm,     unit: "mm",      formula: "HAZ=√(4×α_diff×τ_i) [Carslaw & Jaeger 1959]", confidence: 0.82 },
      surface_roughness: { value: phys.Rz_um,      unit: "µm Rz",   formula: "Rz=C×t^0.4×V^0.3/P^0.5 [Yilbas 2001]", confidence: 0.80 },
      gas_flow_lpm:      { value: phys.Q_gas_lpm,  unit: "L/min",   formula: "Q=π/4×d²×√(2ΔP/ρ) [ISO 11145]", confidence: 0.92 },
      pierce_time_s:     { value: phys.t_pierce_s, unit: "s",       formula: "t_p=0.012×t^1.5/P_kW [Wandera 2011]", confidence: 0.78 },
      cycle_time_s:      { value: cycle_time_s,    unit: "s",       formula: "t_cycle=t_pierce+L/V+overhead", confidence: 0.85 },
      absorbed_power:    { value: phys.I_absorbed_w, unit: "W",     formula: "I=(1-R)×P×exp(-α×z) [Beer-Lambert, Born&Wolf 1999]", confidence: 0.90 },
      energy_kwh:        { value: energy_kwh,      unit: "kWh",     formula: "E=P[kW]×t[h]", confidence: 0.95 },
      gas_cost_usd:      { value: gas_cost,        unit: "USD",     formula: "Cost=Q[m³]×price[$/m³]", confidence: 0.80 },
      gcode,
      gcode_lines: gcode.split("\n").length,
      uncertainty: unc,
      warnings,
      recommendations: recs
    };
  }

  // -------------------------------------------------------------------------
  // MARKING
  // -------------------------------------------------------------------------

  /**
   * Generate a complete laser marking program.
   *
   * Covers: annealing (colour change, sub-surface, no material removal),
   * engraving (depth removal), etching (shallow), foaming, carbonizing, day/night.
   * Computes mark depth via volumetric ablation rate using Beer-Lambert + spot area.
   */
  assembleLaserMark(input: LaserMarkProfile): LaserProgram {
    this._fireResolveMachine(input);
    log.debug(`[${this.engineName}] assembleLaserMark: ${input.process} material=${input.material}`);

    const mat       = this._resolveMaterial(input.material);
    const ctrl      = input.controller  ?? "generic_laser";
    const dialect   = LASER_DIALECTS[ctrl];
    const prog_no   = input.program_number ?? 2001;
    const part_name = input.part_name  ?? "LASER_MARK";

    // Marking physics — pulse-based material removal
    // MRR ≈ (1-R)×P×(pulse_duration / rep_period) / (ρ×Lv)  [Dausinger 2000]
    const R = (input.laser_type === "co2" || input.laser_type === "pulsed_co2") ? mat.R_co2 : mat.R_fiber;
    const Lv = mat.cp * (mat.T_boil - 20) + mat.L_fusion; // approx latent heat to vapour
    const duty_ratio  = clamp(input.pulse_duration_ns * 1e-9 * input.frequency_khz * 1e3, 0.001, 0.95);
    const avg_power_w = input.power_w * duty_ratio;
    const spot_area   = Math.PI / 4 * 0.1 * 0.1; // mm² (assume 0.1mm spot for marking)
    const mrr_mm3s    = (1 - R) * avg_power_w / (mat.rho * 1e-9 * Lv); // mm³/s (density in kg/m³ → g/mm³)

    // Ablation depth per pass [mm] = MRR / (scan_speed × spot_width)
    const spot_width_mm  = 0.05; // typical marking spot ~50µm
    const depth_per_pass = mrr_mm3s / (input.scan_speed_mmps * spot_width_mm);
    const passes         = input.passes ?? 1;
    const mark_depth_mm  = depth_per_pass * passes;

    // Annealing: no material removal — depth_per_pass near zero
    const effective_depth = (input.process === "mark_anneal") ? 0.0 : mark_depth_mm;

    // Cycle time: n_lines × line_length / scan_speed + overhead
    const area      = input.area_mm2 ?? 100;
    const side      = Math.sqrt(area);
    const n_lines   = Math.max(1, Math.round(side / input.hatch_spacing_mm));
    const mark_time = (n_lines * side / input.scan_speed_mmps) * passes + 2; // +2s overhead
    const energy_kwh = (input.power_w / 1000) * (mark_time / 3600);

    const warnings: string[] = [];
    const recs: string[] = [];

    if (input.process === "mark_anneal" && !mat.anneal_ok) {
      warnings.push(`${mat.name} is not well-suited for annealing marks — lacks sufficient oxide formation`);
    }
    if (input.process === "mark_foam" && mat.rho > 5000) {
      warnings.push("Foaming is only effective on thermoplastics/polymers, not metals");
    }
    if (effective_depth > (input.target_depth_mm ?? 999)) {
      recs.push(`Reduce passes to ${Math.ceil((input.target_depth_mm ?? 0.05) / Math.max(depth_per_pass, 1e-9))} to hit target depth`);
    }

    const gcode = buildGCodeMark(dialect, prog_no, part_name, mat, input, PROCESS_LABELS[input.process]);

    // Machine envelope guard — validate scan speed and power
    warnings.push(...this._checkEnvelope({
      feed_mm_min: input.scan_speed_mmps * 60,
      power_kW: avg_power_w / 1000,
    }));

    return {
      process: input.process,
      controller: ctrl,
      material_name: mat.name,
      cutting_speed:     { value: input.scan_speed_mmps * 60, unit: "mm/min", formula: "F=scan_speed×60" },
      kerf_width:        { value: spot_width_mm,   unit: "mm",    formula: "spot~50µm typical marking" },
      haz_depth:         { value: spot_width_mm * 2, unit: "mm",  formula: "HAZ≈2×spot_width (marking)" },
      surface_roughness: { value: effective_depth > 0.001 ? 3.2 : 0.8, unit: "µm Ra", formula: "Marking Ra estimate" },
      gas_flow_lpm:      { value: 0,                unit: "L/min", formula: "No assist gas for marking" },
      pierce_time_s:     { value: 0,                unit: "s" },
      cycle_time_s:      { value: mark_time,        unit: "s",     formula: "t=n_lines×L/v×passes" },
      absorbed_power:    { value: avg_power_w,      unit: "W",     formula: "P_avg=P_peak×duty_ratio" },
      mark_depth_mm:     { value: effective_depth,  unit: "mm",    formula: "d=MRR/(v×w_spot)×passes [Dausinger 2000]", confidence: 0.75 },
      mrr_mm3s:          { value: mrr_mm3s,         unit: "mm³/s", formula: "MRR=(1-R)×P_avg/(ρ×Lv) [Beer-Lambert]", confidence: 0.78 },
      energy_kwh:        { value: energy_kwh,       unit: "kWh" },
      gas_cost_usd:      { value: 0,                unit: "USD",   formula: "No assist gas" },
      gcode,
      gcode_lines: gcode.split("\n").length,
      warnings,
      recommendations: recs
    };
  }

  // -------------------------------------------------------------------------
  // WELDING
  // -------------------------------------------------------------------------

  /**
   * Generate a complete laser welding program.
   *
   * Keyhole: deep penetration >1 kW/mm² — Swift-Hook & Gick (1973) penetration model.
   * Conduction: shallow cosmetic — Rosenthal moving line source.
   * Wobble: gap-bridging oscillation welding.
   */
  assembleLaserWeld(input: LaserWeldProfile): LaserProgram {
    this._fireResolveMachine(input);
    log.debug(`[${this.engineName}] assembleLaserWeld: ${input.process} material=${input.material}`);

    const mat       = this._resolveMaterial(input.material);
    const focus_d   = input.focus_diameter_mm ?? 0.20;
    const ctrl      = input.controller ?? "generic_laser";
    const dialect   = LASER_DIALECTS[ctrl];
    const prog_no   = input.program_number ?? 3001;
    const part_name = input.part_name ?? "LASER_WELD";

    // Weld speed [mm/s]
    const v_mms = input.weld_speed_mmpm / 60;

    // Absorbed power (Beer-Lambert, thin-surface for welding)
    const R = (input.laser_type === "co2") ? mat.R_co2 : mat.R_fiber;
    const P_abs = input.power_w * (1 - R);

    // Swift-Hook & Gick (1973) keyhole penetration model:
    // d = P×η / (v × w × ρ × (cp×ΔT + Lf))   [mm]
    // where η = coupling efficiency, w = weld bead width ≈ focus_d
    const eta_couple = input.process === "weld_keyhole" ? 0.85 : 0.55; // coupling efficiency
    const ΔT_melt    = mat.T_melt - 20;
    const Lf         = mat.L_fusion;
    const w_bead_m   = focus_d / 1000;
    const v_ms       = v_mms / 1000;
    const denom_pen  = v_ms * w_bead_m * mat.rho * (mat.cp * ΔT_melt + Lf);
    const pen_mm     = (P_abs * eta_couple) / (denom_pen + 1e-12) * 1000;

    // Clamp penetration to thickness
    const pen_clamped = clamp(pen_mm, 0.05, input.thickness_mm * 1.05);

    // Irradiance check for keyhole threshold: I > 1 MW/mm² = 1e6 W/mm²
    const spot_area_mm2 = Math.PI / 4 * focus_d * focus_d;
    const irradiance    = input.power_w / spot_area_mm2; // W/mm²
    const is_keyhole    = irradiance > 1e6;

    // HAZ for welding [Carslaw-Jaeger]
    const alpha_diff = mat.thermal_diffusivity;
    const tau_weld   = focus_d / 1000 / (v_mms + 1e-9);
    const haz_mm     = Math.sqrt(4 * alpha_diff * tau_weld) * 1000;

    // Weld seam cycle time
    const seam_len    = input.seam_length_mm ?? 100;
    const cycle_time  = (seam_len / input.weld_speed_mmpm) * 60 + 4;
    const energy_kwh  = (input.power_w / 1000) * (cycle_time / 3600);

    // Gas cost
    const shield_vol_m3 = (input.shield_flow_lpm / 1000) * (cycle_time / 60);
    const gas_costs_weld: Record<AssistGas, number> = {
      argon: 0.80, nitrogen: 0.30, helium: 2.50, air: 0.02, oxygen: 0.25
    };
    const gas_cost = shield_vol_m3 * (gas_costs_weld[input.shield_gas] ?? 0.80);

    const warnings: string[] = [];
    const recs: string[] = [];

    if (input.process === "weld_keyhole" && !is_keyhole) {
      warnings.push(`Irradiance ${(irradiance / 1e6).toFixed(2)} MW/mm² is below keyhole threshold (1 MW/mm²) — likely conduction mode`);
    }
    if (pen_clamped >= input.thickness_mm) {
      recs.push("Full penetration achieved — verify root quality with back-bead inspection");
    }
    if (input.process === "weld_wobble" && !input.wobble_amplitude_mm) {
      warnings.push("weld_wobble selected but wobble_amplitude_mm not specified — defaulting to 0.5mm");
    }

    const gcode = buildGCodeWeld(dialect, prog_no, part_name, mat, input, pen_clamped, PROCESS_LABELS[input.process]);

    // Machine envelope guard — validate weld speed and power
    warnings.push(...this._checkEnvelope({
      feed_mm_min: input.weld_speed_mmpm,
      power_kW: input.power_w / 1000,
    }));

    return {
      process: input.process,
      controller: ctrl,
      material_name: mat.name,
      cutting_speed:     { value: input.weld_speed_mmpm, unit: "mm/min" },
      kerf_width:        { value: focus_d, unit: "mm", formula: "weld_bead ≈ focus_diameter" },
      haz_depth:         { value: haz_mm, unit: "mm", formula: "HAZ=√(4×α_diff×τ) [Carslaw & Jaeger 1959]", confidence: 0.82 },
      surface_roughness: { value: input.process === "weld_keyhole" ? 6.3 : 1.6, unit: "µm Ra", formula: "Ra estimate by weld mode" },
      gas_flow_lpm:      { value: input.shield_flow_lpm, unit: "L/min" },
      pierce_time_s:     { value: 0.2, unit: "s", formula: "Weld initiation ramp" },
      cycle_time_s:      { value: cycle_time, unit: "s", formula: "L/v + overhead" },
      absorbed_power:    { value: P_abs, unit: "W", formula: "P_abs=(1-R)×P [Beer-Lambert]", confidence: 0.90 },
      weld_penetration:  { value: pen_clamped, unit: "mm", formula: "d=P×η/(v×w×ρ×(cp×ΔT+Lf)) [Swift-Hook & Gick 1973]", confidence: 0.82 },
      energy_kwh:        { value: energy_kwh, unit: "kWh" },
      gas_cost_usd:      { value: gas_cost, unit: "USD" },
      gcode,
      gcode_lines: gcode.split("\n").length,
      warnings,
      recommendations: recs
    };
  }

  // -------------------------------------------------------------------------
  // DRILLING
  // -------------------------------------------------------------------------

  /**
   * Generate a laser drilling program (percussion or trepanning).
   *
   * Percussion: pulsed material removal via repetitive ablation pulses.
   * t_drill = ρ×L×(π×d²/4) / (P×η)  [Dausinger 2000]
   *
   * Trepanning: circular trajectory — uses standard cutting physics on
   * circle perimeter with V_trepan derived from Schulz model.
   */
  assembleLaserDrill(input: LaserDrillProfile): LaserProgram {
    this._fireResolveMachine(input);
    log.debug(`[${this.engineName}] assembleLaserDrill: ${input.process} material=${input.material}`);

    const mat       = this._resolveMaterial(input.material);
    const ctrl      = input.controller ?? "generic_laser";
    const dialect   = LASER_DIALECTS[ctrl];
    const prog_no   = input.program_number ?? 4001;
    const part_name = input.part_name ?? "LASER_DRILL";

    // Absorbed power
    const R     = (input.laser_type === "co2") ? mat.R_co2 : mat.R_fiber;
    const P_abs = input.power_w * (1 - R);

    // Percussion drilling time per hole [Dausinger 2000 — Strahlwerkzeug Laser]
    // t_drill = ρ × L × (π×d²/4) / (P×η)
    const L_m  = input.thickness_mm / 1000;
    const d_m  = input.hole_diameter_mm / 1000;
    const eta  = 0.30; // coupling efficiency for drilling
    const vol_per_hole = mat.rho * L_m * (Math.PI / 4) * d_m * d_m; // kg (mass of material in hole)
    const energy_per_hole = vol_per_hole * (mat.cp * (mat.T_boil - 20) + mat.L_fusion); // J
    const t_drill_per_hole = energy_per_hole / (P_abs * eta + 1e-9); // s

    const total_drill_time = t_drill_per_hole * input.n_holes;

    // HAZ around hole (percussion)
    const alpha_diff = mat.thermal_diffusivity;
    const haz_mm     = Math.sqrt(4 * alpha_diff * t_drill_per_hole) * 1000;

    // Recast layer ~10-20% of HAZ
    const recast_mm = haz_mm * 0.15;

    const cycle_time  = total_drill_time + input.n_holes * 0.5 + 3; // +0.5s repositioning + 3s overhead
    const energy_kwh  = (input.power_w / 1000) * (cycle_time / 3600);

    const warnings: string[] = [];
    const recs: string[] = [];

    if (recast_mm > 0.05) recs.push(`Recast layer ~${fmt(recast_mm, 3)}mm — consider EDM/chemical post-processing for turbine blades`);
    if (haz_mm > input.hole_diameter_mm * 0.3) warnings.push(`HAZ ${fmt(haz_mm, 2)}mm >30% of hole diameter — reduce pulse energy or use USP (ultra-short pulses)`);
    if (input.process === "drill_trepan" && !input.trepan_radius_mm) {
      recs.push("Trepan radius not specified — using hole_diameter/2 as default trepan radius");
    }

    const gcode = buildGCodeDrill(dialect, prog_no, part_name, mat, input, total_drill_time, PROCESS_LABELS[input.process]);

    // Machine envelope guard — validate power
    warnings.push(...this._checkEnvelope({
      power_kW: input.power_w / 1000,
    }));

    return {
      process: input.process,
      controller: ctrl,
      material_name: mat.name,
      cutting_speed:     { value: 0, unit: "mm/min", formula: "Drilling — no traverse speed" },
      kerf_width:        { value: input.hole_diameter_mm, unit: "mm", formula: "Kerf = hole diameter" },
      haz_depth:         { value: haz_mm, unit: "mm", formula: "HAZ=√(4×α×t_drill) [Carslaw & Jaeger 1959]", confidence: 0.78 },
      surface_roughness: { value: 6.3, unit: "µm Ra", formula: "Percussion drilling Ra estimate" },
      gas_flow_lpm:      { value: 5.0, unit: "L/min", formula: "Coaxial assist gas" },
      pierce_time_s:     { value: t_drill_per_hole, unit: "s", formula: "t=ρ×L×(π×d²/4)/(P×η) [Dausinger 2000]", confidence: 0.80 },
      cycle_time_s:      { value: cycle_time, unit: "s", formula: "t=n_holes×(t_drill+t_reposition)+overhead" },
      absorbed_power:    { value: P_abs, unit: "W", formula: "P_abs=(1-R)×P [Beer-Lambert]", confidence: 0.90 },
      drill_time_s:      { value: t_drill_per_hole, unit: "s", formula: "Per-hole drill time [Dausinger 2000]", confidence: 0.80 },
      energy_kwh:        { value: energy_kwh, unit: "kWh" },
      gas_cost_usd:      { value: energy_kwh * 0.12, unit: "USD", formula: "Energy cost estimate only" },
      gcode,
      gcode_lines: gcode.split("\n").length,
      warnings,
      recommendations: recs
    };
  }

  // -------------------------------------------------------------------------
  // UNCERTAINTY (STANDALONE)
  // -------------------------------------------------------------------------

  /**
   * Standalone Monte Carlo uncertainty computation for any laser cutting input.
   * 500 samples, Box-Muller Gaussian perturbation.
   * Returns CI95 bands and failure probability metrics.
   */
  computeUncertainty(input: LaserCutProfile): LaserUncertainty {
    log.debug(`[${this.engineName}] computeUncertainty`);
    const mat      = this._resolveMaterial(input.material);
    const focus_d  = input.focus_diameter_mm  ?? 0.10;
    const nozzle_d = input.nozzle_diameter_mm ?? 1.5;
    const phys     = computeCutPhysics(
      mat, input.power_w, input.thickness_mm,
      focus_d, input.gas_pressure_bar, nozzle_d,
      input.laser_type, input.process
    );
    return runMonteCarlo(mat, phys, input.power_w, input.thickness_mm,
      focus_d, input.gas_pressure_bar, nozzle_d,
      input.laser_type, input.process);
  }

  // -------------------------------------------------------------------------
  // STATS
  // -------------------------------------------------------------------------

  /** Return engine metadata. */
  stats(): { methods: string[]; engineName: string } {
    return {
      engineName: this.engineName,
      methods: [
        "assembleLaserCut",
        "assembleLaserMark",
        "assembleLaserWeld",
        "assembleLaserDrill",
        "computeUncertainty",
        "stats"
      ]
    };
  }

  // -------------------------------------------------------------------------
  // NESTED MULTI-PART CUTTING
  // -------------------------------------------------------------------------

  /**
   * Generate a nested multi-part laser cutting program.
   *
   * If the input includes nesting configuration (sheet dimensions + parts or quantity > 1),
   * calls SheetNestingEngine to optimize part placement, then generates G-code for ALL
   * nested parts with lead-in/lead-out per part, tab placement for retention, and
   * common-line cutting detection.
   *
   * Falls back to single-part `assembleLaserCut` if nesting is not needed or fails.
   */
  async assembleNestedLaserCut(input: LaserCutProfile): Promise<LaserProgram> {
    // Determine if nesting is needed
    const nesting = input.nesting;
    const quantity = input.quantity ?? 1;
    const needsNesting = nesting && (
      (nesting.parts && nesting.parts.length > 0) || quantity > 1
    );

    if (!needsNesting) {
      // Single-part path — no nesting needed
      return this.assembleLaserCut(input);
    }

    log.debug(`[${this.engineName}] assembleNestedLaserCut: nesting ${nesting.parts?.length ?? 1} part(s) on ${nesting.sheet_width}x${nesting.sheet_height}mm sheet`);

    // Build single-part result first for physics/uncertainty
    const baseResult = this.assembleLaserCut(input);
    const warnings = [...baseResult.warnings];
    const recs = [...baseResult.recommendations];

    // Build polygon list for nesting engine
    let nestParts: Array<{ id: string; vertices: Array<{ x: number; y: number }>; quantity: number; geometry: LaserCutGeometry }>;

    if (nesting.parts && nesting.parts.length > 0) {
      nestParts = nesting.parts.map(p => ({
        id: p.id,
        vertices: p.geometry.points,
        quantity: p.quantity ?? 1,
        geometry: p.geometry,
      }));
    } else if (input.geometry && input.geometry.points.length >= 2) {
      // Single part with quantity > 1
      nestParts = [{
        id: input.part_name ?? "PART_1",
        vertices: input.geometry.points,
        quantity,
        geometry: input.geometry,
      }];
    } else {
      warnings.push("Nesting requested but no geometry provided — falling back to single-part");
      return { ...baseResult, warnings };
    }

    // Lazy-load and call nesting engine
    let nestingEngine: import("./SheetNestingEngine.js").SheetNestingEngine;
    try {
      nestingEngine = await getSheetNestingEngine();
    } catch (e) {
      warnings.push(`SheetNestingEngine unavailable — falling back to single-part: ${e}`);
      return { ...baseResult, warnings };
    }

    const sheet = {
      width_mm: nesting.sheet_width,
      height_mm: nesting.sheet_height,
    };

    const kerfSpacing = baseResult.kerf_width.value + (nesting.spacing_mm ?? 5);

    const nestResult = nestingEngine.optimizeNesting(
      nestParts.map(p => ({
        id: p.id,
        vertices: p.vertices,
        quantity: p.quantity,
      })),
      sheet,
      {
        spacing_mm: kerfSpacing,
        rotation_allowed: nesting.rotation_allowed ?? true,
        grain_direction: nesting.grain_direction ?? null,
      }
    );

    if (nestResult.placed.length === 0) {
      warnings.push("Nesting failed — no parts fit on sheet. Falling back to single-part.");
      return { ...baseResult, warnings };
    }

    // Tab/micro-joint placement
    const tabWidth = nesting.tab_width_mm ?? 2.0;
    const tabSpacing = nesting.tab_spacing_mm ?? 80;
    let totalTabs = 0;

    // Common-line detection
    const commonLinePairs: Array<{ part_a: string; part_b: string; shared_edge_mm: number }> = [];
    if (nesting.common_line_enabled !== false) {
      const placed = nestResult.placed;
      for (let i = 0; i < placed.length; i++) {
        for (let j = i + 1; j < placed.length; j++) {
          const a = placed[i];
          const b = placed[j];
          if (a.sheet_index !== b.sheet_index) continue;
          // Check if bounding boxes share an edge (within kerf tolerance)
          const tolerance = kerfSpacing * 1.1;
          const aRight = a.bbox.x + a.bbox.w;
          const bLeft = b.bbox.x;
          const aTop = a.bbox.y + a.bbox.h;
          const bBottom = b.bbox.y;
          // Vertical shared edge
          if (Math.abs(aRight - bLeft) < tolerance) {
            const overlapY = Math.min(aTop, b.bbox.y + b.bbox.h) - Math.max(a.bbox.y, b.bbox.y);
            if (overlapY > 0) {
              commonLinePairs.push({ part_a: `${a.part_id}#${a.instance}`, part_b: `${b.part_id}#${b.instance}`, shared_edge_mm: parseFloat(overlapY.toFixed(2)) });
            }
          }
          // Horizontal shared edge
          if (Math.abs(aTop - bBottom) < tolerance) {
            const overlapX = Math.min(aRight, b.bbox.x + b.bbox.w) - Math.max(a.bbox.x, b.bbox.x);
            if (overlapX > 0) {
              commonLinePairs.push({ part_a: `${a.part_id}#${a.instance}`, part_b: `${b.part_id}#${b.instance}`, shared_edge_mm: parseFloat(overlapX.toFixed(2)) });
            }
          }
        }
      }
    }

    // Generate combined G-code for all nested parts
    const mat = this._resolveMaterial(input.material);
    const ctrl = input.controller ?? "generic_laser";
    const dialect = LASER_DIALECTS[ctrl];
    const cs = dialect.comment_style;
    const C = (t: string) => comment(t, cs);
    const prog_no = input.program_number ?? 1001;
    const phys = computeCutPhysics(
      mat, input.power_w, input.thickness_mm,
      input.focus_diameter_mm ?? (input.laser_type === "co2" ? 0.30 : 0.10),
      input.gas_pressure_bar,
      input.nozzle_diameter_mm ?? 1.5,
      input.laser_type, input.process
    );
    if (input.speed_override_mmpm) phys.V_cut_mmpm = input.speed_override_mmpm;
    const F_feed = Math.round(phys.V_cut_mmpm);
    const pierce_ms = Math.round(phys.t_pierce_s * 1000);
    const pierce_s = phys.t_pierce_s.toFixed(3);
    const powerLine = fillMCode(dialect.m_power_set, { P: Math.round(input.power_w) });
    const pierceCmd = fillMCode(dialect.m_pierce, { pierce_ms, pierce_s });
    const progStart = fillMCode(dialect.prog_start, {
      PROG_NO: prog_no.toString().padStart(4, "0"),
      PROG_NAME: (input.part_name ?? "NESTED_CUT").toUpperCase().replace(/\s/g, "_")
    });

    const lines: string[] = [];
    lines.push(progStart);
    lines.push(C(`NESTED LASER CUTTING PROGRAM — ${nestResult.placed.length} PARTS ON ${nestResult.sheets_used} SHEET(S)`));
    lines.push(C(`MATERIAL : ${mat.name.toUpperCase()}`));
    lines.push(C(`THICKNESS: ${input.thickness_mm}mm`));
    lines.push(C(`SHEET    : ${nesting.sheet_width}x${nesting.sheet_height}mm`));
    lines.push(C(`UTILIZATION: ${nestResult.utilization_pct.toFixed(1)}%`));
    lines.push(C(`LASER    : ${input.laser_type.toUpperCase()} ${input.power_w}W`));
    lines.push(C(`GAS      : ${input.assist_gas.toUpperCase()} ${input.gas_pressure_bar}BAR`));
    lines.push(C(`SPEED    : ${F_feed} MM/MIN  KERF: ${fmt(phys.w_kerf_mm, 2)}mm`));
    if (tabWidth > 0) lines.push(C(`TABS     : ${tabWidth}mm WIDE EVERY ${tabSpacing}mm`));
    if (commonLinePairs.length > 0) lines.push(C(`COMMON LINES: ${commonLinePairs.length} PAIR(S) DETECTED`));
    lines.push("");

    // Safe start
    lines.push("G90 G21 G54");
    lines.push(dialect.feed_mode);
    lines.push("G00 Z5.0");
    lines.push(powerLine);
    lines.push(dialect.m_gas_on + "  " + C("ASSIST GAS ON"));
    lines.push("");

    // Cut each part in nesting order
    const cutOrder = nestResult.cut_order.length > 0 ? nestResult.cut_order : nestResult.placed;
    let partIndex = 0;

    for (const placement of cutOrder) {
      partIndex++;
      // Find the corresponding geometry
      const nestPart = nestParts.find(p => p.id === placement.part_id);
      const geom = nestPart?.geometry ?? input.geometry;
      if (!geom || geom.points.length < 2) continue;

      const offsetX = placement.x;
      const offsetY = placement.y;

      // Transform points by placement offset + rotation
      const rotRad = (placement.rotation_deg * Math.PI) / 180;
      const cosR = Math.cos(rotRad);
      const sinR = Math.sin(rotRad);

      const transformedPts = geom.points.map(pt => ({
        x: offsetX + pt.x * cosR - pt.y * sinR,
        y: offsetY + pt.x * sinR + pt.y * cosR,
      }));

      lines.push(C(`--- PART ${partIndex}/${cutOrder.length}: ${placement.part_id}#${placement.instance} AT (${fmt(offsetX, 1)}, ${fmt(offsetY, 1)}) ROT=${placement.rotation_deg}° ---`));

      // Lead-in
      const lead_in = geom.lead_in_mm ?? 3.0;
      const p0 = transformedPts[0];
      const p1 = transformedPts[1];
      const dx = p1.x - p0.x;
      const dy = p1.y - p0.y;
      const segLen = Math.sqrt(dx * dx + dy * dy) || 1;
      const pierce_x = p0.x - (dx / segLen) * lead_in;
      const pierce_y = p0.y - (dy / segLen) * lead_in;

      lines.push(`G00 X${fmt(pierce_x)} Y${fmt(pierce_y)}  ${C("RAPID TO PIERCE")}`);
      lines.push("G00 Z0.5  " + C("CUT HEIGHT"));
      lines.push(dialect.m_laser_on + "  " + C("LASER ON — PIERCE"));
      lines.push(pierceCmd + "  " + C("PIERCE DWELL"));

      // Lead-in move
      lines.push(`G01 X${fmt(p0.x)} Y${fmt(p0.y)} F${F_feed}  ${C("LEAD-IN")}`);

      // Contour with tab insertion
      const contourLen = this._contourLength(geom);
      const tabCount = tabWidth > 0 ? Math.max(2, Math.floor(contourLen / tabSpacing)) : 0;
      let distAccum = 0;
      const tabInterval = tabCount > 0 ? contourLen / tabCount : Infinity;
      let nextTabAt = tabInterval;

      for (let i = 1; i < transformedPts.length; i++) {
        const segDx = transformedPts[i].x - transformedPts[i - 1].x;
        const segDy = transformedPts[i].y - transformedPts[i - 1].y;
        const segLength = Math.sqrt(segDx * segDx + segDy * segDy);
        distAccum += segLength;

        if (tabWidth > 0 && distAccum >= nextTabAt) {
          // Insert tab: laser off, traverse tab width, laser on
          lines.push(dialect.m_laser_off + "  " + C(`TAB — MICRO-JOINT ${tabWidth}mm`));
          lines.push(`G01 X${fmt(transformedPts[i].x)} Y${fmt(transformedPts[i].y)} F${F_feed}`);
          lines.push(dialect.m_laser_on + "  " + C("RESUME CUT"));
          nextTabAt += tabInterval;
          totalTabs++;
        } else {
          lines.push(`G01 X${fmt(transformedPts[i].x)} Y${fmt(transformedPts[i].y)} F${F_feed}`);
        }
      }

      // Close contour if closed
      if (geom.closed) {
        lines.push(`G01 X${fmt(transformedPts[0].x)} Y${fmt(transformedPts[0].y)} F${F_feed}  ${C("CLOSE CONTOUR")}`);
      }

      // Lead-out
      const lead_out = geom.lead_out_mm ?? 2.0;
      const pLast = transformedPts[transformedPts.length - 1];
      lines.push(`G01 X${fmt(pLast.x + (dx / segLen) * lead_out)} Y${fmt(pLast.y + (dy / segLen) * lead_out)} F${F_feed}  ${C("LEAD-OUT")}`);

      lines.push(dialect.m_laser_off + "  " + C("LASER OFF"));
      lines.push("G00 Z5.0  " + C("RETRACT"));
      lines.push("");
    }

    // End
    lines.push(dialect.m_gas_off + "  " + C("GAS OFF"));
    lines.push("G00 Z50.0  " + C("RETRACT FINAL"));
    lines.push("G00 X0.000 Y0.000  " + C("HOME"));
    lines.push(dialect.prog_end);

    const nestedGcode = lines.join("\n");

    // Recalculate total cycle time for all nested parts
    let totalContour = 0;
    for (const np of nestParts) {
      const partContour = this._contourLength(np.geometry);
      totalContour += partContour * np.quantity;
    }
    const totalTraverse = (totalContour / phys.V_cut_mmpm) * 60;
    const totalPierceTime = cutOrder.length * phys.t_pierce_s;
    const totalCycleTime = totalPierceTime + totalTraverse + cutOrder.length * 5; // 5s overhead per part
    const totalEnergy = (input.power_w / 1000) * (totalCycleTime / 3600);

    const nestingResultOutput: LaserNestingResult = {
      parts_per_sheet: Math.ceil(nestResult.placed.length / nestResult.sheets_used),
      utilization_pct: nestResult.utilization_pct,
      waste_pct: parseFloat((100 - nestResult.utilization_pct).toFixed(2)),
      sheets_used: nestResult.sheets_used,
      nested_positions: nestResult.placed.map(p => ({
        part_id: p.part_id,
        instance: p.instance,
        x: p.x,
        y: p.y,
        rotation_deg: p.rotation_deg,
      })),
      common_line_pairs: commonLinePairs,
      tabs_placed: totalTabs,
    };

    if (nestResult.unplaced.length > 0) {
      warnings.push(`${nestResult.unplaced.length} part instance(s) could not fit on ${nestResult.sheets_used} sheet(s)`);
    }
    if (commonLinePairs.length > 0) {
      recs.push(`${commonLinePairs.length} common-line pair(s) detected — potential cut-path sharing for speed improvement`);
    }

    return {
      ...baseResult,
      cycle_time_s: { value: totalCycleTime, unit: "s", formula: "Σ(t_pierce+L/V+overhead) per nested part", confidence: 0.82 },
      energy_kwh: { value: totalEnergy, unit: "kWh", formula: "P[kW]×t_total[h]", confidence: 0.90 },
      gcode: nestedGcode,
      gcode_lines: nestedGcode.split("\n").length,
      nesting_result: nestingResultOutput,
      warnings,
      recommendations: recs,
    };
  }

  // -------------------------------------------------------------------------
  // PRIVATE HELPERS
  // -------------------------------------------------------------------------

  /** Cached bridge resolution for registry-backed enrichment (U-ARCH3). */
  private _resolvedMaterial: ResolvedMaterialContext | null = null;
  /** Cached machine context from registry bridge (U-ARCH3). */
  private _resolvedMachine: ResolvedMachineContext | null = null;

  /** Fire async machine resolution — call at start of each assemble method. */
  private _fireResolveMachine(input: { machine_brand?: string; machine_model?: string }): void {
    if (this._resolvedMachine) return;
    resolveMachine({ brand: input.machine_brand, model: input.machine_model })
      .then(rm => { this._resolvedMachine = rm; })
      .catch(() => {});
  }

  /**
   * Run machine envelope guard against peak laser parameters.
   * Validates feed rate, power, and work volume.
   */
  private _checkEnvelope(opts: {
    feed_mm_min?: number;
    power_kW?: number;
    x_mm?: number;
    y_mm?: number;
    z_mm?: number;
  }): string[] {
    const envelope = this._resolvedMachine
      ? machineEnvelopeGuardEngine.fromMachineData(this._resolvedMachine)
      : {};
    const result = machineEnvelopeGuardEngine.check({
      feed_mm_min: opts.feed_mm_min,
      power_kW: opts.power_kW,
      x: opts.x_mm,
      y: opts.y_mm,
      z: opts.z_mm,
    }, envelope);
    return result.violations.map(v => `ENVELOPE: ${v.message}`);
  }

  /** ISO group → best representative laser material for fallback selection (U-ARCH3). */
  private static readonly _ISO_LASER_FALLBACK: Record<string, string> = {
    P: "mild_steel", M: "stainless_steel", K: "mild_steel",
    N: "aluminum", S: "titanium", H: "mild_steel",
  };

  private _resolveMaterial(name: string): LaserMaterialDB {
    // Tier 1: exact match
    if (LASER_MAT_DB[name]) return LASER_MAT_DB[name];

    // Tier 2: fuzzy match (case-insensitive substring)
    const lower = name.toLowerCase();
    for (const [key, mat] of Object.entries(LASER_MAT_DB)) {
      if (lower.includes(key) || key.includes(lower)) return mat;
    }

    // U-ARCH3 Tier 3: use bridge ISO group detection for best laser fallback
    if (!this._resolvedMaterial) {
      resolveMaterial({ material_name: name })
        .then(rm => { this._resolvedMaterial = rm; })
        .catch(() => { /* fall through to mild_steel */ });
    }
    if (this._resolvedMaterial) {
      const rm = this._resolvedMaterial;
      const fbKey = LaserProgramAssemblerEngine._ISO_LASER_FALLBACK[rm.iso_group];
      if (fbKey && LASER_MAT_DB[fbKey]) {
        const base = { ...LASER_MAT_DB[fbKey] };
        // Enrich with bridge physics where available
        base.rho = rm.density_kg_m3;
        base.k_therm = rm.k_thermal;
        base.cp = rm.cp_J_kgK;
        base.name = rm.name;
        log.info(`[${this.engineName}] Material '${name}' resolved via registry as ISO ${rm.iso_group} → ${fbKey}`);
        return base;
      }
    }

    // Tier 4: last resort
    log.warn(`[${this.engineName}] Unknown material '${name}' — falling back to mild_steel`);
    return { ...LASER_MAT_DB["mild_steel"]!, name: `${name} (fallback: mild_steel)` };
  }

  private _contourLength(geom?: LaserCutGeometry): number {
    if (!geom || geom.points.length < 2) return 100; // default 100mm for cycle time
    let len = 0;
    for (let i = 1; i < geom.points.length; i++) {
      const dx = geom.points[i].x - geom.points[i - 1].x;
      const dy = geom.points[i].y - geom.points[i - 1].y;
      len += Math.sqrt(dx * dx + dy * dy);
    }
    if (geom.closed && geom.points.length > 1) {
      const last = geom.points[geom.points.length - 1];
      const first = geom.points[0];
      len += Math.sqrt((last.x - first.x) ** 2 + (last.y - first.y) ** 2);
    }
    return len;
  }
}
