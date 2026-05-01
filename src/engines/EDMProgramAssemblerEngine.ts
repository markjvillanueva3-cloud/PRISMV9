/**
 * EDMProgramAssemblerEngine — Complete EDM Program Generation Pipeline
 *
 * The EDM equivalent of TurningProgramAssemblerEngine / CNCProgramAssemblerEngine.
 * Accepts a part description and generates a complete, controller-ready EDM program
 * by orchestrating all EDM physics inline (no imports of EDM engines).
 *
 * Pipeline:
 *   1. Analyze part profile → determine required operations (wire/sinker/micro)
 *   2. Auto-assign electrodes/wire settings to operation slots
 *   3. Sequence operations: roughing → semi-finishing → finishing → skim passes
 *   4. Compute MRR / Ra / electrode wear / recast layer per operation (inline physics)
 *   5. Generate G-code (Fanuc WEDM / Mitsubishi / Sodick / AgieCharmilles / Makino / Generic)
 *   6. Stochastic uncertainty via Monte Carlo (500 samples, Box-Muller)
 *   7. Cycle time estimation (wire length / cut speed + sinker depth / feed)
 *
 * Physics models (inline, no imports):
 *   - Discharge energy: E = V_gap × I_peak × t_on
 *   - Wire MRR: V_cut = (K × I_peak × t_on) / (h × D_wire)  [Sato model]
 *   - Sinker MRR: (C_mrr × I_peak^a × t_on^b) / ρ  [empirical, material table]
 *   - Surface roughness: Ra = C_ra × I_peak^α × t_on^β  [Puertas & Luis 2004]
 *   - Electrode wear: θ = V_elec / V_work  [material pair tables]
 *   - Recast layer: t_recast = C × E^0.33  [DiBitonto 1989]
 *   - HAZ depth: HAZ = √(4 × α × t_on)  [Carslaw & Jaeger thermal model]
 *   - Gap width: gap = D_wire/2 + spark_gap  [Charmilles application guide]
 *   - Monte Carlo Box-Muller: vary I_peak ±5%, t_on ±3%, V_gap ±8%, tension ±5%
 *
 * Controller dialects supported:
 *   fanuc_wedm, mitsubishi_wedm, sodick, agiecharmilles, makino_edm, generic_edm
 *
 * Pure computation — no filesystem, no external dependencies.
 *
 * References:
 *   - DiBitonto et al. (1989): Theoretical models of the electrical discharge machining process
 *   - Sato et al. (1985): Wire EDM cutting speed model
 *   - Puertas & Luis (2004): Ra = C·I^α·t_on^β empirical coefficients
 *   - Kunieda et al. (2005): Advancing EDM through fundamental insight into the process
 *   - Schumacher (2004): Modeling of the micro EDM process
 *   - Charmilles Technologies: EDM Application Guide (internal)
 *   - Makino EDM: Process Parameter Tables (application notes)
 *   - Machinery's Handbook, 30th ed., Ch. 32: Electrical Discharge Machining
 *
 * @module engines/EDMProgramAssemblerEngine
 */

// Shared Klocke/Puertas&Luis Ra model — not an engine, just a pure function (U-W100-03b)
import { MATERIAL_RA_MODELS as _SHARED_RA_MODELS } from "./utils/klockeRa.js";

import { log } from "../utils/Logger.js";
import { PipelineCheckpointManager } from "../utils/pipelineCheckpoint.js";
import { resolveMaterial, resolveMachine, type ResolvedMaterialContext, type ResolvedMachineContext } from "./PipelineRegistryBridge.js";
import { machineEnvelopeGuardEngine } from "./MachineEnvelopeGuardEngine.js";

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

/** Supported EDM controller dialects. */
export type EDMController =
  | "fanuc_wedm"
  | "mitsubishi_wedm"
  | "sodick"
  | "agiecharmilles"
  | "makino_edm"
  | "generic_edm";

/** EDM process type. */
export type EDMProcessType = "wire" | "sinker" | "micro";

// ─── Wire EDM Types ────────────────────────────────────────────────────────

/** A 2D profile point for wire EDM contour paths. */
export interface WireProfilePoint {
  x_mm: number;
  y_mm: number;
  /** Optional arc radius — if set, arc move from previous point. */
  arc_radius_mm?: number;
  /** Arc direction: "CW" or "CCW". */
  arc_dir?: "CW" | "CCW";
}

/** A taper segment for 4-axis UV wire EDM. */
export interface TaperSegment {
  /** XY lower plane profile point. */
  xy: WireProfilePoint;
  /** UV upper plane offset (independent 4-axis control). */
  uv: { u_mm: number; v_mm: number };
}

/** Complete Wire EDM part profile. */
export interface WireEDMPartProfile {
  /** Part name / drawing number. */
  part_name: string;
  /** Workpiece material (from EDM_MATERIALS table key). */
  material: string;
  /** Workpiece thickness (stack height) [mm]. */
  thickness_mm: number;
  /** 2D contour profile (XY plane). */
  contour: WireProfilePoint[];
  /** 4-axis taper segments (optional — uses contour if absent). */
  taper_segments?: TaperSegment[];
  /** Wire type: "brass", "coated", "molybdenum". */
  wire_type?: "brass" | "coated" | "molybdenum";
  /** Wire diameter [mm] (default 0.25). */
  wire_diameter_mm?: number;
  /** Number of skim passes after roughing (0–3). */
  num_skim_passes?: number;
  /** Target surface finish [µm Ra]. */
  target_Ra_um?: number;
  /** Target dimensional tolerance [mm] (e.g. ±0.005). */
  target_tolerance_mm?: number;
  /** Start hole position (drilled separately). */
  start_hole?: { x_mm: number; y_mm: number; diameter_mm: number };
  /** Submersion mode: true = submerged, false = flushing only. */
  submerged?: boolean;
  /** Taper angle [degrees] for uniform taper (alternative to taper_segments). */
  taper_angle_deg?: number;
  /** Corner slow-down strategy. */
  corner_strategy?: "radius_reduction" | "slow_down" | "none";
  /** Controller dialect. */
  controller?: EDMController;
  /** Program number (default 1). */
  program_number?: number;
  /** Machine brand for registry lookup. */
  machine_brand?: string;
  /** Machine model for registry lookup. */
  machine_model?: string;
  /** Pipeline run ID for checkpoint tracking. */
  runId?: string;
}

/** A single wire EDM operation (roughing cut or skim pass). */
export interface WireEDMOperation {
  /** Operation type. */
  type:
    | "rough_cut"
    | "skim_1"
    | "skim_2"
    | "skim_3"
    | "start_hole"
    | "auto_thread"
    | "4axis_taper";
  /** Human-readable name. */
  name: string;
  /** Pass number (1 = rough, 2 = 1st skim, etc.). */
  pass_number: number;
  /** Power settings string (controller-specific). */
  power_setting: string;
  /** Wire tension [N]. */
  wire_tension_N: number;
  /** Flushing pressure [bar]. */
  flushing_pressure_bar: number;
  /** Cutting speed [mm/min]. */
  cutting_speed_mm_min: AtomicValue<number>;
  /** Wire offset (half kerf + spark gap per side) [mm]. */
  wire_offset_mm: number;
  /** Predicted surface finish [µm Ra]. */
  predicted_Ra_um: AtomicValue<number>;
  /** Recast layer thickness [µm]. */
  recast_layer_um: AtomicValue<number>;
  /** HAZ depth [µm]. */
  haz_um: AtomicValue<number>;
  /** Generated G-code lines. */
  gcode_lines: string[];
  /** Estimated operation time [s]. */
  estimated_time_s: number;
}

/** Complete assembled Wire EDM program. */
export interface WireEDMProgram {
  program_number: string;
  header_comments: string[];
  part_profile: WireEDMPartProfile;
  electrode_setup: WireElectrodeSetup;
  operations: WireEDMOperation[];
  gcode: string;
  estimated_cycle_time_s: number;
  total_wire_consumed_m: number;
  warnings: string[];
  uncertainty?: EDMUncertainty;
}

/** Wire electrode configuration. */
export interface WireElectrodeSetup {
  wire_type: string;
  wire_diameter_mm: number;
  wire_material: string;
  wire_tensile_strength_MPa: number;
  recommended_tension_N: number;
  spool_length_m: number;
  estimated_consumption_m: number;
}

// ─── Sinker EDM Types ──────────────────────────────────────────────────────

/** A sinker EDM cavity feature. */
export interface SinkerCavityFeature {
  /** Feature type. */
  type:
    | "blind_cavity"
    | "through_cavity"
    | "rib"
    | "radius_pocket"
    | "C_axis_slot"
    | "micro_hole";
  /** Feature name. */
  name: string;
  /** Cavity depth [mm]. */
  depth_mm: number;
  /** Projected area [mm²]. */
  area_mm2: number;
  /** Volume to remove [mm³]. */
  volume_mm3: number;
  /** X position [mm]. */
  x_mm: number;
  /** Y position [mm]. */
  y_mm: number;
  /** Target surface finish [µm Ra]. */
  target_Ra_um?: number;
  /** Orbiting pattern: "circular", "square", "custom". */
  orbit_pattern?: "circular" | "square" | "custom";
  /** Orbiting radius [mm]. */
  orbit_radius_mm?: number;
  /** C-axis rotation angle [degrees] (for indexed sinker). */
  c_axis_angle_deg?: number;
}

/** Sinker EDM electrode assignment. */
export interface SinkerElectrode {
  /** Electrode number (1-based). */
  electrode_number: number;
  /** Electrode material: "copper", "graphite", "tungsten_copper". */
  material: "copper" | "graphite" | "tungsten_copper";
  /** Operation stage this electrode is for. */
  stage: "roughing" | "semi_finishing" | "finishing";
  /** Electrode undersize [mm] (accounts for spark gap). */
  undersize_mm: number;
  /** Features this electrode handles. */
  feature_names: string[];
  /** Peak current [A]. */
  peak_current_A: number;
  /** Pulse on-time [µs]. */
  pulse_on_us: number;
  /** Pulse off-time [µs]. */
  pulse_off_us: number;
  /** Gap voltage [V]. */
  gap_voltage_V: number;
}

/** Complete sinker EDM part profile. */
export interface SinkerEDMPartProfile {
  part_name: string;
  material: string;
  /** Workpiece bounding height [mm]. */
  workpiece_height_mm: number;
  features: SinkerCavityFeature[];
  electrode_material?: "copper" | "graphite" | "tungsten_copper";
  /** Target Ra for finish [µm]. */
  target_Ra_um?: number;
  /** Number of electrodes (auto if omitted). */
  num_electrodes?: number;
  /** Jump cycle height [mm] for debris flushing. */
  jump_height_mm?: number;
  /** Jump frequency [Hz]. */
  jump_frequency_hz?: number;
  controller?: EDMController;
  program_number?: number;
  /** Machine brand for registry resolution (U-ARCH3). */
  machine_brand?: string;
  /** Machine model for registry resolution (U-ARCH3). */
  machine_model?: string;
  /** Pipeline run ID for checkpoint tracking. */
  runId?: string;
}

/** A single sinker EDM operation. */
export interface SinkerEDMOperation {
  type:
    | "roughing"
    | "semi_finishing"
    | "finishing"
    | "orbiting"
    | "jump_cycle"
    | "c_axis_index"
    | "electrode_change";
  name: string;
  electrode: SinkerElectrode;
  feature_name: string;
  /** MRR [mm³/min]. */
  mrr_mm3_min: AtomicValue<number>;
  /** Electrode wear ratio (0–1). */
  electrode_wear_ratio: AtomicValue<number>;
  /** Spark gap [mm per side]. */
  spark_gap_mm: AtomicValue<number>;
  /** Predicted Ra [µm]. */
  predicted_Ra_um: AtomicValue<number>;
  /** Recast layer [µm]. */
  recast_layer_um: AtomicValue<number>;
  /** HAZ depth [µm]. */
  haz_um: AtomicValue<number>;
  gcode_lines: string[];
  estimated_time_s: number;
}

/** Complete assembled Sinker EDM program. */
export interface SinkerEDMProgram {
  program_number: string;
  header_comments: string[];
  part_profile: SinkerEDMPartProfile;
  electrodes: SinkerElectrode[];
  operations: SinkerEDMOperation[];
  gcode: string;
  estimated_cycle_time_s: number;
  warnings: string[];
  uncertainty?: EDMUncertainty;
}

// ─── Micro EDM Types ───────────────────────────────────────────────────────

/** Micro EDM part profile. */
export interface MicroEDMPartProfile {
  part_name: string;
  material: string;
  /** Micro-hole or feature type. */
  feature_type: "micro_hole" | "micro_milling" | "wedg_electrode_prep";
  /** Hole/feature diameter [µm]. */
  diameter_um: number;
  /** Depth [µm]. */
  depth_um: number;
  /** Number of holes/features. */
  count: number;
  /** Hole positions [mm]. */
  positions?: { x_mm: number; y_mm: number }[];
  /** Aspect ratio (depth/diameter). */
  aspect_ratio?: number;
  controller?: EDMController;
  program_number?: number;
  /** Machine brand for registry resolution (U-ARCH3). */
  machine_brand?: string;
  /** Machine model for registry resolution (U-ARCH3). */
  machine_model?: string;
}

/** Micro EDM assembled program. */
export interface MicroEDMProgram {
  program_number: string;
  header_comments: string[];
  part_profile: MicroEDMPartProfile;
  gcode: string;
  estimated_cycle_time_s: number;
  warnings: string[];
  uncertainty?: EDMUncertainty;
}

// ─── Shared Uncertainty Type ───────────────────────────────────────────────

/** Monte Carlo stochastic uncertainty envelope for EDM processes. */
export interface EDMUncertainty {
  /** 95% CI on MRR [mm³/min or mm²/min for wire]. */
  mrr_ci95: [number, number];
  /** 95% CI on Ra [µm]. */
  ra_ci95: [number, number];
  /** 95% CI on recast layer [µm]. */
  recast_ci95: [number, number];
  /** 95% CI on electrode wear ratio. */
  wear_ci95: [number, number];
  /** Short-circuit probability (0–1). */
  p_short_circuit: number;
  /** Probability of exceeding target Ra. */
  p_exceed_Ra: number;
  /** Dominant uncertainty source. */
  dominant_source: string;
  /** Overall confidence (0–1). */
  overall_confidence: number;
  /** Number of Monte Carlo samples. */
  n_samples: number;
}

/** Cycle time breakdown. */
export interface CycleTimeEstimate {
  /** Total cycle time [s]. */
  total_s: number;
  /** Cutting time [s]. */
  cutting_s: number;
  /** Non-cutting time [s] (threading, setup, electrode changes). */
  non_cutting_s: number;
  /** Breakdown per operation. */
  per_operation: { name: string; time_s: number }[];
  /** Human-readable total. */
  formatted: string;
}

// ============================================================================
// MATERIAL DATABASE (EDM machinability)
// ============================================================================

interface EDMMaterial {
  /** Display name. */
  name: string;
  /** ISO group. */
  iso_group: "P" | "M" | "K" | "N" | "S" | "H";
  /** Density [g/cm³]. */
  density_g_cm3: number;
  /** Melting point [°C]. */
  melting_point_C: number;
  /** Thermal diffusivity [mm²/s]. */
  thermal_diffusivity_mm2_s: number;
  /** Sato wire speed constant K (material machinability). */
  sato_K: number;
  /** Sinker MRR coefficient C_mrr. */
  sinker_C_mrr: number;
  /** Sinker MRR exponent a (for I_peak). */
  sinker_a: number;
  /** Sinker MRR exponent b (for t_on). */
  sinker_b: number;
  /** Ra coefficient C_ra [Puertas & Luis 2004]. */
  ra_C: number;
  /** Ra exponent α (I_peak). */
  ra_alpha: number;
  /** Ra exponent β (t_on). */
  ra_beta: number;
  /** Typical roughing peak current [A]. */
  rough_current_A: number;
  /** Typical roughing t_on [µs]. */
  rough_ton_us: number;
  /** Typical finishing peak current [A]. */
  finish_current_A: number;
  /** Typical finishing t_on [µs]. */
  finish_ton_us: number;
  /** Recast layer DiBitonto constant C_recast. */
  recast_C: number;
}

/** EDM material database — 10 materials with full physics coefficients.
 *  References: Machinery's Handbook Ch.32, Charmilles Application Guide,
 *              Puertas & Luis (2004), DiBitonto et al. (1989). */
const EDM_MATERIALS: Record<string, EDMMaterial> = {
  steel_1045: {
    name: "AISI 1045 Carbon Steel",
    iso_group: "P",
    density_g_cm3: 7.85,
    melting_point_C: 1480,
    thermal_diffusivity_mm2_s: 11.7,
    sato_K: 1.8,
    sinker_C_mrr: 4.2,
    sinker_a: 0.72,
    sinker_b: 0.21,
    ra_C: 1.2,
    ra_alpha: 0.38,
    ra_beta: 0.24,
    rough_current_A: 40,
    rough_ton_us: 200,
    finish_current_A: 4,
    finish_ton_us: 6,
    recast_C: 0.45,
  },
  steel_D2: {
    name: "D2 Tool Steel (1.2379)",
    iso_group: "H",
    density_g_cm3: 7.70,
    melting_point_C: 1430,
    thermal_diffusivity_mm2_s: 10.2,
    sato_K: 1.6,
    sinker_C_mrr: 3.8,
    sinker_a: 0.70,
    sinker_b: 0.20,
    ra_C: 1.25,
    ra_alpha: 0.39,
    ra_beta: 0.25,
    rough_current_A: 35,
    rough_ton_us: 180,
    finish_current_A: 3,
    finish_ton_us: 5,
    recast_C: 0.48,
  },
  steel_H13: {
    name: "H13 Hot Work Tool Steel (1.2344)",
    iso_group: "H",
    density_g_cm3: 7.80,
    melting_point_C: 1450,
    thermal_diffusivity_mm2_s: 10.9,
    sato_K: 1.65,
    sinker_C_mrr: 3.9,
    sinker_a: 0.71,
    sinker_b: 0.21,
    ra_C: 1.22,
    ra_alpha: 0.38,
    ra_beta: 0.24,
    rough_current_A: 38,
    rough_ton_us: 190,
    finish_current_A: 3,
    finish_ton_us: 5,
    recast_C: 0.47,
  },
  carbide_WC: {
    name: "Cemented Carbide (WC-Co)",
    iso_group: "K",
    density_g_cm3: 14.8,
    melting_point_C: 2870,
    thermal_diffusivity_mm2_s: 20.0,
    sato_K: 0.8,
    sinker_C_mrr: 1.4,
    sinker_a: 0.60,
    sinker_b: 0.18,
    ra_C: 0.9,
    ra_alpha: 0.35,
    ra_beta: 0.22,
    rough_current_A: 20,
    rough_ton_us: 80,
    finish_current_A: 2,
    finish_ton_us: 3,
    recast_C: 0.38,
  },
  copper: {
    name: "Copper (C11000)",
    iso_group: "N",
    density_g_cm3: 8.96,
    melting_point_C: 1085,
    thermal_diffusivity_mm2_s: 116.0,
    sato_K: 2.5,
    sinker_C_mrr: 6.5,
    sinker_a: 0.78,
    sinker_b: 0.24,
    ra_C: 1.05,
    ra_alpha: 0.36,
    ra_beta: 0.22,
    rough_current_A: 50,
    rough_ton_us: 250,
    finish_current_A: 5,
    finish_ton_us: 8,
    recast_C: 0.42,
  },
  aluminum_6061: {
    name: "Aluminum 6061-T6",
    iso_group: "N",
    density_g_cm3: 2.70,
    melting_point_C: 660,
    thermal_diffusivity_mm2_s: 67.3,
    sato_K: 3.2,
    sinker_C_mrr: 9.1,
    sinker_a: 0.82,
    sinker_b: 0.26,
    ra_C: 0.95,
    ra_alpha: 0.34,
    ra_beta: 0.21,
    rough_current_A: 60,
    rough_ton_us: 300,
    finish_current_A: 6,
    finish_ton_us: 10,
    recast_C: 0.40,
  },
  titanium_Ti6Al4V: {
    name: "Titanium Ti-6Al-4V",
    iso_group: "S",
    density_g_cm3: 4.43,
    melting_point_C: 1660,
    thermal_diffusivity_mm2_s: 2.9,
    sato_K: 1.2,
    sinker_C_mrr: 2.8,
    sinker_a: 0.68,
    sinker_b: 0.19,
    ra_C: 1.35,
    ra_alpha: 0.40,
    ra_beta: 0.26,
    rough_current_A: 25,
    rough_ton_us: 120,
    finish_current_A: 2,
    finish_ton_us: 4,
    recast_C: 0.52,
  },
  inconel_718: {
    name: "Inconel 718 (Nickel Superalloy)",
    iso_group: "S",
    density_g_cm3: 8.19,
    melting_point_C: 1336,
    thermal_diffusivity_mm2_s: 3.5,
    sato_K: 1.1,
    sinker_C_mrr: 2.5,
    sinker_a: 0.67,
    sinker_b: 0.19,
    ra_C: 1.40,
    ra_alpha: 0.41,
    ra_beta: 0.27,
    rough_current_A: 22,
    rough_ton_us: 110,
    finish_current_A: 2,
    finish_ton_us: 3,
    recast_C: 0.55,
  },
  stainless_304: {
    name: "Stainless Steel 304 (1.4301)",
    iso_group: "M",
    density_g_cm3: 7.93,
    melting_point_C: 1455,
    thermal_diffusivity_mm2_s: 3.9,
    sato_K: 1.5,
    sinker_C_mrr: 3.5,
    sinker_a: 0.70,
    sinker_b: 0.20,
    ra_C: 1.28,
    ra_alpha: 0.39,
    ra_beta: 0.25,
    rough_current_A: 32,
    rough_ton_us: 160,
    finish_current_A: 3,
    finish_ton_us: 5,
    recast_C: 0.50,
  },
  tungsten: {
    name: "Tungsten (Pure)",
    iso_group: "H",
    density_g_cm3: 19.35,
    melting_point_C: 3422,
    thermal_diffusivity_mm2_s: 69.2,
    sato_K: 0.6,
    sinker_C_mrr: 1.1,
    sinker_a: 0.58,
    sinker_b: 0.17,
    ra_C: 0.85,
    ra_alpha: 0.33,
    ra_beta: 0.21,
    rough_current_A: 15,
    rough_ton_us: 60,
    finish_current_A: 1,
    finish_ton_us: 2,
    recast_C: 0.35,
  },
  // --- Shop steels commonly used in wire EDM ---
  // References: Machinery's Handbook 31st Ed Ch.32, ASM Metals Handbook Vol.16
  steel_P20: {
    name: "P20 Mold Steel (1.2311)",
    iso_group: "P",
    density_g_cm3: 7.85,
    melting_point_C: 1460,
    thermal_diffusivity_mm2_s: 11.3,
    sato_K: 1.75,
    sinker_C_mrr: 4.0,
    sinker_a: 0.71,
    sinker_b: 0.21,
    ra_C: 1.22,
    ra_alpha: 0.38,
    ra_beta: 0.24,
    rough_current_A: 38,
    rough_ton_us: 190,
    finish_current_A: 4,
    finish_ton_us: 6,
    recast_C: 0.46,
  },
  steel_4140: {
    name: "AISI 4140 Alloy Steel (1.7225)",
    iso_group: "P",
    density_g_cm3: 7.85,
    melting_point_C: 1475,
    thermal_diffusivity_mm2_s: 11.2,
    sato_K: 1.72,
    sinker_C_mrr: 4.1,
    sinker_a: 0.72,
    sinker_b: 0.21,
    ra_C: 1.21,
    ra_alpha: 0.38,
    ra_beta: 0.24,
    rough_current_A: 38,
    rough_ton_us: 190,
    finish_current_A: 4,
    finish_ton_us: 6,
    recast_C: 0.46,
  },
  steel_4140_PH: {
    name: "AISI 4140 Pre-Hardened (28-32 HRC)",
    iso_group: "P",
    density_g_cm3: 7.85,
    melting_point_C: 1475,
    thermal_diffusivity_mm2_s: 10.8,
    sato_K: 1.65,
    sinker_C_mrr: 3.9,
    sinker_a: 0.71,
    sinker_b: 0.21,
    ra_C: 1.23,
    ra_alpha: 0.38,
    ra_beta: 0.24,
    rough_current_A: 36,
    rough_ton_us: 185,
    finish_current_A: 3,
    finish_ton_us: 5,
    recast_C: 0.47,
  },
  steel_A2: {
    name: "A2 Tool Steel (1.2363)",
    iso_group: "H",
    density_g_cm3: 7.86,
    melting_point_C: 1440,
    thermal_diffusivity_mm2_s: 10.5,
    sato_K: 1.58,
    sinker_C_mrr: 3.7,
    sinker_a: 0.70,
    sinker_b: 0.20,
    ra_C: 1.24,
    ra_alpha: 0.39,
    ra_beta: 0.25,
    rough_current_A: 34,
    rough_ton_us: 175,
    finish_current_A: 3,
    finish_ton_us: 5,
    recast_C: 0.48,
  },
  steel_S7: {
    name: "S7 Shock-Resisting Tool Steel",
    iso_group: "H",
    density_g_cm3: 7.83,
    melting_point_C: 1440,
    thermal_diffusivity_mm2_s: 10.7,
    sato_K: 1.60,
    sinker_C_mrr: 3.8,
    sinker_a: 0.70,
    sinker_b: 0.20,
    ra_C: 1.24,
    ra_alpha: 0.39,
    ra_beta: 0.25,
    rough_current_A: 35,
    rough_ton_us: 180,
    finish_current_A: 3,
    finish_ton_us: 5,
    recast_C: 0.47,
  },
  steel_O1: {
    name: "O1 Oil-Hardening Tool Steel (1.2510)",
    iso_group: "H",
    density_g_cm3: 7.85,
    melting_point_C: 1425,
    thermal_diffusivity_mm2_s: 10.4,
    sato_K: 1.62,
    sinker_C_mrr: 3.8,
    sinker_a: 0.70,
    sinker_b: 0.20,
    ra_C: 1.23,
    ra_alpha: 0.39,
    ra_beta: 0.25,
    rough_current_A: 35,
    rough_ton_us: 180,
    finish_current_A: 3,
    finish_ton_us: 5,
    recast_C: 0.47,
  },
  steel_O2: {
    name: "O2 Oil-Hardening Tool Steel (1.2842)",
    iso_group: "H",
    density_g_cm3: 7.85,
    melting_point_C: 1420,
    thermal_diffusivity_mm2_s: 10.3,
    sato_K: 1.63,
    sinker_C_mrr: 3.8,
    sinker_a: 0.70,
    sinker_b: 0.20,
    ra_C: 1.23,
    ra_alpha: 0.39,
    ra_beta: 0.25,
    rough_current_A: 35,
    rough_ton_us: 180,
    finish_current_A: 3,
    finish_ton_us: 5,
    recast_C: 0.47,
  },
  steel_52100: {
    name: "52100 Bearing Steel (1.3505)",
    iso_group: "H",
    density_g_cm3: 7.83,
    melting_point_C: 1435,
    thermal_diffusivity_mm2_s: 10.6,
    sato_K: 1.55,
    sinker_C_mrr: 3.7,
    sinker_a: 0.70,
    sinker_b: 0.20,
    ra_C: 1.25,
    ra_alpha: 0.39,
    ra_beta: 0.25,
    rough_current_A: 33,
    rough_ton_us: 175,
    finish_current_A: 3,
    finish_ton_us: 5,
    recast_C: 0.48,
  },
  steel_1018: {
    name: "AISI 1018 Low-Carbon Steel",
    iso_group: "P",
    density_g_cm3: 7.87,
    melting_point_C: 1510,
    thermal_diffusivity_mm2_s: 13.6,
    sato_K: 1.85,
    sinker_C_mrr: 4.3,
    sinker_a: 0.73,
    sinker_b: 0.22,
    ra_C: 1.18,
    ra_alpha: 0.37,
    ra_beta: 0.23,
    rough_current_A: 42,
    rough_ton_us: 210,
    finish_current_A: 4,
    finish_ton_us: 6,
    recast_C: 0.44,
  },
  steel_1020: {
    name: "AISI 1020 Low-Carbon Steel",
    iso_group: "P",
    density_g_cm3: 7.87,
    melting_point_C: 1515,
    thermal_diffusivity_mm2_s: 13.4,
    sato_K: 1.84,
    sinker_C_mrr: 4.3,
    sinker_a: 0.73,
    sinker_b: 0.22,
    ra_C: 1.18,
    ra_alpha: 0.37,
    ra_beta: 0.23,
    rough_current_A: 42,
    rough_ton_us: 210,
    finish_current_A: 4,
    finish_ton_us: 6,
    recast_C: 0.44,
  },
  steel_M2: {
    name: "M2 High-Speed Steel (1.3343)",
    iso_group: "H",
    density_g_cm3: 8.16,
    melting_point_C: 1430,
    thermal_diffusivity_mm2_s: 8.2,
    sato_K: 1.30,
    sinker_C_mrr: 3.2,
    sinker_a: 0.68,
    sinker_b: 0.19,
    ra_C: 1.28,
    ra_alpha: 0.40,
    ra_beta: 0.26,
    rough_current_A: 28,
    rough_ton_us: 150,
    finish_current_A: 3,
    finish_ton_us: 4,
    recast_C: 0.50,
  },
  steel_M4: {
    name: "M4 High-Speed Steel",
    iso_group: "H",
    density_g_cm3: 8.10,
    melting_point_C: 1415,
    thermal_diffusivity_mm2_s: 7.8,
    sato_K: 1.25,
    sinker_C_mrr: 3.0,
    sinker_a: 0.67,
    sinker_b: 0.19,
    ra_C: 1.30,
    ra_alpha: 0.40,
    ra_beta: 0.26,
    rough_current_A: 26,
    rough_ton_us: 140,
    finish_current_A: 2,
    finish_ton_us: 4,
    recast_C: 0.51,
  },
  steel_M42: {
    name: "M42 Cobalt HSS (1.3247)",
    iso_group: "H",
    density_g_cm3: 7.98,
    melting_point_C: 1410,
    thermal_diffusivity_mm2_s: 7.5,
    sato_K: 1.20,
    sinker_C_mrr: 2.9,
    sinker_a: 0.67,
    sinker_b: 0.19,
    ra_C: 1.32,
    ra_alpha: 0.41,
    ra_beta: 0.26,
    rough_current_A: 25,
    rough_ton_us: 130,
    finish_current_A: 2,
    finish_ton_us: 4,
    recast_C: 0.52,
  },
  cast_iron: {
    name: "Gray Cast Iron (GG-25 / FC250)",
    iso_group: "K",
    density_g_cm3: 7.15,
    melting_point_C: 1200,
    thermal_diffusivity_mm2_s: 12.5,
    sato_K: 2.10,
    sinker_C_mrr: 5.0,
    sinker_a: 0.75,
    sinker_b: 0.23,
    ra_C: 1.10,
    ra_alpha: 0.36,
    ra_beta: 0.23,
    rough_current_A: 45,
    rough_ton_us: 220,
    finish_current_A: 5,
    finish_ton_us: 7,
    recast_C: 0.42,
  },
};

// ============================================================================
// ELECTRODE WEAR RATIO TABLE
// Copper-steel: 1-3% (roughing), 15-40% (finishing) [Machinery's Handbook Ch.32]
// Graphite-steel: 0.5-2% (roughing), 5-15% (finishing) [Charmilles App. Guide]
// ============================================================================
interface ElectrodeWearEntry {
  roughing: number; // ratio (e.g. 0.02 = 2%)
  semi_finishing: number;
  finishing: number;
}

const ELECTRODE_WEAR: Record<string, Record<string, ElectrodeWearEntry>> = {
  copper: {
    P: { roughing: 0.02, semi_finishing: 0.12, finishing: 0.28 },
    M: { roughing: 0.025, semi_finishing: 0.14, finishing: 0.32 },
    K: { roughing: 0.08, semi_finishing: 0.25, finishing: 0.55 },
    N: { roughing: 0.015, semi_finishing: 0.09, finishing: 0.22 },
    S: { roughing: 0.035, semi_finishing: 0.18, finishing: 0.40 },
    H: { roughing: 0.03, semi_finishing: 0.15, finishing: 0.35 },
  },
  graphite: {
    P: { roughing: 0.01, semi_finishing: 0.05, finishing: 0.10 },
    M: { roughing: 0.012, semi_finishing: 0.06, finishing: 0.12 },
    K: { roughing: 0.04, semi_finishing: 0.12, finishing: 0.25 },
    N: { roughing: 0.008, semi_finishing: 0.04, finishing: 0.09 },
    S: { roughing: 0.018, semi_finishing: 0.08, finishing: 0.15 },
    H: { roughing: 0.015, semi_finishing: 0.07, finishing: 0.13 },
  },
  tungsten_copper: {
    P: { roughing: 0.005, semi_finishing: 0.03, finishing: 0.08 },
    M: { roughing: 0.006, semi_finishing: 0.035, finishing: 0.09 },
    K: { roughing: 0.02, semi_finishing: 0.07, finishing: 0.18 },
    N: { roughing: 0.004, semi_finishing: 0.025, finishing: 0.07 },
    S: { roughing: 0.009, semi_finishing: 0.045, finishing: 0.11 },
    H: { roughing: 0.007, semi_finishing: 0.038, finishing: 0.095 },
  },
};

// ============================================================================
// WIRE PROPERTIES TABLE
// ============================================================================
interface WireProperties {
  material: string;
  tensile_strength_MPa: number;
  /** Recommended tension as fraction of break tension. */
  tension_fraction: number;
  /** Machinability factor relative to brass (1.0). */
  machinability_factor: number;
  /** Typical spool length [m]. */
  spool_length_m: number;
}

const WIRE_TYPES: Record<string, WireProperties> = {
  brass: {
    material: "CuZn37 Brass",
    tensile_strength_MPa: 900,
    tension_fraction: 0.6,
    machinability_factor: 1.0,
    spool_length_m: 8000,
  },
  coated: {
    material: "Brass core / Zinc coating",
    tensile_strength_MPa: 950,
    tension_fraction: 0.62,
    machinability_factor: 1.15,
    spool_length_m: 8000,
  },
  molybdenum: {
    material: "Pure Molybdenum",
    tensile_strength_MPa: 1800,
    tension_fraction: 0.55,
    machinability_factor: 0.75,
    spool_length_m: 3000,
  },
};

// ============================================================================
// INLINE PHYSICS HELPERS
// ============================================================================

/**
 * Discharge energy [J].
 * E = V_gap × I_peak × t_on
 * Reference: DiBitonto et al. (1989), Eq. 1
 */
function dischargeEnergy_J(
  V_gap_V: number,
  I_peak_A: number,
  t_on_us: number
): number {
  return V_gap_V * I_peak_A * (t_on_us * 1e-6);
}

/**
 * Sato wire EDM cutting speed [mm/min].
 * V_cut = (K × I_peak × t_on) / (h × D_wire)
 * Reference: Sato et al. (1985), Wire EDM speed prediction model.
 * K = material machinability constant; h = workpiece height [mm]; D_wire [mm]
 */
function satoWireCuttingSpeed_mm_min(
  K: number,
  I_peak_A: number,
  t_on_us: number,
  h_mm: number,
  D_wire_mm: number
): number {
  if (h_mm <= 0 || D_wire_mm <= 0) return 0;
  return (K * I_peak_A * t_on_us) / (h_mm * D_wire_mm);
}

/**
 * Sinker EDM MRR [mm³/min].
 * MRR = (C_mrr × I_peak^a × t_on^b) / ρ_workpiece
 * Reference: Empirical model; Koenig & Klocke (1997), "Fertigungsverfahren Bd.3"
 */
function sinkerMRR_mm3_min(
  C_mrr: number,
  I_peak_A: number,
  t_on_us: number,
  a: number,
  b: number,
  density_g_cm3: number
): number {
  const numerator = C_mrr * Math.pow(I_peak_A, a) * Math.pow(t_on_us, b);
  return numerator / density_g_cm3;
}

/**
 * Surface roughness Ra [um] — Klocke/Puertas&Luis power-law model.
 * Ra = C_ra * I_peak^alpha * t_on^beta
 * Reference: Puertas & Luis (2004); Klocke (2013) Table 8.3
 * Canonical coefficients: utils/klockeRa.ts MATERIAL_RA_MODELS (U-W100-03b)
 */
function surfaceRoughness_Ra(
  C_ra: number,
  I_peak_A: number,
  t_on_us: number,
  alpha: number,
  beta: number
): number {
  return C_ra * Math.pow(I_peak_A, alpha) * Math.pow(t_on_us, beta);
}

// Re-export shared models for cross-reference validation
const _sharedRaModels = _SHARED_RA_MODELS;

/**
 * Recast layer thickness [µm].
 * t_recast = C_recast × E_discharge^(1/3)
 * Reference: DiBitonto et al. (1989), Eq. 15 — thermal melting front model.
 * C_recast is material-dependent [µm/J^(1/3)].
 */
function recastLayerThickness_um(
  C_recast: number,
  E_discharge_J: number
): number {
  return C_recast * Math.pow(E_discharge_J, 1 / 3);
}

/**
 * HAZ depth [µm] — thermal penetration (Carslaw & Jaeger 1959).
 * HAZ = √(4 × α × t_on)
 * where α = thermal diffusivity [mm²/s], t_on in seconds.
 * Reference: Carslaw & Jaeger, "Conduction of Heat in Solids", 2nd ed. Ch.2
 */
function hazDepth_um(thermal_diffusivity_mm2_s: number, t_on_us: number): number {
  const t_on_s = t_on_us * 1e-6;
  return Math.sqrt(4 * thermal_diffusivity_mm2_s * t_on_s) * 1000; // µm
}

/**
 * Wire offset (half kerf per side) [mm].
 * gap_wire = D_wire/2 + spark_gap_per_side
 * spark_gap typically 0.01–0.05 mm per side at standard conditions.
 * Reference: Charmilles Technologies Application Guide, Sec. 4.2
 */
function wireOffset_mm(
  D_wire_mm: number,
  V_gap_V: number,
  I_peak_A: number
): number {
  // Empirical: spark_gap ≈ 0.004 + 0.0003 × V_gap + 0.0001 × I_peak [mm per side]
  const spark_gap = 0.004 + 0.0003 * V_gap_V + 0.0001 * I_peak_A;
  return D_wire_mm / 2 + spark_gap;
}

/**
 * Sinker spark gap [mm per side].
 * gap_sinker = 0.005 + 0.002 × V_gap + 0.001 × I_peak  (empirical, ≈0.005–0.1 mm)
 * Reference: Makino EDM Process Parameter Tables, Application Notes 2019
 */
function sinkerSparkGap_mm(V_gap_V: number, I_peak_A: number): number {
  return 0.005 + 0.0015 * (V_gap_V / 40) + 0.001 * (I_peak_A / 10);
}

/**
 * Box-Muller normal variate (mean=0, std=1).
 * Reference: Box & Muller (1958), "A Note on the Generation of Random Normal Deviates"
 */
function boxMullerNormal(): number {
  let u1 = Math.random();
  let u2 = Math.random();
  if (u1 < 1e-10) u1 = 1e-10;
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

/** Compute 95% confidence interval from a sample array. */
function ci95(samples: number[]): [number, number] {
  const sorted = [...samples].sort((a, b) => a - b);
  const n = sorted.length;
  const lo = sorted[Math.floor(0.025 * n)];
  const hi = sorted[Math.floor(0.975 * n)];
  return [lo, hi];
}

/** ISO group → best representative EDM material for fallback selection (U-ARCH3). */
const ISO_EDM_FALLBACK: Record<string, string> = {
  P: "steel_1045", M: "stainless_304", K: "carbide_WC",
  N: "aluminum_6061", S: "titanium_Ti6Al4V", H: "steel_D2",
};

/** Cached bridge resolution for enriched ISO group detection (U-ARCH3). */
let _edmResolvedMaterial: ResolvedMaterialContext | null = null;
/** Cached machine context from registry bridge (U-ARCH3). */
let _edmResolvedMachine: ResolvedMachineContext | null = null;

/**
 * Look up EDM material with 3-tier fallback (U-ARCH3):
 *   1. Exact key match in EDM_MATERIALS
 *   2. Fuzzy substring match across EDM_MATERIALS keys
 *   3. Bridge ISO group detection → best EDM material for that group
 *   4. steel_1045 last resort
 */
function getMaterial(materialKey: string): EDMMaterial {
  // Tier 1: exact key
  if (EDM_MATERIALS[materialKey]) return EDM_MATERIALS[materialKey];

  // Tier 2: fuzzy substring match (case-insensitive on both sides)
  const lower = materialKey.toLowerCase().replace(/[\s\-\/]/g, "_");
  for (const [k, v] of Object.entries(EDM_MATERIALS)) {
    const kl = k.toLowerCase();
    if (lower.includes(kl) || kl.includes(lower)) return v;
  }

  // Tier 3: use bridge ISO group for best EDM fallback
  // Fire async resolution for future calls (non-blocking)
  if (!_edmResolvedMaterial) {
    resolveMaterial({ material_name: materialKey })
      .then(rm => { _edmResolvedMaterial = rm; })
      .catch(() => { /* fall through to steel_1045 */ });
  }
  if (_edmResolvedMaterial) {
    const isoKey = ISO_EDM_FALLBACK[_edmResolvedMaterial.iso_group];
    if (isoKey && EDM_MATERIALS[isoKey]) {
      log.info(`[EDMProgramAssemblerEngine] Material '${materialKey}' resolved via registry as ISO ${_edmResolvedMaterial.iso_group} → ${isoKey}`);
      return EDM_MATERIALS[isoKey];
    }
  }

  // Tier 4: last resort
  log.warn(`[EDMProgramAssemblerEngine] Material '${materialKey}' not found — using steel_1045`);
  return EDM_MATERIALS["steel_1045"];
}

/** Format seconds as "Xh Ym Zs". */
function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.round(seconds % 60);
  if (h > 0) return `${h}h ${m}m ${s}s`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

/** Contour perimeter from wire profile points [mm]. */
function contourPerimeter_mm(contour: WireProfilePoint[]): number {
  let len = 0;
  for (let i = 1; i < contour.length; i++) {
    const dx = contour[i].x_mm - contour[i - 1].x_mm;
    const dy = contour[i].y_mm - contour[i - 1].y_mm;
    len += Math.sqrt(dx * dx + dy * dy);
  }
  return len;
}

// ============================================================================
// CONTROLLER DIALECT G-CODE HELPERS
// ============================================================================

interface DialectConfig {
  programStart: string;
  programEnd: string;
  autoThreadCode: string;
  wireOnCode: string;
  wireOffCode: string;
  flushOnCode: string;
  flushOffCode: string;
  /** Power setting format — takes (pass_num, I_peak, t_on, V_gap) */
  powerSetting: (pass: number, I: number, ton: number, Vg: number) => string;
  /** Tension setting — takes tension_N */
  tensionSetting: (tension_N: number) => string;
  /** Offset register format — takes pass number */
  offsetRegister: (pass: number) => string;
  comment: (text: string) => string;
}

const DIALECTS: Record<EDMController, DialectConfig> = {
  fanuc_wedm: {
    programStart: "%\n",
    programEnd: "%",
    autoThreadCode: "M06",
    wireOnCode: "M07",
    wireOffCode: "M07 P0",
    flushOnCode: "M08",
    flushOffCode: "M09",
    powerSetting: (pass, I, ton, Vg) =>
      `E${String(pass).padStart(3, "0")} (IP=${I}A TON=${ton}US VG=${Vg}V)`,
    tensionSetting: (t) => `M50 P${Math.round(t * 10)}`,
    offsetRegister: (pass) => `H${String(pass).padStart(3, "0")}`,
    comment: (text) => `(${text})`,
  },
  mitsubishi_wedm: {
    programStart: "%\n",
    programEnd: "M02",
    autoThreadCode: "M06",
    wireOnCode: "M07",
    wireOffCode: "M07 P0",
    flushOnCode: "M08",
    flushOffCode: "M09",
    powerSetting: (pass, I, ton, Vg) =>
      `C${String(pass * 10).padStart(3, "0")} E${String(Math.round(I)).padStart(4, "0")} (TON=${ton}US VG=${Vg}V)`,
    tensionSetting: (t) => `M50 T${Math.round(t)}`,
    offsetRegister: (pass) => `D${String(pass).padStart(3, "0")}`,
    comment: (text) => `; ${text}`,
  },
  sodick: {
    programStart: "$$EDM_START\n",
    programEnd: "$$EDM_END",
    autoThreadCode: "AT",
    wireOnCode: "WON",
    wireOffCode: "WOFF",
    flushOnCode: "FON",
    flushOffCode: "FOFF",
    powerSetting: (pass, I, ton, Vg) =>
      `T${String(pass * 5 + 1).padStart(3, "0")} ; IP=${I}A TON=${ton}US VG=${Vg}V`,
    tensionSetting: (t) => `WT${Math.round(t)}`,
    offsetRegister: (pass) => `F${String(pass).padStart(2, "0")}`,
    comment: (text) => `; ${text}`,
  },
  agiecharmilles: {
    programStart: "%\n",
    programEnd: "M02",
    autoThreadCode: "M06",
    wireOnCode: "M07",
    wireOffCode: "M07 P0",
    flushOnCode: "M08",
    flushOffCode: "M09",
    powerSetting: (pass, I, ton, Vg) =>
      `P${String(pass).padStart(3, "0")} (IP=${I}A ON=${ton} GAP=${Vg})`,
    tensionSetting: (t) => `M50 P${Math.round(t * 100)}`,
    offsetRegister: (pass) => `G${String(41 + pass - 1)} H${String(pass).padStart(2, "0")}`,
    comment: (text) => `(${text})`,
  },
  makino_edm: {
    programStart: "%\n",
    programEnd: "M30",
    autoThreadCode: "M06",
    wireOnCode: "M07",
    wireOffCode: "M07 P0",
    flushOnCode: "M08",
    flushOffCode: "M09",
    powerSetting: (pass, I, ton, Vg) =>
      `E${String(pass).padStart(3, "0")} (PEAK=${I}A PULSE=${ton}US VOLT=${Vg}V)`,
    tensionSetting: (t) => `M50 P${Math.round(t)}`,
    offsetRegister: (pass) => `H${String(pass).padStart(3, "0")}`,
    comment: (text) => `(${text})`,
  },
  generic_edm: {
    programStart: "%\n",
    programEnd: "M02",
    autoThreadCode: "M06",
    wireOnCode: "M07",
    wireOffCode: "M08 P0",
    flushOnCode: "M08",
    flushOffCode: "M09",
    powerSetting: (pass, I, ton, Vg) =>
      `(PASS ${pass}: I=${I}A T_ON=${ton}US V=${Vg}V)`,
    tensionSetting: (t) => `(TENSION ${t}N)`,
    offsetRegister: (pass) => `H${pass}`,
    comment: (text) => `(${text})`,
  },
};

// ============================================================================
// SINKER EDM ELECTRODE AUTO-DESIGN
// ============================================================================

/** Auto-generate electrode sequence from sinker part profile. */
function autoDesignElectrodes(
  profile: SinkerEDMPartProfile,
  mat: EDMMaterial
): SinkerElectrode[] {
  const elecMat = profile.electrode_material ?? "graphite";
  const isoGroup = mat.iso_group;
  const wear = ELECTRODE_WEAR[elecMat]?.[isoGroup] ?? ELECTRODE_WEAR["graphite"]["P"];

  const stages: Array<"roughing" | "semi_finishing" | "finishing"> = [
    "roughing",
    "semi_finishing",
    "finishing",
  ];

  return stages.map((stage, idx) => {
    const isRough = stage === "roughing";
    const isFinish = stage === "finishing";
    const I_peak = isRough
      ? mat.rough_current_A
      : isFinish
      ? mat.finish_current_A
      : (mat.rough_current_A + mat.finish_current_A) / 2;
    const t_on = isRough
      ? mat.rough_ton_us
      : isFinish
      ? mat.finish_ton_us
      : (mat.rough_ton_us + mat.finish_ton_us) / 2;
    const V_gap = isRough ? 65 : isFinish ? 30 : 48;

    // Electrode undersize accounts for spark gap
    const sparkGap = sinkerSparkGap_mm(V_gap, I_peak);
    const undersize = sparkGap;

    return {
      electrode_number: idx + 1,
      material: elecMat as "copper" | "graphite" | "tungsten_copper",
      stage,
      undersize_mm: undersize,
      feature_names: profile.features.map((f) => f.name),
      peak_current_A: I_peak,
      pulse_on_us: t_on,
      pulse_off_us: isRough ? t_on * 2 : t_on * 4,
      gap_voltage_V: V_gap,
    };
  });
}

// ============================================================================
// WIRE EDM PASS SETTINGS (per pass number)
// ============================================================================
interface WirePassSettings {
  I_peak_A: number;
  t_on_us: number;
  t_off_us: number;
  V_gap_V: number;
  offset_factor: number; // multiplied by base offset for skim passes
  feed_factor: number; // fraction of rough speed
  desc: string;
}

function getWirePassSettings(
  passNum: number,
  mat: EDMMaterial
): WirePassSettings {
  const configs: WirePassSettings[] = [
    {
      I_peak_A: mat.rough_current_A,
      t_on_us: mat.rough_ton_us,
      t_off_us: mat.rough_ton_us * 1.5,
      V_gap_V: 65,
      offset_factor: 1.0,
      feed_factor: 1.0,
      desc: "Roughing (1st cut)",
    },
    {
      I_peak_A: mat.finish_current_A * 3.5,
      t_on_us: mat.finish_ton_us * 3.0,
      t_off_us: mat.finish_ton_us * 8.0,
      V_gap_V: 45,
      offset_factor: 0.65,
      feed_factor: 0.45,
      desc: "1st Skim (semi-finish)",
    },
    {
      I_peak_A: mat.finish_current_A * 2.0,
      t_on_us: mat.finish_ton_us * 1.8,
      t_off_us: mat.finish_ton_us * 6.0,
      V_gap_V: 35,
      offset_factor: 0.35,
      feed_factor: 0.25,
      desc: "2nd Skim (finish)",
    },
    {
      I_peak_A: mat.finish_current_A,
      t_on_us: mat.finish_ton_us,
      t_off_us: mat.finish_ton_us * 5.0,
      V_gap_V: 28,
      offset_factor: 0.15,
      feed_factor: 0.15,
      desc: "3rd Skim (mirror finish)",
    },
  ];
  return configs[Math.min(passNum - 1, 3)];
}

// ============================================================================
// EDMProgramAssemblerEngine
// ============================================================================

export class EDMProgramAssemblerEngine {
  readonly engineName = "EDMProgramAssemblerEngine";

  /**
   * Run machine envelope guard against peak machining parameters.
   * Uses resolved machine context if available, otherwise conservative defaults.
   * Returns warning strings to append to program warnings.
   */
  private _checkEnvelope(opts: {
    feed_mm_min?: number;
    power_kW?: number;
    x_mm?: number;
    y_mm?: number;
    z_mm?: number;
  }): string[] {
    const envelope = _edmResolvedMachine
      ? machineEnvelopeGuardEngine.fromMachineData(_edmResolvedMachine)
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

  // ─── Wire EDM ─────────────────────────────────────────────────────────────

  /**
   * Assemble a complete Wire EDM program from a part profile.
   * Generates operations for all requested passes (rough + skim) and full G-code.
   */
  assembleWireEDM(input: WireEDMPartProfile): WireEDMProgram {
    log.info(`[EDMProgramAssemblerEngine] assembleWireEDM: ${input.part_name}`);
    const cpm = new PipelineCheckpointManager("edm-wire", input.runId);
    cpm.checkpoint("intake", 0, { part: input.part_name, material: input.material });

    const mat = getMaterial(input.material);

    // U-ARCH3: fire async machine resolution (non-blocking, enriches machine context)
    if (!_edmResolvedMachine) {
      resolveMachine({ brand: input.machine_brand, model: input.machine_model })
        .then(rm => { _edmResolvedMachine = rm; })
        .catch(() => {});
    }

    const controller = input.controller ?? "fanuc_wedm";
    const dialect = DIALECTS[controller];
    const progNum = input.program_number ?? 1;
    const D_wire = input.wire_diameter_mm ?? 0.25;
    const wireType = input.wire_type ?? "brass";
    const wireProp = WIRE_TYPES[wireType] ?? WIRE_TYPES["brass"];
    const numSkims = Math.min(input.num_skim_passes ?? 1, 3);
    const totalPasses = 1 + numSkims;
    const contourPerim = contourPerimeter_mm(input.contour);
    const warnings: string[] = [];

    // Validate
    if (input.thickness_mm <= 0)
      warnings.push("Workpiece thickness must be > 0");
    if (contourPerim < 1)
      warnings.push("Contour appears very short (<1mm) — check profile points");
    if (input.thickness_mm > 400)
      warnings.push(
        "Workpiece height > 400mm: consider special flushing strategy"
      );

    // Wire setup
    const wireSetup = this._buildWireSetup(
      wireProp,
      D_wire,
      contourPerim,
      totalPasses
    );

    // Build operations (one per pass)
    const operations: WireEDMOperation[] = [];

    // Optional start hole sequence
    if (input.start_hole) {
      operations.push(
        this._buildStartHoleOp(input.start_hole, dialect, mat)
      );
    }

    // Auto-thread
    operations.push(this._buildAutoThreadOp(dialect));

    // PIPELINE-VAR U-PV04: Ra-target-driven finish pass optimization
    // If target Ra is specified and tighter than the default finish pass would achieve,
    // reduce I_peak and t_on on the final pass to hit the target via Puertas & Luis (2004):
    //   Ra = C_ra * I_peak^alpha * t_on^beta → I_peak = (Ra / (C_ra * t_on^beta))^(1/alpha)
    let raTargetFinishOverride: WirePassSettings | null = null;
    if (input.target_Ra_um && input.target_Ra_um > 0) {
      const finalPassDefault = getWirePassSettings(totalPasses, mat);
      const defaultFinishRa = surfaceRoughness_Ra(
        mat.ra_C, finalPassDefault.I_peak_A, finalPassDefault.t_on_us, mat.ra_alpha, mat.ra_beta
      );
      if (input.target_Ra_um < defaultFinishRa * 0.9) {
        // Solve for I_peak: Ra = C_ra * I^alpha * t_on^beta
        // Reduce t_on proportionally, then solve for I_peak
        const t_on_target = finalPassDefault.t_on_us * (input.target_Ra_um / defaultFinishRa);
        const t_on_clamped = Math.max(t_on_target, mat.finish_ton_us * 0.3); // min 30% of finish t_on
        const I_target = Math.pow(
          input.target_Ra_um / (mat.ra_C * Math.pow(t_on_clamped, mat.ra_beta)),
          1 / mat.ra_alpha
        );
        const I_clamped = Math.max(I_target, mat.finish_current_A * 0.2); // min 20% of finish current
        raTargetFinishOverride = {
          ...finalPassDefault,
          I_peak_A: Math.round(I_clamped * 10) / 10,
          t_on_us: Math.round(t_on_clamped * 10) / 10,
          t_off_us: Math.round(t_on_clamped * 5 * 10) / 10,
          desc: `Ra-target finish (${input.target_Ra_um}µm)`,
        };
        warnings.push(
          `Finish pass tuned for Ra≤${input.target_Ra_um}µm: I=${raTargetFinishOverride.I_peak_A}A, t_on=${raTargetFinishOverride.t_on_us}µs (default was ${defaultFinishRa.toFixed(2)}µm)`
        );
      }
    }

    // Cutting passes
    for (let pass = 1; pass <= totalPasses; pass++) {
      const passSettings = (pass === totalPasses && raTargetFinishOverride)
        ? raTargetFinishOverride
        : getWirePassSettings(pass, mat);
      const op = this._buildWirePass(
        pass,
        passSettings,
        input,
        mat,
        D_wire,
        contourPerim,
        dialect,
        controller
      );
      operations.push(op);
    }

    // Aggregate cycle time
    const totalTime = operations.reduce((s, op) => s + op.estimated_time_s, 0);

    // Build G-code
    const programStr = `O${String(progNum).padStart(4, "0")}`;
    const headerComments = [
      `PROGRAM: ${programStr}`,
      `PART: ${input.part_name}`,
      `MATERIAL: ${mat.name} ${input.thickness_mm}MM`,
      `WIRE: ${wireProp.material} ${D_wire}MM`,
      `PASSES: ${totalPasses} (1 ROUGH + ${numSkims} SKIM)`,
      `CONTROLLER: ${controller.toUpperCase()}`,
      `DATE: ${new Date().toISOString().slice(0, 10)}`,
      `EST. CYCLE TIME: ${formatTime(totalTime)}`,
    ];

    const gcode = this._assembleWireGCode(
      programStr,
      headerComments,
      operations,
      dialect,
      input
    );

    // Uncertainty
    const roughSettings = getWirePassSettings(1, mat);
    const uncertainty = this.computeUncertainty({
      edm_type: "wire",
      I_peak_A: roughSettings.I_peak_A,
      t_on_us: roughSettings.t_on_us,
      V_gap_V: 65,
      material: input.material,
      target_Ra_um: input.target_Ra_um,
    });

    if (
      input.target_Ra_um &&
      uncertainty.p_exceed_Ra > 0.2
    ) {
      warnings.push(
        `Monte Carlo: ${(uncertainty.p_exceed_Ra * 100).toFixed(1)}% probability of exceeding Ra ${input.target_Ra_um}µm — add extra skim pass`
      );
    }

    // PIPELINE-VAR U-PV08: Safety validation for wire EDM
    const maxIpeak = mat.rough_current_A * 1.5;
    if (roughSettings.I_peak_A > maxIpeak) {
      warnings.push(`SAFETY BLOCK: I_peak ${roughSettings.I_peak_A}A exceeds max ${maxIpeak}A for ${mat.name}`);
    }
    const wirePropSafety = WIRE_TYPES[input.wire_type ?? "brass"] ?? WIRE_TYPES["brass"];
    const breakTension = wirePropSafety.tensile_strength_MPa * Math.PI * (D_wire / 2) ** 2;
    const wireTension = breakTension * wirePropSafety.tension_fraction;
    if (wireTension > breakTension * 0.85) {
      warnings.push(`SAFETY WARN: Wire tension ${wireTension.toFixed(1)}N at ${((wireTension / breakTension) * 100).toFixed(0)}% of break load`);
    }

    // Machine envelope guard — validate feed, power, and Z travel
    const peakFeed = operations.reduce((mx, op) => Math.max(mx, op.cutting_speed_mm_min?.value ?? 0), 0);
    const genPower = roughSettings.I_peak_A * 65 / 1000; // V_gap~65V × I_peak → kW
    warnings.push(...this._checkEnvelope({
      feed_mm_min: peakFeed,
      power_kW: genPower,
      z_mm: input.thickness_mm,
    }));

    return {
      program_number: programStr,
      header_comments: headerComments,
      part_profile: input,
      electrode_setup: wireSetup,
      operations,
      gcode,
      estimated_cycle_time_s: totalTime,
      total_wire_consumed_m: wireSetup.estimated_consumption_m,
      warnings,
      uncertainty,
    };
  }

  // ─── Sinker EDM ────────────────────────────────────────────────────────────

  /**
   * Assemble a complete Sinker EDM program from a part profile.
   * Auto-designs electrodes (rough/semi/finish), generates jump cycles,
   * orbiting, and optional C-axis indexing.
   */
  assembleSinkerEDM(input: SinkerEDMPartProfile): SinkerEDMProgram {
    // U-ARCH3: Fire async machine resolution (non-blocking)
    if (!_edmResolvedMachine) {
      resolveMachine({ brand: input.machine_brand, model: input.machine_model })
        .then(rm => { _edmResolvedMachine = rm; })
        .catch(() => {});
    }
    log.info(`[EDMProgramAssemblerEngine] assembleSinkerEDM: ${input.part_name}`);
    const cpm = new PipelineCheckpointManager("edm-sinker", input.runId);
    cpm.checkpoint("intake", 0, { part: input.part_name, material: input.material });

    const mat = getMaterial(input.material);
    const controller = input.controller ?? "generic_edm";
    const dialect = DIALECTS[controller];
    const progNum = input.program_number ?? 1;
    const jumpHeight = input.jump_height_mm ?? 3.0;
    const jumpFreq = input.jump_frequency_hz ?? 2.0;
    const warnings: string[] = [];

    // Auto-design electrodes
    const electrodes = autoDesignElectrodes(input, mat);

    // Build operations
    const operations: SinkerEDMOperation[] = [];

    for (const electrode of electrodes) {
      for (const feature of input.features) {
        // Main burn operation
        const op = this._buildSinkerOp(
          electrode,
          feature,
          mat,
          jumpHeight,
          jumpFreq,
          dialect,
          controller
        );
        operations.push(op);

        // Orbiting pass (if requested and this is finishing)
        if (
          (electrode.stage === "finishing" ||
            electrode.stage === "semi_finishing") &&
          feature.orbit_pattern
        ) {
          const orbitOp = this._buildOrbitingOp(
            electrode,
            feature,
            dialect
          );
          operations.push(orbitOp);
        }

        // C-axis index (if requested)
        if (feature.c_axis_angle_deg && electrode.stage === "finishing") {
          const cOp = this._buildCAxisOp(feature, dialect);
          operations.push(cOp);
        }
      }

      // Electrode change op between stages
      if (electrode.stage !== "finishing") {
        operations.push(this._buildElectrodeChangeOp(electrode, dialect));
      }
    }

    const totalTime = operations.reduce((s, op) => s + op.estimated_time_s, 0);

    const programStr = `O${String(progNum).padStart(4, "0")}`;
    const headerComments = [
      `PROGRAM: ${programStr}`,
      `PART: ${input.part_name}`,
      `MATERIAL: ${mat.name}`,
      `ELECTRODE: ${electrodes[0].material.toUpperCase()} (${electrodes.length} ELECTRODES)`,
      `FEATURES: ${input.features.length}`,
      `CONTROLLER: ${controller.toUpperCase()}`,
      `DATE: ${new Date().toISOString().slice(0, 10)}`,
      `EST. CYCLE TIME: ${formatTime(totalTime)}`,
    ];

    const gcode = this._assembleSinkerGCode(
      programStr,
      headerComments,
      operations,
      dialect
    );

    // Warnings
    for (const feat of input.features) {
      if (feat.depth_mm > 100)
        warnings.push(
          `Feature "${feat.name}" depth ${feat.depth_mm}mm > 100mm: use through-flush or vacuum flushing`
        );
      if (feat.area_mm2 > 5000)
        warnings.push(
          `Feature "${feat.name}" area ${feat.area_mm2}mm² is large: expect long rough time`
        );
    }

    const roughElec = electrodes.find((e) => e.stage === "roughing")!;
    const uncertainty = this.computeUncertainty({
      edm_type: "sinker",
      I_peak_A: roughElec.peak_current_A,
      t_on_us: roughElec.pulse_on_us,
      V_gap_V: roughElec.gap_voltage_V,
      material: input.material,
      target_Ra_um: input.target_Ra_um,
    });

    // Machine envelope guard — validate power and Z travel
    const sinkerPower = roughElec.peak_current_A * roughElec.gap_voltage_V / 1000;
    const maxDepth = input.features.reduce((mx, f) => Math.max(mx, f.depth_mm), 0);
    warnings.push(...this._checkEnvelope({
      power_kW: sinkerPower,
      z_mm: maxDepth,
    }));

    return {
      program_number: programStr,
      header_comments: headerComments,
      part_profile: input,
      electrodes,
      operations,
      gcode,
      estimated_cycle_time_s: totalTime,
      warnings,
      uncertainty,
    };
  }

  // ─── Micro EDM ─────────────────────────────────────────────────────────────

  /**
   * Assemble a Micro EDM program.
   * Supports micro-hole drilling (aspect ratio >20:1), micro-milling,
   * and WEDG (wire electro-discharge grinding for electrode preparation).
   */
  assembleMicroEDM(input: MicroEDMPartProfile): MicroEDMProgram {
    // U-ARCH3: Fire async machine resolution (non-blocking)
    if (!_edmResolvedMachine) {
      resolveMachine({ brand: input.machine_brand, model: input.machine_model })
        .then(rm => { _edmResolvedMachine = rm; })
        .catch(() => {});
    }
    log.info(`[EDMProgramAssemblerEngine] assembleMicroEDM: ${input.part_name}`);

    const mat = getMaterial(input.material);
    const controller = input.controller ?? "generic_edm";
    const dialect = DIALECTS[controller];
    const progNum = input.program_number ?? 1;
    const warnings: string[] = [];

    const D_um = input.diameter_um;
    const depth_um = input.depth_um;
    const D_mm = D_um / 1000;
    const depth_mm = depth_um / 1000;
    const aspectRatio = input.aspect_ratio ?? depth_um / D_um;

    if (aspectRatio > 30)
      warnings.push(
        `Aspect ratio ${aspectRatio.toFixed(1)} > 30: use ultrasonic-assisted EDM or peck drilling`
      );
    if (D_um < 10)
      warnings.push("Diameter < 10µm: micro-EDM tooling limit — verify electrode availability");

    // Micro EDM uses very low energy: I_peak 0.1–2A, t_on 0.1–5µs
    const I_peak = Math.max(0.1, Math.min(2.0, D_mm * 4));
    const t_on = Math.max(0.1, Math.min(5.0, D_mm * 8));
    const V_gap = 80; // Higher gap voltage for micro (Kunieda 2005)

    const E_disch = dischargeEnergy_J(V_gap, I_peak, t_on);
    const recast_um = recastLayerThickness_um(mat.recast_C, E_disch);
    const haz_um = hazDepth_um(mat.thermal_diffusivity_mm2_s, t_on);
    const Ra_um = surfaceRoughness_Ra(
      mat.ra_C,
      I_peak,
      t_on,
      mat.ra_alpha,
      mat.ra_beta
    );
    // Micro MRR is very low: scale down sinker formula
    const mrr_um3_min =
      sinkerMRR_mm3_min(
        mat.sinker_C_mrr,
        I_peak,
        t_on,
        mat.sinker_a,
        mat.sinker_b,
        mat.density_g_cm3
      ) *
      1e9 *
      0.01; // tiny fraction for micro

    // Volume of each feature
    const vol_um3 = (Math.PI / 4) * D_um * D_um * depth_um;
    const time_per_hole_s =
      mrr_um3_min > 0 ? (vol_um3 / mrr_um3_min) * 60 : 600;

    // Build G-code
    const lines: string[] = [];
    const D = dialect;
    const programStr = `O${String(progNum).padStart(4, "0")}`;
    lines.push(D.programStart.trimEnd());
    lines.push(programStr);
    for (const hc of [
      `MICRO EDM - ${input.part_name}`,
      `MATERIAL: ${mat.name}`,
      `FEATURE: ${input.feature_type} D=${D_um}µm DEPTH=${depth_um}µm`,
      `COUNT: ${input.count} HOLES`,
      `EST. TIME PER HOLE: ${formatTime(time_per_hole_s)}`,
    ]) {
      lines.push(D.comment(hc));
    }
    lines.push("G21 G90");
    lines.push("G92 X0. Y0. Z0.");

    const positions =
      input.positions ??
      Array.from({ length: input.count }, (_, i) => ({
        x_mm: i * (D_mm * 3),
        y_mm: 0,
      }));

    if (input.feature_type === "wedg_electrode_prep") {
      lines.push(D.comment("WEDG: Wire Electro-Discharge Grinding for electrode prep"));
      lines.push(D.comment("Rotate electrode blank against wire to achieve desired diameter"));
      lines.push("G01 Z2. F500");
      lines.push(D.powerSetting(1, I_peak, t_on, V_gap));
      lines.push(D.wireOnCode);
      lines.push("G01 Z-2. F10 (WEDG SLOW TRAVERSE)");
      lines.push(D.wireOffCode);
    } else {
      for (let i = 0; i < positions.length; i++) {
        const pos = positions[i];
        lines.push(D.comment(`HOLE ${i + 1} of ${positions.length}`));
        lines.push(
          `G00 X${pos.x_mm.toFixed(4)} Y${pos.y_mm.toFixed(4)}`
        );
        lines.push("G00 Z2.");
        lines.push(D.powerSetting(1, I_peak, t_on, V_gap));
        if (input.feature_type === "micro_hole") {
          // Peck drilling for high aspect ratio
          const peck_depth = Math.min(D_mm * 5, depth_mm / 3);
          let z_current = 0;
          let peck = 0;
          while (z_current < depth_mm) {
            peck++;
            const z_next = Math.min(z_current + peck_depth, depth_mm);
            lines.push(
              `G01 Z-${z_next.toFixed(4)} F${(I_peak * 0.5).toFixed(2)} (PECK ${peck})`
            );
            lines.push("G00 Z2. (RETRACT-FLUSH)");
            z_current = z_next;
          }
        } else {
          // micro_milling: scanning pattern
          const step = D_mm * 0.3;
          const passes_y = Math.ceil(D_mm / step);
          for (let py = 0; py < passes_y; py++) {
            const y_off = -D_mm / 2 + py * step;
            lines.push(
              `G01 X${(pos.x_mm - D_mm / 2).toFixed(4)} Y${(pos.y_mm + y_off).toFixed(4)} F20`
            );
            lines.push(
              `G01 X${(pos.x_mm + D_mm / 2).toFixed(4)} Y${(pos.y_mm + y_off).toFixed(4)} F20`
            );
          }
        }
        lines.push("G00 Z5. (SAFE RETRACT)");
      }
    }

    lines.push(D.programEnd);

    const totalTime = time_per_hole_s * input.count + 60 * input.count; // 60s setup per hole
    const uncertainty = this.computeUncertainty({
      edm_type: "micro",
      I_peak_A: I_peak,
      t_on_us: t_on,
      V_gap_V: V_gap,
      material: input.material,
    });

    // Machine envelope guard — validate power and XY travel for micro positions
    const microPower = I_peak * V_gap / 1000;
    const maxX = positions.reduce((mx, p) => Math.max(mx, Math.abs(p.x_mm)), 0);
    const maxY = positions.reduce((mx, p) => Math.max(mx, Math.abs(p.y_mm)), 0);
    warnings.push(...this._checkEnvelope({
      power_kW: microPower,
      x_mm: maxX,
      y_mm: maxY,
      z_mm: depth_mm,
    }));

    return {
      program_number: programStr,
      header_comments: [
        `MICRO EDM: ${input.part_name}`,
        `D=${D_um}µm, DEPTH=${depth_um}µm, COUNT=${input.count}`,
        `Ra≈${Ra_um.toFixed(2)}µm, RECAST≈${recast_um.toFixed(2)}µm, HAZ≈${haz_um.toFixed(2)}µm`,
      ],
      part_profile: input,
      gcode: lines.join("\n"),
      estimated_cycle_time_s: totalTime,
      warnings,
      uncertainty,
    };
  }

  // ─── Cycle Time Estimation ──────────────────────────────────────────────

  /**
   * Estimate detailed cycle time breakdown from an assembled program.
   * Works for both WireEDMProgram and SinkerEDMProgram.
   */
  estimateCycleTime(
    program: WireEDMProgram | SinkerEDMProgram
  ): CycleTimeEstimate {
    const ops = program.operations as Array<{
      name: string;
      estimated_time_s: number;
    }>;

    const perOp = ops.map((op) => ({
      name: op.name,
      time_s: op.estimated_time_s,
    }));

    const cutting_s = ops
      .filter(
        (o) =>
          !o.name.toLowerCase().includes("setup") &&
          !o.name.toLowerCase().includes("thread") &&
          !o.name.toLowerCase().includes("change")
      )
      .reduce((s, op) => s + op.estimated_time_s, 0);

    const total_s = ops.reduce((s, op) => s + op.estimated_time_s, 0);
    const non_cutting_s = total_s - cutting_s;

    return {
      total_s,
      cutting_s,
      non_cutting_s,
      per_operation: perOp,
      formatted: formatTime(total_s),
    };
  }

  // ─── Stochastic Uncertainty (Monte Carlo 500 samples) ──────────────────

  /**
   * Monte Carlo uncertainty analysis for EDM.
   * Varies I_peak (±5%), t_on (±3%), V_gap (±8%), wire tension (±5%).
   * Uses Box-Muller for normal variates (Box & Muller 1958).
   * Outputs 95% CIs on MRR, Ra, recast layer, electrode wear.
   */
  computeUncertainty(input: {
    edm_type: "wire" | "sinker" | "micro";
    I_peak_A: number;
    t_on_us: number;
    V_gap_V: number;
    material?: string;
    target_Ra_um?: number;
    wire_diameter_mm?: number;
    workpiece_thickness_mm?: number;
  }): EDMUncertainty {
    const N = 500;
    const mat = getMaterial(input.material ?? "steel_D2");
    const D_wire = input.wire_diameter_mm ?? 0.25;
    const h = input.workpiece_thickness_mm ?? 50;

    const mrr_samples: number[] = [];
    const ra_samples: number[] = [];
    const recast_samples: number[] = [];
    const wear_samples: number[] = [];

    for (let i = 0; i < N; i++) {
      // Perturb inputs (Box-Muller normal variates × coefficient of variation)
      const I = input.I_peak_A * (1 + 0.05 * boxMullerNormal()); // CV=5%
      const ton = input.t_on_us * (1 + 0.03 * boxMullerNormal()); // CV=3%
      const Vg = input.V_gap_V * (1 + 0.08 * boxMullerNormal()); // CV=8%

      const E = dischargeEnergy_J(Vg, I, ton);
      const recast = recastLayerThickness_um(mat.recast_C, E);
      const Ra = surfaceRoughness_Ra(mat.ra_C, I, ton, mat.ra_alpha, mat.ra_beta);

      let mrr: number;
      if (input.edm_type === "wire") {
        const v_cut = satoWireCuttingSpeed_mm_min(
          mat.sato_K,
          I,
          ton,
          h,
          D_wire
        );
        mrr = v_cut * D_wire * h; // mm²/min → proxy as mm³/min
      } else {
        mrr = sinkerMRR_mm3_min(
          mat.sinker_C_mrr,
          I,
          ton,
          mat.sinker_a,
          mat.sinker_b,
          mat.density_g_cm3
        );
      }

      // Electrode wear (log-normal scatter, CV 30%)
      const stage =
        I > mat.rough_current_A * 0.7 ? "roughing" : "finishing";
      const wearTable =
        ELECTRODE_WEAR["graphite"][mat.iso_group] ??
        ELECTRODE_WEAR["graphite"]["P"];
      const wearBase =
        stage === "roughing" ? wearTable.roughing : wearTable.finishing;
      const wear = wearBase * Math.exp(0.3 * boxMullerNormal() - 0.045); // log-normal

      mrr_samples.push(Math.max(0, mrr));
      ra_samples.push(Math.max(0, Ra));
      recast_samples.push(Math.max(0, recast));
      wear_samples.push(Math.max(0, wear));
    }

    const mrr_ci = ci95(mrr_samples);
    const ra_ci = ci95(ra_samples);
    const recast_ci = ci95(recast_samples);
    const wear_ci = ci95(wear_samples);

    // Probability of exceeding target Ra
    let p_exceed_Ra = 0;
    if (input.target_Ra_um) {
      p_exceed_Ra =
        ra_samples.filter((r) => r > input.target_Ra_um!).length / N;
    }

    // Dominant uncertainty: which CI is widest relative to mean
    const cv_mrr = (mrr_ci[1] - mrr_ci[0]) / (mrr_samples.reduce((a, b) => a + b, 0) / N || 1);
    const cv_ra = (ra_ci[1] - ra_ci[0]) / (ra_samples.reduce((a, b) => a + b, 0) / N || 1);
    const cv_recast = (recast_ci[1] - recast_ci[0]) / (recast_samples.reduce((a, b) => a + b, 0) / N || 1);
    const dominant_source =
      cv_ra >= cv_mrr && cv_ra >= cv_recast
        ? "gap_voltage (Ra sensitive)"
        : cv_recast >= cv_mrr
        ? "discharge_energy (recast layer)"
        : "peak_current (MRR)";

    // Short circuit probability (debris model)
    const p_short_circuit = 1 - Math.exp(-0.15 * (input.I_peak_A / 40));

    const overall_confidence =
      1 -
      0.4 * p_exceed_Ra -
      0.3 * p_short_circuit -
      0.3 * Math.min(1, cv_ra / 0.5);

    return {
      mrr_ci95: mrr_ci,
      ra_ci95: ra_ci,
      recast_ci95: recast_ci,
      wear_ci95: wear_ci,
      p_short_circuit,
      p_exceed_Ra,
      dominant_source,
      overall_confidence: Math.max(0, Math.min(1, overall_confidence)),
      n_samples: N,
    };
  }

  // ─── stats() ──────────────────────────────────────────────────────────────

  stats(): { methods: string[]; engineName: string } {
    return {
      engineName: this.engineName,
      methods: [
        "assembleWireEDM",
        "assembleSinkerEDM",
        "assembleMicroEDM",
        "estimateCycleTime",
        "computeUncertainty",
      ],
    };
  }

  // ============================================================================
  // PRIVATE HELPERS
  // ============================================================================

  private _buildWireSetup(
    wireProp: WireProperties,
    D_wire_mm: number,
    perim_mm: number,
    totalPasses: number
  ): WireElectrodeSetup {
    const break_tension = wireProp.tensile_strength_MPa * Math.PI * (D_wire_mm / 2) ** 2;
    const recommended_tension = break_tension * wireProp.tension_fraction;
    // Wire consumption: perimeter × total passes + 20% safety
    const consumption_m = (perim_mm * totalPasses * 1.2) / 1000;
    return {
      wire_type: wireProp.material,
      wire_diameter_mm: D_wire_mm,
      wire_material: wireProp.material,
      wire_tensile_strength_MPa: wireProp.tensile_strength_MPa,
      recommended_tension_N: Math.round(recommended_tension * 10) / 10,
      spool_length_m: wireProp.spool_length_m,
      estimated_consumption_m: Math.round(consumption_m * 10) / 10,
    };
  }

  private _buildStartHoleOp(
    startHole: { x_mm: number; y_mm: number; diameter_mm: number },
    dialect: DialectConfig,
    mat: EDMMaterial
  ): WireEDMOperation {
    const D = dialect;
    const lines: string[] = [
      D.comment(`START HOLE D=${startHole.diameter_mm}MM`),
      `G00 X${startHole.x_mm.toFixed(4)} Y${startHole.y_mm.toFixed(4)}`,
      D.comment("Drill start hole (separate operation — EDM or conventional drill)"),
      D.comment(`Hole diam: ${startHole.diameter_mm}mm at X${startHole.x_mm} Y${startHole.y_mm}`),
    ];
    return {
      type: "start_hole",
      name: "Start Hole Preparation",
      pass_number: 0,
      power_setting: D.powerSetting(0, 2, 10, 60),
      wire_tension_N: 0,
      flushing_pressure_bar: 0,
      cutting_speed_mm_min: { value: 0, unit: "mm/min" },
      wire_offset_mm: 0,
      predicted_Ra_um: { value: 0, unit: "µm" },
      recast_layer_um: { value: 0, unit: "µm" },
      haz_um: { value: 0, unit: "µm" },
      gcode_lines: lines,
      estimated_time_s: 120,
    };
  }

  private _buildAutoThreadOp(dialect: DialectConfig): WireEDMOperation {
    const D = dialect;
    const lines: string[] = [
      D.comment("AUTO-THREAD WIRE"),
      D.autoThreadCode,
      D.comment("Wire threading complete — check thread confirmation"),
    ];
    return {
      type: "auto_thread",
      name: "Auto-Thread Wire",
      pass_number: 0,
      power_setting: "",
      wire_tension_N: 0,
      flushing_pressure_bar: 0,
      cutting_speed_mm_min: { value: 0, unit: "mm/min" },
      wire_offset_mm: 0,
      predicted_Ra_um: { value: 0, unit: "µm" },
      recast_layer_um: { value: 0, unit: "µm" },
      haz_um: { value: 0, unit: "µm" },
      gcode_lines: lines,
      estimated_time_s: 45,
    };
  }

  private _buildWirePass(
    passNum: number,
    ps: WirePassSettings,
    input: WireEDMPartProfile,
    mat: EDMMaterial,
    D_wire_mm: number,
    perim_mm: number,
    dialect: DialectConfig,
    controller: EDMController
  ): WireEDMOperation {
    const D = dialect;
    const { I_peak_A: I, t_on_us: ton, V_gap_V: Vg, t_off_us: toff } = ps;
    const wireProp = WIRE_TYPES[input.wire_type ?? "brass"] ?? WIRE_TYPES["brass"];

    // Physics calculations
    const v_cut = satoWireCuttingSpeed_mm_min(
      mat.sato_K * wireProp.machinability_factor * ps.feed_factor,
      I,
      ton,
      input.thickness_mm,
      D_wire_mm
    );
    const E_disch = dischargeEnergy_J(Vg, I, ton);
    const Ra_um = surfaceRoughness_Ra(mat.ra_C, I, ton, mat.ra_alpha, mat.ra_beta);
    const recast_um = recastLayerThickness_um(mat.recast_C, E_disch);
    const haz_um_val = hazDepth_um(mat.thermal_diffusivity_mm2_s, ton);
    const offset_mm = wireOffset_mm(D_wire_mm, Vg, I) * ps.offset_factor;
    const break_tension =
      wireProp.tensile_strength_MPa * Math.PI * (D_wire_mm / 2) ** 2;
    const tension_N = break_tension * wireProp.tension_fraction;
    const flushing_bar = passNum === 1 ? 12 : 6;

    // Estimated time for this pass
    const time_s = v_cut > 0 ? (perim_mm / v_cut) * 60 : 3600;

    // G-code generation
    const lines: string[] = [];
    const passType =
      passNum === 1
        ? "ROUGHING CUT"
        : `SKIM PASS ${passNum - 1} (${ps.desc})`;
    lines.push(D.comment(`PASS ${passNum}: ${passType}`));
    lines.push(D.comment(`I=${I}A  TON=${ton}µs  TOFF=${toff.toFixed(1)}µs  VG=${Vg}V`));
    lines.push(
      D.comment(
        `V_CUT=${v_cut.toFixed(2)}mm/min  Ra≈${Ra_um.toFixed(2)}µm  RECAST≈${recast_um.toFixed(2)}µm`
      )
    );
    lines.push(D.powerSetting(passNum, I, ton, Vg));
    lines.push(D.tensionSetting(Math.round(tension_N * 10) / 10));
    lines.push(`(FLUSH PRESSURE: ${flushing_bar} BAR)`);
    lines.push(D.flushOnCode);
    lines.push(D.wireOnCode);

    // Offset register
    lines.push(
      `${D.offsetRegister(passNum)} (WIRE OFFSET: ${offset_mm.toFixed(4)}MM)`
    );

    // Set WCS
    lines.push("G21 (METRIC)");
    lines.push("G90 (ABSOLUTE)");

    // Navigate to start of contour
    const startPt = input.contour[0];
    lines.push(`G00 X${startPt.x_mm.toFixed(4)} Y${startPt.y_mm.toFixed(4)}`);

    // Contour path
    const isTaper = (input.taper_segments && input.taper_segments.length > 0) ||
      (input.taper_angle_deg && input.taper_angle_deg > 0);
    for (let i = 1; i < input.contour.length; i++) {
      const pt = input.contour[i];
      const prev = input.contour[i - 1];
      if (pt.arc_radius_mm && pt.arc_radius_mm > 0) {
        // Arc interpolation
        const arcDir = pt.arc_dir === "CCW" ? "G03" : "G02";
        // Arc center as I/J offset from previous point
        const dx = pt.x_mm - prev.x_mm;
        const dy = pt.y_mm - prev.y_mm;
        const chord = Math.sqrt(dx * dx + dy * dy);
        const sagitta = pt.arc_radius_mm - Math.sqrt(pt.arc_radius_mm ** 2 - (chord / 2) ** 2);
        const nx = -dy / chord; // normal
        const ny = dx / chord;
        const cx = prev.x_mm + dx / 2 - nx * (pt.arc_radius_mm - sagitta);
        const cy = prev.y_mm + dy / 2 - ny * (pt.arc_radius_mm - sagitta);
        lines.push(
          `${arcDir} X${pt.x_mm.toFixed(4)} Y${pt.y_mm.toFixed(4)} ` +
            `I${(cx - prev.x_mm).toFixed(4)} J${(cy - prev.y_mm).toFixed(4)} ` +
            `F${v_cut.toFixed(2)}`
        );
      } else if (isTaper && input.taper_segments && input.taper_segments[i - 1]) {
        // 4-axis taper move: XY + UV
        const ts = input.taper_segments[i - 1];
        lines.push(
          `G01 X${pt.x_mm.toFixed(4)} Y${pt.y_mm.toFixed(4)} ` +
            `U${ts.uv.u_mm.toFixed(4)} V${ts.uv.v_mm.toFixed(4)} ` +
            `F${v_cut.toFixed(2)}`
        );
      } else if (input.taper_angle_deg && input.taper_angle_deg > 0) {
        // Uniform taper: UV = XY offset by taper × thickness
        const taper_offset_factor =
          Math.tan((input.taper_angle_deg * Math.PI) / 180) *
          input.thickness_mm;
        lines.push(
          `G01 X${pt.x_mm.toFixed(4)} Y${pt.y_mm.toFixed(4)} ` +
            `U${(pt.x_mm + taper_offset_factor).toFixed(4)} ` +
            `V${(pt.y_mm + taper_offset_factor).toFixed(4)} ` +
            `F${v_cut.toFixed(2)}`
        );
      } else {
        lines.push(
          `G01 X${pt.x_mm.toFixed(4)} Y${pt.y_mm.toFixed(4)} F${v_cut.toFixed(2)}`
        );
      }

      // Corner slow-down strategy
      if (
        input.corner_strategy === "slow_down" &&
        i < input.contour.length - 1
      ) {
        const next = input.contour[i + 1];
        const v1x = pt.x_mm - prev.x_mm;
        const v1y = pt.y_mm - prev.y_mm;
        const v2x = next.x_mm - pt.x_mm;
        const v2y = next.y_mm - pt.y_mm;
        const dot =
          (v1x * v2x + v1y * v2y) /
          (Math.sqrt(v1x * v1x + v1y * v1y) * Math.sqrt(v2x * v2x + v2y * v2y) + 1e-10);
        const angle_deg = (Math.acos(Math.max(-1, Math.min(1, dot))) * 180) / Math.PI;
        if (angle_deg > 45) {
          lines.push(
            D.comment(`CORNER ${angle_deg.toFixed(0)}° — speed reduced by 40%`)
          );
          lines.push(
            `G01 X${pt.x_mm.toFixed(4)} Y${pt.y_mm.toFixed(4)} F${(v_cut * 0.6).toFixed(2)}`
          );
        }
      }
    }

    // Close contour back to start
    lines.push(
      `G01 X${startPt.x_mm.toFixed(4)} Y${startPt.y_mm.toFixed(4)} F${v_cut.toFixed(2)}`
    );

    lines.push(D.wireOffCode);
    lines.push(D.flushOffCode);
    lines.push(D.comment(`PASS ${passNum} COMPLETE`));

    const opType: WireEDMOperation["type"] =
      passNum === 1
        ? "rough_cut"
        : passNum === 2
        ? "skim_1"
        : passNum === 3
        ? "skim_2"
        : "skim_3";

    return {
      type: opType,
      name: `Pass ${passNum}: ${ps.desc}`,
      pass_number: passNum,
      power_setting: D.powerSetting(passNum, I, ton, Vg),
      wire_tension_N: Math.round(tension_N * 10) / 10,
      flushing_pressure_bar: flushing_bar,
      cutting_speed_mm_min: {
        value: Math.round(v_cut * 100) / 100,
        unit: "mm/min",
        formula: "V_cut = (K × I_peak × t_on) / (h × D_wire) [Sato 1985]",
        confidence: 0.85,
      },
      wire_offset_mm: Math.round(offset_mm * 10000) / 10000,
      predicted_Ra_um: {
        value: Math.round(Ra_um * 100) / 100,
        unit: "µm",
        formula: "Ra = C_ra × I_peak^α × t_on^β [Puertas & Luis 2004]",
        confidence: 0.80,
      },
      recast_layer_um: {
        value: Math.round(recast_um * 100) / 100,
        unit: "µm",
        formula: "t_recast = C × E_discharge^(1/3) [DiBitonto 1989]",
        confidence: 0.75,
      },
      haz_um: {
        value: Math.round(haz_um_val * 100) / 100,
        unit: "µm",
        formula: "HAZ = √(4 × α × t_on) [Carslaw & Jaeger 1959]",
        confidence: 0.78,
      },
      gcode_lines: lines,
      estimated_time_s: Math.round(time_s),
    };
  }

  private _buildSinkerOp(
    electrode: SinkerElectrode,
    feature: SinkerCavityFeature,
    mat: EDMMaterial,
    jumpHeight_mm: number,
    jumpFreq_hz: number,
    dialect: DialectConfig,
    controller: EDMController
  ): SinkerEDMOperation {
    const D = dialect;
    const { peak_current_A: I, pulse_on_us: ton, gap_voltage_V: Vg } = electrode;
    const elecMat = electrode.material;
    const isoGroup = mat.iso_group;
    const wearEntry =
      ELECTRODE_WEAR[elecMat]?.[isoGroup] ?? ELECTRODE_WEAR["graphite"]["P"];
    const wear =
      electrode.stage === "roughing"
        ? wearEntry.roughing
        : electrode.stage === "semi_finishing"
        ? wearEntry.semi_finishing
        : wearEntry.finishing;

    const mrr = sinkerMRR_mm3_min(
      mat.sinker_C_mrr,
      I,
      ton,
      mat.sinker_a,
      mat.sinker_b,
      mat.density_g_cm3
    );
    const E_disch = dischargeEnergy_J(Vg, I, ton);
    const Ra = surfaceRoughness_Ra(mat.ra_C, I, ton, mat.ra_alpha, mat.ra_beta);
    const recast = recastLayerThickness_um(mat.recast_C, E_disch);
    const haz = hazDepth_um(mat.thermal_diffusivity_mm2_s, ton);
    const sparkGap = sinkerSparkGap_mm(Vg, I);

    // Burn volume (reduce by remaining stock fraction per stage)
    const volFraction =
      electrode.stage === "roughing"
        ? 0.75
        : electrode.stage === "semi_finishing"
        ? 0.20
        : 0.05;
    const vol_mm3 = feature.volume_mm3 * volFraction;
    const burn_time_s = mrr > 0 ? (vol_mm3 / mrr) * 60 : 1800;

    // Jump cycle adds overhead: jump_freq × jump_height / descent_speed
    const jumpOverhead_s = jumpFreq_hz > 0
      ? (jumpHeight_mm / 500) * burn_time_s * 0.15
      : 0;

    const totalTime_s = burn_time_s + jumpOverhead_s;

    // G-code
    const lines: string[] = [];
    lines.push(D.comment(`SINKER EDM: ${feature.name} — ${electrode.stage.toUpperCase()}`));
    lines.push(D.comment(`ELECTRODE ${electrode.electrode_number}: ${elecMat.toUpperCase()} — GAP ${electrode.undersize_mm.toFixed(3)}MM U/S`));
    lines.push(D.comment(`MRR=${mrr.toFixed(2)}mm³/min  Ra≈${Ra.toFixed(2)}µm  WEAR=${(wear * 100).toFixed(1)}%`));
    lines.push(D.powerSetting(electrode.electrode_number, I, ton, Vg));
    lines.push("G21 G90");
    lines.push(`G00 X${feature.x_mm.toFixed(4)} Y${feature.y_mm.toFixed(4)}`);
    lines.push("G00 Z5. (APPROACH SAFE HEIGHT)");
    lines.push(`(JUMP HEIGHT: ${jumpHeight_mm}MM  FREQ: ${jumpFreq_hz}HZ)`);

    // Z descent with jump cycles
    const depth_total = feature.depth_mm;
    const increments = Math.max(1, Math.round(depth_total / Math.max(0.5, jumpHeight_mm)));
    const dz = depth_total / increments;
    for (let k = 1; k <= increments; k++) {
      const z_target = -(k * dz);
      lines.push(`G01 Z${z_target.toFixed(4)} F${(I * 0.3).toFixed(1)} (INCREMENT ${k}/${increments})`);
      if (k < increments) {
        lines.push(`G00 Z${(z_target + jumpHeight_mm).toFixed(4)} (JUMP-RETRACT)`);
      }
    }
    lines.push("G00 Z5. (RETRACT — OPERATION COMPLETE)");

    const opType: SinkerEDMOperation["type"] =
      electrode.stage === "roughing"
        ? "roughing"
        : electrode.stage === "semi_finishing"
        ? "semi_finishing"
        : "finishing";

    return {
      type: opType,
      name: `${electrode.stage} — ${feature.name} (Electrode ${electrode.electrode_number})`,
      electrode,
      feature_name: feature.name,
      mrr_mm3_min: {
        value: Math.round(mrr * 100) / 100,
        unit: "mm³/min",
        formula:
          "MRR = (C_mrr × I^a × t_on^b) / ρ [Koenig & Klocke 1997]",
        confidence: 0.82,
      },
      electrode_wear_ratio: {
        value: Math.round(wear * 10000) / 10000,
        unit: "ratio",
        formula: "θ = V_electrode / V_workpiece [Machinery's Handbook Ch.32]",
        confidence: 0.75,
      },
      spark_gap_mm: {
        value: Math.round(sparkGap * 10000) / 10000,
        unit: "mm",
        formula: "gap ≈ f(V_gap, I_peak) [Makino EDM App Notes]",
        confidence: 0.78,
      },
      predicted_Ra_um: {
        value: Math.round(Ra * 100) / 100,
        unit: "µm",
        formula: "Ra = C_ra × I^α × t_on^β [Puertas & Luis 2004]",
        confidence: 0.80,
      },
      recast_layer_um: {
        value: Math.round(recast * 100) / 100,
        unit: "µm",
        formula: "t_recast = C × E^(1/3) [DiBitonto 1989]",
        confidence: 0.75,
      },
      haz_um: {
        value: Math.round(haz * 100) / 100,
        unit: "µm",
        formula: "HAZ = √(4 × α × t_on) [Carslaw & Jaeger 1959]",
        confidence: 0.78,
      },
      gcode_lines: lines,
      estimated_time_s: Math.round(totalTime_s),
    };
  }

  private _buildOrbitingOp(
    electrode: SinkerElectrode,
    feature: SinkerCavityFeature,
    dialect: DialectConfig
  ): SinkerEDMOperation {
    const D = dialect;
    const I = electrode.peak_current_A * 0.5; // Lower energy for orbiting
    const ton = electrode.pulse_on_us * 0.6;
    const Vg = electrode.gap_voltage_V * 0.8;
    const orbitR = feature.orbit_radius_mm ?? 0.05;
    const orbitTime_s = 120; // 2 min nominal

    const lines: string[] = [
      D.comment(`ORBITING: ${feature.orbit_pattern?.toUpperCase()} R=${orbitR}MM`),
      D.powerSetting(electrode.electrode_number + 10, I, ton, Vg),
    ];

    if (feature.orbit_pattern === "circular") {
      lines.push(
        `G02 X${(feature.x_mm + orbitR).toFixed(4)} Y${feature.y_mm.toFixed(4)} I${orbitR.toFixed(4)} J0. F${(I * 0.2).toFixed(1)} (CIRCULAR ORBIT)`
      );
      lines.push(
        `G02 X${(feature.x_mm + orbitR).toFixed(4)} Y${feature.y_mm.toFixed(4)} I${(-orbitR).toFixed(4)} J0. F${(I * 0.2).toFixed(1)} (RETURN)`
      );
    } else if (feature.orbit_pattern === "square") {
      const r = orbitR;
      lines.push(`G01 X${(feature.x_mm + r).toFixed(4)} Y${(feature.y_mm + r).toFixed(4)} F${(I * 0.2).toFixed(1)}`);
      lines.push(`G01 X${(feature.x_mm - r).toFixed(4)} Y${(feature.y_mm + r).toFixed(4)}`);
      lines.push(`G01 X${(feature.x_mm - r).toFixed(4)} Y${(feature.y_mm - r).toFixed(4)}`);
      lines.push(`G01 X${(feature.x_mm + r).toFixed(4)} Y${(feature.y_mm - r).toFixed(4)}`);
      lines.push(`G01 X${feature.x_mm.toFixed(4)} Y${feature.y_mm.toFixed(4)} (RETURN CENTER)`);
    } else {
      lines.push(D.comment("CUSTOM ORBIT — path programmed separately"));
    }
    lines.push("G00 Z5.");

    return {
      type: "orbiting",
      name: `Orbiting — ${feature.name}`,
      electrode,
      feature_name: feature.name,
      mrr_mm3_min: { value: 0, unit: "mm³/min" },
      electrode_wear_ratio: { value: 0, unit: "ratio" },
      spark_gap_mm: { value: 0, unit: "mm" },
      predicted_Ra_um: { value: 0, unit: "µm" },
      recast_layer_um: { value: 0, unit: "µm" },
      haz_um: { value: 0, unit: "µm" },
      gcode_lines: lines,
      estimated_time_s: orbitTime_s,
    };
  }

  private _buildCAxisOp(
    feature: SinkerCavityFeature,
    dialect: DialectConfig
  ): SinkerEDMOperation {
    const D = dialect;
    const angle = feature.c_axis_angle_deg ?? 90;
    const lines: string[] = [
      D.comment(`C-AXIS INDEX: ${angle}° for ${feature.name}`),
      `G91 (INCREMENTAL MODE)`,
      `G00 C${angle.toFixed(2)} (ELECTRODE ROTATION)`,
      `G90 (BACK TO ABSOLUTE)`,
    ];

    const stubElectrode: SinkerElectrode = {
      electrode_number: 0,
      material: "graphite",
      stage: "finishing",
      undersize_mm: 0,
      feature_names: [feature.name],
      peak_current_A: 0,
      pulse_on_us: 0,
      pulse_off_us: 0,
      gap_voltage_V: 0,
    };

    return {
      type: "c_axis_index",
      name: `C-Axis Index ${angle}° — ${feature.name}`,
      electrode: stubElectrode,
      feature_name: feature.name,
      mrr_mm3_min: { value: 0, unit: "mm³/min" },
      electrode_wear_ratio: { value: 0, unit: "ratio" },
      spark_gap_mm: { value: 0, unit: "mm" },
      predicted_Ra_um: { value: 0, unit: "µm" },
      recast_layer_um: { value: 0, unit: "µm" },
      haz_um: { value: 0, unit: "µm" },
      gcode_lines: lines,
      estimated_time_s: 30,
    };
  }

  private _buildElectrodeChangeOp(
    electrode: SinkerElectrode,
    dialect: DialectConfig
  ): SinkerEDMOperation {
    const D = dialect;
    const nextStage =
      electrode.stage === "roughing" ? "semi-finishing" : "finishing";
    const lines: string[] = [
      D.comment(`ELECTRODE CHANGE: ${electrode.stage.toUpperCase()} → ${nextStage.toUpperCase()}`),
      `G00 Z100. (SAFE RETRACT FOR ELECTRODE CHANGE)`,
      `G00 X0. Y0. (RETURN TO HOME)`,
      D.comment(`Install electrode #${electrode.electrode_number + 1} (${nextStage})`),
      `M00 (PROGRAM STOP — CHANGE ELECTRODE)`,
      D.comment("Verify electrode position and touch-off before resuming"),
    ];

    const stubElectrode: SinkerElectrode = {
      ...electrode,
      electrode_number: electrode.electrode_number + 1,
      stage:
        electrode.stage === "roughing"
          ? "semi_finishing"
          : "finishing",
    };

    return {
      type: "electrode_change",
      name: `Electrode Change → ${nextStage}`,
      electrode: stubElectrode,
      feature_name: "ALL",
      mrr_mm3_min: { value: 0, unit: "mm³/min" },
      electrode_wear_ratio: { value: 0, unit: "ratio" },
      spark_gap_mm: { value: 0, unit: "mm" },
      predicted_Ra_um: { value: 0, unit: "µm" },
      recast_layer_um: { value: 0, unit: "µm" },
      haz_um: { value: 0, unit: "µm" },
      gcode_lines: lines,
      estimated_time_s: 300, // 5 min for electrode change
    };
  }

  private _assembleWireGCode(
    programStr: string,
    headerComments: string[],
    operations: WireEDMOperation[],
    dialect: DialectConfig,
    input: WireEDMPartProfile
  ): string {
    const D = dialect;
    const lines: string[] = [];
    lines.push(D.programStart.trimEnd());
    lines.push(programStr);
    for (const hc of headerComments) lines.push(D.comment(hc));
    lines.push("");
    lines.push("G21 (METRIC MODE)");
    lines.push("G90 (ABSOLUTE COORDINATES)");
    lines.push("G92 X0. Y0. (SET WORK COORDINATE ORIGIN)");
    lines.push("");
    for (const op of operations) {
      lines.push(...op.gcode_lines);
      lines.push("");
    }
    lines.push(D.comment("PROGRAM END"));
    lines.push(D.programEnd);
    return lines.join("\n");
  }

  private _assembleSinkerGCode(
    programStr: string,
    headerComments: string[],
    operations: SinkerEDMOperation[],
    dialect: DialectConfig
  ): string {
    const D = dialect;
    const lines: string[] = [];
    lines.push(D.programStart.trimEnd());
    lines.push(programStr);
    for (const hc of headerComments) lines.push(D.comment(hc));
    lines.push("");
    lines.push("G21 (METRIC MODE)");
    lines.push("G90 (ABSOLUTE)");
    lines.push("G92 X0. Y0. Z0. (WORK ZERO)");
    lines.push("");
    for (const op of operations) {
      lines.push(...op.gcode_lines);
      lines.push("");
    }
    lines.push(D.comment("SINKER EDM PROGRAM COMPLETE"));
    lines.push(D.programEnd);
    return lines.join("\n");
  }
}
