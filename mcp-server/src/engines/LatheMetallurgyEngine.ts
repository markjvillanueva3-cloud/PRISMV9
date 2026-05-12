/**
 * LatheMetallurgyEngine — Comprehensive Metallurgical Phenomena in Lathe Cutting
 *
 * Models:
 *   1. Material Microstructure — grain size, phase composition, carbide distribution
 *   2. Work Hardening — strain hardening, depth prediction, accumulated strain
 *   3. Phase Transformations — martensite formation, white layer, austenitization
 *   4. Surface Integrity — residual stress, microhardness, fatigue impact
 *   5. Tool-Material Interactions — chemical affinity, diffusion wear, BUE
 *   6. Material-Specific Behavior — tool steels, stainless, superalloys, aluminum
 *
 * References:
 *   - Trent & Wright (2000) "Metal Cutting" 4th ed. — Chapter 6-8
 *   - Shaw (2005) "Metal Cutting Principles" 2nd ed. — Chapter 15-17
 *   - Astakhov (2006) "Tribology of Metal Cutting" — Tool-work interactions
 *   - Hosseini & Kishawy (2014) "Machining of Titanium Alloys" — Phase transformations
 *   - Umbrello et al. (2004) "White Layer Formation" — Martensite prediction
 *   - Brinksmeier et al. (1982) "Residual Stresses in Machining"
 *   - Oxley (1989) "Mechanics of Machining" — Slip line field theory
 *   - ASM Handbook Vol. 16 "Machining" — Material-specific data
 *
 * @module engines/LatheMetallurgyEngine
 */

import { log } from "../utils/Logger.js";
import {
  CANONICAL_MATERIAL_DB,
  CANONICAL_KIENZLE,
  type ISOGroup,
} from "../physics/constants.js";

// ============================================================================
// CONSTANTS
// ============================================================================

const R_GAS = 8.314; // J/(mol·K)
const BOLTZMANN = 1.380649e-23; // J/K

/** Critical temperatures for steel phase transformations */
const STEEL_CRITICAL_TEMPS = {
  /** Ac1 — Start of austenite formation on heating */
  Ac1_base_C: 727,
  /** Ac3 — Complete austenitization (hypoeutectoid) */
  Ac3_base_C: 850,
  /** Ms — Martensite start temperature */
  Ms_base_C: 350,
  /** Mf — Martensite finish temperature */
  Mf_base_C: 150,
};

/** Hall-Petch constants for grain size strengthening */
const HALL_PETCH = {
  /** Friction stress σ0 [MPa] */
  sigma_0_MPa: 70,
  /** Hall-Petch slope ky [MPa·mm^0.5] */
  ky_MPa_mm05: 0.74,
};

/** Strain hardening exponents by material class */
const STRAIN_HARDENING_N: Record<string, number> = {
  low_carbon_steel: 0.22,
  medium_carbon_steel: 0.18,
  high_carbon_steel: 0.15,
  alloy_steel_annealed: 0.20,
  alloy_steel_qt: 0.12,
  stainless_304: 0.45,
  stainless_316: 0.42,
  stainless_17_4ph: 0.08,
  aluminum_6061: 0.12,
  aluminum_7075: 0.10,
  titanium_ti6al4v: 0.05,
  inconel_718: 0.35,
  tool_steel_d2: 0.08,
  tool_steel_m2: 0.10,
  tool_steel_s7: 0.14,
  tool_steel_a2: 0.12,
  cast_iron_grey: 0.0, // brittle, no work hardening
  cast_iron_nodular: 0.15,
};

/** Strength coefficient K [MPa] for Hollomon equation σ = K·ε^n */
const STRENGTH_COEFF_K: Record<string, number> = {
  low_carbon_steel: 530,
  medium_carbon_steel: 690,
  high_carbon_steel: 850,
  alloy_steel_annealed: 750,
  alloy_steel_qt: 1200,
  stainless_304: 1275,
  stainless_316: 1120,
  stainless_17_4ph: 1380,
  aluminum_6061: 405,
  aluminum_7075: 530,
  titanium_ti6al4v: 1100,
  inconel_718: 1650,
  tool_steel_d2: 1450,
  tool_steel_m2: 1350,
  tool_steel_s7: 1100,
  tool_steel_a2: 1250,
  cast_iron_grey: 250,
  cast_iron_nodular: 580,
};

// ============================================================================
// TYPES — MATERIAL MICROSTRUCTURE
// ============================================================================

/** ASTM E112 grain size number */
export type GrainSizeASTM = number; // 1-14, higher = finer

/** Steel phase types */
export type SteelPhase =
  | "ferrite"
  | "pearlite"
  | "bainite"
  | "martensite"
  | "austenite"
  | "cementite"
  | "retained_austenite";

/** Carbide types in tool steels */
export type CarbideType =
  | "M23C6"  // Cr-rich, common in stainless
  | "M7C3"   // Cr-rich, D2/H13
  | "M6C"    // W/Mo-rich, M2/T15
  | "MC"     // V-rich, very hard
  | "M3C"    // Fe3C cementite
  | "TiC"    // titanium carbide
  | "NbC"    // niobium carbide
  | "WC";    // tungsten carbide

/** Phase composition entry */
export interface PhaseComposition {
  phase: SteelPhase;
  volume_fraction_pct: number;
}

/** Carbide distribution in tool steels */
export interface CarbideDistribution {
  type: CarbideType;
  volume_fraction_pct: number;
  average_size_um: number;
  distribution: "uniform" | "banded" | "network" | "spheroidized";
}

/** Inclusion content affecting machinability */
export interface InclusionContent {
  /** MnS sulfide inclusions — improve machinability */
  mns_rating: number; // ASTM E45 rating, 0-5
  /** Oxide inclusions — abrasive, reduce tool life */
  oxide_rating: number;
  /** Silicate inclusions */
  silicate_rating: number;
  /** Total inclusion severity */
  severity: "clean" | "low" | "moderate" | "high";
}

/** Material microstructure input */
export interface MicrostructureInput {
  material_class: string;
  grain_size_ASTM: GrainSizeASTM;
  phases: PhaseComposition[];
  carbides?: CarbideDistribution[];
  inclusions?: InclusionContent;
  prior_processing: "hot_rolled" | "cold_drawn" | "forged" | "cast" | "annealed" | "normalized" | "quenched_tempered";
  hardness_HRC?: number;
  hardness_HB?: number;
}

/** Microstructure effect on machinability */
export interface MicrostructureResult {
  machinability_index: number; // 0-100
  cutting_force_multiplier: number;
  tool_wear_multiplier: number;
  achievable_Ra_um: number;
  work_hardening_tendency: "none" | "low" | "moderate" | "high" | "severe";
  built_up_edge_risk: "none" | "low" | "moderate" | "high";
  chip_type_prediction: "continuous" | "segmented" | "discontinuous";
  phase_effects: Array<{
    phase: SteelPhase;
    effect: string;
    impact: "positive" | "negative" | "neutral";
  }>;
  carbide_effects?: Array<{
    type: CarbideType;
    effect: string;
    wear_impact: number; // multiplier
  }>;
  recommendations: string[];
}

// ============================================================================
// TYPES — WORK HARDENING
// ============================================================================

/** Work hardening input */
export interface WorkHardeningInput {
  material_class: string;
  initial_hardness_HB?: number;
  cutting_speed_m_min: number;
  feed_mm_rev: number;
  depth_of_cut_mm: number;
  tool_rake_angle_deg?: number;
  nose_radius_mm?: number;
  coolant: "flood" | "mist" | "mql" | "dry" | "cryogenic";
  number_of_passes?: number;
  previous_strain?: number;
}

/** Work hardening result */
export interface WorkHardeningResult {
  strain_hardening_exponent_n: number;
  plastic_strain: number;
  hardness_increase_HB: number;
  hardness_increase_pct: number;
  hardened_layer_depth_um: number;
  accumulated_strain: number;
  flow_stress_MPa: number;
  recommendations: string[];
  multi_pass_analysis?: {
    pass_number: number;
    cumulative_strain: number;
    surface_hardness_HB: number;
    hardened_depth_um: number;
  }[];
}

// ============================================================================
// TYPES — PHASE TRANSFORMATIONS
// ============================================================================

/** Phase transformation input */
export interface PhaseTransformInput {
  material_class: string;
  carbon_pct: number;
  alloy_elements?: {
    Cr?: number;
    Mn?: number;
    Ni?: number;
    Mo?: number;
    V?: number;
    W?: number;
    Si?: number;
  };
  cutting_speed_m_min: number;
  feed_mm_rev: number;
  depth_of_cut_mm: number;
  initial_hardness_HRC?: number;
  coolant: "flood" | "mist" | "mql" | "dry" | "cryogenic";
  tool_wear_VB_mm?: number;
}

/** Phase transformation result */
export interface PhaseTransformResult {
  surface_temperature_C: number;
  critical_temps: {
    Ac1_C: number;
    Ac3_C: number;
    Ms_C: number;
    Mf_C: number;
  };
  white_layer: {
    risk: "none" | "low" | "moderate" | "high" | "critical";
    predicted_depth_um: number;
    martensite_fraction: number;
    hardness_HV: number;
  };
  tempering_effect?: {
    original_hardness_HRC: number;
    tempered_hardness_HRC: number;
    tempered_depth_um: number;
  };
  retained_austenite_transform: boolean;
  austenitization_depth_um: number;
  recommendations: string[];
}

// ============================================================================
// TYPES — SURFACE INTEGRITY
// ============================================================================

/** Surface integrity input */
export interface SurfaceIntegrityInput {
  material_class: string;
  cutting_speed_m_min: number;
  feed_mm_rev: number;
  depth_of_cut_mm: number;
  tool_nose_radius_mm: number;
  tool_edge_radius_um?: number;
  tool_flank_wear_VB_mm?: number;
  coolant: "flood" | "mist" | "mql" | "dry" | "cryogenic";
  operation: "roughing" | "semi_finishing" | "finishing" | "hard_turning";
}

/** Surface integrity result */
export interface SurfaceIntegrityResult {
  roughness: {
    Ra_um: number;
    Rz_um: number;
    Rt_um: number;
    theoretical_Ra_um: number;
    metallurgical_degradation_pct: number;
  };
  residual_stress: {
    surface_stress_MPa: number;
    stress_type: "compressive" | "tensile" | "neutral";
    max_compressive_MPa: number;
    max_compressive_depth_um: number;
    crossover_depth_um: number;
    affected_depth_um: number;
  };
  microhardness: {
    surface_hardness_HV: number;
    bulk_hardness_HV: number;
    hardness_gradient: "hardened" | "softened" | "unchanged";
    affected_depth_um: number;
  };
  fatigue_life_impact: {
    factor: number; // >1 = improvement, <1 = degradation
    dominant_influence: string;
  };
  corrosion_susceptibility: {
    rating: "improved" | "unchanged" | "degraded" | "severely_degraded";
    sensitization_risk: boolean;
  };
  quality_grade: "excellent" | "good" | "acceptable" | "marginal" | "unacceptable";
  recommendations: string[];
}

// ============================================================================
// TYPES — TOOL-MATERIAL INTERACTIONS
// ============================================================================

/** Tool-material interaction input */
export interface ToolMaterialInput {
  workpiece_material: string;
  workpiece_iso_group: ISOGroup;
  tool_material: "carbide" | "cermet" | "ceramic" | "cbn" | "pcd" | "hss";
  tool_coating?: "uncoated" | "TiN" | "TiCN" | "TiAlN" | "AlTiN" | "Al2O3" | "CVD_multilayer" | "PVD_multilayer";
  cutting_speed_m_min: number;
  feed_mm_rev: number;
  depth_of_cut_mm: number;
  cutting_temperature_C?: number;
}

/** Tool wear mechanism */
export type WearMechanism =
  | "abrasion"
  | "adhesion"
  | "diffusion"
  | "oxidation"
  | "fatigue"
  | "thermal_cracking"
  | "plastic_deformation"
  | "chemical_dissolution";

/** Tool-material interaction result */
export interface ToolMaterialResult {
  dominant_wear_mechanism: WearMechanism;
  secondary_wear_mechanisms: WearMechanism[];
  chemical_affinity: {
    level: "none" | "low" | "moderate" | "high" | "severe";
    diffusion_risk: boolean;
    affected_elements: string[];
  };
  built_up_edge: {
    risk: "none" | "low" | "moderate" | "high";
    stable_bue: boolean;
    effect_on_finish: string;
  };
  coating_effectiveness: {
    thermal_barrier: number; // 0-1
    chemical_barrier: number; // 0-1
    adhesion_prevention: number; // 0-1
    expected_life_multiplier: number;
  };
  wear_rate_prediction: {
    flank_wear_um_per_min: number;
    crater_wear_um_per_min: number;
    notch_wear_risk: "none" | "low" | "moderate" | "high";
  };
  recommendations: string[];
}

// ============================================================================
// TYPES — MATERIAL-SPECIFIC STRATEGY
// ============================================================================

/** Material strategy input */
export interface MaterialStrategyInput {
  material_class: string;
  material_condition?: string;
  hardness_HRC?: number;
  operation: "roughing" | "semi_finishing" | "finishing" | "hard_turning";
  required_Ra_um?: number;
  required_tolerance_mm?: number;
  batch_size?: number;
}

/** Material cutting strategy */
export interface MaterialStrategyResult {
  recommended_tool_material: string;
  recommended_coating: string;
  recommended_geometry: {
    insert_shape: string;
    nose_radius_mm: number;
    rake_angle_deg: number;
    clearance_angle_deg: number;
    edge_prep: string;
  };
  cutting_parameters: {
    speed_m_min: { min: number; optimal: number; max: number };
    feed_mm_rev: { min: number; optimal: number; max: number };
    depth_mm: { min: number; optimal: number; max: number };
  };
  coolant_strategy: {
    type: string;
    pressure_bar?: number;
    flow_rate_lpm?: number;
  };
  chip_control: {
    expected_form: string;
    chipbreaker: string;
  };
  special_considerations: string[];
  metallurgical_warnings: string[];
}

// ============================================================================
// MATERIAL DATABASES
// ============================================================================

/** Tool steel properties database */
interface ToolSteelProperties {
  name: string;
  carbon_pct: number;
  alloy_elements: Record<string, number>;
  typical_hardness_HRC: number;
  primary_carbide: CarbideType;
  carbide_volume_pct: number;
  machinability_annealed: number; // relative to 1.0
  machinability_hardened: number;
  Ac1_C: number;
  Ac3_C: number;
  Ms_C: number;
}

const TOOL_STEEL_DB: Record<string, ToolSteelProperties> = {
  D2: {
    name: "D2 Tool Steel",
    carbon_pct: 1.50,
    alloy_elements: { Cr: 12.0, Mo: 0.8, V: 0.9, Mn: 0.4, Si: 0.3 },
    typical_hardness_HRC: 60,
    primary_carbide: "M7C3",
    carbide_volume_pct: 12,
    machinability_annealed: 0.40,
    machinability_hardened: 0.15,
    Ac1_C: 788,
    Ac3_C: 870,
    Ms_C: 180,
  },
  M2: {
    name: "M2 High Speed Steel",
    carbon_pct: 0.85,
    alloy_elements: { W: 6.0, Mo: 5.0, Cr: 4.0, V: 2.0, Mn: 0.3, Si: 0.3 },
    typical_hardness_HRC: 64,
    primary_carbide: "M6C",
    carbide_volume_pct: 15,
    machinability_annealed: 0.45,
    machinability_hardened: 0.10,
    Ac1_C: 815,
    Ac3_C: 900,
    Ms_C: 220,
  },
  S7: {
    name: "S7 Shock-Resisting Tool Steel",
    carbon_pct: 0.50,
    alloy_elements: { Cr: 3.25, Mo: 1.4, Mn: 0.7, Si: 0.25, V: 0.25 },
    typical_hardness_HRC: 56,
    primary_carbide: "M23C6",
    carbide_volume_pct: 4,
    machinability_annealed: 0.55,
    machinability_hardened: 0.25,
    Ac1_C: 770,
    Ac3_C: 840,
    Ms_C: 280,
  },
  A2: {
    name: "A2 Air-Hardening Tool Steel",
    carbon_pct: 1.00,
    alloy_elements: { Cr: 5.0, Mo: 1.0, Mn: 0.7, Si: 0.3, V: 0.25 },
    typical_hardness_HRC: 62,
    primary_carbide: "M7C3",
    carbide_volume_pct: 8,
    machinability_annealed: 0.50,
    machinability_hardened: 0.18,
    Ac1_C: 790,
    Ac3_C: 855,
    Ms_C: 200,
  },
  H13: {
    name: "H13 Hot Work Tool Steel",
    carbon_pct: 0.40,
    alloy_elements: { Cr: 5.25, Mo: 1.35, V: 1.0, Si: 1.0, Mn: 0.4 },
    typical_hardness_HRC: 52,
    primary_carbide: "M23C6",
    carbide_volume_pct: 3,
    machinability_annealed: 0.60,
    machinability_hardened: 0.30,
    Ac1_C: 815,
    Ac3_C: 870,
    Ms_C: 295,
  },
  O1: {
    name: "O1 Oil-Hardening Tool Steel",
    carbon_pct: 0.95,
    alloy_elements: { Mn: 1.2, Cr: 0.5, W: 0.5, V: 0.2, Si: 0.3 },
    typical_hardness_HRC: 62,
    primary_carbide: "M3C",
    carbide_volume_pct: 5,
    machinability_annealed: 0.65,
    machinability_hardened: 0.20,
    Ac1_C: 730,
    Ac3_C: 790,
    Ms_C: 250,
  },
};

/** Stainless steel properties database */
interface StainlessSteelProperties {
  name: string;
  type: "austenitic" | "ferritic" | "martensitic" | "duplex" | "precipitation_hardening";
  work_hardening_n: number;
  austenite_stability: number; // 0-1, higher = more stable
  galling_tendency: number; // 0-1
  sensitization_risk: boolean;
  typical_hardness_HB: number;
  machinability: number;
}

const STAINLESS_DB: Record<string, StainlessSteelProperties> = {
  "304": {
    name: "304 Austenitic Stainless",
    type: "austenitic",
    work_hardening_n: 0.45,
    austenite_stability: 0.7,
    galling_tendency: 0.8,
    sensitization_risk: true,
    typical_hardness_HB: 200,
    machinability: 0.45,
  },
  "316": {
    name: "316 Austenitic Stainless",
    type: "austenitic",
    work_hardening_n: 0.42,
    austenite_stability: 0.75,
    galling_tendency: 0.75,
    sensitization_risk: true,
    typical_hardness_HB: 217,
    machinability: 0.40,
  },
  "303": {
    name: "303 Free-Machining Stainless",
    type: "austenitic",
    work_hardening_n: 0.35,
    austenite_stability: 0.65,
    galling_tendency: 0.5,
    sensitization_risk: false,
    typical_hardness_HB: 180,
    machinability: 0.75,
  },
  "410": {
    name: "410 Martensitic Stainless",
    type: "martensitic",
    work_hardening_n: 0.15,
    austenite_stability: 0,
    galling_tendency: 0.4,
    sensitization_risk: false,
    typical_hardness_HB: 220,
    machinability: 0.55,
  },
  "17-4PH": {
    name: "17-4 PH Stainless",
    type: "precipitation_hardening",
    work_hardening_n: 0.08,
    austenite_stability: 0.3,
    galling_tendency: 0.6,
    sensitization_risk: false,
    typical_hardness_HB: 350,
    machinability: 0.35,
  },
  "2205": {
    name: "2205 Duplex Stainless",
    type: "duplex",
    work_hardening_n: 0.30,
    austenite_stability: 0.5,
    galling_tendency: 0.7,
    sensitization_risk: false,
    typical_hardness_HB: 290,
    machinability: 0.30,
  },
};

/** Superalloy properties database */
interface SuperalloyProperties {
  name: string;
  base: "nickel" | "titanium" | "cobalt";
  strain_rate_sensitivity: number; // C in Johnson-Cook
  thermal_softening_m: number; // m in Johnson-Cook
  work_hardening_n: number;
  gamma_prime_pct?: number;
  machinability: number;
  chemical_affinity_carbide: number; // 0-1
}

const SUPERALLOY_DB: Record<string, SuperalloyProperties> = {
  "Inconel 718": {
    name: "Inconel 718",
    base: "nickel",
    strain_rate_sensitivity: 0.0134,
    thermal_softening_m: 1.3,
    work_hardening_n: 0.65,
    gamma_prime_pct: 18,
    machinability: 0.12,
    chemical_affinity_carbide: 0.85,
  },
  "Ti-6Al-4V": {
    name: "Ti-6Al-4V",
    base: "titanium",
    strain_rate_sensitivity: 0.032,
    thermal_softening_m: 0.8,
    work_hardening_n: 0.05,
    machinability: 0.20,
    chemical_affinity_carbide: 0.95,
  },
  "Waspaloy": {
    name: "Waspaloy",
    base: "nickel",
    strain_rate_sensitivity: 0.014,
    thermal_softening_m: 1.15,
    work_hardening_n: 0.60,
    gamma_prime_pct: 25,
    machinability: 0.10,
    chemical_affinity_carbide: 0.80,
  },
  "Stellite 6": {
    name: "Stellite 6",
    base: "cobalt",
    strain_rate_sensitivity: 0.02,
    thermal_softening_m: 1.0,
    work_hardening_n: 0.40,
    machinability: 0.08,
    chemical_affinity_carbide: 0.70,
  },
};

/** Aluminum alloy properties database */
interface AluminumProperties {
  name: string;
  temper: string;
  si_content_pct: number;
  bue_tendency: number; // 0-1
  smearing_tendency: number; // 0-1
  machinability: number;
  typical_hardness_HB: number;
}

const ALUMINUM_DB: Record<string, AluminumProperties> = {
  "6061-T6": {
    name: "6061-T6 Aluminum",
    temper: "T6",
    si_content_pct: 0.6,
    bue_tendency: 0.6,
    smearing_tendency: 0.5,
    machinability: 0.90,
    typical_hardness_HB: 95,
  },
  "7075-T6": {
    name: "7075-T6 Aluminum",
    temper: "T6",
    si_content_pct: 0.4,
    bue_tendency: 0.5,
    smearing_tendency: 0.4,
    machinability: 0.85,
    typical_hardness_HB: 150,
  },
  "2024-T4": {
    name: "2024-T4 Aluminum",
    temper: "T4",
    si_content_pct: 0.5,
    bue_tendency: 0.7,
    smearing_tendency: 0.6,
    machinability: 0.75,
    typical_hardness_HB: 120,
  },
  "A356-T6": {
    name: "A356-T6 Cast Aluminum",
    temper: "T6",
    si_content_pct: 7.0,
    bue_tendency: 0.3,
    smearing_tendency: 0.2,
    machinability: 0.60,
    typical_hardness_HB: 90,
  },
  "A380": {
    name: "A380 Die Cast Aluminum",
    temper: "F",
    si_content_pct: 8.5,
    bue_tendency: 0.2,
    smearing_tendency: 0.15,
    machinability: 0.55,
    typical_hardness_HB: 80,
  },
};

/** Cast iron properties database */
interface CastIronProperties {
  name: string;
  graphite_form: "flake" | "nodular" | "compacted" | "none";
  matrix: "ferritic" | "pearlitic" | "martensitic" | "mixed";
  free_graphite_pct: number;
  machinability: number;
  typical_hardness_HB: number;
  chip_type: "discontinuous" | "segmented";
}

const CAST_IRON_DB: Record<string, CastIronProperties> = {
  "grey_FC200": {
    name: "Grey Cast Iron FC200",
    graphite_form: "flake",
    matrix: "pearlitic",
    free_graphite_pct: 10,
    machinability: 0.85,
    typical_hardness_HB: 200,
    chip_type: "discontinuous",
  },
  "grey_FC300": {
    name: "Grey Cast Iron FC300",
    graphite_form: "flake",
    matrix: "pearlitic",
    free_graphite_pct: 8,
    machinability: 0.75,
    typical_hardness_HB: 250,
    chip_type: "discontinuous",
  },
  "nodular_FCD450": {
    name: "Ductile Iron FCD450",
    graphite_form: "nodular",
    matrix: "ferritic",
    free_graphite_pct: 12,
    machinability: 0.70,
    typical_hardness_HB: 160,
    chip_type: "segmented",
  },
  "nodular_FCD700": {
    name: "Ductile Iron FCD700",
    graphite_form: "nodular",
    matrix: "pearlitic",
    free_graphite_pct: 10,
    machinability: 0.55,
    typical_hardness_HB: 280,
    chip_type: "segmented",
  },
  "ADI": {
    name: "Austempered Ductile Iron",
    graphite_form: "nodular",
    matrix: "mixed",
    free_graphite_pct: 10,
    machinability: 0.25,
    typical_hardness_HB: 350,
    chip_type: "segmented",
  },
  "CGI": {
    name: "Compacted Graphite Iron",
    graphite_form: "compacted",
    matrix: "pearlitic",
    free_graphite_pct: 9,
    machinability: 0.40,
    typical_hardness_HB: 250,
    chip_type: "segmented",
  },
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Calculate grain size diameter from ASTM number.
 * ASTM E112: n = 2^(G-1) grains per square inch at 100x
 * d = 1/sqrt(n) in mm (approximately)
 */
function grainDiameter_mm(astmNumber: number): number {
  // d ≈ 0.254 / sqrt(2^(G-1)) mm
  return 0.254 / Math.sqrt(Math.pow(2, astmNumber - 1));
}

/**
 * Hall-Petch strengthening from grain size.
 * σ_y = σ_0 + k_y / sqrt(d)
 */
function hallPetchStrength(grainDiameter_mm: number): number {
  const d = grainDiameter_mm;
  return HALL_PETCH.sigma_0_MPa + HALL_PETCH.ky_MPa_mm05 / Math.sqrt(d);
}

/**
 * Hollomon equation: σ = K * ε^n
 */
function hollomonFlowStress(strain: number, K: number, n: number): number {
  if (strain <= 0) return 0;
  return K * Math.pow(strain, n);
}

/**
 * Estimate cutting temperature using simplified Boothroyd model.
 * T = T_amb + (1-β) * Fc * Vc / (ρ * cp * MRR)
 * Simplified: T ≈ base + k * Vc^0.5 * f^0.3 / k_thermal^0.4
 */
function estimateCuttingTemperature(
  Vc_m_min: number,
  f_mm: number,
  k_thermal: number,
  hardness_factor: number = 1.0
): number {
  const base = 200; // ambient + heat from deformation
  const k = 280 * hardness_factor;
  return base + k * Math.pow(Vc_m_min / 100, 0.5) * Math.pow(f_mm / 0.1, 0.3) / Math.pow(k_thermal / 50, 0.4);
}

/**
 * Calculate critical temperatures for steel based on composition.
 * Andrews (1965) empirical formulas.
 */
function calculateCriticalTemps(
  carbonPct: number,
  alloys: Record<string, number> = {}
): { Ac1_C: number; Ac3_C: number; Ms_C: number; Mf_C: number } {
  const Cr = alloys.Cr || 0;
  const Mn = alloys.Mn || 0;
  const Ni = alloys.Ni || 0;
  const Mo = alloys.Mo || 0;
  const Si = alloys.Si || 0;
  const V = alloys.V || 0;
  const W = alloys.W || 0;

  // Andrews (1965) Ac1
  const Ac1 = 723 - 10.7 * Mn - 16.9 * Ni + 29.1 * Si + 16.9 * Cr + 290 * (1 - Math.exp(-1.33 * carbonPct));

  // Andrews (1965) Ac3 for hypoeutectoid steels
  const Ac3 = 910 - 203 * Math.sqrt(carbonPct) - 15.2 * Ni + 44.7 * Si + 104 * V + 31.5 * Mo;

  // Martensite start (Andrews 1965)
  const Ms = 539 - 423 * carbonPct - 30.4 * Mn - 17.7 * Ni - 12.1 * Cr - 7.5 * Mo - 7.5 * Si + 10 * (W + V);

  // Mf typically 100-150°C below Ms
  const Mf = Math.max(Ms - 150, -50);

  return {
    Ac1_C: Math.round(Ac1),
    Ac3_C: Math.round(Ac3),
    Ms_C: Math.round(Ms),
    Mf_C: Math.round(Mf),
  };
}

/**
 * Diffusion coefficient using Arrhenius equation.
 * D = D0 * exp(-Q / RT)
 */
function diffusionCoefficient(D0: number, Q_kJ_mol: number, T_C: number): number {
  const T_K = T_C + 273.15;
  return D0 * Math.exp(-Q_kJ_mol * 1000 / (R_GAS * T_K));
}

// ============================================================================
// ENGINE CLASS
// ============================================================================

export class LatheMetallurgyEngine {
  private readonly engineId = "LatheMetallurgyEngine";

  // ==========================================================================
  // MICROSTRUCTURE ANALYSIS
  // ==========================================================================

  /**
   * Analyze how material microstructure affects machinability.
   * Models grain size (Hall-Petch), phase composition, carbide distribution.
   */
  analyzeMicrostructure(input: MicrostructureInput): MicrostructureResult {
    log.debug(`[${this.engineId}] Analyzing microstructure for ${input.material_class}`);

    const recommendations: string[] = [];
    const phaseEffects: MicrostructureResult["phase_effects"] = [];

    // --- Grain Size Effects (Hall-Petch) ---
    const grainD = grainDiameter_mm(input.grain_size_ASTM);
    const grainStrengthening = hallPetchStrength(grainD);

    // Finer grain = higher strength = higher cutting forces
    // But finer grain = better surface finish achievable
    const grainForceFactor = 1.0 + (input.grain_size_ASTM - 5) * 0.03;
    const grainFinishFactor = Math.max(0.3, 1.4 - input.grain_size_ASTM * 0.08);

    // --- Phase Composition Effects ---
    let phaseMachinability = 0;
    let phaseBUERisk = 0;
    let phaseWorkHardening = 0;
    let totalFraction = 0;

    const PHASE_MACH: Record<SteelPhase, number> = {
      ferrite: 1.1,
      pearlite: 1.0,
      martensite: 0.35,
      bainite: 0.65,
      austenite: 0.55,
      cementite: 0.25,
      retained_austenite: 0.50,
    };

    const PHASE_BUE: Record<SteelPhase, number> = {
      ferrite: 0.8,
      pearlite: 0.3,
      martensite: 0.05,
      bainite: 0.2,
      austenite: 0.6,
      cementite: 0.05,
      retained_austenite: 0.5,
    };

    const PHASE_WORKHARDEN: Record<SteelPhase, number> = {
      ferrite: 0.6,
      pearlite: 0.3,
      martensite: 0.05,
      bainite: 0.2,
      austenite: 0.95,
      cementite: 0.0,
      retained_austenite: 0.85,
    };

    for (const p of input.phases) {
      const mf = PHASE_MACH[p.phase] ?? 0.7;
      const bf = PHASE_BUE[p.phase] ?? 0.3;
      const wf = PHASE_WORKHARDEN[p.phase] ?? 0.3;
      const w = p.volume_fraction_pct / 100;

      phaseMachinability += mf * w;
      phaseBUERisk += bf * w;
      phaseWorkHardening += wf * w;
      totalFraction += w;

      // Build phase effect description
      let effect: string;
      let impact: "positive" | "negative" | "neutral";
      if (mf >= 0.9) {
        effect = "Improves machinability — soft, easy to cut";
        impact = "positive";
      } else if (mf >= 0.6) {
        effect = "Moderate resistance — normal cutting parameters";
        impact = "neutral";
      } else {
        effect = "Hard/abrasive — reduces tool life, increases forces";
        impact = "negative";
      }

      phaseEffects.push({ phase: p.phase, effect, impact });
    }

    // Normalize if fractions don't sum to 100%
    if (totalFraction > 0 && Math.abs(totalFraction - 1.0) > 0.05) {
      phaseMachinability /= totalFraction;
      phaseBUERisk /= totalFraction;
      phaseWorkHardening /= totalFraction;
    }

    // --- Carbide Effects ---
    let carbideWearFactor = 1.0;
    const carbideEffects: MicrostructureResult["carbide_effects"] = [];

    if (input.carbides && input.carbides.length > 0) {
      const CARBIDE_WEAR: Record<CarbideType, number> = {
        M23C6: 1.3,
        M7C3: 1.8,
        M6C: 2.0,
        MC: 2.5,
        M3C: 1.2,
        TiC: 2.2,
        NbC: 2.3,
        WC: 2.8,
      };

      for (const c of input.carbides) {
        const wearMult = CARBIDE_WEAR[c.type] ?? 1.5;
        const sizeFactor = c.average_size_um > 5 ? 1.2 : c.average_size_um < 2 ? 0.9 : 1.0;
        const distFactor = c.distribution === "banded" ? 1.3 : c.distribution === "network" ? 1.4 : 1.0;
        const effectiveWear = wearMult * sizeFactor * distFactor * (c.volume_fraction_pct / 10);
        carbideWearFactor += effectiveWear - 1;

        carbideEffects.push({
          type: c.type,
          effect: `${c.distribution} distribution, ${c.average_size_um.toFixed(1)}µm size — ${wearMult > 1.5 ? "highly" : "moderately"} abrasive`,
          wear_impact: effectiveWear,
        });
      }

      if (carbideWearFactor > 1.5) {
        recommendations.push("High carbide content — use coated carbide or ceramic tooling for improved wear resistance");
      }
    }

    // --- Inclusion Effects ---
    let inclusionMachFactor = 1.0;
    let inclusionWearFactor = 1.0;

    if (input.inclusions) {
      // MnS inclusions improve machinability (chip breaking, lubricating)
      inclusionMachFactor = 1.0 + input.inclusions.mns_rating * 0.05;
      // Oxides are abrasive
      inclusionWearFactor = 1.0 + input.inclusions.oxide_rating * 0.08;

      if (input.inclusions.mns_rating >= 3) {
        recommendations.push("Free-machining steel detected — can use higher speeds");
      }
      if (input.inclusions.oxide_rating >= 3) {
        recommendations.push("High oxide inclusion content — expect accelerated abrasive wear");
      }
    }

    // --- Prior Processing Effect ---
    const PROCESSING_EFFECT: Record<string, number> = {
      hot_rolled: 0.95,
      cold_drawn: 1.10,
      forged: 1.05,
      cast: 0.85,
      annealed: 1.15,
      normalized: 1.00,
      quenched_tempered: 0.70,
    };
    const processingFactor = PROCESSING_EFFECT[input.prior_processing] ?? 1.0;

    // --- Hardness Effect ---
    const hardnessHB = input.hardness_HB ?? (input.hardness_HRC ? input.hardness_HRC * 10 + 100 : 200);
    const hardnessFactor = Math.max(0.3, 1.0 - (hardnessHB - 200) * 0.002);

    // --- Calculate Final Results ---
    const baseMach = 50;
    const machinabilityIndex = Math.round(
      baseMach * phaseMachinability * processingFactor * hardnessFactor *
      inclusionMachFactor / grainForceFactor
    );

    const cutForceMult = grainForceFactor / phaseMachinability / hardnessFactor;
    const wearMult = carbideWearFactor * inclusionWearFactor / phaseMachinability;

    // Surface finish achievable (Ra in µm)
    const achievableRa = 0.4 * grainFinishFactor / phaseMachinability;

    // Work hardening tendency
    let workHardenTendency: MicrostructureResult["work_hardening_tendency"] = "low";
    if (phaseWorkHardening >= 0.8) workHardenTendency = "severe";
    else if (phaseWorkHardening >= 0.6) workHardenTendency = "high";
    else if (phaseWorkHardening >= 0.4) workHardenTendency = "moderate";
    else if (phaseWorkHardening >= 0.1) workHardenTendency = "low";
    else workHardenTendency = "none";

    // BUE risk
    let bueRisk: MicrostructureResult["built_up_edge_risk"] = "low";
    if (phaseBUERisk >= 0.7) bueRisk = "high";
    else if (phaseBUERisk >= 0.5) bueRisk = "moderate";
    else if (phaseBUERisk >= 0.2) bueRisk = "low";
    else bueRisk = "none";

    // Chip type prediction
    let chipType: MicrostructureResult["chip_type_prediction"] = "continuous";
    if (input.material_class.includes("cast_iron") || phaseMachinability < 0.4) {
      chipType = "discontinuous";
    } else if (workHardenTendency === "severe" || workHardenTendency === "high") {
      chipType = "segmented";
    }

    // Add recommendations based on analysis
    if (workHardenTendency === "severe" || workHardenTendency === "high") {
      recommendations.push("High work hardening — maintain feed rate to stay below hardened layer");
    }
    if (bueRisk === "high") {
      recommendations.push("High BUE risk — use higher cutting speeds or coated tools");
    }
    if (input.grain_size_ASTM >= 10) {
      recommendations.push("Very fine grain — excellent finish achievable but higher cutting forces");
    }

    return {
      machinability_index: Math.min(100, Math.max(0, machinabilityIndex)),
      cutting_force_multiplier: Math.round(cutForceMult * 100) / 100,
      tool_wear_multiplier: Math.round(wearMult * 100) / 100,
      achievable_Ra_um: Math.round(achievableRa * 100) / 100,
      work_hardening_tendency: workHardenTendency,
      built_up_edge_risk: bueRisk,
      chip_type_prediction: chipType,
      phase_effects: phaseEffects,
      carbide_effects: carbideEffects.length > 0 ? carbideEffects : undefined,
      recommendations,
    };
  }

  // ==========================================================================
  // WORK HARDENING PREDICTION
  // ==========================================================================

  /**
   * Calculate work hardening depth and accumulated strain.
   * Uses Hollomon equation with multi-pass accumulation model.
   */
  calculateWorkHardening(input: WorkHardeningInput): WorkHardeningResult {
    log.debug(`[${this.engineId}] Calculating work hardening for ${input.material_class}`);

    const recommendations: string[] = [];

    // Get material work hardening parameters
    const materialKey = input.material_class.toLowerCase().replace(/[\s-]/g, "_");
    const n = STRAIN_HARDENING_N[materialKey] ?? 0.20;
    const K = STRENGTH_COEFF_K[materialKey] ?? 700;

    // Calculate plastic strain in cutting
    // Merchant model: ε ≈ cos(α) / (sin(φ) * cos(φ - α))
    // Simplified: ε ≈ 0.3 * cot(φ), where φ ≈ 45° - α/2 + β/2
    const alpha = input.tool_rake_angle_deg ?? 6; // rake angle
    const phi = 45 - alpha / 2 + 10; // shear angle estimate (friction angle β ≈ 20°)
    const shearStrain = Math.cos(alpha * Math.PI / 180) /
      (Math.sin(phi * Math.PI / 180) * Math.cos((phi - alpha) * Math.PI / 180));

    // Strain scales with feed and depth
    const feedFactor = Math.pow(input.feed_mm_rev / 0.2, 0.3);
    const depthFactor = Math.pow(input.depth_of_cut_mm / 1.0, 0.2);
    const plasticStrain = shearStrain * feedFactor * depthFactor * 0.4;

    // Coolant effect on strain (cryogenic increases strain due to suppressed thermal softening)
    const coolantStrainFactor: Record<string, number> = {
      flood: 1.0,
      mist: 1.05,
      mql: 1.08,
      dry: 0.90, // thermal softening reduces effective strain
      cryogenic: 1.15,
    };
    const effectiveStrain = plasticStrain * (coolantStrainFactor[input.coolant] ?? 1.0);

    // Flow stress from Hollomon equation
    const flowStress = hollomonFlowStress(effectiveStrain, K, n);

    // Hardness increase (approximate: HB ≈ UTS/3.45, UTS ≈ σ_flow)
    const baseHardness = input.initial_hardness_HB ?? 200;
    const stressIncrease = flowStress - K * Math.pow(0.002, n); // relative to yield
    const hardnessIncrease = stressIncrease * 0.3 / 3.45;
    const hardnessIncreasePct = (hardnessIncrease / baseHardness) * 100;

    // Hardened layer depth
    // Depth ≈ f(feed, speed, thermal conductivity)
    // Oxley model: depth ≈ uncut chip thickness * strain ratio
    const unchipThickness = input.feed_mm_rev * Math.sin(90 * Math.PI / 180); // for 90° approach
    const hardenedDepth_um = unchipThickness * 1000 * effectiveStrain * 0.5 *
      (input.cutting_speed_m_min > 200 ? 0.7 : 1.0); // thermal softening at high speed

    // Multi-pass accumulation
    const numPasses = input.number_of_passes ?? 1;
    const previousStrain = input.previous_strain ?? 0;
    const accumulatedStrain = previousStrain + effectiveStrain * 0.3; // partial retention

    const multiPassAnalysis: WorkHardeningResult["multi_pass_analysis"] = [];
    if (numPasses > 1) {
      let cumulativeStrain = previousStrain;
      let currentHardness = baseHardness;

      for (let pass = 1; pass <= numPasses; pass++) {
        const passStrain = effectiveStrain * Math.pow(0.95, pass - 1); // diminishing
        cumulativeStrain += passStrain * 0.3;
        const passFlowStress = hollomonFlowStress(cumulativeStrain, K, n);
        currentHardness = baseHardness + (passFlowStress - K * Math.pow(0.002, n)) * 0.3 / 3.45;
        const passDepth = hardenedDepth_um * (1 + (pass - 1) * 0.2);

        multiPassAnalysis.push({
          pass_number: pass,
          cumulative_strain: Math.round(cumulativeStrain * 1000) / 1000,
          surface_hardness_HB: Math.round(currentHardness),
          hardened_depth_um: Math.round(passDepth),
        });
      }
    }

    // Generate recommendations
    if (n >= 0.35) {
      recommendations.push("Material has high work hardening exponent — avoid light passes that only skim hardened layer");
    }
    if (effectiveStrain > 1.5) {
      recommendations.push("Severe plastic strain predicted — use sharp tools and positive rake geometry");
    }
    if (hardenedDepth_um > input.depth_of_cut_mm * 1000 * 0.8) {
      recommendations.push("Hardened layer approaching cut depth — increase DOC to remove hardened zone");
    }
    if (input.coolant === "cryogenic") {
      recommendations.push("Cryogenic cooling increases work hardening — beneficial for surface hardness");
    }

    return {
      strain_hardening_exponent_n: n,
      plastic_strain: Math.round(effectiveStrain * 1000) / 1000,
      hardness_increase_HB: Math.round(hardnessIncrease),
      hardness_increase_pct: Math.round(hardnessIncreasePct * 10) / 10,
      hardened_layer_depth_um: Math.round(hardenedDepth_um),
      accumulated_strain: Math.round(accumulatedStrain * 1000) / 1000,
      flow_stress_MPa: Math.round(flowStress),
      recommendations,
      multi_pass_analysis: multiPassAnalysis.length > 0 ? multiPassAnalysis : undefined,
    };
  }

  // ==========================================================================
  // PHASE TRANSFORMATION — WHITE LAYER
  // ==========================================================================

  /**
   * Predict white layer formation and phase transformations during cutting.
   * Models austenitization, martensite formation, and tempering effects.
   */
  predictWhiteLayer(input: PhaseTransformInput): PhaseTransformResult {
    log.debug(`[${this.engineId}] Predicting white layer for ${input.material_class}`);

    const recommendations: string[] = [];

    // Get critical temperatures
    const alloys = input.alloy_elements ?? {};
    const criticalTemps = calculateCriticalTemps(input.carbon_pct, alloys);

    // Calculate cutting temperature
    const k_thermal = input.material_class.includes("stainless") ? 16 :
      input.material_class.includes("tool_steel") ? 25 : 50;

    const hardnessFactor = input.initial_hardness_HRC ?
      1.0 + (input.initial_hardness_HRC - 30) * 0.015 : 1.0;

    // Tool wear increases temperature dramatically
    const wearFactor = input.tool_wear_VB_mm ?
      1.0 + Math.pow(input.tool_wear_VB_mm / 0.3, 1.5) : 1.0;

    // Base temperature estimate
    let surfaceTemp = estimateCuttingTemperature(
      input.cutting_speed_m_min,
      input.feed_mm_rev,
      k_thermal,
      hardnessFactor
    );
    surfaceTemp *= wearFactor;

    // Coolant effect
    const coolantReduction: Record<string, number> = {
      flood: 0.65,
      mist: 0.80,
      mql: 0.85,
      dry: 1.0,
      cryogenic: 0.50,
    };
    surfaceTemp *= (coolantReduction[input.coolant] ?? 1.0);

    // --- White Layer Analysis ---
    const tempRatio = surfaceTemp / criticalTemps.Ac1_C;

    let whiteLayerRisk: PhaseTransformResult["white_layer"]["risk"] = "none";
    let martensiteFraction = 0;
    let whiteLayerDepth_um = 0;
    let whiteLayerHardness_HV = 0;

    if (surfaceTemp >= criticalTemps.Ac3_C) {
      // Full austenitization — high risk of martensite on quench
      whiteLayerRisk = "critical";
      martensiteFraction = 0.95;
      whiteLayerDepth_um = 15 + (surfaceTemp - criticalTemps.Ac3_C) * 0.08;
    } else if (surfaceTemp >= criticalTemps.Ac1_C) {
      // Partial austenitization
      whiteLayerRisk = "high";
      martensiteFraction = (surfaceTemp - criticalTemps.Ac1_C) /
        (criticalTemps.Ac3_C - criticalTemps.Ac1_C);
      whiteLayerDepth_um = 5 + (surfaceTemp - criticalTemps.Ac1_C) * 0.05;
    } else if (surfaceTemp >= criticalTemps.Ac1_C * 0.9) {
      // Near-transformation zone
      whiteLayerRisk = "moderate";
      martensiteFraction = 0.1;
      whiteLayerDepth_um = 2;
    } else if (surfaceTemp >= criticalTemps.Ac1_C * 0.8) {
      whiteLayerRisk = "low";
      martensiteFraction = 0;
      whiteLayerDepth_um = 0;
    }

    // Calculate white layer hardness (martensite hardness from carbon content)
    // HV ≈ 800 + 2000*C for fresh martensite
    if (martensiteFraction > 0) {
      const martensiteHV = 300 + 2000 * Math.min(input.carbon_pct, 0.8);
      whiteLayerHardness_HV = Math.round(martensiteHV * martensiteFraction +
        300 * (1 - martensiteFraction));
    }

    // --- Tempering Effect (for pre-hardened materials) ---
    let temperingEffect: PhaseTransformResult["tempering_effect"];
    if (input.initial_hardness_HRC && input.initial_hardness_HRC >= 40) {
      // Check if cutting temperature causes tempering
      const tempForTemper = 200; // tempering starts around 200°C
      if (surfaceTemp >= tempForTemper && surfaceTemp < criticalTemps.Ac1_C) {
        // Hollomon-Jaffe tempering parameter
        const P = (surfaceTemp + 273) * (20 + Math.log10(1)); // ~1 second contact
        const hardnessDrop = (surfaceTemp - tempForTemper) * 0.025;
        const temperedHRC = Math.max(30, input.initial_hardness_HRC - hardnessDrop);
        const temperDepth = 20 + surfaceTemp * 0.05; // shallow tempering zone

        temperingEffect = {
          original_hardness_HRC: input.initial_hardness_HRC,
          tempered_hardness_HRC: Math.round(temperedHRC * 10) / 10,
          tempered_depth_um: Math.round(temperDepth),
        };

        recommendations.push(`Surface will be tempered from ${input.initial_hardness_HRC} to ~${Math.round(temperedHRC)} HRC`);
      }
    }

    // --- Retained Austenite Transformation ---
    let retainedAusteniteTransform = false;
    if (input.initial_hardness_HRC && input.initial_hardness_HRC >= 55) {
      // High-hardness steels often have retained austenite
      // Cutting heat can transform it to martensite (dimensional instability)
      if (surfaceTemp >= 150 && surfaceTemp < criticalTemps.Ac1_C) {
        retainedAusteniteTransform = true;
        recommendations.push("Retained austenite may transform during cutting — expect hardness increase and dimensional changes");
      }
    }

    // --- Austenitization Depth ---
    // Thermal penetration: depth ≈ √(α·t), α = k/(ρ·cp)
    const contactTime_s = 0.001; // ~1ms typical
    const thermalDiffusivity = 10e-6; // m²/s typical for steel
    const austenitizationDepth = surfaceTemp >= criticalTemps.Ac1_C ?
      Math.sqrt(thermalDiffusivity * contactTime_s) * 1e6 *
      (surfaceTemp - criticalTemps.Ac1_C) / 100 : 0;

    // --- Generate Recommendations ---
    if (whiteLayerRisk === "critical" || whiteLayerRisk === "high") {
      recommendations.push("HIGH WHITE LAYER RISK — reduce cutting speed or increase coolant");
      if (input.tool_wear_VB_mm && input.tool_wear_VB_mm > 0.2) {
        recommendations.push("Tool wear is amplifying temperatures — replace insert");
      }
      recommendations.push(`Target surface temperature below ${criticalTemps.Ac1_C}°C`);
    }
    if (whiteLayerRisk === "moderate") {
      recommendations.push("Monitor for white layer — verify with Barkhausen noise or nital etch");
    }
    if (input.coolant === "dry" && whiteLayerRisk !== "none") {
      recommendations.push("Dry machining increases white layer risk — consider flood or cryogenic coolant");
    }

    return {
      surface_temperature_C: Math.round(surfaceTemp),
      critical_temps: criticalTemps,
      white_layer: {
        risk: whiteLayerRisk,
        predicted_depth_um: Math.round(whiteLayerDepth_um * 10) / 10,
        martensite_fraction: Math.round(martensiteFraction * 100) / 100,
        hardness_HV: whiteLayerHardness_HV,
      },
      tempering_effect: temperingEffect,
      retained_austenite_transform: retainedAusteniteTransform,
      austenitization_depth_um: Math.round(austenitizationDepth * 10) / 10,
      recommendations,
    };
  }

  // ==========================================================================
  // SURFACE INTEGRITY ASSESSMENT
  // ==========================================================================

  /**
   * Comprehensive surface integrity assessment including residual stress,
   * microhardness, fatigue life impact, and corrosion susceptibility.
   */
  assessSurfaceIntegrity(input: SurfaceIntegrityInput): SurfaceIntegrityResult {
    log.debug(`[${this.engineId}] Assessing surface integrity`);

    const recommendations: string[] = [];

    // --- Surface Roughness ---
    // Theoretical Ra from geometry: Ra = f²/(32·r)
    const f = input.feed_mm_rev;
    const r = input.tool_nose_radius_mm;
    const theoreticalRa_um = (f * f * 1000) / (32 * r);

    // Edge radius effect (ploughing)
    const edgeRadius_um = input.tool_edge_radius_um ?? 10;
    const ploughingEffect = edgeRadius_um * 0.02;

    // Tool wear effect
    const wearEffect = (input.tool_flank_wear_VB_mm ?? 0) * 1.5;

    // Speed effect (BUE at low speed, thermal at high speed)
    let speedFactor = 1.0;
    if (input.cutting_speed_m_min < 60) speedFactor = 1.3; // BUE
    else if (input.cutting_speed_m_min > 300) speedFactor = 1.1; // thermal

    // Coolant effect
    const coolantRaFactor: Record<string, number> = {
      flood: 0.85,
      mist: 0.92,
      mql: 0.90,
      dry: 1.0,
      cryogenic: 0.82,
    };

    const Ra_um = (theoreticalRa_um + ploughingEffect + wearEffect) *
      speedFactor * (coolantRaFactor[input.coolant] ?? 1.0);
    const Rz_um = Ra_um * 4.5;
    const Rt_um = Rz_um * 1.3;

    const metallurgicalDegradation = ((Ra_um - theoreticalRa_um) / theoreticalRa_um) * 100;

    // --- Residual Stress Analysis ---
    // Mechanical stress: compressive from deformation
    // Thermal stress: tensile from rapid cooling
    const k_thermal = input.material_class.includes("stainless") ? 16 :
      input.material_class.includes("titanium") ? 7 :
      input.material_class.includes("aluminum") ? 150 : 50;

    const sigma_y = input.material_class.includes("hardened") ? 1500 :
      input.material_class.includes("titanium") ? 900 : 500;

    // Mechanical stress (Brinksmeier model)
    const mechanicalStress = -sigma_y * 0.4 * (f / 0.15) * (1 + edgeRadius_um / 50);

    // Thermal stress (temperature gradient)
    const surfaceTemp = estimateCuttingTemperature(
      input.cutting_speed_m_min, f, k_thermal
    );
    const thermalStress = sigma_y * 0.2 * (surfaceTemp / 600);

    // Net stress and coolant effect
    const coolantStressFactor: Record<string, number> = {
      flood: 0.6,
      mist: 0.8,
      mql: 0.85,
      dry: 1.2,
      cryogenic: 0.4,
    };

    const netSurfaceStress = Math.round(
      (mechanicalStress + thermalStress) * (coolantStressFactor[input.coolant] ?? 1.0)
    );

    const stressType: SurfaceIntegrityResult["residual_stress"]["stress_type"] =
      netSurfaceStress < -50 ? "compressive" :
      netSurfaceStress > 50 ? "tensile" : "neutral";

    // Stress profile
    const maxCompressiveDepth = 30 + input.cutting_speed_m_min * 0.1;
    const crossoverDepth = maxCompressiveDepth * 2.5;
    const affectedDepth = crossoverDepth * 1.8;

    // --- Microhardness Profile ---
    const bulkHardness_HV = input.operation === "hard_turning" ? 700 :
      input.material_class.includes("stainless") ? 220 :
      input.material_class.includes("aluminum") ? 110 : 250;

    const n = STRAIN_HARDENING_N[input.material_class.toLowerCase().replace(/[\s-]/g, "_")] ?? 0.20;
    const strainHardening = n > 0.3 ? 1.2 : n > 0.15 ? 1.1 : 1.05;

    // Thermal softening vs work hardening balance
    let surfaceHardness_HV: number;
    let hardnessGradient: SurfaceIntegrityResult["microhardness"]["hardness_gradient"];

    if (surfaceTemp > 600) {
      // Thermal softening dominates
      surfaceHardness_HV = bulkHardness_HV * 0.9;
      hardnessGradient = "softened";
    } else if (n > 0.25) {
      // Work hardening dominates
      surfaceHardness_HV = bulkHardness_HV * strainHardening;
      hardnessGradient = "hardened";
    } else {
      surfaceHardness_HV = bulkHardness_HV;
      hardnessGradient = "unchanged";
    }

    // --- Fatigue Life Impact ---
    // Compressive residual stress improves fatigue life
    // Surface roughness degrades it
    let fatigueLifeFactor = 1.0;
    let dominantInfluence = "neutral";

    if (stressType === "compressive" && netSurfaceStress < -200) {
      fatigueLifeFactor *= 1.3;
      dominantInfluence = "beneficial compressive stress";
    } else if (stressType === "tensile" && netSurfaceStress > 200) {
      fatigueLifeFactor *= 0.7;
      dominantInfluence = "detrimental tensile stress";
    }

    // Roughness effect (Goodman-like)
    if (Ra_um > 2.0) {
      fatigueLifeFactor *= 0.85;
      if (dominantInfluence === "neutral") dominantInfluence = "surface roughness";
    }

    // --- Corrosion Susceptibility ---
    let corrosionRating: SurfaceIntegrityResult["corrosion_susceptibility"]["rating"] = "unchanged";
    let sensitizationRisk = false;

    if (input.material_class.includes("stainless")) {
      // Austenitic stainless sensitization (Cr carbide precipitation 450-850°C)
      if (surfaceTemp >= 450 && surfaceTemp <= 850) {
        sensitizationRisk = true;
        corrosionRating = "severely_degraded";
        recommendations.push("SENSITIZATION RISK — temperature in 450-850°C range depletes Cr at grain boundaries");
      } else if (stressType === "tensile") {
        corrosionRating = "degraded";
        recommendations.push("Tensile stress increases SCC susceptibility in stainless steel");
      }
    }

    if (Ra_um > 3.0) {
      // Rough surfaces trap contaminants
      if (corrosionRating === "unchanged") corrosionRating = "degraded";
    }

    // --- Quality Grade ---
    let qualityGrade: SurfaceIntegrityResult["quality_grade"];
    const qualityScore = (
      (Ra_um < 0.8 ? 30 : Ra_um < 1.6 ? 20 : Ra_um < 3.2 ? 10 : 0) +
      (stressType === "compressive" ? 25 : stressType === "neutral" ? 15 : 5) +
      (hardnessGradient !== "softened" ? 20 : 10) +
      (corrosionRating !== "severely_degraded" ? 15 : 0) +
      (fatigueLifeFactor >= 1.0 ? 10 : 0)
    );

    if (qualityScore >= 85) qualityGrade = "excellent";
    else if (qualityScore >= 70) qualityGrade = "good";
    else if (qualityScore >= 55) qualityGrade = "acceptable";
    else if (qualityScore >= 40) qualityGrade = "marginal";
    else qualityGrade = "unacceptable";

    // --- Generate Recommendations ---
    if (stressType === "tensile" && netSurfaceStress > 300) {
      recommendations.push("High tensile residual stress — consider shot peening or burnishing");
    }
    if (Ra_um > input.feed_mm_rev * 1000 / (8 * r) * 1.5) {
      recommendations.push("Surface finish worse than theoretical — check tool condition");
    }
    if (qualityGrade === "marginal" || qualityGrade === "unacceptable") {
      recommendations.push("Surface integrity may not meet fatigue-critical requirements");
    }

    return {
      roughness: {
        Ra_um: Math.round(Ra_um * 100) / 100,
        Rz_um: Math.round(Rz_um * 100) / 100,
        Rt_um: Math.round(Rt_um * 100) / 100,
        theoretical_Ra_um: Math.round(theoreticalRa_um * 100) / 100,
        metallurgical_degradation_pct: Math.round(metallurgicalDegradation),
      },
      residual_stress: {
        surface_stress_MPa: netSurfaceStress,
        stress_type: stressType,
        max_compressive_MPa: Math.round(mechanicalStress),
        max_compressive_depth_um: Math.round(maxCompressiveDepth),
        crossover_depth_um: Math.round(crossoverDepth),
        affected_depth_um: Math.round(affectedDepth),
      },
      microhardness: {
        surface_hardness_HV: Math.round(surfaceHardness_HV),
        bulk_hardness_HV: Math.round(bulkHardness_HV),
        hardness_gradient: hardnessGradient,
        affected_depth_um: Math.round(affectedDepth * 0.8),
      },
      fatigue_life_impact: {
        factor: Math.round(fatigueLifeFactor * 100) / 100,
        dominant_influence: dominantInfluence,
      },
      corrosion_susceptibility: {
        rating: corrosionRating,
        sensitization_risk: sensitizationRisk,
      },
      quality_grade: qualityGrade,
      recommendations,
    };
  }

  // ==========================================================================
  // TOOL-MATERIAL INTERACTION & WEAR MECHANISM
  // ==========================================================================

  /**
   * Predict dominant tool wear mechanism based on tool-workpiece interaction.
   * Models chemical affinity, diffusion, adhesion, and BUE formation.
   */
  predictToolWearMechanism(input: ToolMaterialInput): ToolMaterialResult {
    log.debug(`[${this.engineId}] Predicting tool wear for ${input.workpiece_material}`);

    const recommendations: string[] = [];

    // Get material properties
    const isoGroup = input.workpiece_iso_group;
    const kienzle = CANONICAL_KIENZLE[isoGroup];

    // Calculate cutting temperature if not provided
    const k_thermal = isoGroup === "M" ? 16 : isoGroup === "S" ? 10 : isoGroup === "N" ? 150 : 50;
    const cuttingTemp = input.cutting_temperature_C ?? estimateCuttingTemperature(
      input.cutting_speed_m_min,
      input.feed_mm_rev,
      k_thermal
    );

    // --- Chemical Affinity Analysis ---
    // Different tool materials have varying chemical affinity with workpieces
    const AFFINITY_MATRIX: Record<string, Record<string, number>> = {
      carbide: {
        P: 0.4, M: 0.5, K: 0.2, N: 0.3, S: 0.9, H: 0.3,
      },
      cermet: {
        P: 0.3, M: 0.4, K: 0.2, N: 0.3, S: 0.7, H: 0.25,
      },
      ceramic: {
        P: 0.2, M: 0.3, K: 0.15, N: 0.2, S: 0.5, H: 0.15,
      },
      cbn: {
        P: 0.1, M: 0.2, K: 0.1, N: 0.6, S: 0.3, H: 0.05,
      },
      pcd: {
        P: 0.8, M: 0.7, K: 0.2, N: 0.1, S: 0.5, H: 0.9,
      },
      hss: {
        P: 0.5, M: 0.6, K: 0.3, N: 0.4, S: 0.8, H: 0.5,
      },
    };

    const baseAffinity = AFFINITY_MATRIX[input.tool_material]?.[isoGroup] ?? 0.5;

    // Temperature increases diffusion exponentially
    const tempFactor = Math.exp((cuttingTemp - 500) / 300);
    const effectiveAffinity = Math.min(1, baseAffinity * tempFactor);

    let affinityLevel: ToolMaterialResult["chemical_affinity"]["level"];
    if (effectiveAffinity >= 0.8) affinityLevel = "severe";
    else if (effectiveAffinity >= 0.6) affinityLevel = "high";
    else if (effectiveAffinity >= 0.4) affinityLevel = "moderate";
    else if (effectiveAffinity >= 0.2) affinityLevel = "low";
    else affinityLevel = "none";

    // Elements involved in diffusion
    const diffusionElements: string[] = [];
    if (isoGroup === "S") {
      diffusionElements.push("Ti", "Co", "W");
    } else if (isoGroup === "M") {
      diffusionElements.push("Cr", "Ni", "Fe");
    } else if (isoGroup === "P") {
      diffusionElements.push("Fe", "C");
    }

    // --- Built-Up Edge Analysis ---
    // BUE forms at intermediate temperatures and low speeds
    const BUE_TENDENCY: Record<ISOGroup, number> = {
      P: 0.6, M: 0.5, K: 0.2, N: 0.8, S: 0.4, H: 0.1,
    };

    let bueTendency = BUE_TENDENCY[isoGroup];

    // Speed effect (BUE diminishes at high speed)
    if (input.cutting_speed_m_min > 200) bueTendency *= 0.3;
    else if (input.cutting_speed_m_min > 100) bueTendency *= 0.6;
    else if (input.cutting_speed_m_min < 50) bueTendency *= 1.3;

    // Temperature effect (BUE stable 300-400°C, unstable above 500°C)
    if (cuttingTemp < 300) bueTendency *= 1.2;
    else if (cuttingTemp > 500) bueTendency *= 0.4;

    // Coating effect on BUE
    if (input.tool_coating && input.tool_coating !== "uncoated") {
      bueTendency *= 0.7;
    }

    let bueRisk: ToolMaterialResult["built_up_edge"]["risk"];
    if (bueTendency >= 0.7) bueRisk = "high";
    else if (bueTendency >= 0.4) bueRisk = "moderate";
    else if (bueTendency >= 0.2) bueRisk = "low";
    else bueRisk = "none";

    const stableBue = cuttingTemp >= 300 && cuttingTemp <= 400 && bueTendency >= 0.4;
    const bueFinishEffect = stableBue ?
      "Stable BUE may improve finish temporarily" :
      bueTendency >= 0.4 ? "Unstable BUE degrades finish" : "Minimal effect";

    // --- Coating Effectiveness ---
    let coatingEffectiveness = {
      thermal_barrier: 0,
      chemical_barrier: 0,
      adhesion_prevention: 0,
      expected_life_multiplier: 1.0,
    };

    if (input.tool_coating && input.tool_coating !== "uncoated") {
      const COATING_PROPS: Record<string, { thermal: number; chemical: number; adhesion: number; life: number }> = {
        TiN: { thermal: 0.5, chemical: 0.4, adhesion: 0.5, life: 1.5 },
        TiCN: { thermal: 0.6, chemical: 0.5, adhesion: 0.6, life: 1.8 },
        TiAlN: { thermal: 0.8, chemical: 0.7, adhesion: 0.7, life: 2.2 },
        AlTiN: { thermal: 0.85, chemical: 0.75, adhesion: 0.75, life: 2.5 },
        Al2O3: { thermal: 0.9, chemical: 0.8, adhesion: 0.5, life: 2.0 },
        CVD_multilayer: { thermal: 0.85, chemical: 0.8, adhesion: 0.7, life: 2.8 },
        PVD_multilayer: { thermal: 0.75, chemical: 0.7, adhesion: 0.8, life: 2.3 },
      };

      const props = COATING_PROPS[input.tool_coating];
      if (props) {
        coatingEffectiveness = {
          thermal_barrier: props.thermal,
          chemical_barrier: props.chemical,
          adhesion_prevention: props.adhesion,
          expected_life_multiplier: props.life,
        };
      }
    }

    // --- Determine Dominant Wear Mechanism ---
    interface WearScore { mechanism: WearMechanism; score: number }
    const wearScores: WearScore[] = [];

    // Abrasion — high for hard/abrasive materials
    const abrasionScore = (isoGroup === "H" ? 0.9 : isoGroup === "K" ? 0.7 : isoGroup === "S" ? 0.5 : 0.4) *
      (kienzle.kc1_1 / 2000);
    wearScores.push({ mechanism: "abrasion", score: abrasionScore });

    // Adhesion — high for soft/gummy materials
    const adhesionScore = bueTendency * 0.8;
    wearScores.push({ mechanism: "adhesion", score: adhesionScore });

    // Diffusion — temperature dependent
    const diffusionScore = effectiveAffinity * (cuttingTemp > 600 ? 1.0 : cuttingTemp > 400 ? 0.5 : 0.2);
    wearScores.push({ mechanism: "diffusion", score: diffusionScore });

    // Oxidation — high speed, high temp
    const oxidationScore = (cuttingTemp > 700 ? 0.8 : cuttingTemp > 500 ? 0.4 : 0.1) *
      (input.tool_coating?.includes("Al") ? 0.3 : 1.0);
    wearScores.push({ mechanism: "oxidation", score: oxidationScore });

    // Thermal cracking — interrupted cuts, thermal cycling
    const thermalCrackScore = cuttingTemp > 600 ? 0.5 : 0.2;
    wearScores.push({ mechanism: "thermal_cracking", score: thermalCrackScore });

    // Plastic deformation — very high temps
    const plasticDefScore = cuttingTemp > 800 ? 0.7 : cuttingTemp > 700 ? 0.3 : 0.1;
    wearScores.push({ mechanism: "plastic_deformation", score: plasticDefScore });

    // Sort by score
    wearScores.sort((a, b) => b.score - a.score);

    const dominantMechanism = wearScores[0].mechanism;
    const secondaryMechanisms = wearScores
      .filter(w => w.score > wearScores[0].score * 0.5 && w.mechanism !== dominantMechanism)
      .map(w => w.mechanism);

    // --- Wear Rate Prediction ---
    // Simplified Usui-type model
    const baseFlankRate = 0.5 * (kienzle.kc1_1 / 2000) * (input.cutting_speed_m_min / 100);
    const baseCraterRate = effectiveAffinity * 0.3 * Math.exp((cuttingTemp - 500) / 200);

    // Coating reduction
    const coatingReduction = 1 - coatingEffectiveness.expected_life_multiplier * 0.3;

    const flankWearRate = baseFlankRate * coatingReduction;
    const craterWearRate = baseCraterRate * (1 - coatingEffectiveness.chemical_barrier * 0.8);

    // Notch wear risk
    let notchRisk: ToolMaterialResult["wear_rate_prediction"]["notch_wear_risk"] = "none";
    if (isoGroup === "S" || isoGroup === "M") {
      notchRisk = "high"; // work hardening creates notch at depth of cut line
    } else if (isoGroup === "H") {
      notchRisk = "moderate";
    }

    // --- Generate Recommendations ---
    if (dominantMechanism === "diffusion") {
      recommendations.push("Diffusion wear dominant — use Al2O3 or AlTiN coated tools");
    }
    if (dominantMechanism === "adhesion") {
      recommendations.push("Adhesion wear dominant — increase speed or use polished/coated tools");
    }
    if (dominantMechanism === "abrasion") {
      recommendations.push("Abrasion wear dominant — use hard coating (TiAlN, Al2O3) or ceramic");
    }
    if (notchRisk === "high") {
      recommendations.push("High notch wear risk — vary depth of cut or use round insert");
    }
    if (effectiveAffinity > 0.6 && input.tool_material === "carbide") {
      recommendations.push("High chemical affinity — consider ceramic or CBN tooling");
    }

    return {
      dominant_wear_mechanism: dominantMechanism,
      secondary_wear_mechanisms: secondaryMechanisms,
      chemical_affinity: {
        level: affinityLevel,
        diffusion_risk: effectiveAffinity > 0.5 && cuttingTemp > 500,
        affected_elements: diffusionElements,
      },
      built_up_edge: {
        risk: bueRisk,
        stable_bue: stableBue,
        effect_on_finish: bueFinishEffect,
      },
      coating_effectiveness: coatingEffectiveness,
      wear_rate_prediction: {
        flank_wear_um_per_min: Math.round(flankWearRate * 100) / 100,
        crater_wear_um_per_min: Math.round(craterWearRate * 100) / 100,
        notch_wear_risk: notchRisk,
      },
      recommendations,
    };
  }

  // ==========================================================================
  // MATERIAL-SPECIFIC CUTTING STRATEGY
  // ==========================================================================

  /**
   * Select optimal cutting strategy based on material class.
   * Provides tooling, parameters, and metallurgical considerations.
   */
  selectMaterialStrategy(input: MaterialStrategyInput): MaterialStrategyResult {
    log.debug(`[${this.engineId}] Selecting strategy for ${input.material_class}`);

    const recommendations: string[] = [];
    const metallurgicalWarnings: string[] = [];

    // Normalize material class
    const matClass = input.material_class.toLowerCase();

    // --- Tool Steel Strategy ---
    if (matClass.includes("d2") || matClass.includes("m2") || matClass.includes("s7") ||
        matClass.includes("a2") || matClass.includes("h13") || matClass.includes("o1") ||
        matClass.includes("tool_steel")) {

      const toolSteel = TOOL_STEEL_DB[matClass.toUpperCase()] ?? TOOL_STEEL_DB.D2;
      const isHardened = (input.hardness_HRC ?? 0) >= 45;

      if (isHardened) {
        metallurgicalWarnings.push(`Carbide volume ${toolSteel.carbide_volume_pct}% — expect rapid abrasive wear`);
        metallurgicalWarnings.push(`Primary carbide ${toolSteel.primary_carbide} is highly abrasive`);

        if (input.operation === "finishing" && (input.hardness_HRC ?? 0) >= 55) {
          metallurgicalWarnings.push("White layer risk at high speeds — monitor surface hardness");
        }

        return {
          recommended_tool_material: (input.hardness_HRC ?? 0) >= 58 ? "CBN" : "Ceramic (mixed Al2O3-TiC)",
          recommended_coating: "None (for ceramic/CBN)",
          recommended_geometry: {
            insert_shape: "CNGA/DNGA",
            nose_radius_mm: input.operation === "finishing" ? 0.4 : 0.8,
            rake_angle_deg: -6,
            clearance_angle_deg: 7,
            edge_prep: "Chamfer 0.1mm × 20°",
          },
          cutting_parameters: {
            speed_m_min: { min: 80, optimal: 120, max: 180 },
            feed_mm_rev: { min: 0.05, optimal: 0.10, max: 0.15 },
            depth_mm: { min: 0.1, optimal: 0.2, max: 0.5 },
          },
          coolant_strategy: {
            type: "Dry or air blast",
          },
          chip_control: {
            expected_form: "Powder/segmented",
            chipbreaker: "Negative land geometry",
          },
          special_considerations: [
            "Hard turning generates significant heat — thermal shock risk",
            "Interrupted cuts require tougher CBN grade",
            "Surface white layer must be verified if fatigue-critical",
          ],
          metallurgical_warnings: metallurgicalWarnings,
        };
      } else {
        // Annealed tool steel
        metallurgicalWarnings.push("Annealed condition — watch for work hardening during rough passes");
        metallurgicalWarnings.push(`Machinability index: ${(toolSteel.machinability_annealed * 100).toFixed(0)}%`);

        return {
          recommended_tool_material: "Coated carbide",
          recommended_coating: "TiAlN or AlTiN",
          recommended_geometry: {
            insert_shape: "CNMG",
            nose_radius_mm: 0.8,
            rake_angle_deg: 0,
            clearance_angle_deg: 7,
            edge_prep: "Honed 0.05mm",
          },
          cutting_parameters: {
            speed_m_min: { min: 60, optimal: 100, max: 150 },
            feed_mm_rev: { min: 0.10, optimal: 0.20, max: 0.30 },
            depth_mm: { min: 0.5, optimal: 1.5, max: 3.0 },
          },
          coolant_strategy: {
            type: "Flood",
            pressure_bar: 10,
            flow_rate_lpm: 20,
          },
          chip_control: {
            expected_form: "Continuous — stringy",
            chipbreaker: "M or MR geometry",
          },
          special_considerations: [
            "Pre-heat treat machining — leave finish stock for grinding",
            "Carbides are softer in annealed state but still abrasive",
          ],
          metallurgical_warnings: metallurgicalWarnings,
        };
      }
    }

    // --- Stainless Steel Strategy ---
    if (matClass.includes("304") || matClass.includes("316") || matClass.includes("303") ||
        matClass.includes("410") || matClass.includes("17-4") || matClass.includes("2205") ||
        matClass.includes("stainless")) {

      const stainless = STAINLESS_DB[matClass.replace(/[^0-9\-]/g, "")] ?? STAINLESS_DB["304"];

      metallurgicalWarnings.push(`Work hardening exponent n=${stainless.work_hardening_n.toFixed(2)} — ${stainless.work_hardening_n > 0.35 ? "SEVERE" : "moderate"}`);

      if (stainless.type === "austenitic") {
        metallurgicalWarnings.push("Austenitic — extremely gummy, high BUE tendency");
        metallurgicalWarnings.push("Avoid rubbing/light cuts that only work-harden surface");

        if (stainless.sensitization_risk) {
          metallurgicalWarnings.push("Sensitization possible at 450-850°C — avoid this temperature range");
        }
      } else if (stainless.type === "duplex") {
        metallurgicalWarnings.push("Duplex structure — high strength, difficult chip breaking");
      } else if (stainless.type === "precipitation_hardening") {
        metallurgicalWarnings.push("PH stainless — solution treat condition easier to machine than aged");
      }

      return {
        recommended_tool_material: "Coated carbide (high cobalt substrate)",
        recommended_coating: stainless.galling_tendency > 0.6 ? "TiAlN" : "TiCN",
        recommended_geometry: {
          insert_shape: stainless.type === "austenitic" ? "CCMT" : "CNMG",
          nose_radius_mm: 0.8,
          rake_angle_deg: stainless.type === "austenitic" ? 12 : 6,
          clearance_angle_deg: 11,
          edge_prep: "Sharp or light hone",
        },
        cutting_parameters: {
          speed_m_min: {
            min: 80,
            optimal: stainless.machinability * 200,
            max: stainless.machinability * 280
          },
          feed_mm_rev: { min: 0.12, optimal: 0.20, max: 0.35 },
          depth_mm: { min: 0.5, optimal: 1.5, max: 4.0 },
        },
        coolant_strategy: {
          type: "High-pressure flood",
          pressure_bar: 70,
          flow_rate_lpm: 40,
        },
        chip_control: {
          expected_form: "Continuous — stringy, poor chip breaking",
          chipbreaker: "Aggressive chip breaker geometry",
        },
        special_considerations: [
          "Positive rake essential to minimize work hardening",
          "Sharp tools only — never use worn edges",
          "Feed rate must exceed work-hardened layer depth",
          "Avoid interrupted cuts if possible",
        ],
        metallurgical_warnings: metallurgicalWarnings,
      };
    }

    // --- Superalloy Strategy ---
    if (matClass.includes("inconel") || matClass.includes("ti-6al-4v") || matClass.includes("titanium") ||
        matClass.includes("waspaloy") || matClass.includes("stellite") || matClass.includes("nickel")) {

      const superalloy = SUPERALLOY_DB[matClass.includes("718") ? "Inconel 718" :
        matClass.includes("ti") ? "Ti-6Al-4V" : "Inconel 718"];

      metallurgicalWarnings.push(`High chemical affinity with carbide: ${(superalloy.chemical_affinity_carbide * 100).toFixed(0)}%`);
      metallurgicalWarnings.push(`Strain rate sensitivity C=${superalloy.strain_rate_sensitivity} — cutting forces increase at high speed`);

      if (superalloy.gamma_prime_pct) {
        metallurgicalWarnings.push(`γ' strengthened (${superalloy.gamma_prime_pct}%) — maintains strength at high temperature`);
      }
      if (superalloy.base === "titanium") {
        metallurgicalWarnings.push("Titanium — low thermal conductivity traps heat in tool");
        metallurgicalWarnings.push("Chip re-welding/ignition risk — never use dry");
      }

      return {
        recommended_tool_material: superalloy.base === "titanium" ? "Uncoated carbide (sharp edge)" : "Ceramic (SiAlON)",
        recommended_coating: superalloy.base === "titanium" ? "None (coating adds edge radius)" : "None",
        recommended_geometry: {
          insert_shape: "RCMT (round)",
          nose_radius_mm: 6.0, // full round for notch resistance
          rake_angle_deg: superalloy.base === "titanium" ? 10 : 0,
          clearance_angle_deg: 15,
          edge_prep: "Sharp (<10µm edge radius)",
        },
        cutting_parameters: {
          speed_m_min: {
            min: superalloy.base === "titanium" ? 30 : 100,
            optimal: superalloy.base === "titanium" ? 50 : 200,
            max: superalloy.base === "titanium" ? 80 : 350,
          },
          feed_mm_rev: { min: 0.10, optimal: 0.15, max: 0.25 },
          depth_mm: { min: 0.3, optimal: 0.8, max: 2.0 },
        },
        coolant_strategy: {
          type: superalloy.base === "titanium" ? "High-pressure flood" : "Flood or dry (ceramic)",
          pressure_bar: superalloy.base === "titanium" ? 100 : 20,
          flow_rate_lpm: 60,
        },
        chip_control: {
          expected_form: superalloy.base === "titanium" ? "Segmented (serrated)" : "Continuous",
          chipbreaker: "Open geometry — avoid chip jamming",
        },
        special_considerations: [
          "Diffusion wear dominant at high temperatures",
          "Round inserts prevent notch wear from work-hardened layer",
          "Vary depth of cut to distribute wear",
          superalloy.base === "titanium" ?
            "NEVER machine titanium dry — fire/explosion hazard" :
            "Ceramic tooling allows higher speeds",
        ],
        metallurgical_warnings: metallurgicalWarnings,
      };
    }

    // --- Aluminum Strategy ---
    if (matClass.includes("6061") || matClass.includes("7075") || matClass.includes("2024") ||
        matClass.includes("a356") || matClass.includes("a380") || matClass.includes("aluminum")) {

      const aluminum = ALUMINUM_DB[matClass.includes("6061") ? "6061-T6" :
        matClass.includes("7075") ? "7075-T6" : "6061-T6"];

      metallurgicalWarnings.push(`BUE tendency: ${(aluminum.bue_tendency * 100).toFixed(0)}% — ${aluminum.bue_tendency > 0.5 ? "use high speed or PCD" : "manageable"}`);
      metallurgicalWarnings.push(`Smearing tendency: ${(aluminum.smearing_tendency * 100).toFixed(0)}%`);

      if (aluminum.si_content_pct > 5) {
        metallurgicalWarnings.push(`High silicon ${aluminum.si_content_pct}% — abrasive, use PCD tooling`);
      }

      const needsPCD = aluminum.si_content_pct > 5;

      return {
        recommended_tool_material: needsPCD ? "PCD" : "Polished uncoated carbide",
        recommended_coating: needsPCD ? "None" : "DLC (optional) or uncoated",
        recommended_geometry: {
          insert_shape: "CCGT",
          nose_radius_mm: 0.4,
          rake_angle_deg: 20,
          clearance_angle_deg: 15,
          edge_prep: "Mirror polished, sharp",
        },
        cutting_parameters: {
          speed_m_min: {
            min: 300,
            optimal: needsPCD ? 800 : 500,
            max: needsPCD ? 2000 : 1000,
          },
          feed_mm_rev: { min: 0.08, optimal: 0.15, max: 0.30 },
          depth_mm: { min: 0.3, optimal: 1.0, max: 5.0 },
        },
        coolant_strategy: {
          type: "Flood or MQL",
          pressure_bar: 5,
          flow_rate_lpm: 30,
        },
        chip_control: {
          expected_form: "Continuous — long stringy chips",
          chipbreaker: "Aggressive chipbreaker essential",
        },
        special_considerations: [
          "High rake angle essential to prevent BUE",
          "Polished tool faces reduce adhesion",
          "Very high speeds (>500 m/min) eliminate BUE",
          needsPCD ? "PCD required for high-Si castings" : "Uncoated carbide preferred for wrought",
        ],
        metallurgical_warnings: metallurgicalWarnings,
      };
    }

    // --- Cast Iron Strategy ---
    if (matClass.includes("grey") || matClass.includes("nodular") || matClass.includes("ductile") ||
        matClass.includes("cgi") || matClass.includes("adi") || matClass.includes("cast_iron")) {

      const castIron = CAST_IRON_DB[matClass.includes("grey") ? "grey_FC200" :
        matClass.includes("nodular") || matClass.includes("ductile") ? "nodular_FCD450" :
        matClass.includes("adi") ? "ADI" :
        matClass.includes("cgi") ? "CGI" : "grey_FC200"];

      metallurgicalWarnings.push(`Graphite form: ${castIron.graphite_form} — ${castIron.graphite_form === "flake" ? "good lubrication, short chips" : "continuous chips, higher strength"}`);
      metallurgicalWarnings.push(`Matrix: ${castIron.matrix} — ${castIron.matrix === "pearlitic" ? "abrasive" : "gummy if ferritic"}`);

      if (castIron.name.includes("ADI")) {
        metallurgicalWarnings.push("Austempered ductile iron — extremely abrasive, difficult to machine");
      }
      if (castIron.name.includes("CGI")) {
        metallurgicalWarnings.push("Compacted graphite — 3-5x shorter tool life than grey iron");
      }

      const isADI = castIron.name.includes("ADI");
      const isCGI = castIron.name.includes("CGI");

      return {
        recommended_tool_material: isADI ? "CBN" : isCGI ? "Ceramic (SiAlON)" : "Coated carbide",
        recommended_coating: isADI || isCGI ? "None" : "Al2O3 (CVD multilayer)",
        recommended_geometry: {
          insert_shape: castIron.graphite_form === "flake" ? "SNMG" : "CNMG",
          nose_radius_mm: 0.8,
          rake_angle_deg: castIron.graphite_form === "flake" ? 0 : 6,
          clearance_angle_deg: 7,
          edge_prep: isADI ? "Chamfer + hone" : "Light hone",
        },
        cutting_parameters: {
          speed_m_min: {
            min: isADI ? 60 : isCGI ? 100 : 150,
            optimal: isADI ? 100 : isCGI ? 180 : 250,
            max: isADI ? 150 : isCGI ? 250 : 400,
          },
          feed_mm_rev: { min: 0.15, optimal: 0.25, max: 0.40 },
          depth_mm: { min: 0.5, optimal: 2.0, max: 5.0 },
        },
        coolant_strategy: {
          type: castIron.graphite_form === "flake" ? "Dry (graphite lubricates)" : "Flood",
          pressure_bar: 10,
          flow_rate_lpm: 20,
        },
        chip_control: {
          expected_form: castIron.chip_type,
          chipbreaker: castIron.chip_type === "discontinuous" ? "Open face" : "Standard",
        },
        special_considerations: [
          castIron.graphite_form === "flake" ?
            "Free graphite provides lubrication — dry cutting preferred" :
            "Nodular/CGI requires coolant for heat removal",
          "Graphite dust is abrasive — keep work area clean",
          "Ferrite-heavy castings can work-harden",
        ],
        metallurgical_warnings: metallurgicalWarnings,
      };
    }

    // --- Default Strategy (Generic Steel) ---
    return {
      recommended_tool_material: "Coated carbide",
      recommended_coating: "CVD TiCN-Al2O3-TiN multilayer",
      recommended_geometry: {
        insert_shape: "CNMG",
        nose_radius_mm: 0.8,
        rake_angle_deg: 6,
        clearance_angle_deg: 7,
        edge_prep: "Standard hone",
      },
      cutting_parameters: {
        speed_m_min: { min: 150, optimal: 250, max: 350 },
        feed_mm_rev: { min: 0.15, optimal: 0.25, max: 0.40 },
        depth_mm: { min: 0.5, optimal: 2.0, max: 5.0 },
      },
      coolant_strategy: {
        type: "Flood",
        pressure_bar: 10,
        flow_rate_lpm: 20,
      },
      chip_control: {
        expected_form: "Continuous",
        chipbreaker: "M geometry",
      },
      special_considerations: [
        "General steel cutting parameters",
        "Adjust based on specific alloy and condition",
      ],
      metallurgical_warnings: ["Material not in database — verify parameters with test cuts"],
    };
  }

  // ==========================================================================
  // UTILITY METHODS
  // ==========================================================================

  /**
   * Get available tool steel grades with their properties.
   */
  getToolSteelDatabase(): Record<string, ToolSteelProperties> {
    return { ...TOOL_STEEL_DB };
  }

  /**
   * Get available stainless steel grades with their properties.
   */
  getStainlessDatabase(): Record<string, StainlessSteelProperties> {
    return { ...STAINLESS_DB };
  }

  /**
   * Get available superalloy grades with their properties.
   */
  getSuperalloyDatabase(): Record<string, SuperalloyProperties> {
    return { ...SUPERALLOY_DB };
  }

  /**
   * Get available aluminum alloy grades with their properties.
   */
  getAluminumDatabase(): Record<string, AluminumProperties> {
    return { ...ALUMINUM_DB };
  }

  /**
   * Get available cast iron grades with their properties.
   */
  getCastIronDatabase(): Record<string, CastIronProperties> {
    return { ...CAST_IRON_DB };
  }

  /**
   * Calculate critical temperatures for any steel composition.
   */
  calculateCriticalTemperatures(
    carbonPct: number,
    alloys: Record<string, number> = {}
  ): { Ac1_C: number; Ac3_C: number; Ms_C: number; Mf_C: number } {
    return calculateCriticalTemps(carbonPct, alloys);
  }

  /**
   * Calculate Hall-Petch strengthening from grain size.
   */
  calculateGrainSizeStrengthening(grainSizeASTM: number): {
    grain_diameter_mm: number;
    strengthening_MPa: number;
    force_multiplier: number;
  } {
    const d = grainDiameter_mm(grainSizeASTM);
    const strength = hallPetchStrength(d);
    return {
      grain_diameter_mm: Math.round(d * 1000) / 1000,
      strengthening_MPa: Math.round(strength),
      force_multiplier: Math.round((1.0 + (grainSizeASTM - 5) * 0.03) * 100) / 100,
    };
  }

  /**
   * Calculate flow stress from Hollomon equation.
   */
  calculateHollomonFlowStress(
    strain: number,
    materialClass: string
  ): { flow_stress_MPa: number; K_MPa: number; n: number } {
    const key = materialClass.toLowerCase().replace(/[\s-]/g, "_");
    const n = STRAIN_HARDENING_N[key] ?? 0.20;
    const K = STRENGTH_COEFF_K[key] ?? 700;
    const flowStress = hollomonFlowStress(strain, K, n);

    return {
      flow_stress_MPa: Math.round(flowStress),
      K_MPa: K,
      n,
    };
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const latheMetallurgyEngine = new LatheMetallurgyEngine();
