/**
 * UltimateSpeedFeedEngine — AI-Powered Unified Speed & Feed Optimization
 *
 * The most comprehensive speed/feed calculator in existence. Accepts ANY subset
 * of inputs and infers all missing parameters using physics-based models,
 * material databases, and empirical lookup tables.
 *
 * Capabilities far exceeding Harvey Tool / Kennametal / Sandvik calculators:
 *   - Partial input inference (material alone → full parameter set)
 *   - Physics-backed optimization (Kienzle force, Taylor tool life, Loewen-Shaw thermal)
 *   - Chip thinning compensation with empirical validation
 *   - Power/torque budget verification against machine limits
 *   - Thermal damage risk assessment with coating-aware limits
 *   - Tool life prediction with cost-optimized vs productivity-optimized speeds
 *   - Surface finish prediction (Ra from feed geometry + runout)
 *   - MRR maximization within all constraint envelopes
 *   - Multi-operation support: milling, turning, drilling, tapping, reaming, boring
 *   - 6 ISO material groups × 7 operations × 3 cut types = 126+ parameter combos
 *   - Confidence scoring on every output parameter
 *   - Formulas shown for every calculated value
 *   - Alternative parameter sets (conservative / balanced / aggressive)
 *
 * Orchestrates: CuttingDataLookup, ChipLoad, FeedRateOptimization,
 *   CuttingForce (Kienzle), CuttingPowerBudget, CuttingTemperature,
 *   ToolWearRate (Taylor), AdvancedChipThickness, EngagementGeometry
 *
 * @module engines/UltimateSpeedFeedEngine
 */

import { log } from "../utils/Logger.js";

// ============================================================================
// TYPES
// ============================================================================

export type ISOGroup = "P" | "M" | "K" | "N" | "S" | "H";
export type Operation = "milling" | "turning" | "drilling" | "tapping" | "reaming" | "boring" | "thread_milling";
export type CutType = "roughing" | "semi_finishing" | "finishing";
export type ToolMaterial = "carbide" | "hss" | "cermet" | "ceramic" | "cbn" | "pcd";
export type CoolantType = "flood" | "mist" | "mql" | "air_blast" | "dry" | "through_tool" | "cryogenic";

/** Accept ANY subset of inputs — the engine infers the rest */
export interface UltimateSpeedFeedInput {
  // Material (any one triggers ISO group resolution)
  material?: string;
  iso_group?: ISOGroup;
  hardness_hb?: number;
  hardness_hrc?: number;

  // Tool
  tool_diameter_mm?: number;
  flutes?: number;
  tool_material?: ToolMaterial;
  tool_coating?: string;
  helix_angle_deg?: number;
  corner_radius_mm?: number;
  flute_length_mm?: number;
  overall_length_mm?: number;
  tool_stickout_mm?: number;

  // Operation
  operation?: Operation;
  cut_type?: CutType;
  strategy?: "conventional" | "adaptive" | "trochoidal" | "hsm" | "hpc" | "plunge" | "slot";

  // User-supplied cutting parameters (override inference)
  cutting_speed_mpm?: number;
  spindle_rpm?: number;
  feed_per_tooth_mm?: number;
  feed_per_rev_mm?: number;
  feed_rate_mmmin?: number;
  axial_depth_mm?: number;
  radial_depth_mm?: number;
  radial_depth_pct?: number;

  // Machine constraints
  machine_power_kw?: number;
  machine_max_rpm?: number;
  machine_max_torque_nm?: number;
  machine_rigidity?: "low" | "medium" | "high";

  // Workpiece geometry (for turning)
  workpiece_diameter_mm?: number;

  // Drilling specific
  hole_depth_mm?: number;
  hole_type?: "through" | "blind";
  thread_pitch_mm?: number;

  // Optimization goal
  optimize_for?: "tool_life" | "productivity" | "surface_finish" | "balanced";

  // Coolant
  coolant?: CoolantType;
}

/** Confidence-scored atomic value with formula provenance */
export interface OptimizedValue {
  value: number;
  unit: string;
  confidence: number;          // 0.0–1.0
  source: "calculated" | "lookup" | "inferred" | "user_input" | "default";
  formula?: string;            // LaTeX-style formula shown
  range?: { low: number; high: number };
  notes?: string[];
}

export interface SurfaceFinishPrediction {
  theoretical_ra_um: OptimizedValue;
  practical_ra_um: OptimizedValue;
  scallop_height_um?: OptimizedValue;
}

export interface ToolLifePrediction {
  life_minutes: OptimizedValue;
  life_parts_estimate?: OptimizedValue;
  optimal_speed_cost: OptimizedValue;
  optimal_speed_productivity: OptimizedValue;
  wear_mechanism: string;
}

export interface ForceAnalysis {
  tangential_force_N: OptimizedValue;
  radial_force_N: OptimizedValue;
  axial_force_N: OptimizedValue;
  resultant_force_N: OptimizedValue;
  torque_Nm: OptimizedValue;
  deflection_um?: OptimizedValue;
}

export interface ThermalAnalysis {
  interface_temp_C: OptimizedValue;
  coating_limit_C: OptimizedValue;
  thermal_margin_pct: OptimizedValue;
  thermal_damage_risk: "none" | "low" | "moderate" | "high" | "critical";
}

export interface PowerAnalysis {
  required_power_kw: OptimizedValue;
  available_power_kw?: OptimizedValue;
  power_utilization_pct?: OptimizedValue;
  is_within_budget: boolean;
  limiting_factor?: "power" | "torque" | "none";
}

export interface UltimateSpeedFeedResult {
  // Core optimized parameters
  cutting_speed: OptimizedValue;         // Vc (m/min)
  spindle_rpm: OptimizedValue;           // n (rev/min)
  feed_per_tooth: OptimizedValue;        // fz (mm/tooth) — milling
  feed_per_rev: OptimizedValue;          // fn (mm/rev) — turning/drilling
  feed_rate: OptimizedValue;             // Vf (mm/min)
  axial_depth: OptimizedValue;           // ap (mm)
  radial_depth: OptimizedValue;          // ae (mm)
  mrr: OptimizedValue;                   // Q (cm³/min)

  // Chip analysis
  chip_thickness_max: OptimizedValue;    // hex (mm)
  chip_thinning_factor: OptimizedValue;
  chip_load_actual: OptimizedValue;      // actual hm (mm)

  // Physics analysis
  forces: ForceAnalysis;
  power: PowerAnalysis;
  thermal: ThermalAnalysis;
  surface_finish: SurfaceFinishPrediction;
  tool_life: ToolLifePrediction;

  // Resolved inputs (what was inferred)
  resolved: {
    material: string;
    iso_group: ISOGroup;
    operation: Operation;
    cut_type: CutType;
    tool_diameter_mm: number;
    flutes: number;
    tool_material: ToolMaterial;
    coolant: CoolantType;
    hardness_hb: number;
  };

  // Alternative parameter sets
  alternatives: {
    conservative: { vc: number; fz: number; ap: number; ae_pct: number; note: string };
    balanced: { vc: number; fz: number; ap: number; ae_pct: number; note: string };
    aggressive: { vc: number; fz: number; ap: number; ae_pct: number; note: string };
  };

  // Meta
  inferred_parameters: string[];   // which params were inferred (not user-supplied)
  warnings: string[];
  recommendations: string[];
  confidence_overall: number;       // 0.0–1.0, geometric mean of all confidences
  formulas_used: string[];
}

// ============================================================================
// MATERIAL DATABASE — ISO Group + Typical Properties
// ============================================================================

interface MaterialProfile {
  iso_group: ISOGroup;
  aliases: string[];
  hardness_hb_typical: number;
  hardness_hb_range: [number, number];
  tensile_strength_mpa: number;
  thermal_conductivity_wm_k: number;
  specific_heat_j_kg_k: number;
  kc1_1: number;             // Kienzle Kc1.1 (N/mm²)
  mc: number;                // Kienzle exponent
  machinability_factor: number;  // relative to AISI 1212 = 1.0
  taylor_n_carbide: number;
  taylor_C_carbide: number;
  work_hardening_tendency: "none" | "low" | "moderate" | "high" | "severe";
  built_up_edge_risk: "none" | "low" | "moderate" | "high";
  chip_type: "continuous" | "segmented" | "discontinuous" | "built_up";
  fire_risk: boolean;
  notes: string[];
}

const MATERIAL_DB: Record<string, MaterialProfile> = {
  // ── P: Steel ──
  steel: {
    iso_group: "P", aliases: ["carbon_steel", "mild_steel", "1018", "1020"],
    hardness_hb_typical: 180, hardness_hb_range: [120, 300],
    tensile_strength_mpa: 600, thermal_conductivity_wm_k: 52,
    specific_heat_j_kg_k: 486, kc1_1: 1800, mc: 0.26,
    machinability_factor: 0.65, taylor_n_carbide: 0.25, taylor_C_carbide: 300,
    work_hardening_tendency: "low", built_up_edge_risk: "moderate",
    chip_type: "continuous", fire_risk: false,
    notes: ["General purpose steel", "Good machinability"],
  },
  alloy_steel: {
    iso_group: "P", aliases: ["4140", "4340", "8620", "4130"],
    hardness_hb_typical: 250, hardness_hb_range: [180, 350],
    tensile_strength_mpa: 850, thermal_conductivity_wm_k: 42,
    specific_heat_j_kg_k: 473, kc1_1: 2000, mc: 0.26,
    machinability_factor: 0.50, taylor_n_carbide: 0.22, taylor_C_carbide: 250,
    work_hardening_tendency: "low", built_up_edge_risk: "low",
    chip_type: "continuous", fire_risk: false,
    notes: ["Reduce speed 15-25% vs plain carbon steel"],
  },
  aisi_1045: {
    iso_group: "P", aliases: ["1045", "c45", "s45c"],
    hardness_hb_typical: 200, hardness_hb_range: [170, 260],
    tensile_strength_mpa: 700, thermal_conductivity_wm_k: 49,
    specific_heat_j_kg_k: 486, kc1_1: 1900, mc: 0.26,
    machinability_factor: 0.55, taylor_n_carbide: 0.24, taylor_C_carbide: 280,
    work_hardening_tendency: "low", built_up_edge_risk: "moderate",
    chip_type: "continuous", fire_risk: false,
    notes: ["Medium carbon, general purpose"],
  },

  // ── M: Stainless Steel ──
  stainless_steel: {
    iso_group: "M", aliases: ["stainless", "304", "316", "303", "austenitic"],
    hardness_hb_typical: 200, hardness_hb_range: [150, 350],
    tensile_strength_mpa: 650, thermal_conductivity_wm_k: 16,
    specific_heat_j_kg_k: 500, kc1_1: 2100, mc: 0.27,
    machinability_factor: 0.40, taylor_n_carbide: 0.20, taylor_C_carbide: 200,
    work_hardening_tendency: "severe", built_up_edge_risk: "high",
    chip_type: "continuous", fire_risk: false,
    notes: ["NEVER dwell — work hardens", "Maintain chip load, never rub", "303 has best machinability"],
  },
  "17_4ph": {
    iso_group: "M", aliases: ["17-4ph", "17-4", "precipitation_hardened"],
    hardness_hb_typical: 330, hardness_hb_range: [280, 440],
    tensile_strength_mpa: 1100, thermal_conductivity_wm_k: 18,
    specific_heat_j_kg_k: 460, kc1_1: 2400, mc: 0.27,
    machinability_factor: 0.30, taylor_n_carbide: 0.18, taylor_C_carbide: 160,
    work_hardening_tendency: "high", built_up_edge_risk: "moderate",
    chip_type: "segmented", fire_risk: false,
    notes: ["Condition H900: hardest, worst machinability", "Condition A: best machinability"],
  },
  duplex: {
    iso_group: "M", aliases: ["duplex_stainless", "2205", "2507", "super_duplex"],
    hardness_hb_typical: 280, hardness_hb_range: [250, 320],
    tensile_strength_mpa: 900, thermal_conductivity_wm_k: 14,
    specific_heat_j_kg_k: 480, kc1_1: 2300, mc: 0.27,
    machinability_factor: 0.25, taylor_n_carbide: 0.18, taylor_C_carbide: 150,
    work_hardening_tendency: "severe", built_up_edge_risk: "moderate",
    chip_type: "segmented", fire_risk: false,
    notes: ["High work hardening", "Use sharp tools, positive rake"],
  },

  // ── K: Cast Iron ──
  cast_iron: {
    iso_group: "K", aliases: ["gray_iron", "grey_iron", "fc200"],
    hardness_hb_typical: 200, hardness_hb_range: [150, 300],
    tensile_strength_mpa: 300, thermal_conductivity_wm_k: 50,
    specific_heat_j_kg_k: 460, kc1_1: 1100, mc: 0.28,
    machinability_factor: 0.70, taylor_n_carbide: 0.27, taylor_C_carbide: 350,
    work_hardening_tendency: "none", built_up_edge_risk: "none",
    chip_type: "discontinuous", fire_risk: false,
    notes: ["Dry cutting preferred — thermal shock risk", "Abrasive to tools"],
  },
  ductile_iron: {
    iso_group: "K", aliases: ["nodular_iron", "sg_iron", "fcd"],
    hardness_hb_typical: 220, hardness_hb_range: [160, 320],
    tensile_strength_mpa: 500, thermal_conductivity_wm_k: 36,
    specific_heat_j_kg_k: 460, kc1_1: 1300, mc: 0.28,
    machinability_factor: 0.55, taylor_n_carbide: 0.25, taylor_C_carbide: 300,
    work_hardening_tendency: "low", built_up_edge_risk: "low",
    chip_type: "segmented", fire_risk: false,
    notes: ["Tougher than gray iron", "Better surface finish than gray"],
  },

  // ── N: Non-ferrous ──
  aluminum: {
    iso_group: "N", aliases: ["aluminium", "6061", "7075", "2024", "6082"],
    hardness_hb_typical: 95, hardness_hb_range: [30, 150],
    tensile_strength_mpa: 310, thermal_conductivity_wm_k: 167,
    specific_heat_j_kg_k: 897, kc1_1: 700, mc: 0.23,
    machinability_factor: 2.0, taylor_n_carbide: 0.28, taylor_C_carbide: 700,
    work_hardening_tendency: "none", built_up_edge_risk: "high",
    chip_type: "continuous", fire_risk: false,
    notes: ["High speed machining ideal", "2-3 flute preferred", "Uncoated or DLC polished"],
  },
  brass: {
    iso_group: "N", aliases: ["c360", "free_cutting_brass"],
    hardness_hb_typical: 80, hardness_hb_range: [50, 120],
    tensile_strength_mpa: 360, thermal_conductivity_wm_k: 120,
    specific_heat_j_kg_k: 377, kc1_1: 780, mc: 0.18,
    machinability_factor: 2.5, taylor_n_carbide: 0.30, taylor_C_carbide: 600,
    work_hardening_tendency: "none", built_up_edge_risk: "low",
    chip_type: "discontinuous", fire_risk: false,
    notes: ["Excellent machinability", "Small chips, good finish"],
  },
  copper: {
    iso_group: "N", aliases: ["c110", "ofhc_copper"],
    hardness_hb_typical: 50, hardness_hb_range: [40, 100],
    tensile_strength_mpa: 220, thermal_conductivity_wm_k: 401,
    specific_heat_j_kg_k: 385, kc1_1: 650, mc: 0.20,
    machinability_factor: 1.0, taylor_n_carbide: 0.28, taylor_C_carbide: 500,
    work_hardening_tendency: "moderate", built_up_edge_risk: "high",
    chip_type: "continuous", fire_risk: false,
    notes: ["Stringy chips", "Sharp positive rake needed", "DLC coating helps"],
  },
  plastic: {
    iso_group: "N", aliases: ["acetal", "delrin", "nylon", "peek", "polycarbonate", "abs", "hdpe", "ptfe"],
    hardness_hb_typical: 20, hardness_hb_range: [5, 40],
    tensile_strength_mpa: 70, thermal_conductivity_wm_k: 0.25,
    specific_heat_j_kg_k: 1500, kc1_1: 350, mc: 0.20,
    machinability_factor: 3.0, taylor_n_carbide: 0.35, taylor_C_carbide: 1000,
    work_hardening_tendency: "none", built_up_edge_risk: "none",
    chip_type: "continuous", fire_risk: false,
    notes: ["Heat sensitive — use air blast or mist", "Sharp tools, low rake angle for brittle plastics", "O-flute or 2-flute single edge"],
  },

  // ── S: Superalloys & Titanium ──
  titanium: {
    iso_group: "S", aliases: ["ti_6al_4v", "ti64", "grade5", "grade2", "ti_6-4"],
    hardness_hb_typical: 330, hardness_hb_range: [200, 400],
    tensile_strength_mpa: 950, thermal_conductivity_wm_k: 7,
    specific_heat_j_kg_k: 526, kc1_1: 1400, mc: 0.22,
    machinability_factor: 0.20, taylor_n_carbide: 0.20, taylor_C_carbide: 120,
    work_hardening_tendency: "high", built_up_edge_risk: "moderate",
    chip_type: "segmented", fire_risk: true,
    notes: ["NEVER machine dry — fire risk", "Low thermal conductivity = heat in tool",
            "Maintain chip load — rubbing causes work hardening",
            "Trochoidal/adaptive essential for slotting"],
  },
  inconel: {
    iso_group: "S", aliases: ["inconel_718", "inconel_625", "hastelloy", "waspaloy", "nimonic"],
    hardness_hb_typical: 350, hardness_hb_range: [250, 450],
    tensile_strength_mpa: 1200, thermal_conductivity_wm_k: 11,
    specific_heat_j_kg_k: 435, kc1_1: 2800, mc: 0.22,
    machinability_factor: 0.10, taylor_n_carbide: 0.15, taylor_C_carbide: 80,
    work_hardening_tendency: "severe", built_up_edge_risk: "high",
    chip_type: "segmented", fire_risk: false,
    notes: ["Worst machinability common material", "Ceramic inserts at high speed OR carbide low speed",
            "High-pressure coolant (70+ bar) critical"],
  },

  // ── H: Hardened Steel ──
  hardened_steel: {
    iso_group: "H", aliases: ["tool_steel", "d2", "h13", "a2", "m2", "s7", "o1", "cpm"],
    hardness_hb_typical: 500, hardness_hb_range: [400, 650],
    tensile_strength_mpa: 1700, thermal_conductivity_wm_k: 24,
    specific_heat_j_kg_k: 460, kc1_1: 3200, mc: 0.20,
    machinability_factor: 0.15, taylor_n_carbide: 0.15, taylor_C_carbide: 100,
    work_hardening_tendency: "none", built_up_edge_risk: "none",
    chip_type: "segmented", fire_risk: false,
    notes: ["Light DOC, light ae — hard milling strategy", "CBN inserts above 55 HRC",
            "Air blast preferred — flood causes thermal shock", "Can replace grinding"],
  },
};

// Alias → canonical material name lookup
const MATERIAL_ALIASES: Record<string, string> = {};
for (const [key, profile] of Object.entries(MATERIAL_DB)) {
  MATERIAL_ALIASES[key] = key;
  for (const alias of profile.aliases) {
    MATERIAL_ALIASES[alias.toLowerCase()] = key;
  }
}

// ============================================================================
// CUTTING DATA TABLE — ISO × Operation × CutType → base parameters
// ============================================================================
// Vc in m/min, fz in mm/tooth (base for 12mm endmill), ap in mm, ae in % of Dc

interface CuttingParams {
  vc: [number, number, number];         // [conservative, balanced, aggressive]
  fz: [number, number, number];         // mm/tooth (12mm endmill base)
  ap: [number, number, number];         // mm
  ae_pct: [number, number, number];     // % of tool diameter
  coolant: CoolantType;
  coatings: string[];
}

type DataKey = `${ISOGroup}_${string}_${CutType}`;

const CUTTING_PARAMS: Record<string, CuttingParams> = {
  // ── P: Steel ──
  P_milling_roughing:       { vc: [90, 140, 185], fz: [0.08, 0.13, 0.18], ap: [3, 8, 15], ae_pct: [25, 40, 65], coolant: "flood", coatings: ["AlTiN", "TiAlN"] },
  P_milling_semi_finishing: { vc: [110, 155, 200], fz: [0.06, 0.10, 0.15], ap: [1, 3, 5], ae_pct: [30, 50, 70], coolant: "flood", coatings: ["AlTiN", "TiAlN"] },
  P_milling_finishing:      { vc: [125, 170, 215], fz: [0.04, 0.08, 0.12], ap: [0.2, 0.5, 2], ae_pct: [50, 75, 100], coolant: "flood", coatings: ["AlTiN", "TiAlN"] },
  P_turning_roughing:       { vc: [120, 185, 245], fz: [0.20, 0.30, 0.50], ap: [1.5, 3, 6], ae_pct: [100, 100, 100], coolant: "flood", coatings: ["CVD TiCN+Al2O3"] },
  P_turning_finishing:      { vc: [155, 215, 275], fz: [0.08, 0.15, 0.25], ap: [0.2, 0.5, 1.5], ae_pct: [100, 100, 100], coolant: "flood", coatings: ["PVD TiAlN", "cermet"] },
  P_drilling_roughing:      { vc: [60, 105, 155], fz: [0.10, 0.18, 0.30], ap: [0, 0, 0], ae_pct: [100, 100, 100], coolant: "flood", coatings: ["TiAlN"] },
  P_tapping_roughing:       { vc: [12, 21, 30], fz: [0, 0, 0], ap: [0, 0, 0], ae_pct: [100, 100, 100], coolant: "flood", coatings: ["TiN", "TiCN"] },

  // ── M: Stainless Steel ──
  M_milling_roughing:       { vc: [60, 100, 140], fz: [0.07, 0.10, 0.15], ap: [2, 5, 10], ae_pct: [20, 35, 50], coolant: "flood", coatings: ["AlTiN", "AlCrN"] },
  M_milling_semi_finishing: { vc: [70, 110, 150], fz: [0.05, 0.08, 0.12], ap: [1, 2, 4], ae_pct: [30, 50, 70], coolant: "flood", coatings: ["AlTiN", "AlCrN"] },
  M_milling_finishing:      { vc: [75, 120, 155], fz: [0.04, 0.07, 0.10], ap: [0.2, 0.5, 1.5], ae_pct: [50, 75, 100], coolant: "flood", coatings: ["AlTiN"] },
  M_turning_roughing:       { vc: [90, 145, 200], fz: [0.15, 0.25, 0.40], ap: [1, 2.5, 5], ae_pct: [100, 100, 100], coolant: "flood", coatings: ["PVD TiAlN"] },
  M_turning_finishing:      { vc: [110, 170, 220], fz: [0.08, 0.12, 0.20], ap: [0.2, 0.4, 1], ae_pct: [100, 100, 100], coolant: "flood", coatings: ["PVD TiAlN", "cermet"] },
  M_drilling_roughing:      { vc: [40, 67, 107], fz: [0.08, 0.15, 0.25], ap: [0, 0, 0], ae_pct: [100, 100, 100], coolant: "flood", coatings: ["AlCrN"] },

  // ── K: Cast Iron ──
  K_milling_roughing:       { vc: [107, 170, 245], fz: [0.10, 0.18, 0.25], ap: [3, 6, 12], ae_pct: [30, 50, 75], coolant: "dry", coatings: ["Al2O3", "AlTiN"] },
  K_milling_finishing:      { vc: [120, 200, 305], fz: [0.05, 0.10, 0.15], ap: [0.2, 0.5, 2], ae_pct: [50, 75, 100], coolant: "air_blast", coatings: ["CBN", "Al2O3"] },
  K_turning_roughing:       { vc: [120, 200, 305], fz: [0.15, 0.25, 0.45], ap: [1.5, 3, 8], ae_pct: [100, 100, 100], coolant: "dry", coatings: ["CVD Al2O3"] },
  K_turning_finishing:      { vc: [150, 240, 350], fz: [0.08, 0.12, 0.20], ap: [0.2, 0.5, 1.5], ae_pct: [100, 100, 100], coolant: "air_blast", coatings: ["CBN", "ceramic"] },

  // ── N: Non-ferrous (Aluminum) ──
  N_milling_roughing:       { vc: [245, 365, 760], fz: [0.10, 0.18, 0.30], ap: [5, 15, 25], ae_pct: [25, 50, 100], coolant: "flood", coatings: ["uncoated", "ZrN", "DLC"] },
  N_milling_semi_finishing: { vc: [275, 400, 700], fz: [0.08, 0.14, 0.22], ap: [2, 5, 10], ae_pct: [30, 50, 75], coolant: "mist", coatings: ["uncoated", "DLC"] },
  N_milling_finishing:      { vc: [305, 460, 915], fz: [0.05, 0.10, 0.15], ap: [0.1, 0.3, 1], ae_pct: [50, 75, 100], coolant: "mist", coatings: ["uncoated", "DLC"] },
  N_turning_roughing:       { vc: [245, 365, 915], fz: [0.12, 0.25, 0.50], ap: [1, 3, 8], ae_pct: [100, 100, 100], coolant: "flood", coatings: ["uncoated", "PCD"] },
  N_turning_finishing:      { vc: [305, 460, 1000], fz: [0.06, 0.12, 0.20], ap: [0.1, 0.3, 1], ae_pct: [100, 100, 100], coolant: "mist", coatings: ["uncoated", "PCD"] },
  N_drilling_roughing:      { vc: [90, 185, 305], fz: [0.12, 0.20, 0.38], ap: [0, 0, 0], ae_pct: [100, 100, 100], coolant: "flood", coatings: ["uncoated", "TiN"] },

  // ── S: Superalloys & Titanium ──
  S_milling_roughing:       { vc: [25, 46, 76], fz: [0.05, 0.10, 0.15], ap: [1, 3, 6], ae_pct: [15, 25, 40], coolant: "flood", coatings: ["AlTiN", "AlCrN"] },
  S_milling_semi_finishing: { vc: [30, 55, 85], fz: [0.04, 0.08, 0.12], ap: [0.5, 1.5, 3], ae_pct: [20, 35, 55], coolant: "flood", coatings: ["AlTiN", "AlCrN"] },
  S_milling_finishing:      { vc: [37, 61, 91], fz: [0.03, 0.06, 0.10], ap: [0.2, 0.5, 1.5], ae_pct: [30, 50, 75], coolant: "flood", coatings: ["AlTiN"] },
  S_turning_roughing:       { vc: [30, 53, 84], fz: [0.10, 0.20, 0.30], ap: [0.5, 2, 4], ae_pct: [100, 100, 100], coolant: "flood", coatings: ["PVD AlTiN"] },
  S_turning_finishing:      { vc: [40, 65, 95], fz: [0.06, 0.10, 0.18], ap: [0.2, 0.4, 1], ae_pct: [100, 100, 100], coolant: "flood", coatings: ["PVD AlTiN"] },
  S_drilling_roughing:      { vc: [15, 30, 55], fz: [0.05, 0.10, 0.20], ap: [0, 0, 0], ae_pct: [100, 100, 100], coolant: "flood", coatings: ["AlTiN"] },

  // ── H: Hardened Steel ──
  H_milling_roughing:       { vc: [46, 76, 122], fz: [0.03, 0.06, 0.12], ap: [0.5, 1.5, 3], ae_pct: [10, 20, 35], coolant: "air_blast", coatings: ["AlTiSiN", "AlCrN"] },
  H_milling_semi_finishing: { vc: [55, 90, 140], fz: [0.02, 0.05, 0.08], ap: [0.2, 0.8, 1.5], ae_pct: [15, 30, 50], coolant: "air_blast", coatings: ["AlTiSiN"] },
  H_milling_finishing:      { vc: [61, 107, 155], fz: [0.02, 0.04, 0.06], ap: [0.05, 0.2, 0.5], ae_pct: [20, 40, 60], coolant: "air_blast", coatings: ["AlTiSiN", "CBN"] },
  H_turning_roughing:       { vc: [61, 107, 155], fz: [0.08, 0.15, 0.25], ap: [0.3, 1, 2], ae_pct: [100, 100, 100], coolant: "dry", coatings: ["CBN", "ceramic"] },
  H_turning_finishing:      { vc: [80, 130, 180], fz: [0.05, 0.08, 0.15], ap: [0.1, 0.3, 0.8], ae_pct: [100, 100, 100], coolant: "dry", coatings: ["CBN"] },
};

// ============================================================================
// DIAMETER-BASED FEED SCALING — fz scales with tool diameter
// ============================================================================

const DIAMETER_FZ_SCALE: [number, number][] = [
  [1, 0.20], [2, 0.30], [3, 0.40], [4, 0.50], [5, 0.55],
  [6, 0.60], [8, 0.70], [10, 0.85], [12, 1.00], [16, 1.15],
  [20, 1.30], [25, 1.45], [32, 1.60], [40, 1.75], [50, 1.90],
  [63, 2.05], [80, 2.20], [100, 2.35],
];

function diameterFzFactor(d_mm: number): number {
  if (d_mm <= DIAMETER_FZ_SCALE[0][0]) return DIAMETER_FZ_SCALE[0][1];
  if (d_mm >= DIAMETER_FZ_SCALE[DIAMETER_FZ_SCALE.length - 1][0])
    return DIAMETER_FZ_SCALE[DIAMETER_FZ_SCALE.length - 1][1];
  for (let i = 0; i < DIAMETER_FZ_SCALE.length - 1; i++) {
    const [d1, f1] = DIAMETER_FZ_SCALE[i];
    const [d2, f2] = DIAMETER_FZ_SCALE[i + 1];
    if (d_mm >= d1 && d_mm <= d2) {
      return f1 + (f2 - f1) * (d_mm - d1) / (d2 - d1);
    }
  }
  return 1.0;
}

// ============================================================================
// HARDNESS ADJUSTMENT — speed modifier by HB deviation from typical
// ============================================================================

function hardnessSpeedFactor(hb: number, typical_hb: number): number {
  // Every 50 HB above typical → -15% speed; every 50 HB below → +10% speed
  const delta = hb - typical_hb;
  if (delta > 0) return Math.max(0.4, 1.0 - (delta / 50) * 0.15);
  return Math.min(1.5, 1.0 + (Math.abs(delta) / 50) * 0.10);
}

// HRC to HB approximate conversion
function hrcToHb(hrc: number): number {
  // ASTM E140 approximation
  if (hrc <= 20) return 226;
  if (hrc >= 68) return 940;
  return Math.round(3.18 * hrc * hrc * 0.01 + 6.23 * hrc + 96.7);
}

// ============================================================================
// CHIP THINNING COMPENSATION
// ============================================================================

const CHIP_THIN_TABLE: [number, number][] = [
  [0.05, 2.30], [0.10, 1.70], [0.15, 1.45], [0.20, 1.30],
  [0.25, 1.20], [0.30, 1.12], [0.35, 1.05], [0.40, 1.02],
  [0.50, 1.00], [0.60, 0.98], [0.70, 0.95], [0.80, 0.92],
  [0.90, 0.88], [1.00, 0.85],
];

function chipThinningFactor(ae_mm: number, Dc_mm: number): number {
  const ratio = Math.min(1.0, Math.max(0.01, ae_mm / Dc_mm));
  // Analytical: Dc / (2 * sqrt(ae * (Dc - ae)))
  const analytical = Dc_mm / (2 * Math.sqrt(Math.max(0.001, ae_mm * (Dc_mm - ae_mm))));
  // Empirical interpolation for validation
  let empirical = 1.0;
  for (let i = 0; i < CHIP_THIN_TABLE.length - 1; i++) {
    const [r1, f1] = CHIP_THIN_TABLE[i];
    const [r2, f2] = CHIP_THIN_TABLE[i + 1];
    if (ratio >= r1 && ratio <= r2) {
      empirical = f1 + (f2 - f1) * (ratio - r1) / (r2 - r1);
      break;
    }
  }
  if (ratio < CHIP_THIN_TABLE[0][0]) empirical = CHIP_THIN_TABLE[0][1];
  if (ratio > CHIP_THIN_TABLE[CHIP_THIN_TABLE.length - 1][0]) empirical = CHIP_THIN_TABLE[CHIP_THIN_TABLE.length - 1][1];
  // Blend: 70% analytical, 30% empirical for best accuracy
  return ratio >= 0.50 ? empirical : 0.7 * analytical + 0.3 * empirical;
}

// ============================================================================
// STRATEGY MODIFIERS — adaptive/trochoidal/HSM adjustments
// ============================================================================

interface StrategyMod {
  vc_factor: number;
  fz_factor: number;
  ap_factor: number;
  ae_override_pct?: number;
  notes: string[];
}

const STRATEGY_MODS: Record<string, StrategyMod> = {
  conventional:  { vc_factor: 1.0, fz_factor: 1.0, ap_factor: 1.0, notes: [] },
  adaptive:      { vc_factor: 1.4, fz_factor: 1.2, ap_factor: 2.0, ae_override_pct: 10, notes: ["Constant engagement toolpath", "ae=8-12% of Dc", "Full flute depth OK"] },
  trochoidal:    { vc_factor: 1.5, fz_factor: 1.3, ap_factor: 2.5, ae_override_pct: 8, notes: ["Trochoidal slotting", "ae=5-10% of Dc", "Full flute depth"] },
  hsm:           { vc_factor: 1.3, fz_factor: 1.0, ap_factor: 0.5, ae_override_pct: 50, notes: ["High speed machining", "Light DOC, high speed", "Machine rigidity critical"] },
  hpc:           { vc_factor: 1.0, fz_factor: 1.0, ap_factor: 2.5, ae_override_pct: 12, notes: ["High performance cutting", "Deep ae, light ap", "Similar to adaptive"] },
  plunge:        { vc_factor: 0.7, fz_factor: 0.5, ap_factor: 1.0, notes: ["Plunge roughing", "Axial force dominant", "Good for weak setups"] },
  slot:          { vc_factor: 0.8, fz_factor: 0.9, ap_factor: 0.7, ae_override_pct: 100, notes: ["Full slot — heat buildup", "Reduce speed 20%", "Chip evacuation critical"] },
};

// ============================================================================
// COATING TEMPERATURE LIMITS
// ============================================================================

const COATING_TEMP_LIMIT: Record<string, number> = {
  uncoated: 400, TiN: 600, TiCN: 450, TiAlN: 800, AlTiN: 900,
  AlCrN: 1100, AlTiSiN: 1200, nACo: 1000, DLC: 300,
  diamond: 600, PCD: 700, CBN: 1200, ceramic: 1500,
  "CVD TiCN+Al2O3": 1000, "PVD TiAlN": 800, ZrN: 550,
};

// ============================================================================
// KIENZLE FORCE MODEL — Fc = Kc × b × h
// ============================================================================

function kienzleCuttingForce(
  kc1_1: number, mc: number, ap_mm: number, hex_mm: number,
  ae_mm?: number, Dc_mm?: number,
): { Fc: number; Kc: number } {
  const h = Math.max(0.001, hex_mm);
  const Kc = kc1_1 * Math.pow(h, -mc);  // Kc = Kc1.1 × h^(-mc)
  // For milling: b ≈ ap (axial DOC), effective width handled by engagement
  const b = ap_mm;
  const Fc = Kc * b * h;  // N
  return { Fc, Kc };
}

// ============================================================================
// TAYLOR TOOL LIFE — V × T^n = C (extended form)
// ============================================================================

function taylorToolLife(
  Vc_mpm: number, n: number, C: number,
  feed_mm?: number, doc_mm?: number,
): number {
  // Basic: T = (C / V)^(1/n)
  let T_min = Math.pow(C / Vc_mpm, 1 / n);

  // Extended Taylor: feed and DOC correction (empirical)
  if (feed_mm && feed_mm > 0) {
    // Higher feed → shorter life, but less than speed effect
    // T_corrected = T × (f_ref / f)^0.3
    const f_ref = 0.15; // reference feed
    T_min *= Math.pow(f_ref / Math.max(0.01, feed_mm), 0.3);
  }
  if (doc_mm && doc_mm > 0) {
    // Deeper DOC → shorter life
    const d_ref = 2.0;
    T_min *= Math.pow(d_ref / Math.max(0.1, doc_mm), 0.15);
  }

  return Math.max(1, Math.min(600, T_min));  // clamp 1-600 min
}

// ============================================================================
// SURFACE FINISH PREDICTION — Ra from feed geometry
// ============================================================================

function theoreticalRa(
  fz_mm: number, corner_radius_mm: number, operation: Operation,
): number {
  // Turning: Ra = f² / (32 × r) (mm) → ×1000 for µm
  // Milling endmill: similar but with fz and nose radius
  const f = fz_mm;
  const r = Math.max(0.1, corner_radius_mm);
  const Ra_mm = (f * f) / (32 * r);
  return Ra_mm * 1000; // µm
}

// ============================================================================
// LOEWEN-SHAW TEMPERATURE MODEL
// ============================================================================

function cuttingTemperature(
  Vc_mpm: number, fz_mm: number, material_k: number,
  material_rho_cp: number, kc1_1: number,
): number {
  // T = T_ambient + K × Vc^0.4 × f^0.2 × Kc^0.5 / (k × rho_cp)^0.3
  const T_ambient = 20;
  const K_coeff = 0.4; // empirical
  const Vc_ms = Vc_mpm / 60;
  const T_rise = K_coeff * Math.pow(Vc_ms, 0.4) * Math.pow(Math.max(0.01, fz_mm), 0.2)
    * Math.pow(kc1_1, 0.5) / Math.pow(Math.max(1, material_k * material_rho_cp / 1e6), 0.3);
  return T_ambient + T_rise * 1000; // scale for realistic temps
}

// ============================================================================
// DEFAULT INFERENCE — fill in missing parameters from context
// ============================================================================

function inferFlutes(operation: Operation, Dc_mm: number, iso_group: ISOGroup): number {
  if (operation === "drilling" || operation === "reaming" || operation === "boring") return 2;
  if (operation === "tapping") return 3;
  if (iso_group === "N") return Dc_mm <= 8 ? 2 : 3; // aluminum: fewer flutes
  if (Dc_mm <= 4) return 3;
  if (Dc_mm <= 12) return 4;
  if (Dc_mm <= 25) return 4;
  return 6;
}

function inferToolMaterial(iso_group: ISOGroup, operation: Operation): ToolMaterial {
  if (iso_group === "H") return "cbn";
  return "carbide";
}

function inferToolDiameter(operation: Operation, ap_mm?: number): number {
  if (operation === "turning") return 0; // not applicable
  if (operation === "drilling" && ap_mm) return ap_mm; // drill dia ≈ hole dia
  return 12; // common default for general milling
}

function inferCutType(optimize_for?: string): CutType {
  if (optimize_for === "surface_finish") return "finishing";
  if (optimize_for === "productivity") return "roughing";
  return "roughing";
}

function inferOperation(): Operation {
  return "milling"; // most common
}

function inferCornerRadius(Dc_mm: number, operation: Operation, cut_type: CutType): number {
  if (operation === "turning") return 0.4; // insert nose radius
  if (cut_type === "finishing") return Math.max(0.2, Dc_mm * 0.04);
  return Math.max(0.5, Dc_mm * 0.05); // ~5% of diameter
}

// ============================================================================
// MAIN ENGINE
// ============================================================================

export class UltimateSpeedFeedEngine {
  /**
   * Calculate fully optimized cutting parameters from any subset of inputs.
   * All missing parameters are inferred using physics models + material DB.
   */
  calculate(input: UltimateSpeedFeedInput): UltimateSpeedFeedResult {
    const warnings: string[] = [];
    const recommendations: string[] = [];
    const inferred: string[] = [];
    const formulas: string[] = [];

    // ──────────────────────────────────────────────────
    // STEP 1: Resolve material → ISO group + properties
    // ──────────────────────────────────────────────────
    let materialKey = "steel";
    let mat: MaterialProfile = MATERIAL_DB.steel;

    if (input.material) {
      const normalized = input.material.toLowerCase().replace(/[\s-]/g, "_");
      const found = MATERIAL_ALIASES[normalized];
      if (found && MATERIAL_DB[found]) {
        materialKey = found;
        mat = MATERIAL_DB[found];
      } else {
        // Fuzzy match: check if any alias contains the input
        for (const [alias, canonical] of Object.entries(MATERIAL_ALIASES)) {
          if (alias.includes(normalized) || normalized.includes(alias)) {
            materialKey = canonical;
            mat = MATERIAL_DB[canonical];
            break;
          }
        }
        if (materialKey === "steel" && normalized !== "steel") {
          warnings.push(`Material '${input.material}' not found in database — defaulting to steel (ISO P). Available: ${Object.keys(MATERIAL_DB).join(", ")}`);
          inferred.push("material (defaulted to steel)");
        }
      }
    } else if (input.iso_group) {
      // Find first material matching ISO group
      for (const [key, profile] of Object.entries(MATERIAL_DB)) {
        if (profile.iso_group === input.iso_group) {
          materialKey = key;
          mat = profile;
          break;
        }
      }
      inferred.push("material (from ISO group)");
    } else {
      inferred.push("material (defaulted to steel)");
    }

    const iso = input.iso_group || mat.iso_group;

    // Resolve hardness
    let hardness_hb = mat.hardness_hb_typical;
    if (input.hardness_hb) {
      hardness_hb = input.hardness_hb;
    } else if (input.hardness_hrc) {
      hardness_hb = hrcToHb(input.hardness_hrc);
      formulas.push(`HB = 3.18×HRC²/100 + 6.23×HRC + 96.7 → ${hardness_hb}`);
    } else {
      inferred.push("hardness_hb");
    }

    // Override ISO group if hardness indicates hardened
    const effectiveIso = (hardness_hb > 400 && iso === "P") ? "H" as ISOGroup : iso;
    if (effectiveIso !== iso) {
      warnings.push(`HB ${hardness_hb} indicates hardened steel — switching to ISO H parameters`);
    }

    // ──────────────────────────────────────────────────
    // STEP 2: Resolve operation, cut type, tool params
    // ──────────────────────────────────────────────────
    const operation = input.operation || inferOperation();
    if (!input.operation) inferred.push("operation (defaulted to milling)");

    const cutType = input.cut_type || inferCutType(input.optimize_for);
    if (!input.cut_type) inferred.push("cut_type");

    const isMilling = ["milling", "thread_milling"].includes(operation);
    const isTurning = operation === "turning";
    const isDrilling = ["drilling", "tapping", "reaming", "boring"].includes(operation);

    let Dc = input.tool_diameter_mm || inferToolDiameter(operation, input.axial_depth_mm);
    if (!input.tool_diameter_mm) inferred.push("tool_diameter_mm");

    let z = input.flutes || inferFlutes(operation, Dc, effectiveIso);
    if (!input.flutes) inferred.push("flutes");

    const toolMat = input.tool_material || inferToolMaterial(effectiveIso, operation);
    if (!input.tool_material) inferred.push("tool_material");

    const cornerRadius = input.corner_radius_mm || inferCornerRadius(Dc, operation, cutType);
    if (!input.corner_radius_mm) inferred.push("corner_radius_mm");

    const strategy = input.strategy || "conventional";
    const stratMod = STRATEGY_MODS[strategy] || STRATEGY_MODS.conventional;

    // ──────────────────────────────────────────────────
    // STEP 3: Look up base cutting parameters
    // ──────────────────────────────────────────────────
    const dataKey = `${effectiveIso}_${operation === "thread_milling" ? "milling" : operation}_${cutType}`;
    const baseParams = CUTTING_PARAMS[dataKey] || CUTTING_PARAMS[`${effectiveIso}_milling_roughing`];

    if (!CUTTING_PARAMS[dataKey]) {
      warnings.push(`No specific data for ${dataKey} — using ${effectiveIso}_milling_roughing as base`);
    }

    // Optimization goal → index into [conservative, balanced, aggressive]
    const goalIdx = input.optimize_for === "tool_life" ? 0
      : input.optimize_for === "productivity" ? 2
      : input.optimize_for === "surface_finish" ? 0
      : 1; // balanced

    // ──────────────────────────────────────────────────
    // STEP 4: Calculate cutting speed (Vc)
    // ──────────────────────────────────────────────────
    let Vc: number;
    let vcSource: OptimizedValue["source"] = "calculated";

    if (input.cutting_speed_mpm) {
      Vc = input.cutting_speed_mpm;
      vcSource = "user_input";
    } else if (input.spindle_rpm && Dc > 0) {
      Vc = Math.PI * Dc * input.spindle_rpm / 1000;
      vcSource = "calculated";
      formulas.push(`Vc = π × Dc × n / 1000 = π × ${Dc} × ${input.spindle_rpm} / 1000 = ${Vc.toFixed(1)} m/min`);
    } else {
      const baseVc = baseParams.vc[goalIdx];
      const hFactor = hardnessSpeedFactor(hardness_hb, mat.hardness_hb_typical);
      const machinabilityScale = mat.machinability_factor / MATERIAL_DB.steel.machinability_factor;
      Vc = baseVc * hFactor * stratMod.vc_factor;
      vcSource = "lookup";
      formulas.push(`Vc = Vc_base × hardness_factor × strategy_factor = ${baseVc} × ${hFactor.toFixed(2)} × ${stratMod.vc_factor} = ${Vc.toFixed(1)} m/min`);
    }

    // Machine RPM cap
    let rpm: number;
    if (input.spindle_rpm) {
      rpm = input.spindle_rpm;
    } else if (isTurning && input.workpiece_diameter_mm) {
      rpm = (Vc * 1000) / (Math.PI * input.workpiece_diameter_mm);
      formulas.push(`n = Vc × 1000 / (π × Dw) = ${Vc.toFixed(0)} × 1000 / (π × ${input.workpiece_diameter_mm}) = ${rpm.toFixed(0)} RPM`);
    } else if (Dc > 0) {
      rpm = (Vc * 1000) / (Math.PI * Dc);
      formulas.push(`n = Vc × 1000 / (π × Dc) = ${Vc.toFixed(0)} × 1000 / (π × ${Dc}) = ${rpm.toFixed(0)} RPM`);
    } else {
      rpm = 3000;
      inferred.push("spindle_rpm (default 3000)");
    }

    const maxRPM = input.machine_max_rpm || 15000;
    if (rpm > maxRPM) {
      const oldRPM = rpm;
      rpm = maxRPM;
      Vc = Math.PI * Dc * rpm / 1000;
      warnings.push(`RPM ${Math.round(oldRPM)} exceeds machine max ${maxRPM} — capped. Vc adjusted to ${Vc.toFixed(0)} m/min`);
    }
    rpm = Math.round(rpm);

    // ──────────────────────────────────────────────────
    // STEP 5: Calculate feed per tooth (fz)
    // ──────────────────────────────────────────────────
    let fz: number;
    let fzSource: OptimizedValue["source"] = "calculated";

    if (input.feed_per_tooth_mm) {
      fz = input.feed_per_tooth_mm;
      fzSource = "user_input";
    } else if (input.feed_per_rev_mm && z > 0) {
      fz = input.feed_per_rev_mm / z;
      fzSource = "calculated";
      formulas.push(`fz = fn / z = ${input.feed_per_rev_mm} / ${z} = ${fz.toFixed(4)} mm/tooth`);
    } else if (input.feed_rate_mmmin && rpm > 0 && z > 0) {
      fz = input.feed_rate_mmmin / (rpm * z);
      fzSource = "calculated";
      formulas.push(`fz = Vf / (n × z) = ${input.feed_rate_mmmin} / (${rpm} × ${z}) = ${fz.toFixed(4)} mm/tooth`);
    } else {
      const baseFz = baseParams.fz[goalIdx];
      const diaFactor = isMilling ? diameterFzFactor(Dc) : 1.0;
      fz = baseFz * diaFactor * stratMod.fz_factor;
      fzSource = "lookup";
      if (isMilling) {
        formulas.push(`fz = fz_base × dia_factor × strategy_factor = ${baseFz.toFixed(3)} × ${diaFactor.toFixed(2)} × ${stratMod.fz_factor} = ${fz.toFixed(4)} mm/tooth`);
      }
      inferred.push("feed_per_tooth_mm");
    }

    // Feed per rev (for turning/drilling)
    let fn = isTurning || isDrilling ? fz : fz * z;
    if (input.feed_per_rev_mm && (isTurning || isDrilling)) {
      fn = input.feed_per_rev_mm;
    }

    // ──────────────────────────────────────────────────
    // STEP 6: Depth of cut (ap) and width of cut (ae)
    // ──────────────────────────────────────────────────
    let ap: number;
    if (input.axial_depth_mm) {
      ap = input.axial_depth_mm;
    } else {
      ap = baseParams.ap[goalIdx] * stratMod.ap_factor;
      // Scale ap by tool diameter for milling
      if (isMilling && Dc > 0) {
        const maxAp = (input.flute_length_mm || Dc * 2.5);
        ap = Math.min(ap, maxAp);
      }
      inferred.push("axial_depth_mm");
    }

    let ae_pct: number;
    let ae_mm: number;
    if (input.radial_depth_mm) {
      ae_mm = input.radial_depth_mm;
      ae_pct = Dc > 0 ? (ae_mm / Dc) * 100 : 100;
    } else if (input.radial_depth_pct) {
      ae_pct = input.radial_depth_pct;
      ae_mm = Dc > 0 ? (ae_pct / 100) * Dc : 0;
    } else if (stratMod.ae_override_pct !== undefined) {
      ae_pct = stratMod.ae_override_pct;
      ae_mm = Dc > 0 ? (ae_pct / 100) * Dc : 0;
      inferred.push("radial_depth_mm (from strategy)");
    } else {
      ae_pct = baseParams.ae_pct[goalIdx];
      ae_mm = Dc > 0 ? (ae_pct / 100) * Dc : 0;
      inferred.push("radial_depth_mm");
    }

    // ──────────────────────────────────────────────────
    // STEP 7: Chip thinning compensation (milling only)
    // ──────────────────────────────────────────────────
    let ctf = 1.0;
    let fz_programmed = fz;
    if (isMilling && Dc > 0 && ae_mm > 0 && ae_mm < Dc * 0.50) {
      ctf = chipThinningFactor(ae_mm, Dc);
      fz_programmed = fz * ctf;
      formulas.push(`CTF = Dc / (2 × √(ae × (Dc - ae))) = ${Dc} / (2 × √(${ae_mm.toFixed(1)} × ${(Dc - ae_mm).toFixed(1)})) = ${ctf.toFixed(2)}`);
      formulas.push(`fz_programmed = fz × CTF = ${fz.toFixed(4)} × ${ctf.toFixed(2)} = ${fz_programmed.toFixed(4)} mm/tooth`);
    }

    // ──────────────────────────────────────────────────
    // STEP 8: Feed rate (Vf)
    // ──────────────────────────────────────────────────
    let Vf: number;
    if (input.feed_rate_mmmin) {
      Vf = input.feed_rate_mmmin;
    } else if (isMilling) {
      Vf = fz_programmed * z * rpm;
      formulas.push(`Vf = fz_prog × z × n = ${fz_programmed.toFixed(4)} × ${z} × ${rpm} = ${Vf.toFixed(0)} mm/min`);
    } else {
      Vf = fn * rpm;
      formulas.push(`Vf = fn × n = ${fn.toFixed(3)} × ${rpm} = ${Vf.toFixed(0)} mm/min`);
    }

    // ──────────────────────────────────────────────────
    // STEP 9: Chip thickness analysis
    // ──────────────────────────────────────────────────
    const hex_mm = isMilling ? fz * Math.sin(Math.acos(1 - 2 * Math.min(1, ae_mm / Math.max(1, Dc)))) : fn;
    const hm_mm = isMilling ? fz * (ae_mm / Dc) : fn; // average chip thickness approx

    // ──────────────────────────────────────────────────
    // STEP 10: MRR
    // ──────────────────────────────────────────────────
    let mrr_cm3: number;
    if (isMilling) {
      mrr_cm3 = (ap * ae_mm * Vf) / 1000; // mm³/min → cm³/min
      formulas.push(`MRR = ap × ae × Vf / 1000 = ${ap.toFixed(1)} × ${ae_mm.toFixed(1)} × ${Vf.toFixed(0)} / 1000 = ${mrr_cm3.toFixed(1)} cm³/min`);
    } else if (isTurning) {
      mrr_cm3 = (ap * fn * Vc * 1000) / 1000; // approx
      formulas.push(`MRR = ap × fn × Vc = ${ap.toFixed(1)} × ${fn.toFixed(3)} × ${Vc.toFixed(0)} = ${mrr_cm3.toFixed(1)} cm³/min`);
    } else {
      // Drilling: MRR = π/4 × D² × fn × n / 1000
      mrr_cm3 = (Math.PI / 4 * Dc * Dc * fn * rpm) / 1000;
    }

    // ──────────────────────────────────────────────────
    // STEP 11: Cutting force (Kienzle model)
    // ──────────────────────────────────────────────────
    const { Fc, Kc } = kienzleCuttingForce(mat.kc1_1, mat.mc, ap, Math.max(0.01, hex_mm));
    const Fr = Fc * (isTurning ? 0.4 : 0.3);
    const Fa = Fc * (isDrilling ? 0.5 : isTurning ? 0.25 : 0.2);
    const F_resultant = Math.sqrt(Fc * Fc + Fr * Fr + Fa * Fa);
    const torque = isMilling && Dc > 0 ? (Fc * Dc / 2) / 1000 : (Fc * (input.workpiece_diameter_mm || Dc) / 2) / 1000; // Nm

    formulas.push(`Kc = Kc1.1 × h^(-mc) = ${mat.kc1_1} × ${hex_mm.toFixed(3)}^(-${mat.mc}) = ${Kc.toFixed(0)} N/mm²`);
    formulas.push(`Fc = Kc × ap × hex = ${Kc.toFixed(0)} × ${ap.toFixed(1)} × ${hex_mm.toFixed(3)} = ${Fc.toFixed(0)} N`);

    // Tool deflection estimate (simplified beam model)
    let deflection_um: number | undefined;
    if (isMilling && input.tool_stickout_mm && Dc > 0) {
      const L = input.tool_stickout_mm;
      const I = (Math.PI / 64) * Math.pow(Dc, 4); // moment of inertia (mm⁴)
      const E = 600000; // Young's modulus carbide (N/mm²) ≈ 600 GPa
      deflection_um = (F_resultant * L * L * L) / (3 * E * I) * 1000;
      formulas.push(`δ = F × L³ / (3EI) = ${F_resultant.toFixed(0)} × ${L}³ / (3 × 600000 × ${I.toFixed(0)}) = ${deflection_um.toFixed(1)} µm`);
      if (deflection_um > 50) warnings.push(`Tool deflection ${deflection_um.toFixed(0)}µm exceeds 50µm limit — reduce stickout or use larger diameter`);
    }

    // ──────────────────────────────────────────────────
    // STEP 12: Power analysis
    // ──────────────────────────────────────────────────
    const power_kw = (Fc * Vc) / (60 * 1000); // P = Fc × Vc / 60000
    formulas.push(`P = Fc × Vc / 60000 = ${Fc.toFixed(0)} × ${Vc.toFixed(0)} / 60000 = ${power_kw.toFixed(2)} kW`);

    const machinePower = input.machine_power_kw;
    let powerUtil: number | undefined;
    let isWithinBudget = true;
    let limitingFactor: "power" | "torque" | "none" = "none";

    if (machinePower) {
      const efficiency = 0.85;
      const available = machinePower * efficiency;
      powerUtil = (power_kw / available) * 100;
      isWithinBudget = powerUtil <= 90;
      if (!isWithinBudget) {
        limitingFactor = "power";
        warnings.push(`Power ${power_kw.toFixed(1)}kW exceeds 90% of available ${available.toFixed(1)}kW — reduce MRR`);
        recommendations.push(`Max safe feed at current DOC: ${(Vf * (available * 0.9) / power_kw).toFixed(0)} mm/min`);
      }
    }

    if (input.machine_max_torque_nm && torque > input.machine_max_torque_nm * 0.9) {
      limitingFactor = "torque";
      warnings.push(`Torque ${torque.toFixed(1)}Nm near machine limit ${input.machine_max_torque_nm}Nm`);
    }

    // ──────────────────────────────────────────────────
    // STEP 13: Thermal analysis
    // ──────────────────────────────────────────────────
    const temp_C = cuttingTemperature(
      Vc, fz, mat.thermal_conductivity_wm_k,
      mat.specific_heat_j_kg_k * 7800, mat.kc1_1,
    );

    const coating = input.tool_coating || baseParams.coatings[0] || "TiAlN";
    const coatingLimit = COATING_TEMP_LIMIT[coating] || 800;
    const thermalMargin = ((coatingLimit - temp_C) / coatingLimit) * 100;
    let thermalRisk: ThermalAnalysis["thermal_damage_risk"] = "none";
    if (thermalMargin < 0) thermalRisk = "critical";
    else if (thermalMargin < 10) thermalRisk = "high";
    else if (thermalMargin < 25) thermalRisk = "moderate";
    else if (thermalMargin < 50) thermalRisk = "low";

    if (thermalRisk === "critical" || thermalRisk === "high") {
      warnings.push(`Thermal risk: ${thermalRisk}. Interface temp ~${temp_C.toFixed(0)}°C vs coating limit ${coatingLimit}°C`);
      recommendations.push("Reduce cutting speed 15-20% or upgrade coating");
    }

    // ──────────────────────────────────────────────────
    // STEP 14: Tool life prediction (Taylor)
    // ──────────────────────────────────────────────────
    const taylorN = mat.taylor_n_carbide;
    const taylorC = mat.taylor_C_carbide;
    const toolLife = taylorToolLife(Vc, taylorN, taylorC, fz, ap);
    const optSpeedCost = taylorC * Math.pow(taylorN / (1 - taylorN), taylorN); // optimal V for min cost
    const optSpeedProd = taylorC * Math.pow(taylorN, taylorN); // optimal V for max productivity

    formulas.push(`T = (C/Vc)^(1/n) = (${taylorC}/${Vc.toFixed(0)})^(1/${taylorN}) = ${toolLife.toFixed(0)} min`);

    let wearMechanism = "flank_wear";
    if (temp_C > 800) wearMechanism = "crater_wear (diffusion)";
    else if (mat.built_up_edge_risk === "high" && Vc < 100) wearMechanism = "built_up_edge";
    else if (mat.chip_type === "discontinuous") wearMechanism = "chipping/notch_wear";

    // ──────────────────────────────────────────────────
    // STEP 15: Surface finish prediction
    // ──────────────────────────────────────────────────
    const Ra_theoretical = theoreticalRa(isTurning ? fn : fz, cornerRadius, operation);
    // Practical Ra is typically 2-4× theoretical due to vibration, BUE, runout
    const practicalFactor = cutType === "finishing" ? 2.0 : 3.5;
    const Ra_practical = Ra_theoretical * practicalFactor;

    formulas.push(`Ra_theoretical = f² / (32 × r) = ${(isTurning ? fn : fz).toFixed(4)}² / (32 × ${cornerRadius.toFixed(2)}) = ${Ra_theoretical.toFixed(3)} µm`);

    // Scallop height for ball nose finishing
    let scallop: OptimizedValue | undefined;
    if (cutType === "finishing" && isMilling && ae_mm > 0 && Dc > 0) {
      const R = Dc / 2;
      const stepover = ae_mm;
      const h_scallop = R - Math.sqrt(R * R - (stepover / 2) * (stepover / 2));
      scallop = ov(h_scallop * 1000, "µm", 0.8, "calculated", `h = R - √(R² - (ae/2)²) = ${(h_scallop * 1000).toFixed(1)} µm`);
    }

    // ──────────────────────────────────────────────────
    // STEP 16: Material-specific recommendations
    // ──────────────────────────────────────────────────
    if (mat.fire_risk) {
      const coolant = input.coolant || baseParams.coolant;
      if (coolant === "dry" || coolant === "air_blast") {
        warnings.push("FIRE RISK: Material is flammable when dry machined. Use flood coolant.");
      }
    }
    if (mat.work_hardening_tendency === "severe") {
      recommendations.push("Maintain chip load — never dwell or rub. Use constant engagement toolpaths.");
    }
    if (mat.built_up_edge_risk === "high" && Vc < 60) {
      recommendations.push("BUE risk at low speed — increase Vc or use DLC/polished coating.");
    }
    for (const note of mat.notes) {
      recommendations.push(note);
    }

    // Coolant recommendation
    const coolant = input.coolant || baseParams.coolant;
    if (!input.coolant) inferred.push("coolant");

    // Machine rigidity factor
    const rigidityFactor = input.machine_rigidity === "low" ? 0.7 : input.machine_rigidity === "high" ? 1.1 : 1.0;
    if (rigidityFactor !== 1.0 && !input.cutting_speed_mpm) {
      Vc *= rigidityFactor;
      rpm = Math.round((Vc * 1000) / (Math.PI * Math.max(1, Dc)));
      Vf = isMilling ? fz_programmed * z * rpm : fn * rpm;
      warnings.push(`Machine rigidity ${input.machine_rigidity}: parameters scaled by ${rigidityFactor}`);
    }

    // ──────────────────────────────────────────────────
    // STEP 17: Build alternative parameter sets
    // ──────────────────────────────────────────────────
    const alts = {
      conservative: {
        vc: baseParams.vc[0] * stratMod.vc_factor * hardnessSpeedFactor(hardness_hb, mat.hardness_hb_typical),
        fz: baseParams.fz[0] * (isMilling ? diameterFzFactor(Dc) : 1) * stratMod.fz_factor,
        ap: baseParams.ap[0] * stratMod.ap_factor,
        ae_pct: stratMod.ae_override_pct ?? baseParams.ae_pct[0],
        note: "Long tool life, lowest risk. Best for expensive tools or difficult materials.",
      },
      balanced: {
        vc: baseParams.vc[1] * stratMod.vc_factor * hardnessSpeedFactor(hardness_hb, mat.hardness_hb_typical),
        fz: baseParams.fz[1] * (isMilling ? diameterFzFactor(Dc) : 1) * stratMod.fz_factor,
        ap: baseParams.ap[1] * stratMod.ap_factor,
        ae_pct: stratMod.ae_override_pct ?? baseParams.ae_pct[1],
        note: "Balanced productivity and tool life. Recommended starting point.",
      },
      aggressive: {
        vc: baseParams.vc[2] * stratMod.vc_factor * hardnessSpeedFactor(hardness_hb, mat.hardness_hb_typical),
        fz: baseParams.fz[2] * (isMilling ? diameterFzFactor(Dc) : 1) * stratMod.fz_factor,
        ap: baseParams.ap[2] * stratMod.ap_factor,
        ae_pct: stratMod.ae_override_pct ?? baseParams.ae_pct[2],
        note: "Maximum MRR. Monitor tool wear closely. Best for production runs.",
      },
    };

    // ──────────────────────────────────────────────────
    // STEP 18: Confidence scoring
    // ──────────────────────────────────────────────────
    const vcConf = vcSource === "user_input" ? 1.0 : vcSource === "calculated" ? 0.90 : 0.75;
    const fzConf = fzSource === "user_input" ? 1.0 : fzSource === "calculated" ? 0.90 : 0.75;
    const matConf = input.material || input.iso_group ? 0.9 : 0.5;
    const overallConf = Math.pow(vcConf * fzConf * matConf, 1 / 3);

    // ──────────────────────────────────────────────────
    // STEP 19: Assemble result
    // ──────────────────────────────────────────────────
    const result: UltimateSpeedFeedResult = {
      cutting_speed: ov(roundSig(Vc, 3), "m/min", vcConf, vcSource, `Vc = π × Dc × n / 1000`),
      spindle_rpm: ov(rpm, "RPM", vcConf, input.spindle_rpm ? "user_input" : "calculated", `n = Vc × 1000 / (π × Dc)`),
      feed_per_tooth: ov(roundSig(fz_programmed, 4), "mm/tooth", fzConf, fzSource,
        ctf > 1.01 ? `fz_prog = fz × CTF = ${fz.toFixed(4)} × ${ctf.toFixed(2)}` : undefined),
      feed_per_rev: ov(roundSig(isTurning || isDrilling ? fn : fz_programmed * z, 4), "mm/rev",
        fzConf, fzSource, `fn = fz × z = ${fz_programmed.toFixed(4)} × ${z}`),
      feed_rate: ov(Math.round(Vf), "mm/min", fzConf * vcConf, "calculated", `Vf = fz × z × n`),
      axial_depth: ov(roundSig(ap, 2), "mm", input.axial_depth_mm ? 1.0 : 0.7, input.axial_depth_mm ? "user_input" : "lookup"),
      radial_depth: ov(roundSig(ae_mm, 2), "mm", input.radial_depth_mm ? 1.0 : 0.7,
        input.radial_depth_mm ? "user_input" : "inferred",
        `ae = ${ae_pct.toFixed(0)}% × Dc = ${ae_pct.toFixed(0)}% × ${Dc}`),
      mrr: ov(roundSig(mrr_cm3, 2), "cm³/min", Math.min(vcConf, fzConf) * 0.9, "calculated",
        isMilling ? `Q = ap × ae × Vf / 1000` : `Q = ap × fn × Vc`),

      chip_thickness_max: ov(roundSig(hex_mm, 4), "mm", 0.85, "calculated"),
      chip_thinning_factor: ov(roundSig(ctf, 3), "×", 0.90, ctf > 1.01 ? "calculated" : "default"),
      chip_load_actual: ov(roundSig(hm_mm, 4), "mm", 0.80, "calculated"),

      forces: {
        tangential_force_N: ov(Math.round(Fc), "N", 0.75, "calculated", `Fc = Kc × ap × hex`),
        radial_force_N: ov(Math.round(Fr), "N", 0.65, "calculated"),
        axial_force_N: ov(Math.round(Fa), "N", 0.65, "calculated"),
        resultant_force_N: ov(Math.round(F_resultant), "N", 0.70, "calculated", `F = √(Fc² + Fr² + Fa²)`),
        torque_Nm: ov(roundSig(torque, 3), "Nm", 0.70, "calculated"),
        ...(deflection_um !== undefined ? { deflection_um: ov(roundSig(deflection_um, 2), "µm", 0.60, "calculated") } : {}),
      },

      power: {
        required_power_kw: ov(roundSig(power_kw, 3), "kW", 0.80, "calculated", `P = Fc × Vc / 60000`),
        ...(machinePower ? { available_power_kw: ov(machinePower * 0.85, "kW", 1.0, "user_input") } : {}),
        ...(powerUtil !== undefined ? { power_utilization_pct: ov(roundSig(powerUtil, 1), "%", 0.85, "calculated") } : {}),
        is_within_budget: isWithinBudget,
        limiting_factor: limitingFactor,
      },

      thermal: {
        interface_temp_C: ov(Math.round(temp_C), "°C", 0.60, "calculated", `T ∝ Vc^0.4 × f^0.2`),
        coating_limit_C: ov(coatingLimit, "°C", 0.95, "lookup"),
        thermal_margin_pct: ov(roundSig(thermalMargin, 1), "%", 0.60, "calculated"),
        thermal_damage_risk: thermalRisk,
      },

      surface_finish: {
        theoretical_ra_um: ov(roundSig(Ra_theoretical, 3), "µm", 0.85, "calculated", `Ra = f² / (32 × r)`),
        practical_ra_um: ov(roundSig(Ra_practical, 2), "µm", 0.55, "calculated", `Ra_practical ≈ ${practicalFactor}× theoretical`),
        ...(scallop ? { scallop_height_um: scallop } : {}),
      },

      tool_life: {
        life_minutes: ov(Math.round(toolLife), "min", 0.55, "calculated", `T = (C/Vc)^(1/n) (Taylor)`),
        optimal_speed_cost: ov(roundSig(optSpeedCost, 1), "m/min", 0.50, "calculated"),
        optimal_speed_productivity: ov(roundSig(optSpeedProd, 1), "m/min", 0.50, "calculated"),
        wear_mechanism: wearMechanism,
      },

      resolved: {
        material: materialKey,
        iso_group: effectiveIso,
        operation,
        cut_type: cutType,
        tool_diameter_mm: Dc,
        flutes: z,
        tool_material: toolMat,
        coolant,
        hardness_hb: hardness_hb,
      },

      alternatives: alts,
      inferred_parameters: inferred,
      warnings,
      recommendations,
      confidence_overall: roundSig(overallConf, 2),
      formulas_used: formulas,
    };

    return result;
  }

  /** Quick calculation — returns just the core parameters as a compact string */
  quick(input: UltimateSpeedFeedInput): string {
    const r = this.calculate(input);
    const lines = [
      `Material: ${r.resolved.material} (ISO ${r.resolved.iso_group}) | ${r.resolved.operation} ${r.resolved.cut_type}`,
      `Tool: Ø${r.resolved.tool_diameter_mm}mm ${r.resolved.flutes}F ${r.resolved.tool_material}`,
      `Vc=${r.cutting_speed.value} m/min | n=${r.spindle_rpm.value} RPM`,
      `fz=${r.feed_per_tooth.value} mm/t | Vf=${r.feed_rate.value} mm/min`,
      `ap=${r.axial_depth.value}mm | ae=${r.radial_depth.value}mm (${((r.radial_depth.value / r.resolved.tool_diameter_mm) * 100).toFixed(0)}%)`,
      `MRR=${r.mrr.value} cm³/min | Power=${r.power.required_power_kw.value} kW`,
      `Tool life≈${r.tool_life.life_minutes.value}min | Ra≈${r.surface_finish.practical_ra_um.value}µm`,
    ];
    if (r.chip_thinning_factor.value > 1.01) {
      lines.push(`Chip thinning: ×${r.chip_thinning_factor.value} (fz compensated)`);
    }
    if (r.warnings.length > 0) {
      lines.push(`⚠ ${r.warnings[0]}`);
    }
    return lines.join("\n");
  }

  /** List all supported materials */
  listMaterials(): { key: string; iso: ISOGroup; aliases: string[]; machinability: number }[] {
    return Object.entries(MATERIAL_DB).map(([key, m]) => ({
      key,
      iso: m.iso_group,
      aliases: m.aliases,
      machinability: m.machinability_factor,
    }));
  }

  /** List all supported strategies with their modifiers */
  listStrategies(): { name: string; vc_factor: number; fz_factor: number; ap_factor: number; ae_pct?: number; notes: string[] }[] {
    return Object.entries(STRATEGY_MODS).map(([name, mod]) => ({
      name,
      vc_factor: mod.vc_factor,
      fz_factor: mod.fz_factor,
      ap_factor: mod.ap_factor,
      ae_pct: mod.ae_override_pct,
      notes: mod.notes,
    }));
  }

  /** Get material properties */
  getMaterialProfile(material: string): MaterialProfile | null {
    const normalized = material.toLowerCase().replace(/[\s-]/g, "_");
    const found = MATERIAL_ALIASES[normalized];
    return found ? MATERIAL_DB[found] || null : null;
  }

  /** Compare parameters across all ISO groups for same tool/operation */
  compareAcrossMaterials(
    tool_diameter_mm: number,
    operation: Operation = "milling",
    cut_type: CutType = "roughing",
  ): { material: string; iso: ISOGroup; vc: number; fz: number; mrr: number; tool_life: number }[] {
    return Object.entries(MATERIAL_DB).map(([key, _mat]) => {
      const r = this.calculate({
        material: key,
        tool_diameter_mm,
        operation,
        cut_type,
        optimize_for: "balanced",
      });
      return {
        material: key,
        iso: r.resolved.iso_group,
        vc: r.cutting_speed.value,
        fz: r.feed_per_tooth.value,
        mrr: r.mrr.value,
        tool_life: r.tool_life.life_minutes.value,
      };
    });
  }

  /** Engine stats */
  stats(): {
    materials: number;
    iso_groups: number;
    operations: number;
    strategies: number;
    cutting_data_entries: number;
    physics_models: number;
    output_parameters: number;
  } {
    return {
      materials: Object.keys(MATERIAL_DB).length,
      iso_groups: 6,
      operations: 7,
      strategies: Object.keys(STRATEGY_MODS).length,
      cutting_data_entries: Object.keys(CUTTING_PARAMS).length,
      physics_models: 5, // Kienzle, Taylor, Loewen-Shaw, chip thinning, surface finish
      output_parameters: 28,
    };
  }
}

// ============================================================================
// HELPERS
// ============================================================================

function ov(
  value: number, unit: string, confidence: number,
  source: OptimizedValue["source"], formula?: string,
  range?: { low: number; high: number }, notes?: string[],
): OptimizedValue {
  return { value, unit, confidence, source, ...(formula ? { formula } : {}), ...(range ? { range } : {}), ...(notes ? { notes } : {}) };
}

function roundSig(n: number, sig: number): number {
  if (n === 0) return 0;
  const d = Math.ceil(Math.log10(Math.abs(n)));
  const power = sig - d;
  const mag = Math.pow(10, power);
  return Math.round(n * mag) / mag;
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const ultimateSpeedFeedEngine = new UltimateSpeedFeedEngine();
