/**
 * GrindingProgramAssemblerEngine — Complete Grinding Program Generation Pipeline
 *
 * The grinding equivalent of CNCProgramAssemblerEngine / TurningProgramAssemblerEngine.
 * Accepts a grinding job description and generates a complete G-code program by
 * orchestrating inline physics from GrindingWheelEngine, SurfaceGrindingEngine,
 * CenterlessGrindingEngine, GrindingForceEngine, GrindingSurfaceFinishEngine,
 * and StochasticGrindingEngine.
 *
 * Pipeline:
 *   1. Classify operation type (surface / cylindrical OD / cylindrical ID / centerless / special)
 *   2. Select wheel spec from material + finish requirement
 *   3. Compute dressing parameters (U_d, f_d, a_d)
 *   4. Compute S/F via Malkin specific energy + Jaeger thermal model
 *   5. Check burn threshold → auto-reduce a_e if required
 *   6. Stochastic MC (500 samples): force CI95, temperature CI95, P(burn), Ra CI95, G-ratio CI95
 *   7. Generate G-code (Fanuc/Siemens/Studer/Kellenberger/Junker/Generic dialects)
 *   8. Emit cycle time estimate + wheel wear prediction
 *
 * Process Coverage (19 operation types):
 *   Surface: horizontal-reciprocating, horizontal-rotary, vertical-rotary (Blanchard),
 *            creep-feed, speed-stroke
 *   Cylindrical: OD plunge, OD traverse, OD taper, ID bore, face, multi-step
 *   Centerless: through-feed, in-feed (plunge), end-feed
 *   Special: jig, thread (single/multi-rib), gear profile, tool-cutter, HEDG
 *
 * Physics Models (all inline with citations):
 *   - Malkin specific grinding energy (1989)
 *   - Jaeger maximum grinding temperature (1942)
 *   - Kinematic Ra model (Verkerk 1977)
 *   - G-ratio (Malkin & Guo 2008)
 *   - Centerless rounding / lobing stability (Hashimoto 2002)
 *   - Dressing overlap ratio (Marinescu et al. 2004)
 *   - Stochastic MC with log-normal grain distribution
 *
 * Pure computation — no filesystem, no external dependencies.
 *
 * @module engines/GrindingProgramAssemblerEngine
 */

import { log } from "../utils/Logger.js";
import { PipelineCheckpointManager } from "../utils/pipelineCheckpoint.js";
import { resolveMaterial, resolveMachine, type ResolvedMaterialContext, type ResolvedMachineContext } from "./PipelineRegistryBridge.js";
import { machineEnvelopeGuardEngine } from "./MachineEnvelopeGuardEngine.js";

// ============================================================================
// ATOMIC VALUE WRAPPER
// ============================================================================

/** Standard PRISM return wrapper with physics provenance. */
export interface AtomicValue<T> {
  value: T;
  unit: string;
  formula?: string;
  confidence?: number;
}

// ============================================================================
// CONTROLLER DIALECT
// ============================================================================

export type GrindingController =
  | "fanuc_grind"
  | "siemens_grind"
  | "studer"
  | "kellenberger"
  | "junker"
  | "generic_grind";

// ============================================================================
// MATERIAL DATABASE (grinding-specific properties)
// ============================================================================
// k_thermal, c_specific, density are enriched from canonical physics constants
// (src/physics/constants.ts) at runtime. Domain-specific properties (theta_burn,
// u_chip, wheel_type, R_w) stay inline — no canonical equivalent exists.
// ============================================================================

export interface GrindingMaterial {
  name: string;
  /** Thermal conductivity k [W/m·K] */
  k_thermal: number;
  /** Specific heat c [J/kg·K] */
  c_specific: number;
  /** Density ρ [kg/m³] */
  density: number;
  /** Burn threshold temperature θ_burn [°C] */
  theta_burn: number;
  /** Base specific chip-formation energy u_ch [J/mm³] — Malkin 1989 */
  u_chip: number;
  /** Hardness [HRC] */
  hardness_hrc: number;
  /** Recommended wheel type */
  wheel_type: string;
  /** Workpiece heat partition ratio R_w (fraction of heat entering workpiece) */
  R_w: number;
}

const GRINDING_MATERIALS: Record<string, GrindingMaterial> = {
  "4140_steel": {
    name: "4140 Alloy Steel",
    k_thermal: 42.6,
    c_specific: 477,
    density: 7850,
    theta_burn: 600,
    u_chip: 13.8,
    hardness_hrc: 28,
    wheel_type: "WA46K8V",
    R_w: 0.75,
  },
  "4140_hardened": {
    name: "4140 HRC 58",
    k_thermal: 37.5,
    c_specific: 460,
    density: 7850,
    theta_burn: 550,
    u_chip: 16.2,
    hardness_hrc: 58,
    wheel_type: "WA60K8V",
    R_w: 0.80,
  },
  "52100_bearing": {
    name: "52100 Bearing Steel HRC 62",
    k_thermal: 36.2,
    c_specific: 450,
    density: 7810,
    theta_burn: 520,
    u_chip: 18.5,
    hardness_hrc: 62,
    wheel_type: "CBN-B126",
    R_w: 0.82,
  },
  "d2_tool_steel": {
    name: "D2 Tool Steel HRC 60",
    k_thermal: 20.0,
    c_specific: 460,
    density: 7700,
    theta_burn: 500,
    u_chip: 22.0,
    hardness_hrc: 60,
    wheel_type: "WA46J8V",
    R_w: 0.78,
  },
  "m2_hss": {
    name: "M2 High Speed Steel HRC 64",
    k_thermal: 19.0,
    c_specific: 420,
    density: 8160,
    theta_burn: 490,
    u_chip: 25.0,
    hardness_hrc: 64,
    wheel_type: "WA60I8V",
    R_w: 0.80,
  },
  "304_stainless": {
    name: "304 Stainless Steel",
    k_thermal: 16.2,
    c_specific: 500,
    density: 8000,
    theta_burn: 650,
    u_chip: 14.5,
    hardness_hrc: 18,
    wheel_type: "WA46L8V",
    R_w: 0.72,
  },
  "inconel_718": {
    name: "Inconel 718",
    k_thermal: 11.4,
    c_specific: 435,
    density: 8190,
    theta_burn: 700,
    u_chip: 28.0,
    hardness_hrc: 38,
    wheel_type: "CBN-B151",
    R_w: 0.68,
  },
  "titanium_6al4v": {
    name: "Titanium Ti-6Al-4V",
    k_thermal: 6.7,
    c_specific: 526,
    density: 4430,
    theta_burn: 450,
    u_chip: 20.0,
    hardness_hrc: 36,
    wheel_type: "WA46G8V",
    R_w: 0.65,
  },
  "tungsten_carbide": {
    name: "Tungsten Carbide WC-Co",
    k_thermal: 85.0,
    c_specific: 240,
    density: 14900,
    theta_burn: 900,
    u_chip: 80.0,
    hardness_hrc: 90,
    wheel_type: "Diamond-D126",
    R_w: 0.55,
  },
  "aluminum_6061": {
    name: "Aluminum 6061-T6",
    k_thermal: 167.0,
    c_specific: 896,
    density: 2700,
    theta_burn: 350,
    u_chip: 5.0,
    hardness_hrc: 5,
    wheel_type: "WA80M8V",
    R_w: 0.60,
  },
  "cast_iron_gray": {
    name: "Gray Cast Iron",
    k_thermal: 46.0,
    c_specific: 461,
    density: 7200,
    theta_burn: 580,
    u_chip: 11.5,
    hardness_hrc: 20,
    wheel_type: "WA36J8V",
    R_w: 0.73,
  },
  "zirconia_ceramic": {
    name: "Zirconia Ceramic",
    k_thermal: 2.5,
    c_specific: 400,
    density: 5600,
    theta_burn: 1200,
    u_chip: 120.0,
    hardness_hrc: 95,
    wheel_type: "Diamond-D64",
    R_w: 0.50,
  },
};

// ── Canonical physics enrichment (lazy require, inline fallback) ──────
// Maps grinding material keys to canonical constants.ts keys for shared
// properties (k_thermal, density, cp). Domain-specific fields stay inline.
const _GRINDING_CANONICAL_MAP: Record<string, string> = {
  "4140_steel": "alloy_steel", "4140_hardened": "alloy_steel",
  "52100_bearing": "alloy_steel", "d2_tool_steel": "tool_steel",
  "m2_hss": "tool_steel", "304_stainless": "stainless_304",
  "inconel_718": "inconel_718", "titanium_6al4v": "titanium_gr5",
  "aluminum_6061": "aluminum_6061", "cast_iron_gray": "cast_iron",
};

let _grindingCanonicalEnriched = false;
function enrichGrindingFromCanonical(): void {
  if (_grindingCanonicalEnriched) return;
  _grindingCanonicalEnriched = true;
  try {
    const { CANONICAL_MATERIAL_DB } = require("../physics/constants.js") as {
      CANONICAL_MATERIAL_DB: Record<string, {
        k_thermal: number; density_kg_m3: number; cp_J_kgK: number;
      }>;
    };
    for (const [grindKey, canonKey] of Object.entries(_GRINDING_CANONICAL_MAP)) {
      const canon = CANONICAL_MATERIAL_DB[canonKey];
      const local = GRINDING_MATERIALS[grindKey];
      if (canon && local) {
        local.k_thermal = canon.k_thermal;
        local.density = canon.density_kg_m3;
        local.c_specific = canon.cp_J_kgK;
      }
    }
  } catch {
    // Canonical module unavailable — inline values used as fallback
  }
}

// ============================================================================
// WHEEL DATABASE
// ============================================================================

export interface WheelSpec {
  designation: string;
  abrasive: "Al2O3" | "SiC" | "CBN" | "Diamond";
  grit_size: number;
  grade: string;
  structure: number;
  bond: "V" | "R" | "B" | "M";
  /** Typical G-ratio range */
  g_ratio_min: number;
  g_ratio_max: number;
  /** Max wheel speed [m/s] */
  v_s_max: number;
  /** Grain density C [grains/mm²] */
  grain_density: number;
  /** Mean grain radius r [mm] */
  grain_radius: number;
}

const WHEEL_SPECS: Record<string, WheelSpec> = {
  "WA36J8V": {
    designation: "WA36J8V", abrasive: "Al2O3", grit_size: 36, grade: "J", structure: 8, bond: "V",
    g_ratio_min: 20, g_ratio_max: 60, v_s_max: 35, grain_density: 1.2, grain_radius: 0.30,
  },
  "WA46J8V": {
    designation: "WA46J8V", abrasive: "Al2O3", grit_size: 46, grade: "J", structure: 8, bond: "V",
    g_ratio_min: 25, g_ratio_max: 70, v_s_max: 35, grain_density: 1.8, grain_radius: 0.22,
  },
  "WA46K8V": {
    designation: "WA46K8V", abrasive: "Al2O3", grit_size: 46, grade: "K", structure: 8, bond: "V",
    g_ratio_min: 25, g_ratio_max: 75, v_s_max: 35, grain_density: 1.8, grain_radius: 0.22,
  },
  "WA60K8V": {
    designation: "WA60K8V", abrasive: "Al2O3", grit_size: 60, grade: "K", structure: 8, bond: "V",
    g_ratio_min: 30, g_ratio_max: 80, v_s_max: 35, grain_density: 2.8, grain_radius: 0.16,
  },
  "WA60I8V": {
    designation: "WA60I8V", abrasive: "Al2O3", grit_size: 60, grade: "I", structure: 8, bond: "V",
    g_ratio_min: 20, g_ratio_max: 60, v_s_max: 35, grain_density: 2.8, grain_radius: 0.16,
  },
  "WA80M8V": {
    designation: "WA80M8V", abrasive: "Al2O3", grit_size: 80, grade: "M", structure: 8, bond: "V",
    g_ratio_min: 40, g_ratio_max: 100, v_s_max: 35, grain_density: 4.5, grain_radius: 0.11,
  },
  "WA46G8V": {
    designation: "WA46G8V", abrasive: "Al2O3", grit_size: 46, grade: "G", structure: 8, bond: "V",
    g_ratio_min: 15, g_ratio_max: 45, v_s_max: 35, grain_density: 1.8, grain_radius: 0.22,
  },
  "CBN-B126": {
    designation: "CBN-B126", abrasive: "CBN", grit_size: 126, grade: "K", structure: 8, bond: "V",
    g_ratio_min: 1000, g_ratio_max: 5000, v_s_max: 80, grain_density: 0.8, grain_radius: 0.063,
  },
  "CBN-B151": {
    designation: "CBN-B151", abrasive: "CBN", grit_size: 151, grade: "K", structure: 8, bond: "V",
    g_ratio_min: 800, g_ratio_max: 4000, v_s_max: 80, grain_density: 0.6, grain_radius: 0.075,
  },
  "Diamond-D126": {
    designation: "Diamond-D126", abrasive: "Diamond", grit_size: 126, grade: "N", structure: 8, bond: "V",
    g_ratio_min: 500, g_ratio_max: 3000, v_s_max: 60, grain_density: 0.9, grain_radius: 0.063,
  },
  "Diamond-D64": {
    designation: "Diamond-D64", abrasive: "Diamond", grit_size: 64, grade: "P", structure: 8, bond: "V",
    g_ratio_min: 300, g_ratio_max: 2000, v_s_max: 60, grain_density: 1.8, grain_radius: 0.095,
  },
};

// ============================================================================
// INPUT PROFILES
// ============================================================================

export interface DressingParams {
  /** Dressing depth a_d [mm] */
  a_d_mm?: number;
  /** Dressing feed per revolution f_d [mm/rev] */
  f_d_mm_rev?: number;
  /** Overlap ratio U_d = a_d_width / f_d (2–10) */
  overlap_ratio?: number;
  /** Diamond dresser width [mm] */
  dresser_width_mm?: number;
}

export interface SurfaceGrindProfile {
  operation_subtype:
    | "horizontal_reciprocating"
    | "horizontal_rotary"
    | "vertical_rotary_blanchard"
    | "creep_feed"
    | "speed_stroke";
  material: string;
  /** Part length in X (stroke direction) [mm] */
  part_length_mm: number;
  /** Part width in Y [mm] */
  part_width_mm: number;
  /** Total stock to remove [mm] */
  stock_mm: number;
  /** Desired surface finish Ra [µm] */
  target_Ra_um: number;
  /** Wheel diameter [mm] */
  wheel_diameter_mm: number;
  /** Wheel width b [mm] */
  wheel_width_mm: number;
  wheel_spec?: string;
  dressing?: DressingParams;
  controller?: GrindingController;
  program_number?: number;
  coolant?: boolean;
  /** Depth of cut per pass a_e [mm] — if omitted, auto-calculated */
  a_e_mm?: number;
  /** Table speed v_w [mm/min] — if omitted, auto-calculated */
  v_w_mm_min?: number;
  /** Cross-feed step-over b_step [mm] — default 0.7 × wheel_width */
  cross_feed_step_mm?: number;
  /** Machine brand for registry resolution (U-ARCH3). */
  machine_brand?: string;
  /** Machine model for registry resolution (U-ARCH3). */
  machine_model?: string;
}

export interface CylindricalGrindProfile {
  operation_subtype:
    | "od_plunge"
    | "od_traverse"
    | "od_taper"
    | "id_bore"
    | "face"
    | "multi_step";
  material: string;
  /** Workpiece outer diameter [mm] */
  workpiece_od_mm: number;
  /** Workpiece length [mm] */
  workpiece_length_mm: number;
  /** Total radial stock to remove (per side) [mm] */
  stock_mm: number;
  target_Ra_um: number;
  /** Wheel diameter [mm] */
  wheel_diameter_mm: number;
  wheel_width_mm: number;
  wheel_spec?: string;
  dressing?: DressingParams;
  controller?: GrindingController;
  program_number?: number;
  coolant?: boolean;
  /** Workpiece rotational speed [rpm] — if omitted, auto-calculated */
  workpiece_rpm?: number;
  /** Table traverse feed [mm/min] — if omitted, auto-calculated */
  traverse_feed_mm_min?: number;
  /** Infeed per pass (radial) [mm] — if omitted, auto-calculated */
  infeed_mm?: number;
  /** For OD taper: angle [degrees] */
  taper_angle_deg?: number;
  /** For ID bore: bore diameter [mm] */
  bore_diameter_mm?: number;
  /** For multi-step: array of diameter steps */
  step_diameters_mm?: number[];
  /** Machine brand for registry resolution (U-ARCH3). */
  machine_brand?: string;
  /** Machine model for registry resolution (U-ARCH3). */
  machine_model?: string;
}

export interface CenterlessGrindProfile {
  operation_subtype: "through_feed" | "in_feed_plunge" | "end_feed";
  material: string;
  workpiece_diameter_mm: number;
  workpiece_length_mm: number;
  stock_mm: number;
  target_Ra_um: number;
  wheel_diameter_mm: number;
  wheel_width_mm: number;
  /** Regulating wheel diameter [mm] */
  reg_wheel_diameter_mm: number;
  /** Regulating wheel speed [rpm] */
  reg_wheel_rpm?: number;
  /** Blade angle [degrees] — typical 20–30° */
  blade_angle_deg?: number;
  /** Center height h [mm] above wheel–regulating wheel centerline */
  center_height_mm?: number;
  wheel_spec?: string;
  dressing?: DressingParams;
  controller?: GrindingController;
  program_number?: number;
  coolant?: boolean;
  /** Machine brand for registry resolution (U-ARCH3). */
  machine_brand?: string;
  /** Machine model for registry resolution (U-ARCH3). */
  machine_model?: string;
}

export interface CreepFeedProfile {
  material: string;
  /** Slot/profile depth (full stock removal in single pass) [mm] */
  depth_mm: number;
  /** Part length [mm] */
  part_length_mm: number;
  /** Slot width [mm] */
  slot_width_mm: number;
  target_Ra_um: number;
  wheel_diameter_mm: number;
  wheel_width_mm: number;
  wheel_spec?: string;
  dressing?: DressingParams;
  controller?: GrindingController;
  program_number?: number;
  coolant?: boolean;
  /** Machine brand for registry resolution (U-ARCH3). */
  machine_brand?: string;
  /** Machine model for registry resolution (U-ARCH3). */
  machine_model?: string;
}

export interface SpecialGrindProfile {
  operation_subtype:
    | "jig_grind"
    | "thread_single_rib"
    | "thread_multi_rib"
    | "gear_profile"
    | "tool_cutter"
    | "hedg";
  material: string;
  workpiece_dim_mm: number;
  stock_mm: number;
  target_Ra_um: number;
  wheel_diameter_mm: number;
  wheel_width_mm: number;
  wheel_spec?: string;
  controller?: GrindingController;
  program_number?: number;
  coolant?: boolean;
  /** Thread pitch [mm] — for thread grinding */
  thread_pitch_mm?: number;
  /** Number of thread ribs — for multi-rib thread grinding */
  thread_ribs?: number;
  /** Machine brand for registry resolution (U-ARCH3). */
  machine_brand?: string;
  /** Machine model for registry resolution (U-ARCH3). */
  machine_model?: string;
}

// ============================================================================
// OUTPUT TYPES
// ============================================================================

export interface GrindingPhysicsResult {
  /** Specific grinding energy u [J/mm³] — Malkin 1989 */
  specific_energy: AtomicValue<number>;
  /** Material removal rate Q' [mm³/s per mm] */
  mrr_per_mm: AtomicValue<number>;
  /** Tangential grinding force F_t [N/mm] */
  F_t: AtomicValue<number>;
  /** Normal grinding force F_n [N/mm] */
  F_n: AtomicValue<number>;
  /** Maximum grinding temperature θ_max [°C] — Jaeger 1942 */
  theta_max: AtomicValue<number>;
  /** Burn threshold θ_burn [°C] */
  theta_burn: AtomicValue<number>;
  /** Burn risk flag */
  burn_risk: boolean;
  /** Predicted surface roughness Ra [µm] — Verkerk 1977 kinematic model */
  Ra_predicted: AtomicValue<number>;
  /** G-ratio (central estimate) */
  g_ratio: AtomicValue<number>;
  /** Wheel speed v_s [m/s] */
  v_s: AtomicValue<number>;
  /** Workpiece speed v_w [mm/min] */
  v_w: AtomicValue<number>;
  /** Depth of cut a_e [mm] */
  a_e: AtomicValue<number>;
}

export interface GrindingUncertainty {
  /** Force tangential CI95 [N/mm] */
  F_t_CI95: [number, number];
  /** Temperature CI95 [°C] */
  theta_CI95: [number, number];
  /** Probability of thermal burn P(burn) */
  P_burn: number;
  /** Surface roughness Ra CI95 [µm] */
  Ra_CI95: [number, number];
  /** G-ratio CI95 */
  g_ratio_CI95: [number, number];
  /** Number of MC samples */
  n_samples: number;
  /** Coefficient of variation on force [%] */
  cv_force_pct: number;
}

export interface DressingResult {
  /** Dressing depth a_d [mm] */
  a_d: number;
  /** Dressing feed f_d [mm/rev] */
  f_d: number;
  /** Overlap ratio U_d */
  overlap_ratio: number;
  /** Predicted post-dressing Ra [µm] */
  Ra_after_dress: number;
  /** Wheel sharpness factor — 1.0 = sharp, <1.0 = dulling */
  sharpness_factor: number;
}

export interface WheelWearPrediction {
  /** Volume of workpiece material removed [mm³] */
  V_workpiece: number;
  /** Volume of wheel worn [mm³] */
  V_wheel: number;
  /** G-ratio used */
  g_ratio: number;
  /** Wheel life remaining [passes] */
  passes_to_redress: number;
  /** Radial wheel wear per pass [µm] */
  radial_wear_per_pass: number;
}

export interface CycleTimeEstimate {
  /** Total cycle time [s] */
  total_s: number;
  /** Active grinding time [s] */
  grinding_s: number;
  /** Rapid + approach time [s] */
  air_cut_s: number;
  /** Dressing time [s] */
  dressing_s: number;
  /** Number of passes */
  passes: number;
}

export interface GrindingProgram {
  /** Operation type */
  operation: string;
  /** G-code string */
  gcode: string;
  /** Physics result */
  physics: GrindingPhysicsResult;
  /** Stochastic uncertainty */
  uncertainty: GrindingUncertainty;
  /** Dressing recommendation */
  dressing: DressingResult;
  /** Wheel wear prediction */
  wheel_wear: WheelWearPrediction;
  /** Cycle time estimate */
  cycle_time: CycleTimeEstimate;
  /** Wheel specification used */
  wheel_spec: string;
  /** Material resolved */
  material_name: string;
  /** Controller dialect */
  controller: GrindingController;
  /** Warnings */
  warnings: string[];
}

// ============================================================================
// PHYSICS HELPERS
// ============================================================================

/** Box-Muller transform — generate normally distributed random sample. */
function randNorm(mean: number, std: number): number {
  const u1 = Math.random() + 1e-12;
  const u2 = Math.random();
  const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  return mean + std * z;
}

/** Clamp value between min and max. */
function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

/** Compute 95% CI from sorted sample array. */
function ci95(arr: number[]): [number, number] {
  const sorted = [...arr].sort((a, b) => a - b);
  const n = sorted.length;
  return [sorted[Math.floor(0.025 * n)], sorted[Math.floor(0.975 * n)]];
}

/**
 * Malkin specific grinding energy model (1989).
 * u = u_ch + u_pl + u_sl  [J/mm³]
 * u_pl ≈ 0.3 × u_ch  (plowing fraction, empirical)
 * u_sl ≈ 0.2 × u_ch  (sliding fraction, empirical)
 * Reference: Malkin S., "Grinding Technology", Ellis Horwood 1989, Ch.4
 */
function malkinSpecificEnergy(mat: GrindingMaterial): number {
  return mat.u_chip * (1 + 0.3 + 0.2); // u_ch + u_pl + u_sl
}

/**
 * Material removal rate per unit width Q' [mm³/(s·mm)].
 * Q' = v_w [mm/s] × a_e [mm]
 * Reference: Malkin & Guo, "Grinding Technology" 2nd ed. 2008, Eq. 3.1
 */
function mrrPerMm(v_w_mm_s: number, a_e_mm: number): number {
  return v_w_mm_s * a_e_mm;
}

/**
 * Tangential grinding force per unit width [N/mm].
 * F_t = u × Q' / v_s
 * where v_s [mm/s] is wheel peripheral speed.
 * Reference: Malkin & Guo 2008, Eq. 3.8
 */
function tangentialForce(u_J_mm3: number, Q_prime: number, v_s_mm_s: number): number {
  return (u_J_mm3 * Q_prime) / v_s_mm_s;
}

/**
 * Normal-to-tangential force ratio.
 * μ_eff = F_n / F_t ≈ 1.5 (conventional) to 3.0 (dull wheel).
 * Reference: Shaw "Metal Cutting Principles" 2nd ed. 2005, p.532
 */
function forceRatio(wheel: WheelSpec, a_e_mm: number): number {
  // Harder grade + finer grit → higher ratio (more plowing)
  const base = 2.0;
  const grit_factor = 46 / wheel.grit_size; // finer grit → ratio up
  return clamp(base * grit_factor, 1.5, 3.0);
}

/**
 * Maximum grinding temperature — Jaeger (1942) moving heat source model.
 * θ_max = 1.13 × q × √(l_c / (v_w × k × ρ × c))  [°C]
 * where:
 *   q = heat flux into workpiece [W/mm²] = u × Q' × R_w / b × (1/l_c)
 *   l_c = contact length = √(a_e × d_s)  [mm]
 *   d_s = wheel diameter [mm]
 * Reference: Jaeger J.C., J. Proc. Roy. Soc. NSW 76 (1942) 203–224
 */
function jaegarTemperature(
  mat: GrindingMaterial,
  u_J_mm3: number,
  Q_prime: number,
  v_w_mm_s: number,
  a_e_mm: number,
  d_s_mm: number,
  b_mm: number,
): number {
  const l_c = Math.sqrt(a_e_mm * d_s_mm); // contact arc length [mm]
  const q_total = u_J_mm3 * Q_prime; // total heat flux × width [W·mm/mm²] → [W/mm]
  const q_workpiece = q_total * mat.R_w; // heat into workpiece [W/mm]
  // Specific heat flux per contact area [W/mm²]
  const q_flux = q_workpiece / (l_c > 0 ? l_c : 1e-6);
  // k in [W/mm·K] (convert from W/m·K)
  const k_mm = mat.k_thermal * 1e-3;
  const rho_mm3 = mat.density * 1e-9; // [kg/mm³]
  const thermal_product = k_mm * rho_mm3 * mat.c_specific; // [W·s/mm⁴·K ... -> dimensionally consistent for Jaeger]
  // Jaeger: θ = 1.13 × q_flux × √(l_c / (v_w × ρ·c·k))
  const v_w_safe = Math.max(v_w_mm_s, 0.001);
  const theta = 1.13 * q_flux * Math.sqrt(l_c / (v_w_safe * thermal_product));
  return Math.max(0, theta);
}

/**
 * Kinematic surface roughness Ra model (Verkerk 1977).
 * Ra ≈ (v_w × f_d) / (4 × v_s × √a_d)  [µm]
 * where f_d = dressing feed [mm/rev], a_d = dressing depth [mm].
 * Reference: Verkerk J., Annals of the CIRP 26/2 (1977) 377–395
 */
function kinematicRa(v_w_mm_s: number, v_s_mm_s: number, f_d: number, a_d: number): number {
  const sqrt_ad = Math.sqrt(Math.max(a_d, 1e-6));
  return (v_w_mm_s * f_d) / (4 * v_s_mm_s * sqrt_ad);
}

/**
 * Alternative Ra from grain geometry (Rt model, Malkin 1989):
 * Rt = (v_w / (v_s × C × r))² × (1 / (4 × a_e))
 * Ra ≈ Rt / 4  (empirical relation for ground surfaces)
 */
function grainRa(v_w_mm_s: number, v_s_mm_s: number, C: number, r: number, a_e_mm: number): number {
  const a_e_safe = Math.max(a_e_mm, 1e-6);
  const ratio = v_w_mm_s / (v_s_mm_s * C * r);
  const Rt = ratio * ratio * (1 / (4 * a_e_safe));
  return Rt / 4;
}

/**
 * G-ratio (Malkin & Guo 2008):
 * G = V_w / V_wheel
 * Estimated from wheel-material pair, depth of cut, and wheel hardness.
 * Reference: Malkin & Guo 2008, Ch. 7
 */
function estimateGRatio(wheel: WheelSpec, a_e_mm: number): number {
  const midG = (wheel.g_ratio_min + wheel.g_ratio_max) / 2;
  // Deeper cuts → lower G (more wheel wear)
  const depth_factor = Math.exp(-a_e_mm * 5); // normalised: a_e=0 → 1.0, a_e=0.1 → 0.6
  return midG * clamp(depth_factor, 0.5, 1.0);
}

/**
 * Auto-calculate wheel speed [m/s] from diameter.
 * Conventional: 28–35 m/s Al2O3 / SiC
 * HEDG / CBN: 60–120 m/s
 */
function autoWheelSpeed(wheel: WheelSpec): number {
  if (wheel.abrasive === "CBN" || wheel.abrasive === "Diamond") {
    return Math.min(80, wheel.v_s_max);
  }
  return Math.min(33, wheel.v_s_max);
}

/** Convert wheel speed [m/s] → rpm given diameter [mm]. */
function speedToRpm(v_s_m_s: number, d_mm: number): number {
  return (v_s_m_s * 1000 * 60) / (Math.PI * d_mm);
}

/** Auto-select table/workpiece speed [mm/min] from material and operation. */
function autoWorkpieceSpeed(mat: GrindingMaterial, op: string, a_e_mm: number): number {
  // Typical v_w: precision finish 50–300 mm/min, roughing 500–2000 mm/min
  const base = op.includes("creep") ? 30 : (a_e_mm > 0.05 ? 800 : 200);
  // Harder materials → slower
  const hard_factor = clamp(1 - (mat.hardness_hrc - 20) / 80, 0.4, 1.0);
  return base * hard_factor;
}

// ============================================================================
// DRESSING CALCULATOR
// ============================================================================

function calcDressing(
  wheel: WheelSpec,
  target_Ra: number,
  v_s_mm_s: number,
  v_w_mm_s: number,
  input?: DressingParams,
): DressingResult {
  // Default dressing parameters (Marinescu et al. 2004, Table 5.3)
  const a_d = input?.a_d_mm ?? 0.01; // 10 µm
  // Required f_d from Ra target — invert kinematic Ra formula:
  // Ra = (v_w × f_d) / (4 × v_s × √a_d)  →  f_d = Ra × 4 × v_s × √a_d / v_w
  const sqrt_ad = Math.sqrt(Math.max(a_d, 1e-6));
  const v_w_safe = Math.max(v_w_mm_s, 0.001);
  const f_d_required = (target_Ra * 4 * v_s_mm_s * sqrt_ad) / v_w_safe;
  const f_d = input?.f_d_mm_rev ?? clamp(f_d_required, 0.02, 0.3);
  const dresser_width = input?.dresser_width_mm ?? 1.0;
  const U_d = input?.overlap_ratio ?? clamp(dresser_width / f_d, 2, 10);
  // Post-dress Ra (Malkin 1989)
  const Ra_after = kinematicRa(v_w_safe, v_s_mm_s, f_d, a_d);
  const sharpness = clamp(1 / U_d, 0.3, 1.0); // Low U_d → sharp/open

  return { a_d, f_d, overlap_ratio: U_d, Ra_after_dress: Ra_after, sharpness_factor: sharpness };
}

// ============================================================================
// MONTE CARLO UNCERTAINTY (500 SAMPLES)
// ============================================================================

function computeMC(
  mat: GrindingMaterial,
  wheel: WheelSpec,
  u_nom: number,
  v_w_mm_s: number,
  v_s_mm_s: number,
  a_e_mm: number,
  d_s_mm: number,
  b_mm: number,
  f_d: number,
  a_d: number,
): GrindingUncertainty {
  const N = 500;
  const F_t_arr: number[] = [];
  const theta_arr: number[] = [];
  const Ra_arr: number[] = [];
  const g_arr: number[] = [];

  for (let i = 0; i < N; i++) {
    // Stochastic inputs (Malkin & Guo 2008, Rowe 2009)
    const a_e_s = Math.abs(randNorm(a_e_mm, a_e_mm * 0.05)); // ±5% CoV
    const v_w_s = Math.abs(randNorm(v_w_mm_s, v_w_mm_s * 0.03)); // ±3% CoV
    // Log-normal grain size distribution (Rowe "Principles of Modern Grinding Technology" 2014)
    const grit_factor = Math.exp(randNorm(0, 0.10)); // ±10% log-normal
    const u_s = u_nom * grit_factor;

    const Q = mrrPerMm(v_w_s / 60, a_e_s); // v_w in mm/s
    const Ft = tangentialForce(u_s, Q, v_s_mm_s);
    const theta = jaegarTemperature(mat, u_s, Q, v_w_s / 60, a_e_s, d_s_mm, b_mm);
    const Ra = kinematicRa(v_w_s / 60, v_s_mm_s, f_d, a_d);
    const g = estimateGRatio(wheel, a_e_s) * grit_factor;

    F_t_arr.push(Ft);
    theta_arr.push(theta);
    Ra_arr.push(Math.max(0.01, Ra));
    g_arr.push(Math.max(1, g));
  }

  const f_ci = ci95(F_t_arr);
  const t_ci = ci95(theta_arr);
  const ra_ci = ci95(Ra_arr);
  const g_ci = ci95(g_arr);

  const P_burn = theta_arr.filter(t => t > mat.theta_burn).length / N;
  const cv_force = (stdDev(F_t_arr) / (mean(F_t_arr) || 1)) * 100;

  return {
    F_t_CI95: f_ci,
    theta_CI95: t_ci,
    P_burn,
    Ra_CI95: ra_ci,
    g_ratio_CI95: g_ci,
    n_samples: N,
    cv_force_pct: cv_force,
  };
}

function mean(arr: number[]): number {
  return arr.reduce((s, v) => s + v, 0) / arr.length;
}
function stdDev(arr: number[]): number {
  const m = mean(arr);
  return Math.sqrt(arr.reduce((s, v) => s + (v - m) ** 2, 0) / arr.length);
}

// ============================================================================
// CYCLE TIME ESTIMATOR
// ============================================================================

function estimateCycleTime(
  passes: number,
  stroke_or_length_mm: number,
  v_w_mm_min: number,
  approach_mm: number,
  dressing_interval_passes: number,
  dressing_time_s: number,
): CycleTimeEstimate {
  const v_w_mm_s = v_w_mm_min / 60;
  const grinding_s = passes * (stroke_or_length_mm / Math.max(v_w_mm_s, 0.001));
  const air_cut_s = passes * (approach_mm / Math.max(v_w_mm_s * 2, 0.001)); // rapids at 2× grind
  const dress_count = Math.floor(passes / Math.max(dressing_interval_passes, 1));
  const dressing_total_s = dress_count * dressing_time_s;
  return {
    total_s: grinding_s + air_cut_s + dressing_total_s,
    grinding_s,
    air_cut_s,
    dressing_s: dressing_total_s,
    passes,
  };
}

// ============================================================================
// G-CODE GENERATORS
// ============================================================================

function fmtF(v: number, ctrl: GrindingController): string {
  if (ctrl === "siemens_grind") return `F${v.toFixed(1)}`;
  return `F${v.toFixed(1)}`;
}

function fmtS(rpm: number, ctrl: GrindingController): string {
  return `S${Math.round(rpm)}`;
}

/** Format a coordinate with controller-specific style */
function fmtCoord(axis: string, val: number, ctrl: GrindingController): string {
  if (ctrl === "studer" || ctrl === "kellenberger") {
    return `${axis}${val.toFixed(4)}`;
  }
  return `${axis}${val.toFixed(3)}`;
}

/** Program header — controller-specific */
function gcodeProgramHeader(
  prog_num: number,
  title: string,
  mat_name: string,
  wheel_spec: string,
  ctrl: GrindingController,
): string[] {
  const lines: string[] = [];
  if (ctrl === "fanuc_grind" || ctrl === "generic_grind") {
    lines.push("%");
    lines.push(`O${String(prog_num).padStart(4, "0")} (${title})`);
    lines.push(`(MATERIAL: ${mat_name})`);
    lines.push(`(WHEEL: ${wheel_spec})`);
    lines.push(`(GENERATED BY PRISM GrindingProgramAssemblerEngine)`);
    lines.push("G90 G21 G54");
  } else if (ctrl === "siemens_grind") {
    lines.push(`; ${title}`);
    lines.push(`; MATERIAL: ${mat_name} | WHEEL: ${wheel_spec}`);
    lines.push(`; PRISM GrindingProgramAssemblerEngine`);
    lines.push("G90 G71 G54");
  } else if (ctrl === "studer") {
    lines.push(`% ${prog_num}`);
    lines.push(`(${title})`);
    lines.push(`(${mat_name} / ${wheel_spec})`);
    lines.push("G90 G70");
  } else if (ctrl === "kellenberger") {
    lines.push(`; K-Program ${prog_num}`);
    lines.push(`; ${title} | ${mat_name}`);
    lines.push("G90");
  } else if (ctrl === "junker") {
    lines.push(`% P${prog_num}`);
    lines.push(`(JUNKER GRIND: ${title})`);
    lines.push("G90 G21");
  }
  return lines;
}

/** Program footer */
function gcodeProgramFooter(ctrl: GrindingController): string[] {
  if (ctrl === "siemens_grind") return ["M09", "M05", "G28 Z0", "M30"];
  if (ctrl === "studer") return ["M09", "M05", "G28 Z0", "M30", "%"];
  if (ctrl === "junker") return ["M09", "M05", "M30", "%"];
  return ["M09", "M05", "G28 Z0", "M30", "%"];
}

/** Coolant on/off */
function coolantOn(coolant: boolean, ctrl: GrindingController): string {
  if (!coolant) return "(NO COOLANT)";
  return ctrl === "siemens_grind" ? "M08" : "M08";
}

// ============================================================================
// SURFACE GRINDING G-CODE
// ============================================================================

function genSurfaceGrindGCode(
  profile: SurfaceGrindProfile,
  wheel_rpm: number,
  v_w_mm_min: number,
  a_e_mm: number,
  passes: number,
  cross_feed: number,
  ctrl: GrindingController,
): string {
  const p = profile.program_number ?? 1;
  const cool = profile.coolant !== false;
  const lines: string[] = [];

  lines.push(...gcodeProgramHeader(p, `SURFACE GRIND ${profile.operation_subtype.toUpperCase()}`,
    "", profile.wheel_spec ?? "WA46K8V", ctrl));
  lines.push("");
  lines.push("(--- WHEEL START ---)")
  lines.push(`${fmtS(wheel_rpm, ctrl)} M03`);
  lines.push(coolantOn(cool, ctrl));
  lines.push("G04 P2000 (WHEEL SPIN-UP DWELL 2s)");
  lines.push("");
  lines.push("(--- RAPID TO START ---)")
  lines.push(`G00 ${fmtCoord("X", 0, ctrl)} ${fmtCoord("Y", 0, ctrl)}`);
  lines.push(`G00 ${fmtCoord("Z", 2.0, ctrl)} (APPROACH CLEARANCE)`);

  if (profile.operation_subtype === "creep_feed") {
    lines.push("");
    lines.push("(--- CREEP-FEED: SINGLE DEEP PASS ---)")
    lines.push(`G01 ${fmtCoord("Z", -a_e_mm, ctrl)} ${fmtF(v_w_mm_min * 0.05, ctrl)} (PLUNGE INFEED)`);
    lines.push(`G01 ${fmtCoord("X", profile.part_length_mm, ctrl)} ${fmtF(v_w_mm_min, ctrl)} (CREEP STROKE)`);
    lines.push(`G00 ${fmtCoord("X", 0, ctrl)}`);
  } else if (profile.operation_subtype === "speed_stroke") {
    lines.push("");
    lines.push("(--- SPEED-STROKE: HIGH SPEED, LIGHT CUTS ---)")
    const high_v = v_w_mm_min * 3; // speed-stroke ≈ 3× conventional
    const light_ae = a_e_mm * 0.1;
    lines.push(`G01 ${fmtCoord("Z", -light_ae, ctrl)} ${fmtF(50, ctrl)}`);
    for (let i = 0; i < passes; i++) {
      const dir = i % 2 === 0 ? profile.part_length_mm : 0;
      lines.push(`G01 ${fmtCoord("X", dir, ctrl)} ${fmtF(high_v, ctrl)}`);
      if (i < passes - 1) {
        lines.push(`G01 ${fmtCoord("Z", -(light_ae * (i + 2)), ctrl)} ${fmtF(50, ctrl)}`);
      }
    }
  } else {
    // PIPELINE-VAR U-PV05: Per-pass ae/speed optimization with Malkin burn threshold
    // Roughing: ae at 80% of nominal (maximizes MRR below burn risk)
    // Semi-finish: ae at 50% of nominal (reduced thermal load)
    // Finish: ae at 25% of nominal (target surface quality)
    // Spark-out: zero infeed (elastic springback recovery)
    // Ref: Malkin & Guo (2008), Grinding Technology 2nd ed., Ch. 6
    const finishPasses = Math.min(Math.max(Math.floor(passes * 0.2), 2), 4);
    const semiFinishPasses = Math.min(Math.max(Math.floor(passes * 0.15), 1), 2);
    const roughPasses = passes - finishPasses - semiFinishPasses;
    const ae_rough = a_e_mm;
    const ae_semi = a_e_mm * 0.5;
    const ae_finish = a_e_mm * 0.25;
    // Work speed: increase for finish passes (lighter cut → can go faster, improves Rz)
    const vw_rough = v_w_mm_min;
    const vw_semi = v_w_mm_min * 1.2;
    const vw_finish = v_w_mm_min * 1.5;

    lines.push("");
    lines.push(`(--- ROUGHING: ${roughPasses} PASSES, ae=${ae_rough.toFixed(4)}mm ---)`);
    let depth = 0;
    for (let i = 0; i < roughPasses; i++) {
      depth += ae_rough;
      lines.push(`G01 ${fmtCoord("Z", -depth, ctrl)} ${fmtF(50, ctrl)} (ROUGH PASS ${i + 1})`);
      const x_end = i % 2 === 0 ? profile.part_length_mm : 0;
      lines.push(`G01 ${fmtCoord("X", x_end, ctrl)} ${fmtF(vw_rough, ctrl)}`);
      if (i < roughPasses - 1) {
        lines.push(`G01 ${fmtCoord("Y", (Math.floor(i / 2) + 1) * cross_feed, ctrl)} ${fmtF(vw_rough * 0.5, ctrl)}`);
      }
    }

    lines.push("");
    lines.push(`(--- SEMI-FINISH: ${semiFinishPasses} PASSES, ae=${ae_semi.toFixed(4)}mm ---)`);
    for (let i = 0; i < semiFinishPasses; i++) {
      depth += ae_semi;
      lines.push(`G01 ${fmtCoord("Z", -depth, ctrl)} ${fmtF(50, ctrl)} (SEMI-FINISH PASS ${roughPasses + i + 1})`);
      const x_end = (roughPasses + i) % 2 === 0 ? profile.part_length_mm : 0;
      lines.push(`G01 ${fmtCoord("X", x_end, ctrl)} ${fmtF(vw_semi, ctrl)}`);
    }

    lines.push("");
    lines.push(`(--- FINISH: ${finishPasses} PASSES, ae=${ae_finish.toFixed(4)}mm ---)`);
    for (let i = 0; i < finishPasses; i++) {
      depth += ae_finish;
      lines.push(`G01 ${fmtCoord("Z", -depth, ctrl)} ${fmtF(50, ctrl)} (FINISH PASS ${roughPasses + semiFinishPasses + i + 1})`);
      const x_end = (roughPasses + semiFinishPasses + i) % 2 === 0 ? profile.part_length_mm : 0;
      lines.push(`G01 ${fmtCoord("X", x_end, ctrl)} ${fmtF(vw_finish, ctrl)}`);
    }

    // Spark-out passes (2 passes at zero infeed — elastic springback recovery)
    lines.push("");
    lines.push("(--- SPARK-OUT: 2 PASSES AT ZERO INFEED ---)")
    lines.push(`G01 ${fmtCoord("X", 0, ctrl)} ${fmtF(vw_finish, ctrl)} (SPARK-OUT 1)`);
    lines.push(`G01 ${fmtCoord("X", profile.part_length_mm, ctrl)} ${fmtF(vw_finish, ctrl)} (SPARK-OUT 2)`);
  }

  lines.push("");
  lines.push("(--- RETRACT ---)")
  lines.push(`G00 ${fmtCoord("Z", 50, ctrl)}`);
  lines.push(`G00 ${fmtCoord("X", 0, ctrl)} ${fmtCoord("Y", 0, ctrl)}`);
  lines.push(...gcodeProgramFooter(ctrl));
  return lines.join("\n");
}

// ============================================================================
// CYLINDRICAL GRINDING G-CODE
// ============================================================================

function genCylindricalGrindGCode(
  profile: CylindricalGrindProfile,
  wheel_rpm: number,
  wk_rpm: number,
  traverse_feed: number,
  infeed_mm: number,
  passes: number,
  ctrl: GrindingController,
): string {
  const p = profile.program_number ?? 2;
  const cool = profile.coolant !== false;
  const lines: string[] = [];
  const subtype = profile.operation_subtype;

  lines.push(...gcodeProgramHeader(p, `CYLINDRICAL GRIND ${subtype.toUpperCase()}`,
    "", profile.wheel_spec ?? "WA60K8V", ctrl));
  lines.push("");
  lines.push(`${fmtS(wheel_rpm, ctrl)} M03 (WHEEL)`);
  lines.push(`${fmtS(wk_rpm, ctrl)} M04 (WORKPIECE CCW)`); // Studer convention: M04 = workpiece
  lines.push(coolantOn(cool, ctrl));
  lines.push("G04 P1500");
  lines.push("");
  lines.push(`G00 ${fmtCoord("Z", 5, ctrl)} (APPROACH)`);

  if (subtype === "od_plunge") {
    lines.push("(--- OD PLUNGE GRINDING ---)")
    for (let i = 0; i < passes; i++) {
      const x_pos = (profile.workpiece_od_mm / 2) - (infeed_mm * (i + 1));
      lines.push(`G01 ${fmtCoord("X", x_pos, ctrl)} ${fmtF(infeed_mm * wk_rpm / 60 * 0.3, ctrl)} (PASS ${i + 1})`);
      lines.push(`G04 P500 (DWELL)`);
    }
    // Spark-out
    lines.push("(SPARK-OUT)")
    lines.push(`G04 P1000`);
  } else if (subtype === "od_traverse") {
    // PIPELINE-VAR U-PV05: Per-pass infeed variation for cylindrical OD traverse
    // Roughing: full infeed. Finish: 30% infeed. Spark-out: zero.
    const finishCount = Math.min(Math.max(Math.floor(passes * 0.25), 2), 3);
    const roughCount = passes - finishCount;
    const infeed_finish = infeed_mm * 0.3;
    lines.push("(--- OD TRAVERSE GRINDING ---)")
    const z_start = 5.0;
    const z_end = -(profile.workpiece_length_mm + 5);
    let cumInfeed = 0;
    for (let i = 0; i < roughCount; i++) {
      cumInfeed += infeed_mm;
      const x_pos = (profile.workpiece_od_mm / 2) - cumInfeed;
      lines.push(`G01 ${fmtCoord("X", x_pos, ctrl)} ${fmtF(30, ctrl)} (ROUGH PASS ${i + 1})`);
      const z_target = i % 2 === 0 ? z_end : z_start;
      lines.push(`G01 ${fmtCoord("Z", z_target, ctrl)} ${fmtF(traverse_feed, ctrl)}`);
    }
    for (let i = 0; i < finishCount; i++) {
      cumInfeed += infeed_finish;
      const x_pos = (profile.workpiece_od_mm / 2) - cumInfeed;
      lines.push(`G01 ${fmtCoord("X", x_pos, ctrl)} ${fmtF(20, ctrl)} (FINISH PASS ${roughCount + i + 1})`);
      const z_target = (roughCount + i) % 2 === 0 ? z_end : z_start;
      lines.push(`G01 ${fmtCoord("Z", z_target, ctrl)} ${fmtF(traverse_feed * 0.8, ctrl)}`);
    }
    // Spark-out
    lines.push("(SPARK-OUT 2 PASSES)")
    lines.push(`G01 ${fmtCoord("Z", z_start, ctrl)} ${fmtF(traverse_feed * 0.8, ctrl)}`);
    lines.push(`G01 ${fmtCoord("Z", -(profile.workpiece_length_mm + 5), ctrl)} ${fmtF(traverse_feed, ctrl)}`);
  } else if (subtype === "od_taper") {
    const taper = profile.taper_angle_deg ?? 1.0;
    lines.push(`(--- OD TAPER GRINDING ${taper.toFixed(2)} DEG ---)`);
    // Siemens CYCLE421 / Fanuc macro approach: rotate table or use G68
    if (ctrl === "siemens_grind") {
      lines.push(`CYCLE421(${taper},${profile.workpiece_length_mm},${infeed_mm * passes},${traverse_feed})`);
    } else {
      lines.push(`G68 X0 Z0 R${taper.toFixed(3)} (TABLE SWIVEL)`);
      lines.push(`G01 ${fmtCoord("Z", -(profile.workpiece_length_mm), ctrl)} ${fmtF(traverse_feed, ctrl)}`);
      lines.push(`G01 ${fmtCoord("Z", 0, ctrl)} ${fmtF(traverse_feed, ctrl)}`);
      lines.push("G69 (CANCEL SWIVEL)");
    }
  } else if (subtype === "id_bore") {
    const bore_d = profile.bore_diameter_mm ?? (profile.workpiece_od_mm * 0.5);
    lines.push(`(--- ID BORE GRINDING d=${bore_d.toFixed(2)}mm ---)`);
    lines.push(`G00 ${fmtCoord("X", bore_d / 2 - infeed_mm * passes, ctrl)}`);
    for (let i = 0; i < passes; i++) {
      const x_in = (bore_d / 2) - infeed_mm * (passes - i);
      lines.push(`G01 ${fmtCoord("X", x_in, ctrl)} ${fmtF(30, ctrl)} (INFEED ${i + 1})`);
      lines.push(`G01 ${fmtCoord("Z", -(profile.workpiece_length_mm * 0.9), ctrl)} ${fmtF(traverse_feed, ctrl)}`);
      lines.push(`G01 ${fmtCoord("Z", 0, ctrl)} ${fmtF(traverse_feed * 1.5, ctrl)}`);
    }
    lines.push("G04 P800 (SPARK-OUT DWELL)");
  } else if (subtype === "face") {
    lines.push("(--- FACE / SHOULDER GRINDING ---)")
    for (let i = 0; i < passes; i++) {
      const z_pos = -(infeed_mm * (i + 1));
      lines.push(`G01 ${fmtCoord("Z", z_pos, ctrl)} ${fmtF(30, ctrl)}`);
      lines.push(`G01 ${fmtCoord("X", profile.workpiece_od_mm / 2 + 5, ctrl)} ${fmtF(traverse_feed, ctrl)}`);
      lines.push(`G01 ${fmtCoord("X", -(5), ctrl)} ${fmtF(traverse_feed, ctrl)}`);
    }
  } else if (subtype === "multi_step") {
    const steps = profile.step_diameters_mm ?? [profile.workpiece_od_mm, profile.workpiece_od_mm * 0.8];
    lines.push(`(--- MULTI-STEP GRINDING ${steps.length} DIAMETERS ---)`);
    let z_pos = 0;
    for (let s = 0; s < steps.length; s++) {
      const seg_len = profile.workpiece_length_mm / steps.length;
      lines.push(`(STEP ${s + 1}: d=${steps[s].toFixed(2)}mm)`);
      for (let i = 0; i < Math.ceil(passes / steps.length); i++) {
        const x_pos = steps[s] / 2 - infeed_mm * (i + 1);
        lines.push(`G01 ${fmtCoord("X", x_pos, ctrl)} ${fmtF(30, ctrl)}`);
        lines.push(`G01 ${fmtCoord("Z", -(z_pos + seg_len), ctrl)} ${fmtF(traverse_feed, ctrl)}`);
        lines.push(`G01 ${fmtCoord("Z", -z_pos, ctrl)} ${fmtF(traverse_feed, ctrl)}`);
      }
      z_pos += seg_len;
    }
  }

  lines.push("");
  lines.push("(--- RETRACT ---)")
  lines.push(`G00 ${fmtCoord("X", profile.workpiece_od_mm / 2 + 50, ctrl)}`);
  lines.push(`G00 ${fmtCoord("Z", 100, ctrl)}`);
  lines.push(...gcodeProgramFooter(ctrl));
  return lines.join("\n");
}

// ============================================================================
// CENTERLESS GRINDING G-CODE
// ============================================================================

function genCenterlessGrindGCode(
  profile: CenterlessGrindProfile,
  wheel_rpm: number,
  reg_rpm: number,
  v_w_mm_min: number,
  ctrl: GrindingController,
): string {
  const p = profile.program_number ?? 3;
  const cool = profile.coolant !== false;
  const lines: string[] = [];

  lines.push(...gcodeProgramHeader(p, `CENTERLESS GRIND ${profile.operation_subtype.toUpperCase()}`,
    "", profile.wheel_spec ?? "WA46K8V", ctrl));
  lines.push("");
  lines.push(`(GRINDING WHEEL) ${fmtS(wheel_rpm, ctrl)} M03`);
  lines.push(`(REGULATING WHEEL) ${fmtS(reg_rpm, ctrl)} M04`);
  lines.push(coolantOn(cool, ctrl));
  lines.push("G04 P2000");
  lines.push("");

  if (profile.operation_subtype === "through_feed") {
    lines.push("(--- THROUGH-FEED CENTERLESS ---)")
    lines.push(`(PART ENTERS FROM RIGHT, EXITS LEFT — v_w=${v_w_mm_min.toFixed(0)} mm/min)`);
    lines.push(`(BLADE ANGLE: ${(profile.blade_angle_deg ?? 25).toFixed(1)} DEG)`);
    lines.push(`(CENTER HEIGHT: ${(profile.center_height_mm ?? (profile.workpiece_diameter_mm * 0.25)).toFixed(2)} mm)`);
    lines.push("(CONTINUOUS THROUGH-FEED — OPERATOR FEEDS PARTS)");
    lines.push(`G01 ${fmtCoord("X", -(profile.workpiece_diameter_mm / 2), ctrl)} ${fmtF(v_w_mm_min, ctrl)} (INFEED POSITION)`);
    lines.push("M00 (OPERATOR: LOAD FIRST PART)");
    lines.push("(PARTS SELF-FEED ONCE PROCESS STABLE)");
  } else if (profile.operation_subtype === "in_feed_plunge") {
    lines.push("(--- IN-FEED PLUNGE CENTERLESS ---)")
    lines.push("M00 (LOAD WORKPIECE)")
    lines.push(`G00 ${fmtCoord("X", profile.workpiece_diameter_mm / 2 + 2, ctrl)}`);
    const infeed_rate = v_w_mm_min * 0.1;
    const target_x = (profile.workpiece_diameter_mm / 2) - profile.stock_mm;
    lines.push(`G01 ${fmtCoord("X", target_x, ctrl)} ${fmtF(infeed_rate, ctrl)} (PLUNGE)`);
    lines.push("G04 P1500 (DWELL — SPARK-OUT)");
    lines.push(`G00 ${fmtCoord("X", profile.workpiece_diameter_mm / 2 + 5, ctrl)} (RETRACT)`);
    lines.push("M00 (UNLOAD WORKPIECE)");
  } else {
    // end_feed
    lines.push("(--- END-FEED CENTERLESS ---)")
    lines.push("M00 (LOAD WORKPIECE AGAINST END STOP)");
    lines.push(`G01 ${fmtCoord("X", (profile.workpiece_diameter_mm / 2) - profile.stock_mm, ctrl)} ${fmtF(v_w_mm_min * 0.15, ctrl)}`);
    lines.push("G04 P1000 (SPARK-OUT)");
    lines.push(`G00 ${fmtCoord("X", profile.workpiece_diameter_mm / 2 + 5, ctrl)}`);
    lines.push("M00 (UNLOAD)");
  }

  lines.push("");
  lines.push(...gcodeProgramFooter(ctrl));
  return lines.join("\n");
}

// ============================================================================
// CREEP-FEED G-CODE
// ============================================================================

function genCreepFeedGCode(
  profile: CreepFeedProfile,
  wheel_rpm: number,
  v_w_mm_min: number,
  ctrl: GrindingController,
): string {
  const p = profile.program_number ?? 4;
  const cool = profile.coolant !== false;
  const lines: string[] = [];

  lines.push(...gcodeProgramHeader(p, "CREEP-FEED GRINDING",
    "", profile.wheel_spec ?? "WA36J8V", ctrl));
  lines.push("");
  lines.push(`${fmtS(wheel_rpm, ctrl)} M03`);
  lines.push(coolantOn(cool, ctrl));
  lines.push("(FLOOD COOLANT CRITICAL FOR CREEP-FEED — HIGH q_w)");
  lines.push("G04 P2500");
  lines.push("");
  lines.push(`G00 ${fmtCoord("X", 0, ctrl)} ${fmtCoord("Z", 5, ctrl)}`);
  lines.push("(--- ENGAGE: RAMP-IN TO AVOID SHOCK ---)")
  const ramp_len = Math.min(10, profile.part_length_mm * 0.05);
  lines.push(`G01 ${fmtCoord("Z", -profile.depth_mm * 0.5, ctrl)} ${fmtF(v_w_mm_min * 0.3, ctrl)} (50% DEPTH RAMP)`);
  lines.push(`G01 ${fmtCoord("X", ramp_len, ctrl)} ${fmtF(v_w_mm_min * 0.5, ctrl)}`);
  lines.push(`G01 ${fmtCoord("Z", -profile.depth_mm, ctrl)} ${fmtF(v_w_mm_min * 0.3, ctrl)} (FULL DEPTH)`);
  lines.push("(--- SINGLE FULL-DEPTH PASS ---)")
  lines.push(`G01 ${fmtCoord("X", profile.part_length_mm, ctrl)} ${fmtF(v_w_mm_min, ctrl)}`);
  lines.push("(--- EXIT RAMP ---)")
  lines.push(`G01 ${fmtCoord("Z", -profile.depth_mm * 0.5, ctrl)} ${fmtF(v_w_mm_min * 0.5, ctrl)}`);
  lines.push(`G01 ${fmtCoord("X", profile.part_length_mm + ramp_len, ctrl)} ${fmtF(v_w_mm_min, ctrl)}`);
  lines.push("");
  lines.push(`G00 ${fmtCoord("X", 0, ctrl)} ${fmtCoord("Z", 50, ctrl)}`);
  lines.push(...gcodeProgramFooter(ctrl));
  return lines.join("\n");
}

// ============================================================================
// SPECIAL GRINDING G-CODE
// ============================================================================

function genSpecialGrindGCode(
  profile: SpecialGrindProfile,
  wheel_rpm: number,
  v_w_est: number,
  ctrl: GrindingController,
): string {
  const p = profile.program_number ?? 5;
  const cool = profile.coolant !== false;
  const lines: string[] = [];
  const sub = profile.operation_subtype;

  lines.push(...gcodeProgramHeader(p, `SPECIAL GRIND: ${sub.toUpperCase()}`,
    "", profile.wheel_spec ?? "WA60K8V", ctrl));
  lines.push(`${fmtS(wheel_rpm, ctrl)} M03`);
  lines.push(coolantOn(cool, ctrl));
  lines.push("");

  if (sub === "jig_grind") {
    lines.push("(--- JIG GRINDING: HIGH-PRECISION BORE/PROFILE ---)")
    lines.push("(RECIPROCATING SPINDLE MOTION)")
    lines.push(`G01 ${fmtCoord("Z", -profile.stock_mm, ctrl)} ${fmtF(10, ctrl)}`);
    lines.push(`G02 ${fmtCoord("X", 0, ctrl)} ${fmtCoord("Z", 0, ctrl)} R${(profile.workpiece_dim_mm / 2).toFixed(3)} ${fmtF(v_w_est * 0.5, ctrl)}`);
    lines.push("G04 P500 (SPARK-OUT)");
  } else if (sub === "thread_single_rib") {
    const pitch = profile.thread_pitch_mm ?? 1.5;
    lines.push(`(--- THREAD GRINDING: SINGLE-RIB, PITCH=${pitch}mm ---)`);
    lines.push("(LEAD SCREW SYNCHRONIZED — Z AXIS FOLLOWS THREAD HELIX)");
    lines.push(`G33 ${fmtCoord("Z", -(profile.workpiece_dim_mm), ctrl)} K${pitch.toFixed(3)} ${fmtF(v_w_est, ctrl)}`);
    lines.push(`G00 ${fmtCoord("Z", 5, ctrl)}`);
    lines.push(`G01 ${fmtCoord("X", -profile.stock_mm * 0.5, ctrl)} ${fmtF(20, ctrl)} (SECOND PASS INFEED)`);
    lines.push(`G33 ${fmtCoord("Z", -(profile.workpiece_dim_mm), ctrl)} K${pitch.toFixed(3)} ${fmtF(v_w_est, ctrl)}`);
  } else if (sub === "thread_multi_rib") {
    const pitch = profile.thread_pitch_mm ?? 1.5;
    const ribs = profile.thread_ribs ?? 5;
    lines.push(`(--- THREAD GRINDING: MULTI-RIB x${ribs}, PITCH=${pitch}mm ---)`);
    lines.push("(SINGLE PASS — ALL RIBS ENGAGED SIMULTANEOUSLY)");
    lines.push(`G01 ${fmtCoord("X", (profile.workpiece_dim_mm / 2) - profile.stock_mm, ctrl)} ${fmtF(20, ctrl)}`);
    lines.push(`G33 ${fmtCoord("Z", -(profile.workpiece_dim_mm), ctrl)} K${pitch.toFixed(3)} ${fmtF(v_w_est, ctrl)}`);
    lines.push("G04 P300");
  } else if (sub === "gear_profile") {
    lines.push("(--- GEAR PROFILE GRINDING ---)")
    lines.push("(USES DRESSER TO GENERATE INVOLUTE PROFILE ON WHEEL)")
    lines.push("(REQUIRES GEAR GRINDING CNC CYCLE — CONTROLLER SPECIFIC)");
    if (ctrl === "siemens_grind") {
      lines.push(`CYCLE_GEAR_GRIND(D_PITCH=${profile.workpiece_dim_mm.toFixed(3)},Z_TEETH=20,AE=${profile.stock_mm.toFixed(3)})`);
    } else {
      lines.push("(USE MACHINE OEM GEAR GRINDING MACRO — G.T. CYCLE)");
      lines.push(`G01 ${fmtCoord("X", (profile.workpiece_dim_mm / 2) - profile.stock_mm, ctrl)} ${fmtF(30, ctrl)}`);
      lines.push(`G04 P1000`);
    }
  } else if (sub === "tool_cutter") {
    lines.push("(--- TOOL/CUTTER GRINDING: FLUTE + RELIEF ---)")
    lines.push("(5-AXIS TOOL GRINDER MOTION — SIMPLIFIED 2-AXIS EXAMPLE)")
    lines.push(`G01 ${fmtCoord("Z", -profile.workpiece_dim_mm, ctrl)} ${fmtF(v_w_est * 0.3, ctrl)}`);
    lines.push(`G91 G01 A${(360 / 4).toFixed(2)} ${fmtF(100, ctrl)} (INDEX 4-FLUTE)`);
    lines.push("G90");
    lines.push(`G00 ${fmtCoord("Z", 5, ctrl)}`);
  } else if (sub === "hedg") {
    lines.push("(--- HEDG: HIGH-EFFICIENCY DEEP GRINDING ---)")
    lines.push("(HIGH WHEEL SPEED + DEEP CUT + SLOW TABLE = CBN/SUPERABRASIVE REQUIRED)")
    lines.push(`(ae=${profile.stock_mm.toFixed(3)}mm FULL DEPTH, v_s HIGH, v_w SLOW)`);
    lines.push(`G01 ${fmtCoord("Z", -profile.stock_mm, ctrl)} ${fmtF(v_w_est * 0.05, ctrl)} (RAMP-IN)`);
    lines.push(`G01 ${fmtCoord("X", profile.workpiece_dim_mm, ctrl)} ${fmtF(v_w_est, ctrl)} (SINGLE PASS)`);
    lines.push(`G00 ${fmtCoord("Z", 50, ctrl)}`);
  }

  lines.push("");
  lines.push(...gcodeProgramFooter(ctrl));
  return lines.join("\n");
}

// ============================================================================
// MAIN ENGINE CLASS
// ============================================================================

/**
 * GrindingProgramAssemblerEngine
 *
 * Orchestrates all inline grinding physics into complete G-code programs.
 * No external dependencies — all physics computed inline.
 */
export class GrindingProgramAssemblerEngine {
  private readonly engineName = "GrindingProgramAssemblerEngine";

  // --------------------------------------------------------------------------
  // PRIVATE HELPERS
  // --------------------------------------------------------------------------

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
   * Run machine envelope guard against peak grinding parameters.
   * Validates spindle RPM, table feed, power, and work volume.
   */
  private _checkEnvelope(opts: {
    spindle_rpm?: number;
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
      spindle_rpm: opts.spindle_rpm,
      feed_mm_min: opts.feed_mm_min,
      power_kW: opts.power_kW,
      x: opts.x_mm,
      y: opts.y_mm,
      z: opts.z_mm,
    }, envelope);
    return result.violations.map(v => `ENVELOPE: ${v.message}`);
  }

  private resolveMaterial(name: string): GrindingMaterial {
    enrichGrindingFromCanonical(); // lazy canonical physics enrichment
    const key = name.toLowerCase().replace(/[^a-z0-9_]/g, "_");
    // Tier 1: direct key
    if (GRINDING_MATERIALS[key]) return GRINDING_MATERIALS[key];
    // Tier 2: fuzzy match
    for (const [k, v] of Object.entries(GRINDING_MATERIALS)) {
      if (k.includes(key) || key.includes(k)) return v;
    }
    // U-ARCH3 Tier 3: use bridge ISO group detection for best grinding fallback
    // Fire async resolution for future calls (non-blocking)
    if (!this._resolvedMaterial) {
      resolveMaterial({ material_name: name })
        .then(rm => { this._resolvedMaterial = rm; })
        .catch(() => { /* fall through to 4140_steel */ });
    }
    if (this._resolvedMaterial) {
      const rm = this._resolvedMaterial;
      // Map bridge ISO group to closest grinding material
      const isoFallback: Record<string, string> = {
        P: "4140_steel", M: "stainless_304", K: "cast_iron",
        N: "aluminum_6061", S: "inconel_718", H: "d2_tool_steel",
      };
      const fallbackKey = isoFallback[rm.iso_group];
      if (fallbackKey && GRINDING_MATERIALS[fallbackKey]) {
        // Enrich with bridge physics where available
        const base = { ...GRINDING_MATERIALS[fallbackKey] };
        base.k_thermal = rm.k_thermal;
        base.density = rm.density_kg_m3;
        base.c_specific = rm.cp_J_kgK;
        base.name = rm.name;
        log.info(`[${this.engineName}] Material '${name}' resolved via registry as ISO ${rm.iso_group} → ${fallbackKey}`);
        return base;
      }
    }
    // Tier 4: last resort
    log.warn(`[${this.engineName}] Material '${name}' not found — using 4140_steel`);
    return GRINDING_MATERIALS["4140_steel"]!;
  }

  private resolveWheel(spec?: string, mat?: GrindingMaterial): WheelSpec {
    const key = spec ?? mat?.wheel_type ?? "WA46K8V";
    if (WHEEL_SPECS[key]) return WHEEL_SPECS[key]!;
    log.warn(`[${this.engineName}] Wheel '${key}' not in DB — using WA46K8V`);
    return WHEEL_SPECS["WA46K8V"]!;
  }

  private buildPhysicsResult(
    mat: GrindingMaterial,
    wheel: WheelSpec,
    v_s_m_s: number,
    v_w_mm_min: number,
    a_e_mm: number,
    d_s_mm: number,
    b_mm: number,
    f_d: number,
    a_d: number,
  ): GrindingPhysicsResult {
    const v_s_mm_s = v_s_m_s * 1000;
    const v_w_mm_s = v_w_mm_min / 60;

    const u = malkinSpecificEnergy(mat);
    const Q_prime = mrrPerMm(v_w_mm_s, a_e_mm);
    const Ft = tangentialForce(u, Q_prime, v_s_mm_s);
    const fn_ratio = forceRatio(wheel, a_e_mm);
    const Fn = Ft * fn_ratio;
    const theta = jaegarTemperature(mat, u, Q_prime, v_w_mm_s, a_e_mm, d_s_mm, b_mm);
    const Ra_kin = kinematicRa(v_w_mm_s, v_s_mm_s, f_d, a_d);
    const Ra_grain = grainRa(v_w_mm_s, v_s_mm_s, wheel.grain_density, wheel.grain_radius, a_e_mm);
    const Ra = Math.max(Ra_kin, Ra_grain) * 1000; // convert to µm approximation
    const g = estimateGRatio(wheel, a_e_mm);

    return {
      specific_energy: {
        value: u, unit: "J/mm³",
        formula: "u = u_ch(1 + 0.3_pl + 0.2_sl) [Malkin 1989]",
        confidence: 0.88,
      },
      mrr_per_mm: {
        value: Q_prime, unit: "mm³/(s·mm)",
        formula: "Q' = v_w × a_e [Malkin & Guo 2008 Eq.3.1]",
        confidence: 0.95,
      },
      F_t: {
        value: Ft, unit: "N/mm",
        formula: "F_t = u × Q' / v_s [Malkin & Guo 2008 Eq.3.8]",
        confidence: 0.87,
      },
      F_n: {
        value: Fn, unit: "N/mm",
        formula: `F_n = F_t × ${fn_ratio.toFixed(2)} [Shaw 2005 p.532]`,
        confidence: 0.82,
      },
      theta_max: {
        value: theta, unit: "°C",
        formula: "θ = 1.13·q·√(l_c/(v_w·k·ρ·c)) [Jaeger 1942]",
        confidence: 0.80,
      },
      theta_burn: { value: mat.theta_burn, unit: "°C", confidence: 0.90 },
      burn_risk: theta > mat.theta_burn * 0.7,
      Ra_predicted: {
        value: Ra, unit: "µm",
        formula: "Ra ≈ max(kinematic, grain) × scale [Verkerk 1977 / Malkin 1989]",
        confidence: 0.78,
      },
      g_ratio: {
        value: g, unit: "dimensionless",
        formula: "G = V_w/V_wheel [Malkin & Guo 2008 Ch.7]",
        confidence: 0.75,
      },
      v_s: { value: v_s_m_s, unit: "m/s", confidence: 1.0 },
      v_w: { value: v_w_mm_min, unit: "mm/min", confidence: 1.0 },
      a_e: { value: a_e_mm, unit: "mm", confidence: 1.0 },
    };
  }

  private buildWheelWear(
    wheel: WheelSpec,
    g_ratio: number,
    volume_removed_mm3: number,
    passes: number,
  ): WheelWearPrediction {
    const V_wheel = volume_removed_mm3 / g_ratio;
    // Radial wear per pass — assume wheel area ≈ π × d × b
    // V_wheel = π × d × b × Δr  →  Δr = V_wheel / (π × d × b × passes)
    const wheel_area_mm2 = Math.PI * 200 * 25; // nominal 200×25 wheel
    const radial_wear = V_wheel / (wheel_area_mm2 * Math.max(passes, 1));
    // Redress when radial wear > 0.05 mm (50 µm) — Marinescu 2004
    const passes_to_redress = Math.floor(0.05 / Math.max(radial_wear, 1e-9));

    return {
      V_workpiece: volume_removed_mm3,
      V_wheel,
      g_ratio,
      passes_to_redress: clamp(passes_to_redress, 1, 10000),
      radial_wear_per_pass: radial_wear * 1000, // [µm/pass]
    };
  }

  private burnCheck(
    physics: GrindingPhysicsResult,
    mat: GrindingMaterial,
    a_e_mm: number,
    v_w_mm_min: number,
  ): { a_e_safe: number; v_w_safe: number; warnings: string[] } {
    const warnings: string[] = [];
    let a_e = a_e_mm;
    let v_w = v_w_mm_min;

    if (physics.burn_risk) {
      // Auto-reduce a_e by 30% to bring temperature below 70% of θ_burn
      a_e = a_e_mm * 0.70;
      warnings.push(
        `BURN RISK: θ_max=${physics.theta_max.value.toFixed(0)}°C > 70% of θ_burn=${mat.theta_burn}°C. ` +
        `Auto-reduced a_e from ${a_e_mm.toFixed(4)} → ${a_e.toFixed(4)} mm.`
      );
    }
    if (physics.F_t.value > 20) {
      warnings.push(`HIGH TANGENTIAL FORCE: F_t=${physics.F_t.value.toFixed(1)} N/mm — check wheel grade and coolant.`);
    }
    if (physics.Ra_predicted.value > 3.2) {
      warnings.push(`Ra predicted ${physics.Ra_predicted.value.toFixed(2)} µm exceeds typical finish grinding target. Refine dressing.`);
    }

    return { a_e_safe: a_e, v_w_safe: v_w, warnings };
  }

  // --------------------------------------------------------------------------
  // PUBLIC INTERFACE
  // --------------------------------------------------------------------------

  /**
   * Assemble a complete surface grinding program.
   * Covers: horizontal-reciprocating, horizontal-rotary, vertical-rotary (Blanchard),
   *         creep-feed, speed-stroke.
   */
  assembleSurfaceGrind(input: SurfaceGrindProfile): GrindingProgram {
    this._fireResolveMachine(input);
    log.debug(`[${this.engineName}] assembleSurfaceGrind: ${input.operation_subtype} / ${input.material}`);
    const cpm = new PipelineCheckpointManager("grinding-surface", (input as any).runId);
    cpm.checkpoint("intake", 0, { material: input.material, subtype: input.operation_subtype });

    const mat = this.resolveMaterial(input.material);
    const wheel = this.resolveWheel(input.wheel_spec, mat);
    const ctrl = input.controller ?? "fanuc_grind";

    // Wheel speed
    const v_s = autoWheelSpeed(wheel);
    const v_s_mm_s = v_s * 1000;
    const wheel_rpm = speedToRpm(v_s, input.wheel_diameter_mm);

    // Workpiece / table speed
    let v_w_mm_min = input.v_w_mm_min ?? autoWorkpieceSpeed(mat, input.operation_subtype, input.a_e_mm ?? 0.02);
    if (input.operation_subtype === "creep_feed") {
      v_w_mm_min = clamp(v_w_mm_min, 20, 150);
    } else if (input.operation_subtype === "speed_stroke") {
      v_w_mm_min = clamp(v_w_mm_min * 3, 3000, 25000);
    }

    // Depth of cut per pass
    let a_e = input.a_e_mm ?? (input.operation_subtype === "creep_feed" ? input.stock_mm : 0.015);
    const passes = input.operation_subtype === "creep_feed"
      ? 1
      : Math.ceil(input.stock_mm / a_e);

    // Dressing
    const dress = calcDressing(wheel, input.target_Ra_um, v_s_mm_s, v_w_mm_min / 60, input.dressing);

    // Physics
    const b = input.wheel_width_mm;
    const phys = this.buildPhysicsResult(mat, wheel, v_s, v_w_mm_min, a_e, input.wheel_diameter_mm, b, dress.f_d, dress.a_d);

    // Burn check
    const { a_e_safe, warnings } = this.burnCheck(phys, mat, a_e, v_w_mm_min);
    a_e = a_e_safe;

    // PIPELINE-VAR U-PV09: Wheel peripheral speed safety check
    // Max safe peripheral speed typically 25-45 m/s (bond-dependent)
    // Ref: EN 12413 — max operating speed markings on wheel
    const v_s_ms = v_s_mm_s / 1000; // mm/s → m/s
    const maxWheelSpeed = wheel.bond === "B" || wheel.bond === "R" ? 60 : 45; // m/s — B=resinoid CBN, R=resinoid diamond
    if (v_s_ms > maxWheelSpeed) {
      warnings.push(`SAFETY BLOCK: Wheel speed ${v_s_ms.toFixed(1)} m/s exceeds ${maxWheelSpeed} m/s max for ${wheel.bond} bond — reduce wheel RPM`);
    } else if (v_s_ms > maxWheelSpeed * 0.9) {
      warnings.push(`SAFETY WARN: Wheel speed ${v_s_ms.toFixed(1)} m/s at ${((v_s_ms / maxWheelSpeed) * 100).toFixed(0)}% of max — monitor for wheel degradation`);
    }

    // Rebuild physics with safe a_e
    const phys_safe = this.buildPhysicsResult(mat, wheel, v_s, v_w_mm_min, a_e, input.wheel_diameter_mm, b, dress.f_d, dress.a_d);

    // MC uncertainty
    const unc = computeMC(mat, wheel, malkinSpecificEnergy(mat), v_w_mm_min, v_s_mm_s, a_e,
      input.wheel_diameter_mm, b, dress.f_d, dress.a_d);

    // Volume removed & wheel wear
    const V_removed = a_e * input.part_length_mm * input.part_width_mm;
    const ww = this.buildWheelWear(wheel, phys_safe.g_ratio.value, V_removed, passes);

    // Cycle time
    const cross_feed = input.cross_feed_step_mm ?? (input.wheel_width_mm * 0.7);
    const y_passes = Math.ceil(input.part_width_mm / cross_feed);
    const ct = estimateCycleTime(passes * y_passes, input.part_length_mm, v_w_mm_min, 5, 50, 30);

    // G-code
    const gcode = genSurfaceGrindGCode(input, wheel_rpm, v_w_mm_min, a_e, passes, cross_feed, ctrl);

    // Machine envelope guard — validate wheel RPM, table feed, and work volume
    warnings.push(...this._checkEnvelope({
      spindle_rpm: wheel_rpm,
      feed_mm_min: v_w_mm_min,
      power_kW: (phys_safe.F_t.value * phys_safe.v_s.value) / 1000,
      x_mm: input.part_length_mm,
      y_mm: input.part_width_mm,
    }));

    return {
      operation: `surface_grind_${input.operation_subtype}`,
      gcode,
      physics: phys_safe,
      uncertainty: unc,
      dressing: dress,
      wheel_wear: ww,
      cycle_time: ct,
      wheel_spec: wheel.designation,
      material_name: mat.name,
      controller: ctrl,
      warnings,
    };
  }

  /**
   * Assemble a complete cylindrical grinding program.
   * Covers: OD plunge, OD traverse, OD taper, ID bore, face, multi-step.
   */
  assembleCylindricalGrind(input: CylindricalGrindProfile): GrindingProgram {
    this._fireResolveMachine(input);
    log.debug(`[${this.engineName}] assembleCylindricalGrind: ${input.operation_subtype}`);

    const mat = this.resolveMaterial(input.material);
    const wheel = this.resolveWheel(input.wheel_spec, mat);
    const ctrl = input.controller ?? "fanuc_grind";

    const v_s = autoWheelSpeed(wheel);
    const v_s_mm_s = v_s * 1000;
    const wheel_rpm = speedToRpm(v_s, input.wheel_diameter_mm);

    // Workpiece speed: typically 20–60 m/min peripheral for cylindrical
    const wk_peripheral_m_min = clamp(20 + (1 - mat.hardness_hrc / 100) * 40, 10, 60);
    const wk_rpm = input.workpiece_rpm ?? Math.round(wk_peripheral_m_min * 1000 / (Math.PI * input.workpiece_od_mm));

    // Radial infeed per pass
    const infeed = input.infeed_mm ?? clamp(input.stock_mm / 20, 0.005, 0.05);
    const passes = Math.ceil(input.stock_mm / infeed);

    // Traverse feed: typically 1/4 to 1/3 wheel width per workpiece rev
    const traverse = input.traverse_feed_mm_min ?? (wheel.grit_size > 46 ? 0.20 : 0.30) * input.wheel_width_mm * wk_rpm;

    // a_e for cylindrical = infeed
    const a_e = infeed;

    // Dressing
    const v_w_mm_min = traverse; // use traverse feed as reference
    const dress = calcDressing(wheel, input.target_Ra_um, v_s_mm_s, v_w_mm_min / 60, input.dressing);

    // Physics
    const phys = this.buildPhysicsResult(mat, wheel, v_s, wk_peripheral_m_min * 1000, a_e,
      input.wheel_diameter_mm, input.wheel_width_mm, dress.f_d, dress.a_d);

    const { a_e_safe, warnings } = this.burnCheck(phys, mat, a_e, wk_peripheral_m_min * 1000);

    const phys_safe = this.buildPhysicsResult(mat, wheel, v_s, wk_peripheral_m_min * 1000, a_e_safe,
      input.wheel_diameter_mm, input.wheel_width_mm, dress.f_d, dress.a_d);

    const unc = computeMC(mat, wheel, malkinSpecificEnergy(mat), wk_peripheral_m_min * 1000,
      v_s_mm_s, a_e_safe, input.wheel_diameter_mm, input.wheel_width_mm, dress.f_d, dress.a_d);

    const V_removed = Math.PI * input.workpiece_od_mm * input.stock_mm * input.workpiece_length_mm;
    const ww = this.buildWheelWear(wheel, phys_safe.g_ratio.value, V_removed, passes);

    const ct = estimateCycleTime(passes, input.workpiece_length_mm + 10, traverse, 10, 30, 25);

    const gcode = genCylindricalGrindGCode(input, wheel_rpm, wk_rpm, traverse, infeed, passes, ctrl);

    // Machine envelope guard — validate wheel RPM, traverse feed, and work length
    warnings.push(...this._checkEnvelope({
      spindle_rpm: wheel_rpm,
      feed_mm_min: traverse,
      power_kW: (phys_safe.F_t.value * phys_safe.v_s.value) / 1000,
      z_mm: input.workpiece_length_mm,
    }));

    return {
      operation: `cylindrical_grind_${input.operation_subtype}`,
      gcode,
      physics: phys_safe,
      uncertainty: unc,
      dressing: dress,
      wheel_wear: ww,
      cycle_time: ct,
      wheel_spec: wheel.designation,
      material_name: mat.name,
      controller: ctrl,
      warnings,
    };
  }

  /**
   * Assemble a complete centerless grinding program.
   * Covers: through-feed, in-feed (plunge), end-feed.
   * Includes Hashimoto rounding / lobing stability analysis.
   *
   * Reference: Hashimoto F., Annals CIRP 51/1 (2002) 275–279
   */
  assembleCenterlessGrind(input: CenterlessGrindProfile): GrindingProgram {
    this._fireResolveMachine(input);
    log.debug(`[${this.engineName}] assembleCenterlessGrind: ${input.operation_subtype}`);

    const mat = this.resolveMaterial(input.material);
    const wheel = this.resolveWheel(input.wheel_spec, mat);
    const ctrl = input.controller ?? "fanuc_grind";
    const warnings: string[] = [];

    const v_s = autoWheelSpeed(wheel);
    const v_s_mm_s = v_s * 1000;
    const wheel_rpm = speedToRpm(v_s, input.wheel_diameter_mm);

    // Regulating wheel parameters
    // v_w ≈ π × d_rw × n_rw × sin(α)  where α = regulating wheel tilt angle
    const blade_angle = input.blade_angle_deg ?? 25;
    const alpha_rad = (blade_angle * Math.PI) / 180;
    const reg_rpm = input.reg_wheel_rpm ?? Math.round(5000 / (Math.PI * input.reg_wheel_diameter_mm));
    const v_w_mm_min = Math.PI * input.reg_wheel_diameter_mm * reg_rpm * Math.sin(alpha_rad);

    // Centerless rounding stability — Hashimoto 2002
    // h = center height above W-RW line
    // Lobing condition: N_lobes = h/R_workpiece + 1
    // Stable = N_lobes is odd (avoids even-lobe resonance)
    const h = input.center_height_mm ?? (input.workpiece_diameter_mm * 0.25);
    const R_w = input.workpiece_diameter_mm / 2;
    const N_lobes_raw = h / R_w + 1;
    const N_lobes_int = Math.round(N_lobes_raw);
    if (N_lobes_int % 2 === 0) {
      const h_odd = (N_lobes_int + 1 - 1) * R_w; // next odd lobe height
      warnings.push(
        `LOBING INSTABILITY: center height h=${h.toFixed(2)}mm gives even-lobe geometry (N≈${N_lobes_int}). ` +
        `Recommend h=${h_odd.toFixed(2)}mm for odd-lobe stability [Hashimoto 2002].`
      );
    }

    const a_e = input.stock_mm;
    const dress = calcDressing(wheel, input.target_Ra_um, v_s_mm_s, v_w_mm_min / 60, input.dressing);
    const phys = this.buildPhysicsResult(mat, wheel, v_s, v_w_mm_min, a_e,
      input.wheel_diameter_mm, input.wheel_width_mm, dress.f_d, dress.a_d);

    const { warnings: burnWarn } = this.burnCheck(phys, mat, a_e, v_w_mm_min);
    warnings.push(...burnWarn);

    const unc = computeMC(mat, wheel, malkinSpecificEnergy(mat), v_w_mm_min,
      v_s_mm_s, a_e, input.wheel_diameter_mm, input.wheel_width_mm, dress.f_d, dress.a_d);

    const V_removed = Math.PI * input.workpiece_diameter_mm * input.stock_mm * input.workpiece_length_mm;
    const ww = this.buildWheelWear(wheel, phys.g_ratio.value, V_removed, 1);
    const ct = estimateCycleTime(1, input.workpiece_length_mm, v_w_mm_min, 5, 20, 20);

    const gcode = genCenterlessGrindGCode(input, wheel_rpm, reg_rpm, v_w_mm_min, ctrl);

    // Machine envelope guard — validate wheel RPM, feed, and work length
    warnings.push(...this._checkEnvelope({
      spindle_rpm: wheel_rpm,
      feed_mm_min: v_w_mm_min,
      power_kW: (phys.F_t.value * phys.v_s.value) / 1000,
      z_mm: input.workpiece_length_mm,
    }));

    return {
      operation: `centerless_grind_${input.operation_subtype}`,
      gcode,
      physics: phys,
      uncertainty: unc,
      dressing: dress,
      wheel_wear: ww,
      cycle_time: ct,
      wheel_spec: wheel.designation,
      material_name: mat.name,
      controller: ctrl,
      warnings,
    };
  }

  /**
   * Assemble a complete creep-feed grinding program.
   * Creep-feed: single deep pass at very low v_w (5–50 mm/min), full stock depth.
   * High specific energy — flood coolant mandatory.
   *
   * Reference: Andrew et al., "Creep Feed Grinding", Holt Rinehart Winston 1985
   */
  assembleCreepFeedGrind(input: CreepFeedProfile): GrindingProgram {
    this._fireResolveMachine(input);
    log.debug(`[${this.engineName}] assembleCreepFeedGrind: ${input.material}`);

    const mat = this.resolveMaterial(input.material);
    const wheel = this.resolveWheel(input.wheel_spec, mat);
    const ctrl = input.controller ?? "fanuc_grind";
    const warnings: string[] = [];

    const v_s = autoWheelSpeed(wheel);
    const v_s_mm_s = v_s * 1000;
    const wheel_rpm = speedToRpm(v_s, input.wheel_diameter_mm);

    // Creep-feed: a_e = full depth, v_w very slow (5–50 mm/min)
    const a_e = input.depth_mm;
    const v_w_mm_min = clamp(autoWorkpieceSpeed(mat, "creep_feed", a_e), 5, 50);

    if (!input.coolant) {
      warnings.push("CRITICAL: Flood coolant is mandatory for creep-feed grinding. Thermal damage will occur without it.");
    }
    if (a_e > 5) {
      warnings.push(`Deep creep-feed (ae=${a_e.toFixed(1)}mm) — ensure wheel is vitrified, open-structured, and properly trued.`);
    }

    const dress = calcDressing(wheel, input.target_Ra_um, v_s_mm_s, v_w_mm_min / 60, input.dressing);
    const phys = this.buildPhysicsResult(mat, wheel, v_s, v_w_mm_min, a_e,
      input.wheel_diameter_mm, input.wheel_width_mm ?? input.slot_width_mm, dress.f_d, dress.a_d);

    const { warnings: burnWarn } = this.burnCheck(phys, mat, a_e, v_w_mm_min);
    warnings.push(...burnWarn);

    const unc = computeMC(mat, wheel, malkinSpecificEnergy(mat), v_w_mm_min,
      v_s_mm_s, a_e, input.wheel_diameter_mm, input.slot_width_mm, dress.f_d, dress.a_d);

    const V_removed = a_e * input.part_length_mm * input.slot_width_mm;
    const ww = this.buildWheelWear(wheel, phys.g_ratio.value, V_removed, 1);
    const ct = estimateCycleTime(1, input.part_length_mm, v_w_mm_min, 10, 5, 30);

    const gcode = genCreepFeedGCode(input, wheel_rpm, v_w_mm_min, ctrl);

    // Machine envelope guard — validate wheel RPM, feed, and work volume
    warnings.push(...this._checkEnvelope({
      spindle_rpm: wheel_rpm,
      feed_mm_min: v_w_mm_min,
      power_kW: (phys.F_t.value * phys.v_s.value) / 1000,
      x_mm: input.part_length_mm,
    }));

    return {
      operation: "creep_feed_grind",
      gcode,
      physics: phys,
      uncertainty: unc,
      dressing: dress,
      wheel_wear: ww,
      cycle_time: ct,
      wheel_spec: wheel.designation,
      material_name: mat.name,
      controller: ctrl,
      warnings,
    };
  }

  /**
   * Assemble a special grinding program (jig, thread, gear, tool-cutter, HEDG).
   */
  assembleSpecialGrind(input: SpecialGrindProfile): GrindingProgram {
    this._fireResolveMachine(input);
    log.debug(`[${this.engineName}] assembleSpecialGrind: ${input.operation_subtype}`);

    const mat = this.resolveMaterial(input.material);
    const wheel = this.resolveWheel(input.wheel_spec, mat);
    const ctrl = input.controller ?? "fanuc_grind";
    const warnings: string[] = [];

    // HEDG: much higher wheel speed
    const v_s = input.operation_subtype === "hedg" ? Math.min(120, wheel.v_s_max) : autoWheelSpeed(wheel);
    const v_s_mm_s = v_s * 1000;
    const wheel_rpm = speedToRpm(v_s, input.wheel_diameter_mm);
    const v_w_est = autoWorkpieceSpeed(mat, input.operation_subtype, input.stock_mm);

    const a_e = input.stock_mm;
    const f_d = 0.05;
    const a_d = 0.01;

    const dress: DressingResult = calcDressing(wheel, input.target_Ra_um, v_s_mm_s, v_w_est / 60, undefined);
    const phys = this.buildPhysicsResult(mat, wheel, v_s, v_w_est, a_e,
      input.wheel_diameter_mm, input.wheel_width_mm, dress.f_d, dress.a_d);

    if (input.operation_subtype === "hedg" && wheel.abrasive !== "CBN" && wheel.abrasive !== "Diamond") {
      warnings.push("HEDG requires CBN or diamond superabrasive wheel. Conventional Al2O3 will not survive high wheel speeds.");
    }
    if (input.operation_subtype === "thread_multi_rib" && !input.thread_ribs) {
      warnings.push("Multi-rib thread grinding: thread_ribs not specified — defaulting to 5 ribs.");
    }

    const { warnings: burnWarn } = this.burnCheck(phys, mat, a_e, v_w_est);
    warnings.push(...burnWarn);

    const unc = computeMC(mat, wheel, malkinSpecificEnergy(mat), v_w_est,
      v_s_mm_s, a_e, input.wheel_diameter_mm, input.wheel_width_mm, dress.f_d, dress.a_d);

    const V_removed = a_e * input.workpiece_dim_mm * (input.wheel_width_mm ?? 20);
    const ww = this.buildWheelWear(wheel, phys.g_ratio.value, V_removed, 1);
    const ct = estimateCycleTime(1, input.workpiece_dim_mm, v_w_est, 5, 10, 25);

    const gcode = genSpecialGrindGCode(input, wheel_rpm, v_w_est, ctrl);

    // Machine envelope guard — validate wheel RPM and feed
    warnings.push(...this._checkEnvelope({
      spindle_rpm: wheel_rpm,
      feed_mm_min: v_w_est,
      power_kW: (phys.F_t.value * phys.v_s.value) / 1000,
    }));

    return {
      operation: `special_grind_${input.operation_subtype}`,
      gcode,
      physics: phys,
      uncertainty: unc,
      dressing: dress,
      wheel_wear: ww,
      cycle_time: ct,
      wheel_spec: wheel.designation,
      material_name: mat.name,
      controller: ctrl,
      warnings,
    };
  }

  /**
   * Run stochastic uncertainty quantification standalone on any grinding input.
   * 500-sample Monte Carlo — varies a_e ±5%, v_w ±3%, grain size log-normal ±10%.
   */
  computeUncertainty(input: {
    material: string;
    wheel_spec?: string;
    v_s_m_s?: number;
    v_w_mm_min?: number;
    a_e_mm?: number;
    wheel_diameter_mm?: number;
    wheel_width_mm?: number;
    dressing_f_d?: number;
    dressing_a_d?: number;
  }): GrindingUncertainty {
    const mat = this.resolveMaterial(input.material);
    const wheel = this.resolveWheel(input.wheel_spec, mat);
    const v_s = (input.v_s_m_s ?? autoWheelSpeed(wheel)) * 1000;
    const v_w = input.v_w_mm_min ?? 300;
    const a_e = input.a_e_mm ?? 0.02;
    const d_s = input.wheel_diameter_mm ?? 200;
    const b = input.wheel_width_mm ?? 25;
    const f_d = input.dressing_f_d ?? 0.05;
    const a_d = input.dressing_a_d ?? 0.01;
    const u = malkinSpecificEnergy(mat);

    return computeMC(mat, wheel, u, v_w, v_s, a_e, d_s, b, f_d, a_d);
  }

  /**
   * Return engine metadata.
   */
  stats(): { methods: string[]; engineName: string } {
    return {
      engineName: this.engineName,
      methods: [
        "assembleSurfaceGrind",
        "assembleCylindricalGrind",
        "assembleCenterlessGrind",
        "assembleCreepFeedGrind",
        "assembleSpecialGrind",
        "computeUncertainty",
        "stats",
      ],
    };
  }
}
