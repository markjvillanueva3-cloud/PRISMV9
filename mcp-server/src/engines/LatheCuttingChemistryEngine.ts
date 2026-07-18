/**
 * LatheCuttingChemistryEngine — Chemical phenomena in lathe cutting operations
 *
 * Models: Coolant chemistry (pH, HLB, biocides), oxidation kinetics (Arrhenius),
 *         diffusion mechanisms (Fick's law + temperature), chemical wear,
 *         material-coolant compatibility, environmental/safety factors
 *
 * References:
 *   - NIOSH Metalworking Fluids Guidelines (2013)
 *   - Machinery's Handbook 31st ed., Chapter 23 (Cutting Fluids)
 *   - Brinksmeier et al., "Metalworking Fluids — Mechanisms and Performance", CIRP Annals (2015)
 *   - Trent & Wright, "Metal Cutting", 4th ed., Chapter 10 (Tool Wear)
 *   - Klocke & Eisenblätter, "Dry Cutting", CIRP Annals (1997)
 *   - Childs et al., "Metal Machining: Theory and Applications", Chapter 5
 *
 * @module LatheCuttingChemistryEngine
 */

import { log } from "../utils/Logger.js";

// ============================================================================
// PHYSICAL CONSTANTS
// ============================================================================

/** Universal gas constant (J/(mol·K)) */
const R_GAS = 8.314;

/** Absolute zero offset (K) */
const KELVIN_OFFSET = 273.15;

/** Standard atmospheric pressure (kPa) */
const ATMOSPHERIC_PRESSURE_KPA = 101.325;

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

// --- Coolant Types ---

export type CoolantBaseType =
  | "water_soluble_oil"      // Mineral oil emulsions
  | "semi_synthetic"         // Partial mineral + synthetic
  | "full_synthetic"         // No mineral oil, all synthetic
  | "straight_oil"           // Neat cutting oil, no water
  | "vegetable_ester"        // Bio-based oils
  | "mql_oil";               // Minimum quantity lubrication oil

export type CoolantAdditive =
  | "ep_sulfur"              // Extreme pressure - sulfurized
  | "ep_chlorine"            // Extreme pressure - chlorinated
  | "ep_phosphorus"          // Extreme pressure - phosphorus
  | "fatty_acid"             // Lubricity - fatty acids
  | "ester"                  // Lubricity - synthetic esters
  | "amine"                  // Corrosion inhibitor
  | "borate"                 // Corrosion + pH buffer
  | "triazole"               // Yellow metal corrosion inhibitor
  | "biocide_formaldehyde"   // Biocide - formaldehyde releaser
  | "biocide_isothiazolinone"// Biocide - isothiazolinone
  | "biocide_triazine"       // Biocide - triazine
  | "antifoam_silicone"      // Defoamer - silicone
  | "antifoam_mineral"       // Defoamer - mineral oil
  | "emulsifier_nonionic"    // Emulsifier - nonionic surfactant
  | "emulsifier_anionic";    // Emulsifier - anionic surfactant

// --- Material Types ---

export type WorkpieceMaterial =
  | "carbon_steel"
  | "alloy_steel"
  | "stainless_304"
  | "stainless_316"
  | "stainless_17_4"
  | "tool_steel_d2"
  | "tool_steel_m2"
  | "tool_steel_a2"
  | "cast_iron_gray"
  | "cast_iron_ductile"
  | "aluminum_6061"
  | "aluminum_7075"
  | "aluminum_2024"
  | "copper_c110"
  | "brass_c360"
  | "bronze_c932"
  | "titanium_grade2"
  | "titanium_6al4v"
  | "inconel_718"
  | "inconel_625"
  | "hastelloy_c276"
  | "magnesium_az31"
  | "cobalt_chrome";

export type ToolMaterial =
  | "hss"
  | "carbide_uncoated"
  | "carbide_cvd"
  | "carbide_pvd"
  | "cermet"
  | "ceramic_al2o3"
  | "ceramic_sialon"
  | "cbn"
  | "pcd";

export type ToolCoating =
  | "none"
  | "TiN"
  | "TiCN"
  | "TiAlN"
  | "AlTiN"
  | "AlCrN"
  | "CVD_Al2O3"
  | "CVD_TiCN_Al2O3"
  | "DLC";

// --- Operation Types ---

export type LatheOperation =
  | "od_roughing"
  | "od_finishing"
  | "id_boring_rough"
  | "id_boring_finish"
  | "facing"
  | "grooving"
  | "parting"
  | "threading_external"
  | "threading_internal"
  | "drilling"
  | "tapping";

// --- Wear Mechanism Types ---

export type ChemicalWearMechanism =
  | "dissolution"            // Material dissolves into tool
  | "diffusion"              // Atomic diffusion across interface
  | "oxidation"              // High-temp oxidation wear
  | "tribochemical"          // Reaction products at interface
  | "corrosion"              // Coolant-induced corrosion
  | "attrition";             // Grain-by-grain removal

// --- Compatibility Rating ---

export type CompatibilityRating =
  | "excellent"              // No issues expected
  | "good"                   // Minor precautions needed
  | "fair"                   // Significant precautions
  | "poor"                   // Avoid if possible
  | "prohibited";            // Never use this combination

// ============================================================================
// INPUT/OUTPUT INTERFACES
// ============================================================================

export interface AtomicValue {
  value: number;
  unit: string;
  uncertainty: number;
  source: string;
  warning?: string;
}

// --- Coolant Chemistry ---

export interface CoolantChemistryInput {
  coolant_type: CoolantBaseType;
  concentration_pct?: number;        // For water-based (default 5%)
  water_hardness_ppm?: number;       // CaCO3 equivalent
  ph_measured?: number;
  temperature_C?: number;
  age_weeks?: number;                // Time since mixing
  tramp_oil_pct?: number;            // Contamination level
}

export interface CoolantChemistryResult {
  effective_ph: AtomicValue;
  hlb_value: AtomicValue;            // Hydrophilic-Lipophilic Balance
  emulsion_stability: AtomicValue;   // 0-1 stability index
  biocide_effectiveness: AtomicValue;// 0-1 effectiveness
  corrosion_risk: AtomicValue;       // 0-1 risk index
  recommended_adjustments: string[];
  safety_warnings: string[];
}

// --- Oxidation Kinetics ---

export interface OxidationInput {
  material: WorkpieceMaterial;
  temperature_C: number;
  time_minutes: number;
  atmosphere?: "air" | "inert" | "coolant_vapor";
  oxygen_partial_pressure_kPa?: number;
}

export interface OxidationResult {
  oxide_thickness_um: AtomicValue;
  oxidation_rate_um_per_min: AtomicValue;
  oxide_type: string;
  is_protective: boolean;
  scale_adherence: AtomicValue;      // 0-1 adherence factor
  parabolic_rate_constant: AtomicValue;
  recommendations: string[];
}

// --- Diffusion Wear ---

export interface DiffusionWearInput {
  tool_material: ToolMaterial;
  tool_coating?: ToolCoating;
  workpiece_material: WorkpieceMaterial;
  interface_temperature_C: number;
  contact_time_seconds: number;
  contact_pressure_MPa?: number;
}

export interface DiffusionWearResult {
  diffusion_depth_um: AtomicValue;
  diffusion_coefficient_m2_s: AtomicValue;
  activation_energy_kJ_mol: AtomicValue;
  primary_diffusing_species: string;
  wear_rate_um_per_hour: AtomicValue;
  coating_breakdown_time_min?: AtomicValue;
  recommendations: string[];
}

// --- Chemical Compatibility ---

export interface CompatibilityInput {
  coolant_type: CoolantBaseType;
  additives: CoolantAdditive[];
  workpiece_material: WorkpieceMaterial;
  concentration_pct?: number;
}

export interface CompatibilityResult {
  overall_rating: CompatibilityRating;
  staining_risk: AtomicValue;        // 0-1 probability
  corrosion_risk: AtomicValue;       // 0-1 probability
  stress_corrosion_risk: AtomicValue;// 0-1 probability
  fire_risk: AtomicValue;            // 0-1 probability
  specific_reactions: string[];
  required_precautions: string[];
  alternative_coolants: CoolantBaseType[];
}

// --- Chemical Wear Assessment ---

export interface ChemicalWearInput {
  workpiece_material: WorkpieceMaterial;
  tool_material: ToolMaterial;
  tool_coating?: ToolCoating;
  cutting_speed_m_min: number;
  feed_mm_rev: number;
  depth_of_cut_mm: number;
  coolant_type?: CoolantBaseType;
  operation: LatheOperation;
}

export interface ChemicalWearResult {
  dominant_mechanism: ChemicalWearMechanism;
  mechanism_contributions: Record<ChemicalWearMechanism, AtomicValue>;
  total_chemical_wear_rate_um_per_min: AtomicValue;
  interface_temperature_C: AtomicValue;
  reaction_products: string[];
  mitigation_strategies: string[];
}

// --- Coolant Selection ---

export interface CoolantSelectionInput {
  workpiece_material: WorkpieceMaterial;
  operation: LatheOperation;
  cutting_speed_m_min: number;
  tool_material: ToolMaterial;
  surface_finish_required_Ra_um?: number;
  environmental_priority?: boolean;
  operator_sensitivity?: boolean;    // Skin sensitivity concerns
}

export interface CoolantSelectionResult {
  recommended_coolant: CoolantBaseType;
  recommended_additives: CoolantAdditive[];
  concentration_pct: AtomicValue;
  ph_target: AtomicValue;
  suitability_score: AtomicValue;    // 0-1
  alternatives: Array<{
    coolant: CoolantBaseType;
    score: number;
    reason: string;
  }>;
  chemistry_notes: string[];
}

// --- Coolant Concentration Optimization ---

export interface ConcentrationOptInput {
  coolant_type: CoolantBaseType;
  operation: LatheOperation;
  workpiece_material: WorkpieceMaterial;
  cutting_speed_m_min: number;
  current_concentration_pct?: number;
  tool_life_target_min?: number;
  surface_finish_target_Ra?: number;
}

export interface ConcentrationOptResult {
  optimal_concentration_pct: AtomicValue;
  lubricity_index: AtomicValue;      // 0-1
  cooling_capacity: AtomicValue;     // 0-1
  cost_per_liter: AtomicValue;
  projected_tool_life_improvement_pct: AtomicValue;
  projected_surface_finish_Ra: AtomicValue;
  recommendations: string[];
}

// --- Environmental & Safety ---

export interface EnvironmentalInput {
  coolant_type: CoolantBaseType;
  additives: CoolantAdditive[];
  sump_volume_liters: number;
  air_flow_m3_min?: number;
  enclosure_type?: "open" | "partial" | "full";
  spindle_rpm?: number;
}

export interface EnvironmentalResult {
  mist_generation_mg_m3: AtomicValue;
  voc_emissions_ppm: AtomicValue;
  flash_point_C: AtomicValue;
  fire_risk_level: "low" | "moderate" | "high" | "extreme";
  dermatitis_risk: AtomicValue;      // 0-1
  osha_compliance: boolean;
  niosh_rel_exceeded: boolean;
  required_ppe: string[];
  disposal_classification: string;
  recommendations: string[];
}

// ============================================================================
// MATERIAL CHEMISTRY DATABASES
// ============================================================================

/**
 * Oxidation parameters: parabolic rate constant pre-exponential (kp0) in kg²/(m⁴·s),
 * activation energy (Q) in kJ/mol, protective oxide flag
 * Reference: Kofstad, "High Temperature Corrosion" (1988)
 */
const OXIDATION_PARAMS: Record<string, {
  kp0: number;
  Q_kJ: number;
  oxide: string;
  protective: boolean;
  max_service_C: number;
}> = {
  carbon_steel:     { kp0: 2.5e-6, Q_kJ: 150, oxide: "Fe2O3/Fe3O4", protective: false, max_service_C: 570 },
  alloy_steel:      { kp0: 1.8e-6, Q_kJ: 160, oxide: "Fe2O3/FeCr2O4", protective: false, max_service_C: 600 },
  stainless_304:    { kp0: 1.2e-8, Q_kJ: 250, oxide: "Cr2O3", protective: true, max_service_C: 870 },
  stainless_316:    { kp0: 0.9e-8, Q_kJ: 260, oxide: "Cr2O3", protective: true, max_service_C: 900 },
  stainless_17_4:   { kp0: 1.5e-8, Q_kJ: 240, oxide: "Cr2O3", protective: true, max_service_C: 620 },
  tool_steel_d2:    { kp0: 1.0e-7, Q_kJ: 200, oxide: "Cr2O3/Fe3O4", protective: true, max_service_C: 540 },
  tool_steel_m2:    { kp0: 1.2e-7, Q_kJ: 195, oxide: "Fe2O3/WO3", protective: false, max_service_C: 620 },
  tool_steel_a2:    { kp0: 1.1e-7, Q_kJ: 190, oxide: "Cr2O3/Fe3O4", protective: true, max_service_C: 500 },
  cast_iron_gray:   { kp0: 3.0e-6, Q_kJ: 140, oxide: "Fe2O3", protective: false, max_service_C: 400 },
  cast_iron_ductile:{ kp0: 2.8e-6, Q_kJ: 145, oxide: "Fe2O3", protective: false, max_service_C: 450 },
  aluminum_6061:    { kp0: 1.0e-12, Q_kJ: 120, oxide: "Al2O3", protective: true, max_service_C: 200 },
  aluminum_7075:    { kp0: 1.2e-12, Q_kJ: 115, oxide: "Al2O3", protective: true, max_service_C: 180 },
  aluminum_2024:    { kp0: 1.1e-12, Q_kJ: 118, oxide: "Al2O3", protective: true, max_service_C: 175 },
  copper_c110:      { kp0: 5.0e-9, Q_kJ: 160, oxide: "Cu2O", protective: true, max_service_C: 300 },
  brass_c360:       { kp0: 8.0e-9, Q_kJ: 140, oxide: "ZnO/Cu2O", protective: false, max_service_C: 250 },
  bronze_c932:      { kp0: 6.0e-9, Q_kJ: 150, oxide: "Cu2O/SnO2", protective: true, max_service_C: 280 },
  titanium_grade2:  { kp0: 2.0e-10, Q_kJ: 200, oxide: "TiO2", protective: true, max_service_C: 500 },
  titanium_6al4v:   { kp0: 1.8e-10, Q_kJ: 210, oxide: "TiO2/Al2O3", protective: true, max_service_C: 540 },
  inconel_718:      { kp0: 5.0e-11, Q_kJ: 280, oxide: "NiO/Cr2O3", protective: true, max_service_C: 980 },
  inconel_625:      { kp0: 4.5e-11, Q_kJ: 285, oxide: "NiO/Cr2O3", protective: true, max_service_C: 1000 },
  hastelloy_c276:   { kp0: 3.0e-11, Q_kJ: 290, oxide: "NiO/MoO3", protective: true, max_service_C: 1050 },
  magnesium_az31:   { kp0: 1.0e-7, Q_kJ: 130, oxide: "MgO", protective: false, max_service_C: 150 },
  cobalt_chrome:    { kp0: 2.0e-10, Q_kJ: 270, oxide: "Cr2O3/CoO", protective: true, max_service_C: 1100 },
};

/**
 * Diffusion parameters for tool-workpiece pairs
 * D = D0 * exp(-Q / RT) [Arrhenius equation]
 * D0 in m²/s, Q in kJ/mol
 * Reference: Trent & Wright, "Metal Cutting", 4th ed.
 */
interface DiffusionPair {
  D0: number;
  Q_kJ: number;
  primary_species: string;
  notes: string;
}

const DIFFUSION_DATABASE: Record<string, Record<string, DiffusionPair>> = {
  carbide_uncoated: {
    carbon_steel:     { D0: 1.5e-4, Q_kJ: 160, primary_species: "C, Fe", notes: "Carbon diffusion into WC, Fe into Co binder" },
    alloy_steel:      { D0: 1.3e-4, Q_kJ: 165, primary_species: "C, Cr", notes: "Cr carbide formation at interface" },
    stainless_304:    { D0: 1.8e-4, Q_kJ: 155, primary_species: "Ni, Fe", notes: "Ni diffusion promotes crater wear" },
    stainless_316:    { D0: 1.7e-4, Q_kJ: 158, primary_species: "Ni, Mo", notes: "Mo migration accelerates wear" },
    titanium_grade2:  { D0: 3.5e-4, Q_kJ: 135, primary_species: "Ti, C", notes: "Severe Ti-C reaction, avoid uncoated" },
    titanium_6al4v:   { D0: 4.0e-4, Q_kJ: 130, primary_species: "Ti, Al", notes: "Extreme reactivity, coating mandatory" },
    inconel_718:      { D0: 2.5e-4, Q_kJ: 145, primary_species: "Ni, Nb", notes: "Nb carbide dissolution" },
    cast_iron_gray:   { D0: 0.8e-4, Q_kJ: 180, primary_species: "C", notes: "Graphite acts as diffusion barrier" },
  },
  carbide_pvd: {
    carbon_steel:     { D0: 0.3e-4, Q_kJ: 200, primary_species: "Fe", notes: "TiAlN barrier effective to 900°C" },
    alloy_steel:      { D0: 0.25e-4, Q_kJ: 210, primary_species: "Cr", notes: "Coating provides 5-10x life improvement" },
    stainless_304:    { D0: 0.4e-4, Q_kJ: 195, primary_species: "Ni", notes: "Coating critical for stainless" },
    titanium_6al4v:   { D0: 1.2e-4, Q_kJ: 170, primary_species: "Ti", notes: "Even coated, Ti very aggressive" },
    inconel_718:      { D0: 0.8e-4, Q_kJ: 185, primary_species: "Ni", notes: "AlCrN preferred coating" },
  },
  carbide_cvd: {
    carbon_steel:     { D0: 0.2e-4, Q_kJ: 220, primary_species: "Fe", notes: "Al2O3 layer excellent diffusion barrier" },
    alloy_steel:      { D0: 0.18e-4, Q_kJ: 225, primary_species: "Cr", notes: "Multi-layer CVD optimal for steel" },
    cast_iron_gray:   { D0: 0.15e-4, Q_kJ: 240, primary_species: "C", notes: "Excellent for cast iron roughing" },
    cast_iron_ductile:{ D0: 0.17e-4, Q_kJ: 235, primary_species: "C, Fe", notes: "Good performance" },
  },
  ceramic_al2o3: {
    carbon_steel:     { D0: 0.05e-4, Q_kJ: 300, primary_species: "Fe", notes: "Ceramic inert, minimal diffusion" },
    alloy_steel:      { D0: 0.04e-4, Q_kJ: 310, primary_species: "Cr", notes: "Excellent chemical stability" },
    cast_iron_gray:   { D0: 0.03e-4, Q_kJ: 320, primary_species: "None", notes: "Ideal for high-speed cast iron" },
    inconel_718:      { D0: 0.15e-4, Q_kJ: 270, primary_species: "Ni", notes: "SiAlON preferred for Ni alloys" },
  },
  ceramic_sialon: {
    inconel_718:      { D0: 0.08e-4, Q_kJ: 290, primary_species: "Ni", notes: "Excellent Ni-alloy performance" },
    inconel_625:      { D0: 0.07e-4, Q_kJ: 295, primary_species: "Ni", notes: "Primary choice for Inconel" },
    titanium_6al4v:   { D0: 0.2e-4, Q_kJ: 250, primary_species: "Ti", notes: "Fair performance, CBN preferred" },
  },
  cbn: {
    hardened_steel:   { D0: 0.02e-4, Q_kJ: 350, primary_species: "Fe", notes: "CBN chemically stable with steel" },
    inconel_718:      { D0: 0.05e-4, Q_kJ: 320, primary_species: "Ni", notes: "Excellent for finish Inconel" },
    cobalt_chrome:    { D0: 0.04e-4, Q_kJ: 330, primary_species: "Co", notes: "Good for Co-Cr alloys" },
  },
  pcd: {
    aluminum_6061:    { D0: 0.01e-4, Q_kJ: 400, primary_species: "None", notes: "Ideal for aluminum, no chemical wear" },
    aluminum_7075:    { D0: 0.01e-4, Q_kJ: 400, primary_species: "None", notes: "Excellent for aerospace Al" },
  },
};

/**
 * Material-coolant compatibility matrix
 * Defines chemical interactions between materials and coolant types
 */
interface CompatibilityEntry {
  rating: CompatibilityRating;
  staining_risk: number;       // 0-1
  corrosion_risk: number;      // 0-1
  stress_corrosion_risk: number;
  fire_risk: number;
  reactions: string[];
  precautions: string[];
}

const COMPATIBILITY_MATRIX: Record<string, Record<string, CompatibilityEntry>> = {
  aluminum_6061: {
    water_soluble_oil: {
      rating: "good", staining_risk: 0.4, corrosion_risk: 0.2, stress_corrosion_risk: 0.1, fire_risk: 0.0,
      reactions: ["Aluminum hydroxide formation possible at high pH"],
      precautions: ["Maintain pH 8.5-9.2", "Use aluminum-compatible inhibitors"],
    },
    semi_synthetic: {
      rating: "excellent", staining_risk: 0.2, corrosion_risk: 0.1, stress_corrosion_risk: 0.05, fire_risk: 0.0,
      reactions: [], precautions: ["Standard monitoring"],
    },
    full_synthetic: {
      rating: "excellent", staining_risk: 0.1, corrosion_risk: 0.1, stress_corrosion_risk: 0.05, fire_risk: 0.0,
      reactions: [], precautions: [],
    },
    straight_oil: {
      rating: "good", staining_risk: 0.1, corrosion_risk: 0.0, stress_corrosion_risk: 0.0, fire_risk: 0.3,
      reactions: [], precautions: ["Fire suppression required", "Avoid chlorinated oils - staining"],
    },
  },
  copper_c110: {
    water_soluble_oil: {
      rating: "fair", staining_risk: 0.6, corrosion_risk: 0.4, stress_corrosion_risk: 0.2, fire_risk: 0.0,
      reactions: ["Copper ion leaching", "Green/black staining from sulfur compounds"],
      precautions: ["Use triazole-based copper inhibitors", "Avoid sulfurized EP additives"],
    },
    semi_synthetic: {
      rating: "good", staining_risk: 0.3, corrosion_risk: 0.2, stress_corrosion_risk: 0.1, fire_risk: 0.0,
      reactions: ["Minor discoloration possible"],
      precautions: ["Add copper passivator"],
    },
    straight_oil: {
      rating: "poor", staining_risk: 0.8, corrosion_risk: 0.1, stress_corrosion_risk: 0.0, fire_risk: 0.3,
      reactions: ["Sulfur attack causes black staining", "Chlorine causes green patina"],
      precautions: ["NEVER use sulfurized or chlorinated oils", "Use non-active EP additives only"],
    },
  },
  brass_c360: {
    water_soluble_oil: {
      rating: "fair", staining_risk: 0.5, corrosion_risk: 0.3, stress_corrosion_risk: 0.4, fire_risk: 0.0,
      reactions: ["Dezincification possible", "Ammonia in coolant causes stress corrosion"],
      precautions: ["Zero ammonia tolerance", "Use dezincification-resistant formulation"],
    },
    semi_synthetic: {
      rating: "good", staining_risk: 0.3, corrosion_risk: 0.2, stress_corrosion_risk: 0.2, fire_risk: 0.0,
      reactions: ["Minor dezincification possible at high pH"],
      precautions: ["Maintain pH below 9.5", "Use copper passivator"],
    },
    straight_oil: {
      rating: "poor", staining_risk: 0.7, corrosion_risk: 0.1, stress_corrosion_risk: 0.05, fire_risk: 0.3,
      reactions: ["Sulfur compounds cause severe tarnishing"],
      precautions: ["Avoid all sulfurized additives", "Use only non-reactive oils"],
    },
  },
  titanium_6al4v: {
    water_soluble_oil: {
      rating: "good", staining_risk: 0.1, corrosion_risk: 0.1, stress_corrosion_risk: 0.7, fire_risk: 0.0,
      reactions: ["Chloride-induced stress corrosion cracking", "Hydrogen embrittlement risk"],
      precautions: ["ZERO chlorine tolerance", "Rinse parts immediately", "Monitor for hydrogen pickup"],
    },
    semi_synthetic: {
      rating: "excellent", staining_risk: 0.05, corrosion_risk: 0.05, stress_corrosion_risk: 0.3, fire_risk: 0.0,
      reactions: [], precautions: ["Chlorine-free formulation mandatory"],
    },
    straight_oil: {
      rating: "fair", staining_risk: 0.1, corrosion_risk: 0.0, stress_corrosion_risk: 0.1, fire_risk: 0.6,
      reactions: ["Titanium fire risk with fine chips and oil"],
      precautions: ["Excellent chip control mandatory", "Fire suppression required", "NO chlorinated oils"],
    },
  },
  magnesium_az31: {
    water_soluble_oil: {
      rating: "prohibited", staining_risk: 0.9, corrosion_risk: 0.95, stress_corrosion_risk: 0.2, fire_risk: 0.8,
      reactions: ["Mg + 2H2O → Mg(OH)2 + H2↑", "EXPLOSIVE HYDROGEN GENERATION"],
      precautions: ["NEVER USE WATER-BASED COOLANTS ON MAGNESIUM"],
    },
    semi_synthetic: {
      rating: "prohibited", staining_risk: 0.9, corrosion_risk: 0.9, stress_corrosion_risk: 0.2, fire_risk: 0.7,
      reactions: ["Water content reacts with magnesium"],
      precautions: ["PROHIBITED - contains water"],
    },
    full_synthetic: {
      rating: "prohibited", staining_risk: 0.85, corrosion_risk: 0.85, stress_corrosion_risk: 0.2, fire_risk: 0.6,
      reactions: ["Even trace water content dangerous"],
      precautions: ["PROHIBITED - may contain water"],
    },
    straight_oil: {
      rating: "fair", staining_risk: 0.2, corrosion_risk: 0.1, stress_corrosion_risk: 0.0, fire_risk: 0.9,
      reactions: ["Magnesium chips ignite easily in oil mist"],
      precautions: ["Dry machining preferred", "If oil used: Class D fire extinguisher MANDATORY",
                    "Chip collection must be dry and segregated", "Flood coolant to suppress ignition"],
    },
  },
  stainless_304: {
    water_soluble_oil: {
      rating: "good", staining_risk: 0.3, corrosion_risk: 0.3, stress_corrosion_risk: 0.5, fire_risk: 0.0,
      reactions: ["Chloride pitting in crevices", "Sensitization if heat affected"],
      precautions: ["Low chloride formulation", "Rinse parts after machining"],
    },
    semi_synthetic: {
      rating: "excellent", staining_risk: 0.2, corrosion_risk: 0.2, stress_corrosion_risk: 0.3, fire_risk: 0.0,
      reactions: [], precautions: ["Standard practice"],
    },
    straight_oil: {
      rating: "excellent", staining_risk: 0.1, corrosion_risk: 0.0, stress_corrosion_risk: 0.0, fire_risk: 0.3,
      reactions: [], precautions: ["EP additives help with work hardening"],
    },
  },
  cast_iron_gray: {
    water_soluble_oil: {
      rating: "fair", staining_risk: 0.7, corrosion_risk: 0.6, stress_corrosion_risk: 0.0, fire_risk: 0.0,
      reactions: ["Rust staining common", "Graphite absorbs coolant"],
      precautions: ["Dry machining often preferred", "Strong rust inhibitors if wet"],
    },
    straight_oil: {
      rating: "good", staining_risk: 0.2, corrosion_risk: 0.1, stress_corrosion_risk: 0.0, fire_risk: 0.2,
      reactions: [], precautions: ["Light oil or dry preferred for finishing"],
    },
  },
  inconel_718: {
    water_soluble_oil: {
      rating: "good", staining_risk: 0.2, corrosion_risk: 0.2, stress_corrosion_risk: 0.3, fire_risk: 0.0,
      reactions: ["High nickel content resists corrosion"],
      precautions: ["High-pressure delivery recommended", "EP additives beneficial"],
    },
    semi_synthetic: {
      rating: "excellent", staining_risk: 0.1, corrosion_risk: 0.1, stress_corrosion_risk: 0.2, fire_risk: 0.0,
      reactions: [], precautions: ["Standard high-performance formulation"],
    },
  },
};

/**
 * Coolant HLB (Hydrophilic-Lipophilic Balance) values
 * HLB 1-3: Anti-foaming agents
 * HLB 3-6: W/O emulsifiers
 * HLB 7-9: Wetting agents
 * HLB 8-18: O/W emulsifiers
 * HLB 13-15: Detergents
 * HLB 15-18: Solubilizers
 */
const COOLANT_HLB: Record<CoolantBaseType, { base_hlb: number; optimal_range: [number, number] }> = {
  water_soluble_oil: { base_hlb: 10, optimal_range: [8, 12] },
  semi_synthetic:    { base_hlb: 12, optimal_range: [10, 14] },
  full_synthetic:    { base_hlb: 15, optimal_range: [13, 17] },
  straight_oil:      { base_hlb: 3, optimal_range: [2, 5] },     // N/A for neat oils
  vegetable_ester:   { base_hlb: 8, optimal_range: [6, 10] },
  mql_oil:           { base_hlb: 5, optimal_range: [3, 7] },
};

/**
 * Biocide effectiveness factors
 * Effectiveness decreases with pH deviation, temperature, contamination
 */
const BIOCIDE_PARAMS: Record<CoolantAdditive, {
  optimal_ph: [number, number];
  max_temp_C: number;
  effectiveness_base: number;
  sensitizer: boolean;
}> = {
  biocide_formaldehyde:    { optimal_ph: [8.0, 9.5], max_temp_C: 40, effectiveness_base: 0.95, sensitizer: true },
  biocide_isothiazolinone: { optimal_ph: [7.5, 9.0], max_temp_C: 45, effectiveness_base: 0.90, sensitizer: true },
  biocide_triazine:        { optimal_ph: [8.5, 10.0], max_temp_C: 50, effectiveness_base: 0.85, sensitizer: false },
  // Non-biocide additives
  ep_sulfur:               { optimal_ph: [7.0, 10.0], max_temp_C: 60, effectiveness_base: 1.0, sensitizer: false },
  ep_chlorine:             { optimal_ph: [7.0, 9.0], max_temp_C: 50, effectiveness_base: 1.0, sensitizer: false },
  ep_phosphorus:           { optimal_ph: [7.5, 9.5], max_temp_C: 55, effectiveness_base: 1.0, sensitizer: false },
  fatty_acid:              { optimal_ph: [8.0, 9.5], max_temp_C: 50, effectiveness_base: 1.0, sensitizer: false },
  ester:                   { optimal_ph: [7.5, 9.0], max_temp_C: 45, effectiveness_base: 1.0, sensitizer: false },
  amine:                   { optimal_ph: [8.5, 10.5], max_temp_C: 60, effectiveness_base: 1.0, sensitizer: true },
  borate:                  { optimal_ph: [8.0, 10.0], max_temp_C: 60, effectiveness_base: 1.0, sensitizer: false },
  triazole:                { optimal_ph: [7.0, 9.5], max_temp_C: 55, effectiveness_base: 1.0, sensitizer: false },
  antifoam_silicone:       { optimal_ph: [6.0, 11.0], max_temp_C: 80, effectiveness_base: 1.0, sensitizer: false },
  antifoam_mineral:        { optimal_ph: [6.0, 11.0], max_temp_C: 70, effectiveness_base: 1.0, sensitizer: false },
  emulsifier_nonionic:     { optimal_ph: [6.0, 10.0], max_temp_C: 60, effectiveness_base: 1.0, sensitizer: false },
  emulsifier_anionic:      { optimal_ph: [7.0, 10.0], max_temp_C: 55, effectiveness_base: 1.0, sensitizer: false },
};

/**
 * Environmental safety data
 */
const ENVIRONMENTAL_DATA: Record<CoolantBaseType, {
  flash_point_C: number;
  voc_content_g_L: number;
  mist_factor: number;        // Relative mist generation
  dermatitis_risk: number;    // Base risk 0-1
  disposal_code: string;
}> = {
  water_soluble_oil: { flash_point_C: 180, voc_content_g_L: 20, mist_factor: 1.0, dermatitis_risk: 0.3, disposal_code: "D001/F001" },
  semi_synthetic:    { flash_point_C: 200, voc_content_g_L: 15, mist_factor: 0.8, dermatitis_risk: 0.25, disposal_code: "D001" },
  full_synthetic:    { flash_point_C: 220, voc_content_g_L: 10, mist_factor: 0.6, dermatitis_risk: 0.2, disposal_code: "D001" },
  straight_oil:      { flash_point_C: 150, voc_content_g_L: 50, mist_factor: 1.5, dermatitis_risk: 0.4, disposal_code: "D001/F003" },
  vegetable_ester:   { flash_point_C: 280, voc_content_g_L: 5, mist_factor: 0.7, dermatitis_risk: 0.15, disposal_code: "Non-haz" },
  mql_oil:           { flash_point_C: 250, voc_content_g_L: 8, mist_factor: 0.3, dermatitis_risk: 0.1, disposal_code: "Non-haz" },
};

/**
 * Concentration guidelines by operation
 */
const CONCENTRATION_GUIDELINES: Record<LatheOperation, {
  min_pct: number;
  optimal_pct: number;
  max_pct: number;
  lubricity_weight: number;   // 0-1: how much lubricity matters
  cooling_weight: number;     // 0-1: how much cooling matters
}> = {
  od_roughing:         { min_pct: 5, optimal_pct: 7, max_pct: 10, lubricity_weight: 0.4, cooling_weight: 0.6 },
  od_finishing:        { min_pct: 4, optimal_pct: 6, max_pct: 8, lubricity_weight: 0.6, cooling_weight: 0.4 },
  id_boring_rough:     { min_pct: 6, optimal_pct: 8, max_pct: 12, lubricity_weight: 0.5, cooling_weight: 0.5 },
  id_boring_finish:    { min_pct: 5, optimal_pct: 7, max_pct: 10, lubricity_weight: 0.7, cooling_weight: 0.3 },
  facing:              { min_pct: 5, optimal_pct: 6, max_pct: 8, lubricity_weight: 0.5, cooling_weight: 0.5 },
  grooving:            { min_pct: 6, optimal_pct: 8, max_pct: 12, lubricity_weight: 0.7, cooling_weight: 0.3 },
  parting:             { min_pct: 8, optimal_pct: 10, max_pct: 15, lubricity_weight: 0.8, cooling_weight: 0.2 },
  threading_external:  { min_pct: 8, optimal_pct: 12, max_pct: 18, lubricity_weight: 0.9, cooling_weight: 0.1 },
  threading_internal:  { min_pct: 10, optimal_pct: 15, max_pct: 20, lubricity_weight: 0.95, cooling_weight: 0.05 },
  drilling:            { min_pct: 6, optimal_pct: 8, max_pct: 12, lubricity_weight: 0.6, cooling_weight: 0.4 },
  tapping:             { min_pct: 10, optimal_pct: 15, max_pct: 20, lubricity_weight: 0.95, cooling_weight: 0.05 },
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function mkAv(value: number, unit: string, uncertainty: number, source: string, warning?: string): AtomicValue {
  return { value, unit, uncertainty, source, warning };
}

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

/**
 * Arrhenius equation: k = A * exp(-Ea / RT)
 * @param A Pre-exponential factor
 * @param Ea_kJ Activation energy in kJ/mol
 * @param T_C Temperature in Celsius
 * @returns Rate constant
 */
function arrhenius(A: number, Ea_kJ: number, T_C: number): number {
  const T_K = T_C + KELVIN_OFFSET;
  return A * Math.exp(-Ea_kJ * 1000 / (R_GAS * T_K));
}

/**
 * Estimate cutting interface temperature using Loewen-Shaw model (simplified)
 * Reference: Loewen & Shaw, Trans ASME, 1954
 */
function estimateInterfaceTemperature(
  cutting_speed_m_min: number,
  feed_mm_rev: number,
  depth_mm: number,
  material: WorkpieceMaterial
): number {
  // Material thermal properties (simplified)
  const thermalProps: Record<string, { k: number; rho_cp: number; T_melt: number }> = {
    carbon_steel:    { k: 50, rho_cp: 3.9e6, T_melt: 1500 },
    alloy_steel:     { k: 42, rho_cp: 4.0e6, T_melt: 1480 },
    stainless_304:   { k: 16, rho_cp: 4.1e6, T_melt: 1450 },
    stainless_316:   { k: 14, rho_cp: 4.2e6, T_melt: 1400 },
    stainless_17_4:  { k: 18, rho_cp: 4.0e6, T_melt: 1440 },
    tool_steel_d2:   { k: 20, rho_cp: 4.1e6, T_melt: 1420 },
    tool_steel_m2:   { k: 25, rho_cp: 4.0e6, T_melt: 1430 },
    tool_steel_a2:   { k: 22, rho_cp: 4.0e6, T_melt: 1420 },
    cast_iron_gray:  { k: 50, rho_cp: 3.6e6, T_melt: 1200 },
    cast_iron_ductile: { k: 35, rho_cp: 3.8e6, T_melt: 1180 },
    aluminum_6061:   { k: 167, rho_cp: 2.4e6, T_melt: 650 },
    aluminum_7075:   { k: 130, rho_cp: 2.4e6, T_melt: 635 },
    aluminum_2024:   { k: 120, rho_cp: 2.4e6, T_melt: 640 },
    copper_c110:     { k: 390, rho_cp: 3.4e6, T_melt: 1085 },
    brass_c360:      { k: 120, rho_cp: 3.3e6, T_melt: 900 },
    bronze_c932:     { k: 60, rho_cp: 3.5e6, T_melt: 1000 },
    titanium_grade2: { k: 17, rho_cp: 2.3e6, T_melt: 1670 },
    titanium_6al4v:  { k: 7, rho_cp: 2.4e6, T_melt: 1660 },
    inconel_718:     { k: 11, rho_cp: 4.2e6, T_melt: 1340 },
    inconel_625:     { k: 10, rho_cp: 4.3e6, T_melt: 1350 },
    hastelloy_c276:  { k: 10, rho_cp: 4.4e6, T_melt: 1370 },
    magnesium_az31:  { k: 96, rho_cp: 1.8e6, T_melt: 630 },
    cobalt_chrome:   { k: 14, rho_cp: 4.5e6, T_melt: 1400 },
  };

  const props = thermalProps[material] || { k: 30, rho_cp: 4.0e6, T_melt: 1400 };

  // Simplified Loewen-Shaw: T_max ∝ (V^0.5 * f^0.3 * ap^0.1) / k^0.5
  const V = cutting_speed_m_min / 60;  // m/s
  const f = feed_mm_rev / 1000;         // m/rev
  const ap = depth_mm / 1000;           // m

  // Empirical factor calibrated to cutting data
  // Base temperature rise factor adjusted for realistic cutting temperatures
  // Reference: Shaw's Metal Cutting Principles, typical interface temps 400-1000°C
  const kNormalized = props.k / 50;  // Normalize to steel's conductivity
  const tempRise = 1200 * Math.pow(V, 0.4) * Math.pow(f, 0.2) * Math.pow(ap, 0.1) / Math.sqrt(kNormalized);

  // Limit to material melting point
  const T_interface = Math.min(25 + tempRise, props.T_melt * 0.85);

  return T_interface;
}

// ============================================================================
// MAIN ENGINE CLASS
// ============================================================================

export class LatheCuttingChemistryEngine {
  private readonly SOURCE = "LatheCuttingChemistryEngine";

  // ─────────────────────────────────────────────────────────────────────────
  // COOLANT CHEMISTRY ANALYSIS
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Analyze coolant chemistry and predict stability, effectiveness
   * @param input Coolant chemistry parameters
   * @returns Chemistry analysis with recommendations
   */
  analyzeCoolantChemistry(input: CoolantChemistryInput): CoolantChemistryResult {
    const {
      coolant_type,
      concentration_pct = 5,
      water_hardness_ppm = 150,
      ph_measured,
      temperature_C = 25,
      age_weeks = 0,
      tramp_oil_pct = 0,
    } = input;

    const recs: string[] = [];
    const warnings: string[] = [];

    // --- pH Calculation ---
    // Fresh coolant pH depends on type
    const basePh: Record<CoolantBaseType, number> = {
      water_soluble_oil: 9.0,
      semi_synthetic: 9.2,
      full_synthetic: 9.5,
      straight_oil: 7.0,  // N/A
      vegetable_ester: 8.5,
      mql_oil: 7.0,  // N/A
    };

    let effectivePh = basePh[coolant_type];

    // pH drops with age (microbial activity)
    const phDropFromAge = Math.min(age_weeks * 0.05, 1.5);
    effectivePh -= phDropFromAge;

    // High concentration raises pH
    effectivePh += (concentration_pct - 5) * 0.1;

    // Hard water can destabilize pH
    if (water_hardness_ppm > 300) {
      effectivePh -= 0.3;
      recs.push("Hard water (>300 ppm CaCO3) may cause soap formation and emulsion instability");
    }

    // Temperature affects pH
    effectivePh -= (temperature_C - 25) * 0.01;

    // Override with measured pH if provided
    if (ph_measured !== undefined) {
      effectivePh = ph_measured;
    }

    // pH warnings
    if (effectivePh < 8.0) {
      warnings.push("CRITICAL: pH below 8.0 — severe corrosion risk, microbial growth likely");
      recs.push("Add pH booster or replace coolant immediately");
    } else if (effectivePh < 8.5) {
      warnings.push("WARNING: pH below 8.5 — corrosion and biocide effectiveness reduced");
      recs.push("Add pH booster to reach 8.8-9.2 range");
    } else if (effectivePh > 10.0) {
      warnings.push("WARNING: pH above 10.0 — aluminum staining risk, skin irritation likely");
      recs.push("Reduce concentration or add acidic buffer");
    }

    // --- HLB Value ---
    const hlbData = COOLANT_HLB[coolant_type];
    let hlb = hlbData.base_hlb;

    // Concentration affects HLB (higher conc = more oil = lower effective HLB)
    hlb -= (concentration_pct - 5) * 0.2;

    // Tramp oil contamination shifts HLB toward oil-in-water
    hlb -= tramp_oil_pct * 0.5;

    const hlbWarning = (hlb < hlbData.optimal_range[0] || hlb > hlbData.optimal_range[1])
      ? `HLB ${hlb.toFixed(1)} outside optimal ${hlbData.optimal_range[0]}-${hlbData.optimal_range[1]}`
      : undefined;

    // --- Emulsion Stability ---
    let stability = 1.0;

    // Water hardness effect
    if (water_hardness_ppm < 50) {
      stability -= 0.1;
      recs.push("Soft water (<50 ppm) may cause excessive foaming");
    } else if (water_hardness_ppm > 400) {
      stability -= 0.3;
      recs.push("Very hard water (>400 ppm) causes emulsion instability, consider water softening");
    }

    // Tramp oil effect
    stability -= tramp_oil_pct * 0.1;
    if (tramp_oil_pct > 3) {
      warnings.push("Tramp oil >3% — skim immediately, bacteria harbor in oil layer");
    }

    // Temperature effect
    if (temperature_C > 40) {
      stability -= (temperature_C - 40) * 0.02;
      recs.push("Coolant temperature >40°C reduces stability and biocide effectiveness");
    }

    // Age effect
    stability -= age_weeks * 0.02;

    stability = clamp(stability, 0, 1);

    // --- Biocide Effectiveness ---
    // Assume isothiazolinone-type biocide as default
    let biocideEff = 0.9;

    // pH effect on biocide
    if (effectivePh < 7.5 || effectivePh > 9.5) {
      biocideEff *= 0.7;
      recs.push("pH outside 7.5-9.5 range reduces biocide effectiveness by 30%");
    }

    // Temperature effect
    if (temperature_C > 40) {
      biocideEff *= Math.max(0.5, 1 - (temperature_C - 40) * 0.02);
    }

    // Age depletes biocide
    biocideEff *= Math.max(0.3, 1 - age_weeks * 0.05);

    if (biocideEff < 0.5) {
      warnings.push("Biocide effectiveness <50% — add biocide boost or change coolant");
    }

    // --- Corrosion Risk ---
    let corrosionRisk = 0.1;

    // Low pH increases corrosion
    if (effectivePh < 8.5) {
      corrosionRisk += (8.5 - effectivePh) * 0.3;
    }

    // Low concentration increases corrosion
    if (concentration_pct < 4) {
      corrosionRisk += (4 - concentration_pct) * 0.1;
    }

    // Contamination increases corrosion
    corrosionRisk += tramp_oil_pct * 0.05;

    // Chloride in hard water
    if (water_hardness_ppm > 200) {
      corrosionRisk += 0.1;
    }

    corrosionRisk = clamp(corrosionRisk, 0, 1);

    if (corrosionRisk > 0.5) {
      warnings.push("High corrosion risk — check machine ways and spindle daily");
    }

    // --- Final Recommendations ---
    if (recs.length === 0) {
      recs.push("Coolant chemistry within acceptable parameters — continue standard monitoring");
    }

    return {
      effective_ph: mkAv(
        Math.round(effectivePh * 100) / 100,
        "pH",
        0.3,
        this.SOURCE,
        effectivePh < 8.0 ? "CRITICAL: Add pH booster" : undefined
      ),
      hlb_value: mkAv(
        Math.round(hlb * 10) / 10,
        "HLB",
        0.5,
        this.SOURCE,
        hlbWarning
      ),
      emulsion_stability: mkAv(
        Math.round(stability * 100) / 100,
        "index",
        0.1,
        this.SOURCE,
        stability < 0.7 ? "Emulsion unstable" : undefined
      ),
      biocide_effectiveness: mkAv(
        Math.round(biocideEff * 100) / 100,
        "index",
        0.15,
        this.SOURCE,
        biocideEff < 0.5 ? "Add biocide" : undefined
      ),
      corrosion_risk: mkAv(
        Math.round(corrosionRisk * 100) / 100,
        "index",
        0.1,
        this.SOURCE,
        corrosionRisk > 0.5 ? "High risk" : undefined
      ),
      recommended_adjustments: recs,
      safety_warnings: warnings,
    };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // OXIDATION KINETICS
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Calculate oxidation rate and oxide thickness using parabolic rate law
   * Wagner's parabolic oxidation: x² = kp * t
   * kp = kp0 * exp(-Q / RT)  [Arrhenius]
   *
   * @param input Oxidation parameters
   * @returns Oxidation analysis
   */
  calculateOxidationRate(input: OxidationInput): OxidationResult {
    const {
      material,
      temperature_C,
      time_minutes,
      atmosphere = "air",
      oxygen_partial_pressure_kPa = 21.3,  // Standard air O2 partial pressure
    } = input;

    const recs: string[] = [];
    const params = OXIDATION_PARAMS[material];

    if (!params) {
      return {
        oxide_thickness_um: mkAv(0, "µm", 0, this.SOURCE, `Unknown material: ${material}`),
        oxidation_rate_um_per_min: mkAv(0, "µm/min", 0, this.SOURCE),
        oxide_type: "unknown",
        is_protective: false,
        scale_adherence: mkAv(0, "index", 0, this.SOURCE),
        parabolic_rate_constant: mkAv(0, "kg²/(m⁴·s)", 0, this.SOURCE),
        recommendations: [`Material ${material} not in oxidation database`],
      };
    }

    // Calculate parabolic rate constant using Arrhenius
    const T_K = temperature_C + KELVIN_OFFSET;
    let kp = params.kp0 * Math.exp(-params.Q_kJ * 1000 / (R_GAS * T_K));

    // Adjust for atmosphere
    if (atmosphere === "inert") {
      kp *= 0.001;  // Minimal oxidation in inert atmosphere
      recs.push("Inert atmosphere significantly reduces oxidation");
    } else if (atmosphere === "coolant_vapor") {
      kp *= 0.5;  // Coolant vapor provides some protection
    }

    // Adjust for oxygen partial pressure (relative to standard air)
    const pO2_factor = Math.sqrt(oxygen_partial_pressure_kPa / 21.3);
    kp *= pO2_factor;

    // Parabolic law: x² = kp * t
    // Using simplified parabolic oxidation model
    // Reference: Wagner's theory of oxidation
    const time_seconds = time_minutes * 60;

    // Direct parabolic rate calculation
    // kp0 values are in kg²/(m⁴·s), need to convert to µm²/s
    // Scale factor accounts for unit conversion and empirical calibration
    // Typical oxide thicknesses: 0.1-100 µm for 10 min at 500°C
    const scaleFactor = 1e12;  // Large scale factor because kp values are very small
    const thickness_um_squared = kp * time_seconds * scaleFactor;
    const thickness_um = Math.sqrt(Math.max(1e-10, thickness_um_squared));

    // Oxidation rate (instantaneous at time t)
    // From parabolic law: x = sqrt(kp * t), dx/dt = sqrt(kp) / (2 * sqrt(t))
    const rate_um_min = time_minutes > 0
      ? thickness_um / (2 * time_minutes)
      : Math.sqrt(kp * scaleFactor / 60);

    // Scale adherence (protective oxides adhere better)
    let adherence = params.protective ? 0.9 : 0.4;

    // Adherence decreases at high temperatures due to thermal stress
    if (temperature_C > params.max_service_C) {
      adherence *= Math.max(0.2, 1 - (temperature_C - params.max_service_C) / 200);
      recs.push(`Temperature ${temperature_C}°C exceeds max service ${params.max_service_C}°C — spalling likely`);
    }

    // Thick oxides spall more easily
    if (thickness_um > 5) {
      adherence *= 0.9;
    }
    if (thickness_um > 20) {
      adherence *= 0.7;
      recs.push("Oxide thickness >20µm — mechanical spalling risk");
    }

    // Recommendations
    if (temperature_C > 200 && !params.protective) {
      recs.push(`${material} forms non-protective oxide — consider protective coating or inert atmosphere`);
    }

    if (params.protective && temperature_C < params.max_service_C) {
      recs.push(`${params.oxide} layer is self-limiting — ${material} suitable for this temperature`);
    }

    if (material.includes("magnesium") && temperature_C > 400) {
      recs.push("CRITICAL: Magnesium ignition risk at elevated temperature");
    }

    if (recs.length === 0) {
      recs.push("Oxidation within normal parameters");
    }

    return {
      oxide_thickness_um: mkAv(
        Math.round(thickness_um * 100) / 100,
        "µm",
        thickness_um * 0.25,
        this.SOURCE + " (Wagner parabolic law)"
      ),
      oxidation_rate_um_per_min: mkAv(
        Math.round(rate_um_min * 1000) / 1000,
        "µm/min",
        rate_um_min * 0.3,
        this.SOURCE + " (Arrhenius kinetics)"
      ),
      oxide_type: params.oxide,
      is_protective: params.protective,
      scale_adherence: mkAv(
        Math.round(adherence * 100) / 100,
        "index",
        0.15,
        this.SOURCE
      ),
      parabolic_rate_constant: mkAv(
        kp,
        "kg²/(m⁴·s)",
        kp * 0.3,
        this.SOURCE + " (Arrhenius: kp = kp0·exp(-Q/RT))"
      ),
      recommendations: recs,
    };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // DIFFUSION WEAR PREDICTION
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Predict diffusion-controlled wear using Fick's law
   * D = D0 * exp(-Q / RT)  [Arrhenius]
   * Diffusion depth: x = sqrt(D * t)  [Fick's 2nd law approximation]
   *
   * @param input Diffusion wear parameters
   * @returns Diffusion wear prediction
   */
  predictDiffusionWear(input: DiffusionWearInput): DiffusionWearResult {
    const {
      tool_material,
      tool_coating = "none",
      workpiece_material,
      interface_temperature_C,
      contact_time_seconds,
      contact_pressure_MPa = 500,
    } = input;

    const recs: string[] = [];

    // Get diffusion parameters
    const toolKey = tool_coating !== "none" && tool_coating.startsWith("TiAlN")
      ? "carbide_pvd"
      : tool_coating !== "none" && tool_coating.startsWith("CVD")
        ? "carbide_cvd"
        : tool_material;

    const toolData = DIFFUSION_DATABASE[toolKey];

    // Find matching workpiece
    let workKey = workpiece_material;
    // Simplify workpiece key for lookup
    if (workpiece_material.includes("carbon_steel") || workpiece_material.includes("alloy_steel")) {
      workKey = "carbon_steel";
    } else if (workpiece_material.includes("stainless")) {
      workKey = "stainless_304";
    } else if (workpiece_material.includes("titanium")) {
      workKey = "titanium_6al4v";
    } else if (workpiece_material.includes("inconel")) {
      workKey = "inconel_718";
    } else if (workpiece_material.includes("cast_iron")) {
      workKey = "cast_iron_gray";
    } else if (workpiece_material.includes("aluminum")) {
      workKey = "aluminum_6061";
    }

    const diffPair = toolData?.[workKey];

    if (!diffPair) {
      // Use default values
      const defaultD0 = 1e-4;
      const defaultQ = 180;

      const T_K = interface_temperature_C + KELVIN_OFFSET;
      const D = defaultD0 * Math.exp(-defaultQ * 1000 / (R_GAS * T_K));
      const depth_m = Math.sqrt(D * contact_time_seconds);
      const depth_um = depth_m * 1e6;

      return {
        diffusion_depth_um: mkAv(depth_um, "µm", depth_um * 0.5, this.SOURCE, "Default parameters used"),
        diffusion_coefficient_m2_s: mkAv(D, "m²/s", D * 0.5, this.SOURCE),
        activation_energy_kJ_mol: mkAv(defaultQ, "kJ/mol", 20, this.SOURCE),
        primary_diffusing_species: "Unknown",
        wear_rate_um_per_hour: mkAv(depth_um / (contact_time_seconds / 3600), "µm/hr", depth_um * 0.5, this.SOURCE),
        recommendations: [`No specific data for ${tool_material} + ${workpiece_material} combination`],
      };
    }

    // Calculate diffusion coefficient using Arrhenius
    const T_K = interface_temperature_C + KELVIN_OFFSET;
    let D = diffPair.D0 * Math.exp(-diffPair.Q_kJ * 1000 / (R_GAS * T_K));

    // Pressure effect (stress-enhanced diffusion)
    const pressure_factor = 1 + (contact_pressure_MPa - 500) / 2000;
    D *= Math.max(0.5, pressure_factor);

    // Calculate diffusion depth (Fick's law approximation)
    const depth_m = Math.sqrt(D * contact_time_seconds);
    const depth_um = depth_m * 1e6;

    // Wear rate (µm per hour)
    const wear_rate = depth_um / (contact_time_seconds / 3600);

    // Coating breakdown time (if applicable)
    let coating_breakdown: AtomicValue | undefined;
    if (tool_coating !== "none") {
      // Typical PVD coating thickness: 2-4 µm
      const coating_thickness_um = 3;
      const time_to_breakthrough_s = Math.pow(coating_thickness_um / 1e6, 2) / D;
      const time_to_breakthrough_min = time_to_breakthrough_s / 60;

      coating_breakdown = mkAv(
        Math.round(time_to_breakthrough_min * 10) / 10,
        "min",
        time_to_breakthrough_min * 0.3,
        this.SOURCE,
        time_to_breakthrough_min < 5 ? "Coating fails quickly at this temperature" : undefined
      );

      if (time_to_breakthrough_min < 10) {
        recs.push(`Coating breakthrough predicted in ${time_to_breakthrough_min.toFixed(1)} min — reduce cutting speed`);
      }
    }

    // Temperature recommendations
    if (interface_temperature_C > 900) {
      recs.push("CRITICAL: Interface temperature >900°C — severe diffusion wear expected");
    } else if (interface_temperature_C > 700) {
      recs.push("High interface temperature — diffusion wear dominant, consider ceramic tooling");
    }

    // Material-specific recommendations
    if (workpiece_material.includes("titanium")) {
      recs.push("Titanium highly reactive — use AlTiN or AlCrN coating, avoid uncoated carbide");
    }
    if (workpiece_material.includes("inconel")) {
      recs.push("Nickel alloys cause severe diffusion wear — ceramic or CBN tooling recommended");
    }

    if (recs.length === 0) {
      recs.push(`Diffusion wear rate ${wear_rate.toFixed(2)} µm/hr — ${diffPair.notes}`);
    }

    return {
      diffusion_depth_um: mkAv(
        Math.round(depth_um * 1000) / 1000,
        "µm",
        depth_um * 0.3,
        this.SOURCE + " (Fick's law: x = √(D·t))"
      ),
      diffusion_coefficient_m2_s: mkAv(
        D,
        "m²/s",
        D * 0.3,
        this.SOURCE + " (Arrhenius: D = D0·exp(-Q/RT))"
      ),
      activation_energy_kJ_mol: mkAv(
        diffPair.Q_kJ,
        "kJ/mol",
        diffPair.Q_kJ * 0.1,
        "Literature database"
      ),
      primary_diffusing_species: diffPair.primary_species,
      wear_rate_um_per_hour: mkAv(
        Math.round(wear_rate * 100) / 100,
        "µm/hr",
        wear_rate * 0.3,
        this.SOURCE
      ),
      coating_breakdown_time_min: coating_breakdown,
      recommendations: recs,
    };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // MATERIAL-COOLANT COMPATIBILITY
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Assess chemical compatibility between coolant and workpiece material
   * @param input Compatibility parameters
   * @returns Compatibility assessment
   */
  assessCompatibility(input: CompatibilityInput): CompatibilityResult {
    const {
      coolant_type,
      additives,
      workpiece_material,
      concentration_pct = 5,
    } = input;

    // Find material in compatibility matrix
    let materialKey = workpiece_material;

    // Map to closest match in matrix
    if (workpiece_material.includes("aluminum")) materialKey = "aluminum_6061";
    else if (workpiece_material.includes("copper") && !workpiece_material.includes("brass")) materialKey = "copper_c110";
    else if (workpiece_material.includes("brass")) materialKey = "brass_c360";
    else if (workpiece_material.includes("titanium")) materialKey = "titanium_6al4v";
    else if (workpiece_material.includes("magnesium")) materialKey = "magnesium_az31";
    else if (workpiece_material.includes("stainless")) materialKey = "stainless_304";
    else if (workpiece_material.includes("cast_iron")) materialKey = "cast_iron_gray";
    else if (workpiece_material.includes("inconel")) materialKey = "inconel_718";

    const materialData = COMPATIBILITY_MATRIX[materialKey];
    const coolantData = materialData?.[coolant_type];

    if (!coolantData) {
      // Generate default compatibility
      return {
        overall_rating: "fair",
        staining_risk: mkAv(0.3, "probability", 0.2, this.SOURCE, "No specific data"),
        corrosion_risk: mkAv(0.3, "probability", 0.2, this.SOURCE),
        stress_corrosion_risk: mkAv(0.2, "probability", 0.15, this.SOURCE),
        fire_risk: mkAv(0.1, "probability", 0.1, this.SOURCE),
        specific_reactions: [],
        required_precautions: ["Monitor for adverse reactions", "Test on sample piece first"],
        alternative_coolants: ["semi_synthetic", "full_synthetic"],
      };
    }

    const reactions: string[] = [...coolantData.reactions];
    const precautions: string[] = [...coolantData.precautions];

    // Initialize risk values from coolant data
    let staining = coolantData.staining_risk;
    let corrosion = coolantData.corrosion_risk;
    let scc = coolantData.stress_corrosion_risk;
    let fire = coolantData.fire_risk;

    // Check additive-specific reactions
    for (const additive of additives) {
      if (additive === "ep_sulfur") {
        if (materialKey.includes("copper") || materialKey.includes("brass") || materialKey.includes("bronze")) {
          reactions.push("Sulfur compounds cause severe discoloration of copper alloys");
          precautions.push("REMOVE sulfurized EP additives for copper alloys");
        }
      }
      if (additive === "ep_chlorine") {
        if (materialKey.includes("titanium")) {
          reactions.push("CRITICAL: Chlorine causes stress corrosion cracking in titanium");
          precautions.push("NEVER use chlorinated coolants with titanium");
        }
        if (materialKey.includes("stainless")) {
          reactions.push("Chlorine increases pitting corrosion risk in stainless steel");
        }
      }
      if (additive === "amine") {
        if (materialKey.includes("brass") || materialKey.includes("bronze") || materialKey.includes("copper")) {
          reactions.push("Ammonia from amine breakdown causes stress corrosion cracking in brass/copper alloys");
          precautions.push("Avoid amine-based corrosion inhibitors for brass and copper alloys");
          // Increase SCC risk for brass with amine
          if (materialKey.includes("brass")) {
            scc += 0.2;
          }
        }
      }
    }

    // Adjust risks based on concentration

    // Higher concentration generally means better corrosion protection but more residue
    if (concentration_pct > 8) {
      staining += 0.1;
    }
    if (concentration_pct < 4) {
      corrosion += 0.15;
      precautions.push("Low concentration (<4%) increases corrosion risk");
    }

    // Determine alternatives
    const alternatives: CoolantBaseType[] = [];
    if (coolantData.rating !== "excellent") {
      if (!alternatives.includes("semi_synthetic")) alternatives.push("semi_synthetic");
      if (!alternatives.includes("full_synthetic")) alternatives.push("full_synthetic");
    }
    if (materialKey === "magnesium_az31") {
      alternatives.length = 0;  // Only dry machining safe
    }

    return {
      overall_rating: coolantData.rating,
      staining_risk: mkAv(
        Math.round(clamp(staining, 0, 1) * 100) / 100,
        "probability",
        0.15,
        this.SOURCE
      ),
      corrosion_risk: mkAv(
        Math.round(clamp(corrosion, 0, 1) * 100) / 100,
        "probability",
        0.15,
        this.SOURCE
      ),
      stress_corrosion_risk: mkAv(
        Math.round(clamp(scc, 0, 1) * 100) / 100,
        "probability",
        0.15,
        this.SOURCE
      ),
      fire_risk: mkAv(
        Math.round(clamp(fire, 0, 1) * 100) / 100,
        "probability",
        0.1,
        this.SOURCE
      ),
      specific_reactions: reactions,
      required_precautions: precautions,
      alternative_coolants: alternatives,
    };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // CHEMICAL WEAR ASSESSMENT
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Assess chemical wear mechanisms in lathe cutting
   * @param input Cutting parameters
   * @returns Chemical wear analysis
   */
  assessChemicalWear(input: ChemicalWearInput): ChemicalWearResult {
    const {
      workpiece_material,
      tool_material,
      tool_coating,
      cutting_speed_m_min,
      feed_mm_rev,
      depth_of_cut_mm,
      coolant_type,
      operation,
    } = input;

    // Estimate interface temperature
    const T_interface = estimateInterfaceTemperature(
      cutting_speed_m_min,
      feed_mm_rev,
      depth_of_cut_mm,
      workpiece_material
    );

    const mechanisms: Record<ChemicalWearMechanism, number> = {
      dissolution: 0,
      diffusion: 0,
      oxidation: 0,
      tribochemical: 0,
      corrosion: 0,
      attrition: 0,
    };

    const reactions: string[] = [];
    const mitigations: string[] = [];

    // --- Dissolution Wear ---
    // Dominant in titanium machining with carbide tools
    if (workpiece_material.includes("titanium")) {
      if (tool_material === "carbide_uncoated") {
        mechanisms.dissolution = 0.95;  // Dissolution is THE dominant mechanism for Ti + uncoated carbide
        reactions.push("Ti dissolves WC and Co binder at high temperature");
        mitigations.push("Use coated carbide (AlTiN) or CBN for titanium");
      } else if (tool_material.includes("carbide_pvd") || tool_material.includes("carbide_cvd")) {
        mechanisms.dissolution = 0.4;
        reactions.push("Coating delays but does not prevent Ti dissolution");
      }
    }

    // --- Diffusion Wear ---
    // Use Arrhenius-based rate
    const diffResult = this.predictDiffusionWear({
      tool_material,
      tool_coating,
      workpiece_material,
      interface_temperature_C: T_interface,
      contact_time_seconds: 60,  // 1 minute reference
    });

    const diffRate = diffResult.wear_rate_um_per_hour.value;
    mechanisms.diffusion = Math.min(1, diffRate / 10);  // Normalize to 10 µm/hr

    // For titanium with uncoated carbide, dissolution is THE dominant mechanism
    // Diffusion contributes but is secondary to the chemical dissolution attack
    if (workpiece_material.includes("titanium") && tool_material === "carbide_uncoated") {
      mechanisms.diffusion = Math.min(mechanisms.diffusion, 0.7);  // Cap diffusion below dissolution
    }

    if (diffRate > 5) {
      reactions.push(`High diffusion rate: ${diffResult.primary_diffusing_species} migration`);
      mitigations.push("Reduce cutting speed to lower interface temperature");
    }

    // --- Oxidation Wear ---
    // Notch wear at DOC line often oxidation-driven
    const oxResult = this.calculateOxidationRate({
      material: workpiece_material,
      temperature_C: T_interface * 0.9,  // Tool surface slightly cooler
      time_minutes: 1,
    });

    mechanisms.oxidation = oxResult.is_protective ? 0.1 : Math.min(0.6, oxResult.oxidation_rate_um_per_min.value);

    if (T_interface > 800 && !oxResult.is_protective) {
      reactions.push(`Non-protective ${oxResult.oxide_type} scale forms at DOC line`);
      mitigations.push("Ensure coolant reaches DOC region, consider ceramic tooling");
    }

    // --- Tribochemical Wear ---
    // Reaction products at sliding interface
    if (coolant_type && coolant_type !== "straight_oil") {
      mechanisms.tribochemical = 0.2;

      if (coolant_type === "water_soluble_oil" && T_interface > 500) {
        mechanisms.tribochemical = 0.4;
        reactions.push("Coolant decomposition products (sulfides, phosphates) form at interface");
      }
    }

    // EP additives form reaction films
    if (coolant_type === "straight_oil") {
      mechanisms.tribochemical = 0.3;
      reactions.push("EP additive reaction films form protective layers");
      mitigations.push("Maintain adequate EP concentration for film formation");
    }

    // --- Corrosion ---
    if (coolant_type) {
      const compat = this.assessCompatibility({
        coolant_type,
        additives: [],
        workpiece_material,
      });
      mechanisms.corrosion = compat.corrosion_risk.value * 0.5;  // Scale down
    }

    // --- Attrition ---
    // Grain-by-grain removal, worse with hard workpiece inclusions
    if (workpiece_material.includes("cast_iron")) {
      mechanisms.attrition = 0.5;
      reactions.push("Graphite inclusions and hard carbides cause attrition wear");
    }
    if (workpiece_material.includes("inconel") || workpiece_material.includes("hastelloy")) {
      mechanisms.attrition = 0.4;
      reactions.push("Carbide precipitates in Ni-alloys cause tool attrition");
    }

    // Determine dominant mechanism
    let dominant: ChemicalWearMechanism = "diffusion";
    let maxVal = 0;
    for (const [mech, val] of Object.entries(mechanisms)) {
      if (val > maxVal) {
        maxVal = val;
        dominant = mech as ChemicalWearMechanism;
      }
    }

    // Calculate total chemical wear rate
    // Sum weighted contributions
    const totalRate = Object.values(mechanisms).reduce((sum, v) => sum + v * 2, 0);  // µm/min equivalent

    // Build contribution AtomicValues
    const contributions: Record<ChemicalWearMechanism, AtomicValue> = {} as Record<ChemicalWearMechanism, AtomicValue>;
    for (const [mech, val] of Object.entries(mechanisms)) {
      contributions[mech as ChemicalWearMechanism] = mkAv(
        Math.round(val * 100) / 100,
        "contribution",
        val * 0.2,
        this.SOURCE
      );
    }

    // Final mitigations
    if (mitigations.length === 0) {
      mitigations.push("Chemical wear within acceptable levels for current conditions");
    }

    return {
      dominant_mechanism: dominant,
      mechanism_contributions: contributions,
      total_chemical_wear_rate_um_per_min: mkAv(
        Math.round(totalRate * 100) / 100,
        "µm/min",
        totalRate * 0.3,
        this.SOURCE
      ),
      interface_temperature_C: mkAv(
        Math.round(T_interface),
        "°C",
        T_interface * 0.15,
        "Loewen-Shaw model"
      ),
      reaction_products: reactions,
      mitigation_strategies: mitigations,
    };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // COOLANT SELECTION
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Select optimal coolant based on chemistry considerations
   * @param input Selection parameters
   * @returns Coolant recommendation
   */
  selectCoolant(input: CoolantSelectionInput): CoolantSelectionResult {
    const {
      workpiece_material,
      operation,
      cutting_speed_m_min,
      tool_material,
      surface_finish_required_Ra_um,
      environmental_priority = false,
      operator_sensitivity = false,
    } = input;

    const notes: string[] = [];
    const alternatives: Array<{ coolant: CoolantBaseType; score: number; reason: string }> = [];

    // Start with scores for each coolant type
    const scores: Record<CoolantBaseType, number> = {
      water_soluble_oil: 0.7,
      semi_synthetic: 0.75,
      full_synthetic: 0.7,
      straight_oil: 0.6,
      vegetable_ester: 0.65,
      mql_oil: 0.5,
    };

    // --- Material-based adjustments ---
    if (workpiece_material.includes("magnesium")) {
      // Only straight oil or dry!
      scores.water_soluble_oil = 0;
      scores.semi_synthetic = 0;
      scores.full_synthetic = 0;
      scores.straight_oil = 0.5;  // Still risky
      scores.mql_oil = 0.7;       // Minimal oil best
      notes.push("MAGNESIUM: Water-based coolants prohibited — fire/explosion risk");
    }

    if (workpiece_material.includes("titanium")) {
      scores.semi_synthetic += 0.15;
      scores.full_synthetic += 0.1;
      scores.straight_oil -= 0.2;  // Fire risk with chips
      notes.push("Titanium: Chlorine-free formulation mandatory");
    }

    if (workpiece_material.includes("aluminum")) {
      scores.semi_synthetic += 0.1;
      scores.full_synthetic += 0.15;
      scores.straight_oil -= 0.1;  // Staining with chlorinated
      notes.push("Aluminum: Use aluminum-compatible inhibitors, maintain pH 8.5-9.2");
    }

    if (workpiece_material.includes("copper") || workpiece_material.includes("brass")) {
      scores.full_synthetic += 0.2;
      scores.semi_synthetic += 0.1;
      scores.straight_oil -= 0.3;  // Sulfur staining
      scores.water_soluble_oil -= 0.1;
      notes.push("Copper alloys: Avoid sulfurized EP additives — severe staining");
    }

    if (workpiece_material.includes("stainless")) {
      scores.semi_synthetic += 0.1;
      scores.straight_oil += 0.1;  // EP helps with work hardening
      notes.push("Stainless: EP additives beneficial, low-chloride formulation preferred");
    }

    if (workpiece_material.includes("inconel") || workpiece_material.includes("hastelloy")) {
      scores.semi_synthetic += 0.15;
      scores.water_soluble_oil += 0.1;
      notes.push("Nickel alloys: High-pressure delivery recommended for chip clearance");
    }

    if (workpiece_material.includes("cast_iron")) {
      scores.mql_oil += 0.3;
      scores.water_soluble_oil -= 0.2;  // Rust
      notes.push("Cast iron: MQL or dry often preferred to avoid rust staining");
    }

    // --- Operation-based adjustments ---
    const opGuide = CONCENTRATION_GUIDELINES[operation];

    if (opGuide.lubricity_weight > 0.7) {
      // High lubricity needed (threading, tapping, grooving)
      scores.straight_oil += 0.15;
      scores.semi_synthetic += 0.1;
      scores.mql_oil += 0.1;
    }

    if (opGuide.cooling_weight > 0.5) {
      // High cooling needed (roughing)
      scores.water_soluble_oil += 0.1;
      scores.full_synthetic += 0.1;
      scores.straight_oil -= 0.1;
    }

    // --- Speed-based adjustments ---
    if (cutting_speed_m_min > 200) {
      // High speed = more heat = need cooling
      scores.full_synthetic += 0.1;
      scores.semi_synthetic += 0.05;
      scores.straight_oil -= 0.15;
      notes.push("High cutting speed: Prioritize cooling capacity over lubricity");
    }

    // --- Tool-based adjustments ---
    if (tool_material === "ceramic_al2o3" || tool_material === "ceramic_sialon") {
      scores.mql_oil += 0.2;
      scores.straight_oil -= 0.2;  // Thermal shock risk
      notes.push("Ceramic tools: MQL or dry preferred to avoid thermal shock");
    }

    if (tool_material === "pcd") {
      scores.full_synthetic += 0.1;
      scores.semi_synthetic += 0.1;
      notes.push("PCD tools: Synthetic coolants maintain diamond stability");
    }

    // --- Surface finish adjustments ---
    if (surface_finish_required_Ra_um !== undefined && surface_finish_required_Ra_um < 1.6) {
      // Fine finish needs good lubricity
      scores.straight_oil += 0.1;
      scores.semi_synthetic += 0.05;
      notes.push("Fine surface finish (<Ra 1.6): Higher lubricity beneficial");
    }

    // --- Environmental/health adjustments ---
    if (environmental_priority) {
      scores.vegetable_ester += 0.25;
      scores.mql_oil += 0.2;
      scores.full_synthetic += 0.1;
      scores.straight_oil -= 0.2;
      notes.push("Environmental priority: Bio-based and synthetic options preferred");
    }

    if (operator_sensitivity) {
      scores.full_synthetic += 0.15;
      scores.vegetable_ester += 0.1;
      scores.water_soluble_oil -= 0.1;
      notes.push("Operator sensitivity: Low-irritation synthetics recommended");
    }

    // --- Find best coolant ---
    let best: CoolantBaseType = "semi_synthetic";
    let bestScore = 0;

    for (const [coolant, score] of Object.entries(scores)) {
      if (score > bestScore) {
        bestScore = score;
        best = coolant as CoolantBaseType;
      }
    }

    // Build alternatives list
    for (const [coolant, score] of Object.entries(scores)) {
      if (coolant !== best && score > 0.3) {
        let reason = "";
        if (score > bestScore - 0.1) reason = "Nearly equivalent performance";
        else if (score > bestScore - 0.2) reason = "Good alternative";
        else reason = "Acceptable with precautions";

        alternatives.push({
          coolant: coolant as CoolantBaseType,
          score: Math.round(score * 100) / 100,
          reason,
        });
      }
    }
    alternatives.sort((a, b) => b.score - a.score);

    // Determine additives
    const additives: CoolantAdditive[] = [];

    if (opGuide.lubricity_weight > 0.6) {
      additives.push("fatty_acid");
    }
    if (workpiece_material.includes("stainless") || workpiece_material.includes("titanium")) {
      additives.push("ep_phosphorus");  // Safe EP for these materials
    }
    if (workpiece_material.includes("copper") || workpiece_material.includes("brass")) {
      additives.push("triazole");  // Copper passivator
    }
    if (best !== "straight_oil" && best !== "mql_oil") {
      additives.push("biocide_triazine");  // Low-sensitization biocide
      additives.push("amine");  // Corrosion inhibitor
    }

    // Concentration
    const concentration = opGuide.optimal_pct;

    // pH target
    let phTarget = 9.0;
    if (workpiece_material.includes("aluminum")) {
      phTarget = 8.8;  // Lower to avoid staining
    }

    if (notes.length === 0) {
      notes.push("Standard coolant selection — monitor concentration and pH per schedule");
    }

    return {
      recommended_coolant: best,
      recommended_additives: additives,
      concentration_pct: mkAv(
        concentration,
        "%",
        1.5,
        this.SOURCE
      ),
      ph_target: mkAv(
        phTarget,
        "pH",
        0.3,
        this.SOURCE
      ),
      suitability_score: mkAv(
        Math.round(bestScore * 100) / 100,
        "score",
        0.1,
        this.SOURCE
      ),
      alternatives: alternatives.slice(0, 3),
      chemistry_notes: notes,
    };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // CONCENTRATION OPTIMIZATION
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Optimize coolant concentration for specific operation
   * @param input Optimization parameters
   * @returns Optimal concentration recommendation
   */
  optimizeCoolantConcentration(input: ConcentrationOptInput): ConcentrationOptResult {
    const {
      coolant_type,
      operation,
      workpiece_material,
      cutting_speed_m_min,
      current_concentration_pct,
      tool_life_target_min,
      surface_finish_target_Ra,
    } = input;

    const recs: string[] = [];
    const opGuide = CONCENTRATION_GUIDELINES[operation];

    // Base optimal from operation guidelines
    let optimal = opGuide.optimal_pct;

    // --- Material adjustments ---
    if (workpiece_material.includes("titanium") || workpiece_material.includes("inconel")) {
      optimal += 2;  // These need more cooling/lubricity
      recs.push("High-alloy material: Increased concentration for better lubricity");
    }

    if (workpiece_material.includes("cast_iron")) {
      optimal -= 1;  // Less coolant needed, graphite helps
    }

    if (workpiece_material.includes("aluminum")) {
      optimal = Math.min(optimal, 8);  // Avoid staining from high concentration
      recs.push("Aluminum: Keep concentration ≤8% to prevent staining");
    }

    // --- Speed adjustments ---
    if (cutting_speed_m_min > 150) {
      optimal += 1;  // More cooling needed
    }
    if (cutting_speed_m_min < 50) {
      optimal -= 0.5;  // Less heat, lubricity more important
    }

    // --- Coolant type adjustments ---
    if (coolant_type === "full_synthetic") {
      optimal *= 0.9;  // Synthetics are more concentrated
    }
    if (coolant_type === "straight_oil") {
      // Straight oil is used neat (100%)
      return {
        optimal_concentration_pct: mkAv(100, "%", 0, this.SOURCE, "Straight oil used neat"),
        lubricity_index: mkAv(0.95, "index", 0.05, this.SOURCE),
        cooling_capacity: mkAv(0.6, "index", 0.1, this.SOURCE),
        cost_per_liter: mkAv(6, "$/L", 1, "Industry average"),
        projected_tool_life_improvement_pct: mkAv(0, "%", 0, this.SOURCE),
        projected_surface_finish_Ra: mkAv(1.6, "um", 0.3, this.SOURCE),
        recommendations: ["Straight cutting oil used at 100% concentration (neat)"],
      };
    }

    // Clamp to reasonable range
    optimal = clamp(optimal, opGuide.min_pct, opGuide.max_pct);

    // --- Calculate indices ---
    // Lubricity index (higher concentration = more lubricity)
    const lubricity = clamp((optimal - opGuide.min_pct) / (opGuide.max_pct - opGuide.min_pct), 0.3, 0.95);

    // Cooling capacity (moderate concentration optimal, too high reduces cooling)
    let cooling = 0.9;
    if (optimal > 12) cooling -= (optimal - 12) * 0.03;
    if (optimal < 5) cooling -= (5 - optimal) * 0.05;
    cooling = clamp(cooling, 0.5, 0.95);

    // --- Cost estimation ---
    // Typical concentrate costs per liter
    const concentrateCosts: Record<CoolantBaseType, number> = {
      water_soluble_oil: 8,
      semi_synthetic: 12,
      full_synthetic: 18,
      straight_oil: 6,
      vegetable_ester: 15,
      mql_oil: 25,
    };

    const concentrateCost = concentrateCosts[coolant_type] || 10;
    // straight_oil returns early above (lines 1863-1874), so coolant_type is never "straight_oil" here
    const costPerLiter = concentrateCost * (optimal / 100);

    // --- Tool life improvement ---
    let lifeImprovement = 0;
    if (current_concentration_pct !== undefined) {
      const delta = optimal - current_concentration_pct;
      if (delta > 0 && current_concentration_pct < opGuide.optimal_pct) {
        // Moving toward optimal from too low
        lifeImprovement = delta * 5;  // ~5% per percent concentration increase
      } else if (delta < 0 && current_concentration_pct > opGuide.optimal_pct * 1.5) {
        // Moving toward optimal from too high (reducing residue/BUE)
        lifeImprovement = Math.abs(delta) * 3;
      }
      lifeImprovement = clamp(lifeImprovement, -20, 40);
    }

    // --- Surface finish prediction ---
    // Higher lubricity = better finish (lower Ra)
    let predictedRa = 3.2;  // Default baseline
    predictedRa *= (1.5 - lubricity);  // Scale by lubricity
    if (workpiece_material.includes("aluminum")) predictedRa *= 0.6;  // Al finishes well
    if (workpiece_material.includes("stainless")) predictedRa *= 1.2;  // SS harder to finish
    predictedRa = Math.max(0.4, predictedRa);

    // --- Recommendations ---
    if (current_concentration_pct !== undefined) {
      const delta = optimal - current_concentration_pct;
      if (Math.abs(delta) > 2) {
        if (delta > 0) {
          recs.push(`Increase concentration from ${current_concentration_pct}% to ${optimal.toFixed(1)}% for optimal performance`);
        } else {
          recs.push(`Reduce concentration from ${current_concentration_pct}% to ${optimal.toFixed(1)}% to improve cooling and reduce cost`);
        }
      } else {
        recs.push("Current concentration is within optimal range");
      }
    }

    if (tool_life_target_min !== undefined && lifeImprovement < 0) {
      recs.push("Concentration adjustment may not meet tool life target — consider coolant type change");
    }

    if (surface_finish_target_Ra !== undefined && predictedRa > surface_finish_target_Ra) {
      recs.push(`Predicted Ra ${predictedRa.toFixed(1)} µm exceeds target ${surface_finish_target_Ra} µm — consider increasing lubricity additives`);
    }

    if (recs.length === 0) {
      recs.push("Concentration optimization complete — maintain with regular monitoring");
    }

    return {
      optimal_concentration_pct: mkAv(
        Math.round(optimal * 10) / 10,
        "%",
        1.5,
        this.SOURCE
      ),
      lubricity_index: mkAv(
        Math.round(lubricity * 100) / 100,
        "index",
        0.1,
        this.SOURCE
      ),
      cooling_capacity: mkAv(
        Math.round(cooling * 100) / 100,
        "index",
        0.1,
        this.SOURCE
      ),
      cost_per_liter: mkAv(
        Math.round(costPerLiter * 100) / 100,
        "$/L",
        costPerLiter * 0.15,
        "Industry average"
      ),
      projected_tool_life_improvement_pct: mkAv(
        Math.round(lifeImprovement * 10) / 10,
        "%",
        Math.abs(lifeImprovement) * 0.3,
        this.SOURCE
      ),
      projected_surface_finish_Ra: mkAv(
        Math.round(predictedRa * 100) / 100,
        "µm",
        predictedRa * 0.2,
        this.SOURCE
      ),
      recommendations: recs,
    };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // ENVIRONMENTAL & SAFETY ASSESSMENT
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Assess environmental and safety factors
   * @param input Environmental parameters
   * @returns Safety assessment
   */
  assessEnvironmentalSafety(input: EnvironmentalInput): EnvironmentalResult {
    const {
      coolant_type,
      additives,
      sump_volume_liters,
      air_flow_m3_min = 10,
      enclosure_type = "partial",
      spindle_rpm = 1000,
    } = input;

    const recs: string[] = [];
    const ppe: string[] = [];

    const envData = ENVIRONMENTAL_DATA[coolant_type];

    // --- Mist Generation ---
    // Base mist from coolant type, increased by spindle speed
    let mist = envData.mist_factor * 0.5;  // mg/m³ base

    // Spindle speed effect (mist increases with RPM)
    mist *= Math.pow(spindle_rpm / 1000, 0.7);

    // Enclosure effect
    if (enclosure_type === "full") {
      mist *= 0.3;
    } else if (enclosure_type === "partial") {
      mist *= 0.6;
    }

    // Dilution by air flow
    mist *= (10 / air_flow_m3_min);

    // NIOSH REL for metalworking fluids: 0.5 mg/m³ (thoracic)
    const nioshExceeded = mist > 0.5;

    if (nioshExceeded) {
      recs.push(`Mist level ${mist.toFixed(2)} mg/m³ exceeds NIOSH REL (0.5 mg/m³) — improve ventilation or enclosure`);
      ppe.push("Respiratory protection (N95 minimum)");
    }

    // --- VOC Emissions ---
    let voc = envData.voc_content_g_L * 0.1;  // ppm approximation based on evaporation

    // Temperature effect (higher temp = more evaporation)
    // Assume sump at 30°C typically

    // Additive contributions
    for (const add of additives) {
      if (add.includes("amine")) voc += 5;
      if (add.includes("biocide_formaldehyde")) voc += 10;
    }

    // OSHA PEL for general VOCs: varies, 50 ppm typical reference
    if (voc > 50) {
      recs.push("VOC levels elevated — ensure adequate local exhaust ventilation");
      ppe.push("Organic vapor respirator for prolonged exposure");
    }

    // --- Fire Risk ---
    const flashPoint = envData.flash_point_C;
    let fireLevel: "low" | "moderate" | "high" | "extreme" = "low";

    if (coolant_type === "straight_oil") {
      fireLevel = "moderate";
      if (spindle_rpm > 5000) fireLevel = "high";
      recs.push("Straight cutting oil: Fire suppression system recommended");
    }

    if (coolant_type === "mql_oil" && spindle_rpm > 10000) {
      fireLevel = "moderate";
    }

    // Check for reactive materials (would need material input)
    // For now, general assessment

    if (fireLevel !== "low") {
      ppe.push("Fire-resistant clothing");
      recs.push(`Flash point ${flashPoint}°C — ensure no ignition sources near machine`);
    }

    // --- Dermatitis Risk ---
    let dermatitis = envData.dermatitis_risk;

    // Additive effects
    for (const add of additives) {
      const params = BIOCIDE_PARAMS[add];
      if (params?.sensitizer) {
        dermatitis += 0.15;
      }
    }

    // Concentration effect (higher = more irritation potential)
    // This would need concentration input

    dermatitis = clamp(dermatitis, 0, 1);

    if (dermatitis > 0.3) {
      ppe.push("Chemical-resistant gloves (nitrile)");
      ppe.push("Protective apron");
    }
    if (dermatitis > 0.5) {
      recs.push("High dermatitis risk — ensure barrier cream use, frequent glove changes");
      ppe.push("Face shield for splash protection");
    }

    // --- OSHA Compliance ---
    // Simplified check
    // fireLevel is never assigned "extreme" in this method (straight_oil/mql_oil only reach "moderate"/"high")
    const oshaCompliant = !nioshExceeded && voc < 100;

    // --- Disposal ---
    const disposal = envData.disposal_code;
    recs.push(`Disposal: ${disposal} — contact licensed waste hauler for proper disposal`);

    // Standard PPE
    if (!ppe.includes("Safety glasses")) ppe.unshift("Safety glasses");
    if (!ppe.includes("Steel-toed boots")) ppe.push("Steel-toed boots");

    if (recs.length <= 1) {
      recs.unshift("Environmental conditions acceptable — maintain regular monitoring");
    }

    return {
      mist_generation_mg_m3: mkAv(
        Math.round(mist * 100) / 100,
        "mg/m³",
        mist * 0.3,
        this.SOURCE + " (NIOSH model)"
      ),
      voc_emissions_ppm: mkAv(
        Math.round(voc * 10) / 10,
        "ppm",
        voc * 0.3,
        this.SOURCE
      ),
      flash_point_C: mkAv(
        flashPoint,
        "°C",
        10,
        "Manufacturer data"
      ),
      fire_risk_level: fireLevel,
      dermatitis_risk: mkAv(
        Math.round(dermatitis * 100) / 100,
        "probability",
        0.15,
        this.SOURCE
      ),
      osha_compliance: oshaCompliant,
      niosh_rel_exceeded: nioshExceeded,
      required_ppe: ppe,
      disposal_classification: disposal,
      recommendations: recs,
    };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // BATCH ANALYSIS METHODS
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Perform comprehensive chemistry analysis for a cutting operation
   * Combines all chemistry factors into single assessment
   */
  comprehensiveAnalysis(input: {
    workpiece_material: WorkpieceMaterial;
    tool_material: ToolMaterial;
    tool_coating?: ToolCoating;
    operation: LatheOperation;
    cutting_speed_m_min: number;
    feed_mm_rev: number;
    depth_of_cut_mm: number;
    coolant_type?: CoolantBaseType;
    coolant_concentration_pct?: number;
  }): {
    coolant_recommendation: CoolantSelectionResult;
    chemical_wear: ChemicalWearResult;
    compatibility?: CompatibilityResult;
    concentration_optimization?: ConcentrationOptResult;
    oxidation: OxidationResult;
    diffusion: DiffusionWearResult;
    summary: string[];
  } {
    const {
      workpiece_material,
      tool_material,
      tool_coating,
      operation,
      cutting_speed_m_min,
      feed_mm_rev,
      depth_of_cut_mm,
      coolant_type,
      coolant_concentration_pct,
    } = input;

    // Estimate interface temperature
    const T_interface = estimateInterfaceTemperature(
      cutting_speed_m_min,
      feed_mm_rev,
      depth_of_cut_mm,
      workpiece_material
    );

    // Run all analyses
    const coolantRec = this.selectCoolant({
      workpiece_material,
      operation,
      cutting_speed_m_min,
      tool_material,
    });

    const chemWear = this.assessChemicalWear({
      workpiece_material,
      tool_material,
      tool_coating,
      cutting_speed_m_min,
      feed_mm_rev,
      depth_of_cut_mm,
      coolant_type: coolant_type || coolantRec.recommended_coolant,
      operation,
    });

    let compat: CompatibilityResult | undefined;
    if (coolant_type) {
      compat = this.assessCompatibility({
        coolant_type,
        additives: [],
        workpiece_material,
        concentration_pct: coolant_concentration_pct,
      });
    }

    let concOpt: ConcentrationOptResult | undefined;
    if (coolant_type && coolant_type !== "straight_oil") {
      concOpt = this.optimizeCoolantConcentration({
        coolant_type,
        operation,
        workpiece_material,
        cutting_speed_m_min,
        current_concentration_pct: coolant_concentration_pct,
      });
    }

    const oxidation = this.calculateOxidationRate({
      material: workpiece_material,
      temperature_C: T_interface * 0.8,  // Chip temperature
      time_minutes: 1,
    });

    const diffusion = this.predictDiffusionWear({
      tool_material,
      tool_coating,
      workpiece_material,
      interface_temperature_C: T_interface,
      contact_time_seconds: 60,
    });

    // Generate summary
    const summary: string[] = [];

    summary.push(`Interface temperature: ~${Math.round(T_interface)}°C`);
    summary.push(`Dominant wear mechanism: ${chemWear.dominant_mechanism}`);
    summary.push(`Recommended coolant: ${coolantRec.recommended_coolant} (score: ${coolantRec.suitability_score.value})`);

    if (diffusion.wear_rate_um_per_hour.value > 5) {
      summary.push(`HIGH diffusion wear rate: ${diffusion.wear_rate_um_per_hour.value.toFixed(1)} µm/hr`);
    }

    if (compat && compat.overall_rating === "poor") {
      summary.push(`WARNING: Poor coolant-material compatibility`);
    }

    if (oxidation.oxidation_rate_um_per_min.value > 0.1) {
      summary.push(`Significant oxidation: ${oxidation.oxidation_rate_um_per_min.value.toFixed(3)} µm/min`);
    }

    return {
      coolant_recommendation: coolantRec,
      chemical_wear: chemWear,
      compatibility: compat,
      concentration_optimization: concOpt,
      oxidation,
      diffusion,
      summary,
    };
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const latheCuttingChemistryEngine = new LatheCuttingChemistryEngine();
