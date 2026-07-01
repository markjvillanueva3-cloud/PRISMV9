/**
 * EDMMaterialMachineWireEngine — WEDM-P2P-MS3+MS4 Combined
 *
 * Consolidates Material Assessment (MS3 U01-U05) and Machine/Wire Selection
 * (MS4 U01-U06) into a single production engine with 11 units.
 *
 * MS3 Material Assessment:
 *   U01: EDM machinability classifier (Class A-D)
 *   U02: Thermal property resolver
 *   U03: Recast risk assessor
 *   U04: Electrical property mapper
 *   U05: Heat treatment state checker
 *
 * MS4 Machine & Wire Selection:
 *   U01: EDM machine selector
 *   U02: Wire type selector
 *   U03: Wire diameter optimizer
 *   U04: Wire tension calculator
 *   U05: Wire consumption estimator
 *   U06: Controller capability mapper
 *
 * Actions: assess_material, select_machine, select_wire, optimize_wire_diameter,
 *          calculate_tension, estimate_wire_cost, map_controller, full_selection
 */

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export type MachinabilityClass = "A" | "B" | "C" | "D";
export type HeatTreatState = "annealed" | "pre-hardened" | "hardened" | "stress_relieved" | "normalized" | "unknown";
export type WireType = "brass" | "coated" | "molybdenum" | "tungsten";
export type MachineType = "wire" | "sinker";
export type ControllerBrand = "Fanuc" | "Sodick" | "Makino" | "Mitsubishi" | "AgieCharmilles" | "Accutex";

export interface EDMMaterialProperties {
  key: string;
  melting_point_C: number;
  thermal_conductivity_W_mK: number;
  resistivity_uOhm_cm: number;
  mrr_factor: number;
  carbon_pct: number;
  diffusivity_mm2_s: number;
  specific_heat_J_kgK: number;
  latent_heat_kJ_kg: number;
  density_kg_m3: number;
  flags: string[];
}

export interface WireSpec {
  key: string;
  type: WireType;
  diameter_mm: number;
  tensile_strength_N: number;
  speed_range_mm_min: [number, number];
  cost_per_m_usd: number;
  min_corner_radius_mm: number;
  speed_boost: number;
  max_height_mm: number;
}

export interface EDMMachineSpec {
  model: string;
  manufacturer: string;
  type: MachineType;
  x_travel_mm: number;
  y_travel_mm: number;
  z_travel_mm: number;
  max_workpiece_kg: number;
  tank_size_mm: [number, number, number];
  wire_diameters_mm: number[];
  uv_axis: boolean;
  submerged_cutting: boolean;
  auto_threading: boolean;
  max_taper_deg: number;
  controller: ControllerBrand;
  features: string[];
}

export interface MaterialAssessmentInput {
  material: string;
  heat_treat_state?: HeatTreatState;
  hardness_hrc?: number;
  thickness_mm?: number;
}

export interface MachinabilityResult {
  material_key: string;
  machinability_class: MachinabilityClass;
  class_description: string;
  mrr_factor: number;
  thermal: {
    melting_point_C: number;
    thermal_conductivity_W_mK: number;
    diffusivity_mm2_s: number;
    specific_heat_J_kgK: number;
    latent_heat_kJ_kg: number;
  };
  electrical: {
    resistivity_uOhm_cm: number;
    spark_gap_behavior: string;
    servo_strategy: string;
  };
  recast: {
    risk_level: "low" | "moderate" | "high" | "critical";
    crack_probability_pct: number;
    contributing_factors: string[];
    mitigation: string[];
  };
  heat_treat: {
    state: HeatTreatState;
    edm_before_hardening_recommended: boolean;
    distortion_risk: "low" | "moderate" | "high";
    notes: string[];
  };
  warnings: string[];
  recommendations: string[];
}

export interface MachineSelectionInput {
  part_x_mm: number;
  part_y_mm: number;
  part_z_mm: number;
  part_weight_kg?: number;
  material: string;
  min_corner_radius_mm?: number;
  taper_required_deg?: number;
  submerged_required?: boolean;
  uv_axis_required?: boolean;
  preferred_controller?: ControllerBrand;
  machine_type?: MachineType;
}

export interface MachineSelectionResult {
  recommended_machines: Array<{
    model: string;
    manufacturer: string;
    score: number;
    fit_notes: string[];
    limitations: string[];
  }>;
  rejected_machines: Array<{
    model: string;
    reason: string;
  }>;
}

export interface WireSelectionInput {
  material: string;
  thickness_mm: number;
  min_corner_radius_mm: number;
  target_surface_finish_Ra_um?: number;
  priority?: "speed" | "cost" | "accuracy";
}

export interface WireSelectionResult {
  recommended_wire: string;
  wire_type: WireType;
  diameter_mm: number;
  rationale: string[];
  alternatives: Array<{
    wire_key: string;
    diameter_mm: number;
    reason_not_primary: string;
  }>;
  estimated_speed_mm_min: number;
}

export interface WireDiameterOptResult {
  optimal_diameter_mm: number;
  wire_key: string;
  corner_clearance_mm: number;
  rationale: string;
  all_viable: Array<{
    wire_key: string;
    diameter_mm: number;
    meets_corner: boolean;
    speed_factor: number;
  }>;
}

export interface WireTensionResult {
  optimal_tension_N: number;
  tension_pct_of_uts: number;
  wire_key: string;
  adjustments: string[];
  break_risk: "low" | "moderate" | "high";
  recommendations: string[];
}

export interface WireCostResult {
  wire_key: string;
  cut_length_mm: number;
  wire_consumed_m: number;
  wire_consumed_kg: number;
  cost_usd: number;
  cost_per_part_usd: number;
  breakdown: {
    roughing_m: number;
    finishing_m: number;
    threading_waste_m: number;
  };
}

export interface ControllerCapabilityResult {
  controller: ControllerBrand;
  features: string[];
  strengths: string[];
  limitations: string[];
  compatibility_notes: string[];
}

export interface FullSelectionInput {
  material: string;
  heat_treat_state?: HeatTreatState;
  hardness_hrc?: number;
  part_x_mm: number;
  part_y_mm: number;
  part_z_mm: number;
  part_weight_kg?: number;
  min_corner_radius_mm: number;
  cut_length_mm: number;
  num_parts?: number;
  taper_required_deg?: number;
  target_surface_finish_Ra_um?: number;
  priority?: "speed" | "cost" | "accuracy";
  preferred_controller?: ControllerBrand;
}

export interface FullSelectionResult {
  material_assessment: MachinabilityResult;
  machine_selection: MachineSelectionResult;
  wire_selection: WireSelectionResult;
  wire_diameter_optimization: WireDiameterOptResult;
  wire_tension: WireTensionResult;
  wire_cost: WireCostResult;
  controller_map: ControllerCapabilityResult;
  summary: string[];
}

// ============================================================================
// MATERIALS DATABASE — 17 common EDM workpiece materials
// ============================================================================

const MATERIALS_DB: Record<string, EDMMaterialProperties> = {
  steel_1045: {
    key: "steel_1045", melting_point_C: 1520, thermal_conductivity_W_mK: 49.8,
    resistivity_uOhm_cm: 16, mrr_factor: 1.0, carbon_pct: 0.45,
    diffusivity_mm2_s: 13.1, specific_heat_J_kgK: 486, latent_heat_kJ_kg: 247,
    density_kg_m3: 7850, flags: [],
  },
  D2_tool: {
    key: "D2_tool", melting_point_C: 1421, thermal_conductivity_W_mK: 20.0,
    resistivity_uOhm_cm: 65, mrr_factor: 1.0, carbon_pct: 2.1,
    diffusivity_mm2_s: 5.4, specific_heat_J_kgK: 460, latent_heat_kJ_kg: 250,
    density_kg_m3: 7700, flags: ["HIGH_CRACK_RISK"],
  },
  A2_tool: {
    key: "A2_tool", melting_point_C: 1420, thermal_conductivity_W_mK: 25.0,
    resistivity_uOhm_cm: 55, mrr_factor: 0.95, carbon_pct: 1.0,
    diffusivity_mm2_s: 6.7, specific_heat_J_kgK: 460, latent_heat_kJ_kg: 250,
    density_kg_m3: 7860, flags: [],
  },
  H13_tool: {
    key: "H13_tool", melting_point_C: 1427, thermal_conductivity_W_mK: 24.3,
    resistivity_uOhm_cm: 52, mrr_factor: 0.95, carbon_pct: 0.40,
    diffusivity_mm2_s: 6.5, specific_heat_J_kgK: 460, latent_heat_kJ_kg: 250,
    density_kg_m3: 7800, flags: [],
  },
  S7_tool: {
    key: "S7_tool", melting_point_C: 1420, thermal_conductivity_W_mK: 33.0,
    resistivity_uOhm_cm: 50, mrr_factor: 1.0, carbon_pct: 0.50,
    diffusivity_mm2_s: 8.9, specific_heat_J_kgK: 475, latent_heat_kJ_kg: 248,
    density_kg_m3: 7830, flags: [],
  },
  "304_stainless": {
    key: "304_stainless", melting_point_C: 1400, thermal_conductivity_W_mK: 16.2,
    resistivity_uOhm_cm: 72, mrr_factor: 0.8, carbon_pct: 0.08,
    diffusivity_mm2_s: 4.2, specific_heat_J_kgK: 500, latent_heat_kJ_kg: 260,
    density_kg_m3: 8000, flags: [],
  },
  Ti6Al4V: {
    key: "Ti6Al4V", melting_point_C: 1660, thermal_conductivity_W_mK: 6.7,
    resistivity_uOhm_cm: 178, mrr_factor: 0.5, carbon_pct: 0,
    diffusivity_mm2_s: 2.9, specific_heat_J_kgK: 526, latent_heat_kJ_kg: 365,
    density_kg_m3: 4430, flags: ["SLOW"],
  },
  "6061_aluminum": {
    key: "6061_aluminum", melting_point_C: 582, thermal_conductivity_W_mK: 167,
    resistivity_uOhm_cm: 4.0, mrr_factor: 1.8, carbon_pct: 0,
    diffusivity_mm2_s: 68.3, specific_heat_J_kgK: 896, latent_heat_kJ_kg: 397,
    density_kg_m3: 2700, flags: ["LOW_MELTING"],
  },
  copper_C110: {
    key: "copper_C110", melting_point_C: 1083, thermal_conductivity_W_mK: 390,
    resistivity_uOhm_cm: 1.7, mrr_factor: 2.0, carbon_pct: 0,
    diffusivity_mm2_s: 112.3, specific_heat_J_kgK: 385, latent_heat_kJ_kg: 205,
    density_kg_m3: 8940, flags: [],
  },
  carbide_WC: {
    key: "carbide_WC", melting_point_C: 2870, thermal_conductivity_W_mK: 110,
    resistivity_uOhm_cm: 20, mrr_factor: 0.3, carbon_pct: 0,
    diffusivity_mm2_s: 24.2, specific_heat_J_kgK: 292, latent_heat_kJ_kg: 150,
    density_kg_m3: 15630, flags: [],
  },
  inconel_718: {
    key: "inconel_718", melting_point_C: 1336, thermal_conductivity_W_mK: 11.4,
    resistivity_uOhm_cm: 125, mrr_factor: 0.6, carbon_pct: 0,
    diffusivity_mm2_s: 3.1, specific_heat_J_kgK: 435, latent_heat_kJ_kg: 292,
    density_kg_m3: 8190, flags: [],
  },
  hastelloy_C276: {
    key: "hastelloy_C276", melting_point_C: 1370, thermal_conductivity_W_mK: 10.2,
    resistivity_uOhm_cm: 130, mrr_factor: 0.55, carbon_pct: 0,
    diffusivity_mm2_s: 2.8, specific_heat_J_kgK: 427, latent_heat_kJ_kg: 285,
    density_kg_m3: 8890, flags: [],
  },
  beryllium_copper: {
    key: "beryllium_copper", melting_point_C: 870, thermal_conductivity_W_mK: 105,
    resistivity_uOhm_cm: 7, mrr_factor: 1.6, carbon_pct: 0,
    diffusivity_mm2_s: 32.8, specific_heat_J_kgK: 385, latent_heat_kJ_kg: 190,
    density_kg_m3: 8250, flags: ["TOXIC_FUMES"],
  },
  P20_mold: {
    key: "P20_mold", melting_point_C: 1425, thermal_conductivity_W_mK: 34.0,
    resistivity_uOhm_cm: 48, mrr_factor: 1.0, carbon_pct: 0.35,
    diffusivity_mm2_s: 9.0, specific_heat_J_kgK: 477, latent_heat_kJ_kg: 250,
    density_kg_m3: 7850, flags: [],
  },
  M2_hss: {
    key: "M2_hss", melting_point_C: 1430, thermal_conductivity_W_mK: 21.0,
    resistivity_uOhm_cm: 60, mrr_factor: 0.9, carbon_pct: 0.85,
    diffusivity_mm2_s: 5.7, specific_heat_J_kgK: 460, latent_heat_kJ_kg: 250,
    density_kg_m3: 8160, flags: [],
  },
  "4140_steel": {
    key: "4140_steel", melting_point_C: 1416, thermal_conductivity_W_mK: 42.6,
    resistivity_uOhm_cm: 22, mrr_factor: 1.05, carbon_pct: 0.40,
    diffusivity_mm2_s: 11.2, specific_heat_J_kgK: 473, latent_heat_kJ_kg: 247,
    density_kg_m3: 7850, flags: [],
  },
  kovar: {
    key: "kovar", melting_point_C: 1450, thermal_conductivity_W_mK: 17.0,
    resistivity_uOhm_cm: 49, mrr_factor: 0.85, carbon_pct: 0,
    diffusivity_mm2_s: 4.4, specific_heat_J_kgK: 460, latent_heat_kJ_kg: 260,
    density_kg_m3: 8360, flags: [],
  },

  // ── Shop Tool Steel Portfolio (hardened state unless noted) ──────────
  "4140_PH_steel": {
    key: "4140_PH_steel", melting_point_C: 1416, thermal_conductivity_W_mK: 42.6,
    resistivity_uOhm_cm: 22, mrr_factor: 1.05, carbon_pct: 0.40,
    diffusivity_mm2_s: 11.2, specific_heat_J_kgK: 473, latent_heat_kJ_kg: 247,
    density_kg_m3: 7850, flags: ["PRE_HARD"],
  },
  O2_tool: {
    key: "O2_tool", melting_point_C: 1420, thermal_conductivity_W_mK: 36.0,
    resistivity_uOhm_cm: 45, mrr_factor: 0.95, carbon_pct: 0.90,
    diffusivity_mm2_s: 9.5, specific_heat_J_kgK: 460, latent_heat_kJ_kg: 250,
    density_kg_m3: 7860, flags: [],
  },
  "52100_bearing": {
    key: "52100_bearing", melting_point_C: 1424, thermal_conductivity_W_mK: 46.6,
    resistivity_uOhm_cm: 19, mrr_factor: 0.85, carbon_pct: 1.00,
    diffusivity_mm2_s: 12.6, specific_heat_J_kgK: 475, latent_heat_kJ_kg: 248,
    density_kg_m3: 7830, flags: ["HIGH_CRACK_RISK"],
  },
  "1018_steel": {
    key: "1018_steel", melting_point_C: 1510, thermal_conductivity_W_mK: 51.9,
    resistivity_uOhm_cm: 15.9, mrr_factor: 1.15, carbon_pct: 0.18,
    diffusivity_mm2_s: 13.5, specific_heat_J_kgK: 486, latent_heat_kJ_kg: 247,
    density_kg_m3: 7870, flags: ["GUMMY_SOFT"],
  },
  "1020_steel": {
    key: "1020_steel", melting_point_C: 1515, thermal_conductivity_W_mK: 51.9,
    resistivity_uOhm_cm: 15.9, mrr_factor: 1.15, carbon_pct: 0.20,
    diffusivity_mm2_s: 13.5, specific_heat_J_kgK: 486, latent_heat_kJ_kg: 247,
    density_kg_m3: 7870, flags: ["GUMMY_SOFT"],
  },
  M4_hss: {
    key: "M4_hss", melting_point_C: 1430, thermal_conductivity_W_mK: 19.0,
    resistivity_uOhm_cm: 62, mrr_factor: 0.80, carbon_pct: 1.30,
    diffusivity_mm2_s: 5.2, specific_heat_J_kgK: 460, latent_heat_kJ_kg: 250,
    density_kg_m3: 8020, flags: ["HIGH_VANADIUM"],
  },
  M42_hss: {
    key: "M42_hss", melting_point_C: 1430, thermal_conductivity_W_mK: 20.0,
    resistivity_uOhm_cm: 58, mrr_factor: 0.75, carbon_pct: 1.10,
    diffusivity_mm2_s: 5.5, specific_heat_J_kgK: 452, latent_heat_kJ_kg: 250,
    density_kg_m3: 8150, flags: ["COBALT_HSS"],
  },
  silver_braze: {
    key: "silver_braze", melting_point_C: 780, thermal_conductivity_W_mK: 250,
    resistivity_uOhm_cm: 3.8, mrr_factor: 2.5, carbon_pct: 0,
    diffusivity_mm2_s: 65.0, specific_heat_J_kgK: 330, latent_heat_kJ_kg: 170,
    density_kg_m3: 9100, flags: ["BRAZE_ALLOY", "LOW_MELTING"],
  },
};

// ============================================================================
// WIRE DATABASE — 6 wire specifications
// ============================================================================

const WIRE_DB: Record<string, WireSpec> = {
  brass_025: {
    key: "brass_025", type: "brass", diameter_mm: 0.25, tensile_strength_N: 900,
    speed_range_mm_min: [3, 15], cost_per_m_usd: 0.02, min_corner_radius_mm: 0.14,
    speed_boost: 1.0, max_height_mm: 400,
  },
  brass_020: {
    key: "brass_020", type: "brass", diameter_mm: 0.20, tensile_strength_N: 600,
    speed_range_mm_min: [3, 12], cost_per_m_usd: 0.025, min_corner_radius_mm: 0.11,
    speed_boost: 1.0, max_height_mm: 350,
  },
  coated_025: {
    key: "coated_025", type: "coated", diameter_mm: 0.25, tensile_strength_N: 800,
    speed_range_mm_min: [5, 18], cost_per_m_usd: 0.04, min_corner_radius_mm: 0.14,
    speed_boost: 1.25, max_height_mm: 400,
  },
  coated_020: {
    key: "coated_020", type: "coated", diameter_mm: 0.20, tensile_strength_N: 550,
    speed_range_mm_min: [5, 15], cost_per_m_usd: 0.05, min_corner_radius_mm: 0.11,
    speed_boost: 1.20, max_height_mm: 350,
  },
  moly_010: {
    key: "moly_010", type: "molybdenum", diameter_mm: 0.10, tensile_strength_N: 350,
    speed_range_mm_min: [1, 4], cost_per_m_usd: 0.15, min_corner_radius_mm: 0.06,
    speed_boost: 1.0, max_height_mm: 200,
  },
  tungsten_005: {
    key: "tungsten_005", type: "tungsten", diameter_mm: 0.05, tensile_strength_N: 200,
    speed_range_mm_min: [0.5, 2], cost_per_m_usd: 0.30, min_corner_radius_mm: 0.03,
    speed_boost: 1.0, max_height_mm: 100,
  },
};

// ============================================================================
// EDM MACHINES DATABASE — 15 machines
// ============================================================================

const MACHINE_DB: EDMMachineSpec[] = [
  // Makino Wire
  {
    model: "U6", manufacturer: "Makino", type: "wire",
    x_travel_mm: 600, y_travel_mm: 400, z_travel_mm: 420,
    max_workpiece_kg: 1500, tank_size_mm: [1050, 820, 500],
    wire_diameters_mm: [0.10, 0.15, 0.20, 0.25, 0.30],
    uv_axis: true, submerged_cutting: true, auto_threading: true,
    max_taper_deg: 30, controller: "Makino",
    features: ["HyperCut", "ProTech collision avoidance", "H.E.A.T. ready", "fine-finish capable"],
  },
  {
    model: "U6 H.E.A.T.", manufacturer: "Makino", type: "wire",
    x_travel_mm: 600, y_travel_mm: 400, z_travel_mm: 420,
    max_workpiece_kg: 1500, tank_size_mm: [1050, 820, 500],
    wire_diameters_mm: [0.10, 0.15, 0.20, 0.25, 0.30],
    uv_axis: true, submerged_cutting: true, auto_threading: true,
    max_taper_deg: 30, controller: "Makino",
    features: ["HyperCut", "H.E.A.T. technology", "high-energy applied tech", "50% speed boost", "ProTech"],
  },
  {
    model: "U86", manufacturer: "Makino", type: "wire",
    x_travel_mm: 800, y_travel_mm: 600, z_travel_mm: 510,
    max_workpiece_kg: 3000, tank_size_mm: [1350, 1050, 600],
    wire_diameters_mm: [0.15, 0.20, 0.25, 0.30],
    uv_axis: true, submerged_cutting: true, auto_threading: true,
    max_taper_deg: 30, controller: "Makino",
    features: ["HyperCut", "large-format", "ProTech", "heavy workpiece"],
  },
  // Makino Sinker
  {
    model: "EDAF2", manufacturer: "Makino", type: "sinker",
    x_travel_mm: 350, y_travel_mm: 250, z_travel_mm: 250,
    max_workpiece_kg: 500, tank_size_mm: [750, 500, 350],
    wire_diameters_mm: [], uv_axis: false, submerged_cutting: true,
    auto_threading: false, max_taper_deg: 0, controller: "Makino",
    features: ["sinker EDM", "SG adaptive servo", "fine-rib capable", "electrode changer ready"],
  },
  {
    model: "EDAF3", manufacturer: "Makino", type: "sinker",
    x_travel_mm: 450, y_travel_mm: 350, z_travel_mm: 350,
    max_workpiece_kg: 1000, tank_size_mm: [950, 650, 450],
    wire_diameters_mm: [], uv_axis: false, submerged_cutting: true,
    auto_threading: false, max_taper_deg: 0, controller: "Makino",
    features: ["sinker EDM", "SG adaptive servo", "large-format sinker", "electrode changer ready"],
  },
  // Sodick Wire
  {
    model: "ALC600G", manufacturer: "Sodick", type: "wire",
    x_travel_mm: 600, y_travel_mm: 400, z_travel_mm: 310,
    max_workpiece_kg: 1000, tank_size_mm: [1020, 750, 400],
    wire_diameters_mm: [0.10, 0.15, 0.20, 0.25, 0.30],
    uv_axis: true, submerged_cutting: true, auto_threading: true,
    max_taper_deg: 30, controller: "Sodick",
    features: ["linear motors all axes", "Smart Pulse", "LN2W controller", "auto-wire threading"],
  },
  {
    model: "AG600L", manufacturer: "Sodick", type: "wire",
    x_travel_mm: 600, y_travel_mm: 400, z_travel_mm: 350,
    max_workpiece_kg: 1200, tank_size_mm: [1050, 800, 440],
    wire_diameters_mm: [0.10, 0.15, 0.20, 0.25, 0.30],
    uv_axis: true, submerged_cutting: true, auto_threading: true,
    max_taper_deg: 30, controller: "Sodick",
    features: ["linear motors", "high-speed threading", "SVC circuit", "K-SMC ceramic guides"],
  },
  {
    model: "VL600Q", manufacturer: "Sodick", type: "wire",
    x_travel_mm: 600, y_travel_mm: 400, z_travel_mm: 500,
    max_workpiece_kg: 2000, tank_size_mm: [1100, 850, 600],
    wire_diameters_mm: [0.15, 0.20, 0.25, 0.30],
    uv_axis: true, submerged_cutting: true, auto_threading: true,
    max_taper_deg: 45, controller: "Sodick",
    features: ["linear motors", "tall workpiece capable", "LN3W controller", "SVC circuit"],
  },
  // Mitsubishi Wire
  {
    model: "MV1200R", manufacturer: "Mitsubishi", type: "wire",
    x_travel_mm: 400, y_travel_mm: 300, z_travel_mm: 310,
    max_workpiece_kg: 800, tank_size_mm: [770, 610, 350],
    wire_diameters_mm: [0.10, 0.15, 0.20, 0.25, 0.30],
    uv_axis: true, submerged_cutting: true, auto_threading: true,
    max_taper_deg: 30, controller: "Mitsubishi",
    features: ["V350V generator", "tubular shaft motor", "Optical Drive System", "D-CUBES controller"],
  },
  {
    model: "MV2400R", manufacturer: "Mitsubishi", type: "wire",
    x_travel_mm: 600, y_travel_mm: 400, z_travel_mm: 310,
    max_workpiece_kg: 1500, tank_size_mm: [1050, 820, 400],
    wire_diameters_mm: [0.10, 0.15, 0.20, 0.25, 0.30],
    uv_axis: true, submerged_cutting: true, auto_threading: true,
    max_taper_deg: 30, controller: "Mitsubishi",
    features: ["V350V generator", "large-format", "Optical Drive System", "D-CUBES controller"],
  },
  // AgieCharmilles Wire
  {
    model: "CUT P 350", manufacturer: "AgieCharmilles", type: "wire",
    x_travel_mm: 350, y_travel_mm: 250, z_travel_mm: 256,
    max_workpiece_kg: 500, tank_size_mm: [700, 550, 300],
    wire_diameters_mm: [0.10, 0.15, 0.20, 0.25, 0.30, 0.33],
    uv_axis: true, submerged_cutting: true, auto_threading: true,
    max_taper_deg: 30, controller: "AgieCharmilles",
    features: ["POWER-EXPERT", "Intelligent Power Generator", "TAPER-EXPERT", "Econowatt"],
  },
  {
    model: "CUT P 550", manufacturer: "AgieCharmilles", type: "wire",
    x_travel_mm: 550, y_travel_mm: 350, z_travel_mm: 425,
    max_workpiece_kg: 2000, tank_size_mm: [1050, 750, 500],
    wire_diameters_mm: [0.10, 0.15, 0.20, 0.25, 0.30, 0.33],
    uv_axis: true, submerged_cutting: true, auto_threading: true,
    max_taper_deg: 30, controller: "AgieCharmilles",
    features: ["POWER-EXPERT", "large-format", "TAPER-EXPERT", "Econowatt", "Intelligent Power Generator"],
  },
  // Fanuc Wire
  {
    model: "ROBOCUT α-CiC", manufacturer: "Fanuc", type: "wire",
    x_travel_mm: 600, y_travel_mm: 400, z_travel_mm: 310,
    max_workpiece_kg: 1500, tank_size_mm: [1050, 820, 400],
    wire_diameters_mm: [0.10, 0.15, 0.20, 0.25, 0.30],
    uv_axis: true, submerged_cutting: true, auto_threading: true,
    max_taper_deg: 30, controller: "Fanuc",
    features: ["AWF2 auto-threading", "Core Stitch", "ai Pulse Control", "LINKi IoT ready"],
  },
  // Accutex Wire
  {
    model: "AU-300iA", manufacturer: "Accutex", type: "wire",
    x_travel_mm: 300, y_travel_mm: 400, z_travel_mm: 250,
    max_workpiece_kg: 600, tank_size_mm: [700, 580, 310],
    wire_diameters_mm: [0.15, 0.20, 0.25, 0.30],
    uv_axis: true, submerged_cutting: true, auto_threading: true,
    max_taper_deg: 20, controller: "Accutex",
    features: ["anti-electrolysis", "Windows-based CNC", "corner strategy", "auto wire threading"],
  },
  {
    model: "AU-500iA", manufacturer: "Accutex", type: "wire",
    x_travel_mm: 500, y_travel_mm: 400, z_travel_mm: 310,
    max_workpiece_kg: 1200, tank_size_mm: [900, 700, 400],
    wire_diameters_mm: [0.15, 0.20, 0.25, 0.30],
    uv_axis: true, submerged_cutting: true, auto_threading: true,
    max_taper_deg: 25, controller: "Accutex",
    features: ["anti-electrolysis", "large-format", "Windows-based CNC", "corner strategy"],
  },
];

// ============================================================================
// CONTROLLER CAPABILITY DATABASE
// ============================================================================

const CONTROLLER_DB: Record<ControllerBrand, {
  features: string[];
  strengths: string[];
  limitations: string[];
}> = {
  Makino: {
    features: [
      "HyperCut multi-pass technology", "ProTech collision avoidance",
      "H.E.A.T. high-energy applied technology", "Auto-threading with broken wire recovery",
      "Adaptive servo with SG control", "Submerged machining standard",
      "Remote monitoring via Makino Connect",
    ],
    strengths: [
      "Best-in-class surface finish (<0.1 Ra)", "Fastest auto-threading recovery",
      "Excellent taper accuracy to ±0.001°", "H.E.A.T. models offer 50% speed boost on rough cuts",
    ],
    limitations: [
      "Proprietary control — limited 3rd-party post compatibility",
      "Higher acquisition cost", "Requires Makino-certified technicians",
    ],
  },
  Sodick: {
    features: [
      "Linear motor drives (all axes)", "Smart Pulse generator",
      "LN2W/LN3W CNC controller", "K-SMC ceramic wire guides",
      "SVC (Super Variable Control) circuit", "Auto-threading with annealing",
    ],
    strengths: [
      "Zero backlash from linear motors", "Excellent positional accuracy (±1µm)",
      "Fast rapid traverse", "Good corner accuracy from rigid linear drives",
    ],
    limitations: [
      "Linear motors generate heat — thermal management needed",
      "Higher power consumption", "Parts availability varies by region",
    ],
  },
  Fanuc: {
    features: [
      "AWF2 auto wire feed", "Core Stitch (bridges for slug retention)",
      "ai Pulse Control (adaptive energy)", "LINKi IoT platform",
      "Corner control with arc interpolation", "Energy saving mode",
    ],
    strengths: [
      "Robust and reliable CNC platform", "Excellent global parts/service network",
      "Core Stitch eliminates slug fishing", "ai Pulse adapts energy in real-time",
    ],
    limitations: [
      "Surface finish slightly behind Makino/Sodick on finest cuts",
      "UV axis stroke can be limiting on some models",
    ],
  },
  Mitsubishi: {
    features: [
      "V350V digital generator", "Optical Drive System (non-contact axis measurement)",
      "D-CUBES touch-screen controller", "Tubular shaft direct-drive motors",
      "Multi-material technology library", "Cylindrical machining option",
    ],
    strengths: [
      "Excellent tech library — material/wire combos pre-optimized",
      "Optical Drive eliminates scale wear", "Good all-around performance",
      "Intuitive D-CUBES interface reduces operator training time",
    ],
    limitations: [
      "Optical Drive requires clean environment", "Smaller install base in some regions",
    ],
  },
  AgieCharmilles: {
    features: [
      "POWER-EXPERT adaptive generator", "TAPER-EXPERT geometry compensation",
      "Intelligent Power Generator (IPG)", "Econowatt energy optimization",
      "AC CUT VS wire threading", "Integrated collision protection",
    ],
    strengths: [
      "Best taper cutting accuracy (TAPER-EXPERT)", "IPG handles varying thicknesses well",
      "Econowatt reduces power 20-30%", "Swiss-precision build quality",
    ],
    limitations: [
      "Higher consumable costs (wire guides, contacts)", "Slower auto-threading than Makino/Fanuc",
      "Service intervals more frequent on IPG modules",
    ],
  },
  Accutex: {
    features: [
      "Anti-electrolysis power supply", "Windows-based CNC controller",
      "Corner strategy optimization", "Auto wire threading",
      "Open architecture controller", "USB/Ethernet connectivity",
    ],
    strengths: [
      "Cost-effective acquisition", "Anti-electrolysis protects workpiece surfaces",
      "Open controller accepts standard G-code easily", "Good value for job-shop applications",
    ],
    limitations: [
      "Surface finish ceiling vs premium brands", "Smaller technology library",
      "Limited high-end taper capability", "Fewer service centers globally",
    ],
  },
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function resolveMaterial(materialInput: string): EDMMaterialProperties | null {
  const key = materialInput.toLowerCase().replace(/[\s-]/g, "_");
  // Direct match
  if (MATERIALS_DB[key]) return MATERIALS_DB[key];
  // Partial match
  for (const [k, v] of Object.entries(MATERIALS_DB)) {
    if (k.includes(key) || key.includes(k)) return v;
    if (v.key.toLowerCase().includes(key)) return v;
  }
  // Common aliases
  const aliases: Record<string, string> = {
    "1045": "steel_1045", "d2": "D2_tool", "a2": "A2_tool", "h13": "H13_tool",
    "s7": "S7_tool", "304": "304_stainless", "ss304": "304_stainless",
    "titanium": "Ti6Al4V", "ti64": "Ti6Al4V", "ti6al4v": "Ti6Al4V",
    "aluminum": "6061_aluminum", "al6061": "6061_aluminum", "6061": "6061_aluminum",
    "copper": "copper_C110", "c110": "copper_C110",
    "carbide": "carbide_WC", "tungsten_carbide": "carbide_WC", "wc": "carbide_WC",
    "inconel": "inconel_718", "in718": "inconel_718",
    "hastelloy": "hastelloy_C276", "c276": "hastelloy_C276",
    "becu": "beryllium_copper", "beryllium": "beryllium_copper",
    "p20": "P20_mold", "m2": "M2_hss", "hss": "M2_hss",
    "4140": "4140_steel", "41l40": "4140_steel",
    "4140_ph": "4140_PH_steel", "4140ph": "4140_PH_steel", "4140_pre_hard": "4140_PH_steel",
    "o2": "O2_tool", "o_2": "O2_tool", "o2_tool": "O2_tool",
    "52100": "52100_bearing", "aisi_52100": "52100_bearing",
    "1018": "1018_steel", "aisi_1018": "1018_steel",
    "1020": "1020_steel", "aisi_1020": "1020_steel",
    "m4": "M4_hss", "m4_hss": "M4_hss",
    "m42": "M42_hss", "m42_hss": "M42_hss", "cobalt_hss": "M42_hss",
    "braze": "silver_braze", "silver_braze": "silver_braze", "bag": "silver_braze",
  };
  const aliasKey = aliases[key] || aliases[materialInput.toLowerCase()];
  if (aliasKey && MATERIALS_DB[aliasKey]) return MATERIALS_DB[aliasKey];
  return null;
}

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

function round2(val: number): number {
  return Math.round(val * 100) / 100;
}

// ============================================================================
// ENGINE CLASS
// ============================================================================

export class EDMMaterialMachineWireEngine {

  // ==========================================================================
  // MS3 U01 — EDM Machinability Classifier
  // ==========================================================================

  private classifyMachinability(mat: EDMMaterialProperties): { cls: MachinabilityClass; desc: string } {
    // Classification based on MRR factor, resistivity, thermal conductivity
    // Class A: Easy to EDM — high MRR, moderate resistivity, good thermal conductivity
    // Class B: Standard — baseline performance
    // Class C: Difficult — low MRR, very high/low resistivity, thermal challenges
    // Class D: Very difficult — exotic materials, extremely slow

    const score =
      mat.mrr_factor * 40 +
      clamp(mat.resistivity_uOhm_cm / 10, 0, 10) * 3 +
      clamp(mat.thermal_conductivity_W_mK / 50, 0, 5) * 2 -
      (mat.flags.includes("SLOW") ? 15 : 0) -
      (mat.melting_point_C > 2000 ? 10 : 0);

    if (score >= 50) {
      return { cls: "A", desc: "Excellent EDM machinability — high MRR, good spark stability, minimal wire breaks" };
    } else if (score >= 35) {
      return { cls: "B", desc: "Standard EDM machinability — normal parameters, predictable performance" };
    } else if (score >= 20) {
      return { cls: "C", desc: "Difficult EDM material — reduced MRR, requires parameter tuning, higher wire consumption" };
    } else {
      return { cls: "D", desc: "Very difficult EDM material — very slow, frequent wire breaks, specialized techniques required" };
    }
  }

  // ==========================================================================
  // MS3 U02 — Thermal Property Resolver
  // ==========================================================================

  private resolveThermal(mat: EDMMaterialProperties): MachinabilityResult["thermal"] {
    return {
      melting_point_C: mat.melting_point_C,
      thermal_conductivity_W_mK: mat.thermal_conductivity_W_mK,
      diffusivity_mm2_s: mat.diffusivity_mm2_s,
      specific_heat_J_kgK: mat.specific_heat_J_kgK,
      latent_heat_kJ_kg: mat.latent_heat_kJ_kg,
    };
  }

  // ==========================================================================
  // MS3 U03 — Recast Risk Assessor
  // ==========================================================================

  private assessRecastRisk(mat: EDMMaterialProperties, hardnessHrc?: number): MachinabilityResult["recast"] {
    const factors: string[] = [];
    let crackProb = 0;

    // Carbon content is the primary driver of recast layer cracking
    if (mat.carbon_pct >= 1.5) {
      crackProb += 40;
      factors.push(`Very high carbon (${mat.carbon_pct}%) — martensitic transformation in recast layer`);
    } else if (mat.carbon_pct >= 0.8) {
      crackProb += 25;
      factors.push(`High carbon (${mat.carbon_pct}%) — significant recast hardness`);
    } else if (mat.carbon_pct >= 0.4) {
      crackProb += 10;
      factors.push(`Moderate carbon (${mat.carbon_pct}%) — some recast risk`);
    }

    // Hardness contribution
    if (hardnessHrc && hardnessHrc > 55) {
      crackProb += 15;
      factors.push(`High hardness (${hardnessHrc} HRC) — residual stress amplifies cracking`);
    } else if (hardnessHrc && hardnessHrc > 45) {
      crackProb += 8;
      factors.push(`Moderate hardness (${hardnessHrc} HRC) — some stress contribution`);
    }

    // Alloy flags
    if (mat.flags.includes("HIGH_CRACK_RISK")) {
      crackProb += 20;
      factors.push("Material flagged HIGH_CRACK_RISK — known for EDM cracking issues");
    }

    // Low thermal conductivity = heat concentrates = deeper recast
    if (mat.thermal_conductivity_W_mK < 15) {
      crackProb += 10;
      factors.push(`Low thermal conductivity (${mat.thermal_conductivity_W_mK} W/mK) — heat concentrates, deeper recast`);
    }

    crackProb = clamp(crackProb, 0, 95);

    // Determine risk level
    let riskLevel: "low" | "moderate" | "high" | "critical";
    if (crackProb < 15) riskLevel = "low";
    else if (crackProb < 35) riskLevel = "moderate";
    else if (crackProb < 60) riskLevel = "high";
    else riskLevel = "critical";

    // Mitigations
    const mitigation: string[] = [];
    if (crackProb > 10) {
      mitigation.push("Use multiple skim passes to remove recast layer (3+ passes recommended)");
    }
    if (crackProb > 30) {
      mitigation.push("Reduce discharge energy on rough cut to minimize recast depth");
      mitigation.push("Consider stress-relief anneal after EDM if geometry permits");
    }
    if (crackProb > 50) {
      mitigation.push("Mandatory post-EDM grinding/polishing of critical surfaces");
      mitigation.push("Inspect for micro-cracks with dye penetrant or fluorescent inspection");
      mitigation.push("Reduce on-time to minimum viable level — accept slower MRR");
    }
    if (factors.length === 0) {
      factors.push("No significant recast risk factors identified");
      mitigation.push("Standard EDM parameters acceptable — monitor surface quality");
    }

    return {
      risk_level: riskLevel,
      crack_probability_pct: crackProb,
      contributing_factors: factors,
      mitigation,
    };
  }

  // ==========================================================================
  // MS3 U04 — Electrical Property Mapper
  // ==========================================================================

  private mapElectrical(mat: EDMMaterialProperties): MachinabilityResult["electrical"] {
    let sparkGap: string;
    let servo: string;

    if (mat.resistivity_uOhm_cm < 5) {
      sparkGap = "Very small gap — high conductivity pulls spark energy; risk of DC arcing";
      servo = "Use high servo sensitivity with fast retract; increase off-time to prevent arcing";
    } else if (mat.resistivity_uOhm_cm < 25) {
      sparkGap = "Normal spark gap — good energy coupling, stable discharge";
      servo = "Standard servo settings; optimize for speed with normal gap voltage";
    } else if (mat.resistivity_uOhm_cm < 80) {
      sparkGap = "Moderate gap — higher open voltage needed for reliable ignition";
      servo = "Increase open voltage 10-20%; slightly higher gap for stable ignition";
    } else if (mat.resistivity_uOhm_cm < 150) {
      sparkGap = "Large gap — high resistivity requires elevated open voltage and longer ignition delay";
      servo = "High open voltage (>100V); increase ignition delay; reduce servo gain to prevent hunting";
    } else {
      sparkGap = "Very large gap — extreme resistivity; borderline EDM-able; requires maximum open voltage";
      servo = "Maximum open voltage; very conservative servo; consider sinker EDM with high-pressure flushing";
    }

    return {
      resistivity_uOhm_cm: mat.resistivity_uOhm_cm,
      spark_gap_behavior: sparkGap,
      servo_strategy: servo,
    };
  }

  // ==========================================================================
  // MS3 U05 — Heat Treatment State Checker
  // ==========================================================================

  private checkHeatTreat(
    mat: EDMMaterialProperties,
    state: HeatTreatState,
    hardnessHrc?: number,
  ): MachinabilityResult["heat_treat"] {
    const notes: string[] = [];
    let edmBeforeHardening = false;
    let distortionRisk: "low" | "moderate" | "high" = "low";

    // Non-hardenable materials
    if (mat.carbon_pct === 0 && !["Ti6Al4V", "inconel_718", "hastelloy_C276"].includes(mat.key)) {
      notes.push("Material is not heat-treatable — EDM timing is not a factor");
      return { state, edm_before_hardening_recommended: false, distortion_risk: "low", notes };
    }

    switch (state) {
      case "annealed":
        notes.push("Material is annealed (soft) — EDM cuts faster but dimensions may shift during subsequent hardening");
        if (mat.carbon_pct > 0.6) {
          edmBeforeHardening = false;
          distortionRisk = "high";
          notes.push("HIGH CARBON: EDM after hardening recommended — annealed part will distort significantly during heat treat");
          notes.push(`Expected dimensional change: ±${round2(mat.carbon_pct * 0.05)}mm typical growth`);
        } else {
          edmBeforeHardening = true;
          distortionRisk = "moderate";
          notes.push("Low-to-moderate carbon: EDM before hardening is acceptable if tolerances allow 0.02-0.05mm shift");
        }
        break;

      case "pre-hardened":
        notes.push(`Pre-hardened stock (typically 28-34 HRC) — good compromise for EDM`);
        edmBeforeHardening = false; // Already partially hardened
        distortionRisk = "low";
        notes.push("Pre-hardened state minimizes post-EDM distortion — recommended for mold steels (P20, H13)");
        break;

      case "hardened":
        notes.push(`Hardened state${hardnessHrc ? ` (${hardnessHrc} HRC)` : ""} — ideal for precision wire EDM`);
        edmBeforeHardening = false;
        distortionRisk = "low";
        notes.push("Hardened material is dimensionally stable — EDM will not cause phase-change distortion");
        if (hardnessHrc && hardnessHrc > 58) {
          notes.push("Very high hardness — monitor for micro-cracking in recast layer");
        }
        if (mat.carbon_pct > 1.0) {
          notes.push("CAUTION: High-carbon hardened steel has highest recast crack risk — use skim passes to remove recast");
        }
        break;

      case "stress_relieved":
        notes.push("Stress-relieved state — reduced residual stress improves EDM dimensional accuracy");
        distortionRisk = "low";
        notes.push("Stress relief before EDM is best practice for precision work (±0.005mm tolerance)");
        break;

      case "normalized":
        notes.push("Normalized — uniform grain structure but not hardened");
        edmBeforeHardening = mat.carbon_pct < 0.5;
        distortionRisk = mat.carbon_pct > 0.6 ? "high" : "moderate";
        notes.push("If part will be hardened after EDM, leave 0.1-0.2mm stock for finish grinding");
        break;

      default:
        notes.push("Heat treat state unknown — assume worst-case distortion risk");
        distortionRisk = "moderate";
        notes.push("Recommend verifying heat treat state before EDM to predict dimensional stability");
        break;
    }

    return {
      state,
      edm_before_hardening_recommended: edmBeforeHardening,
      distortion_risk: distortionRisk,
      notes,
    };
  }

  // ==========================================================================
  // ACTION: assess_material (MS3 combined)
  // ==========================================================================

  assessMaterial(input: MaterialAssessmentInput): MachinabilityResult {
    const mat = resolveMaterial(input.material);
    if (!mat) {
      return {
        material_key: input.material,
        machinability_class: "C",
        class_description: `Unknown material "${input.material}" — defaulting to Class C (difficult); provide exact material for accurate assessment`,
        mrr_factor: 0.7,
        thermal: { melting_point_C: 1400, thermal_conductivity_W_mK: 25, diffusivity_mm2_s: 6, specific_heat_J_kgK: 460, latent_heat_kJ_kg: 250 },
        electrical: { resistivity_uOhm_cm: 50, spark_gap_behavior: "Unknown — using conservative parameters", servo_strategy: "Use conservative servo settings; test cut recommended" },
        recast: { risk_level: "moderate", crack_probability_pct: 25, contributing_factors: ["Unknown material — cannot assess"], mitigation: ["Perform test cut and inspect recast layer"] },
        heat_treat: { state: input.heat_treat_state || "unknown", edm_before_hardening_recommended: false, distortion_risk: "moderate", notes: ["Unknown material — verify heat treat state"] },
        warnings: [`Material "${input.material}" not found in database — using conservative defaults`],
        recommendations: ["Provide exact material specification for accurate assessment", "Perform test cut to validate parameters"],
      };
    }

    const { cls, desc } = this.classifyMachinability(mat);
    const thermal = this.resolveThermal(mat);
    const electrical = this.mapElectrical(mat);
    const recast = this.assessRecastRisk(mat, input.hardness_hrc);
    const heatTreat = this.checkHeatTreat(mat, input.heat_treat_state || "unknown", input.hardness_hrc);

    const warnings: string[] = [];
    const recommendations: string[] = [];

    // Generate warnings from flags
    if (mat.flags.includes("TOXIC_FUMES")) {
      warnings.push("SAFETY: Material produces toxic fumes during EDM — ensure proper ventilation and fume extraction");
      warnings.push("SAFETY: Beryllium copper requires HEPA filtration on dielectric system");
    }
    if (mat.flags.includes("LOW_MELTING")) {
      warnings.push("Low melting point — risk of workpiece surface melting with aggressive parameters");
      recommendations.push("Use reduced discharge energy; increase off-time; ensure adequate flushing");
    }
    if (mat.flags.includes("SLOW")) {
      warnings.push("Inherently slow EDM material — expect 40-60% longer cycle times vs tool steel");
      recommendations.push("Plan for extended cycle time; consider coated wire for speed improvement");
    }
    if (mat.flags.includes("HIGH_CRACK_RISK")) {
      warnings.push("HIGH CRACK RISK — this material is known for EDM surface cracking");
    }

    // Thickness-based recommendations
    if (input.thickness_mm) {
      if (input.thickness_mm > 200) {
        recommendations.push(`Tall workpiece (${input.thickness_mm}mm) — increase flushing pressure, reduce speed, monitor wire tension`);
      }
      if (input.thickness_mm > 300) {
        recommendations.push("Consider 0.30mm wire for heights >300mm to maintain tension stability");
      }
      if (input.thickness_mm < 5 && mat.thermal_conductivity_W_mK > 100) {
        recommendations.push("Thin + high-conductivity material — reduce energy to prevent thermal distortion");
      }
    }

    // Class-based recommendations
    if (cls === "A") {
      recommendations.push("Class A material — standard parameters will work well; optimize for speed");
    } else if (cls === "B") {
      recommendations.push("Class B material — use manufacturer tech tables as starting point");
    } else if (cls === "C") {
      recommendations.push("Class C material — test cut recommended; start with conservative parameters and increase");
    } else {
      recommendations.push("Class D material — mandatory test cut; expect multiple parameter iterations");
      recommendations.push("Consider specialized wire (coated or molybdenum) for improved stability");
    }

    return {
      material_key: mat.key,
      machinability_class: cls,
      class_description: desc,
      mrr_factor: mat.mrr_factor,
      thermal,
      electrical,
      recast,
      heat_treat: heatTreat,
      warnings,
      recommendations,
    };
  }

  // ==========================================================================
  // MS4 U01 — Machine Selector
  // ==========================================================================

  selectMachine(input: MachineSelectionInput): MachineSelectionResult {
    const machineType = input.machine_type || "wire";
    const recommended: MachineSelectionResult["recommended_machines"] = [];
    const rejected: MachineSelectionResult["rejected_machines"] = [];

    for (const machine of MACHINE_DB) {
      // Filter by type
      if (machine.type !== machineType) {
        rejected.push({ model: machine.model, reason: `Wrong type: ${machine.type} vs required ${machineType}` });
        continue;
      }

      // Check travel
      if (input.part_x_mm > machine.x_travel_mm) {
        rejected.push({ model: machine.model, reason: `X travel insufficient: ${machine.x_travel_mm}mm < ${input.part_x_mm}mm required` });
        continue;
      }
      if (input.part_y_mm > machine.y_travel_mm) {
        rejected.push({ model: machine.model, reason: `Y travel insufficient: ${machine.y_travel_mm}mm < ${input.part_y_mm}mm required` });
        continue;
      }
      if (input.part_z_mm > machine.z_travel_mm) {
        rejected.push({ model: machine.model, reason: `Z travel insufficient: ${machine.z_travel_mm}mm < ${input.part_z_mm}mm required` });
        continue;
      }

      // Check weight
      if (input.part_weight_kg && input.part_weight_kg > machine.max_workpiece_kg) {
        rejected.push({ model: machine.model, reason: `Weight capacity insufficient: ${machine.max_workpiece_kg}kg < ${input.part_weight_kg}kg` });
        continue;
      }

      // Check taper
      if (input.taper_required_deg && input.taper_required_deg > machine.max_taper_deg) {
        rejected.push({ model: machine.model, reason: `Taper capability insufficient: ${machine.max_taper_deg}° < ${input.taper_required_deg}°` });
        continue;
      }

      // Check UV axis
      if (input.uv_axis_required && !machine.uv_axis) {
        rejected.push({ model: machine.model, reason: "UV axis required but not available" });
        continue;
      }

      // Check submerged
      if (input.submerged_required && !machine.submerged_cutting) {
        rejected.push({ model: machine.model, reason: "Submerged cutting required but not available" });
        continue;
      }

      // Scoring
      let score = 50;
      const fitNotes: string[] = [];
      const limitations: string[] = [];

      // Travel margin bonus (prefer machines where part fits comfortably)
      const xMargin = (machine.x_travel_mm - input.part_x_mm) / machine.x_travel_mm;
      const yMargin = (machine.y_travel_mm - input.part_y_mm) / machine.y_travel_mm;
      score += (xMargin + yMargin) * 10;

      // Don't over-size: penalize machines much larger than needed
      if (xMargin > 0.7 && yMargin > 0.7) {
        score -= 5;
        fitNotes.push("Machine is significantly oversized for this part — may be cost-inefficient");
      }

      // Preferred controller bonus
      if (input.preferred_controller && machine.controller === input.preferred_controller) {
        score += 15;
        fitNotes.push(`Matches preferred controller: ${input.preferred_controller}`);
      }

      // Auto-threading bonus
      if (machine.auto_threading) {
        score += 5;
        fitNotes.push("Auto-threading available");
      }

      // Wire diameter compatibility for small corners
      if (input.min_corner_radius_mm && input.min_corner_radius_mm < 0.12) {
        const hasSmallWire = machine.wire_diameters_mm.some(d => d <= 0.10);
        if (hasSmallWire) {
          score += 10;
          fitNotes.push("Supports small wire diameters for tight corners");
        } else {
          score -= 10;
          limitations.push(`Minimum wire diameter ${Math.min(...machine.wire_diameters_mm)}mm may not achieve ${input.min_corner_radius_mm}mm corners`);
        }
      }

      // Feature bonuses
      if (machine.features.includes("H.E.A.T. technology") || machine.features.includes("H.E.A.T. ready")) {
        score += 5;
        fitNotes.push("H.E.A.T. technology available for speed boost");
      }

      // Material-based adjustments
      const mat = resolveMaterial(input.material);
      if (mat) {
        if (mat.flags.includes("SLOW") && machine.features.some(f => f.includes("adaptive") || f.includes("Smart Pulse") || f.includes("ai Pulse"))) {
          score += 8;
          fitNotes.push("Adaptive pulse technology benefits difficult materials");
        }
      }

      recommended.push({
        model: `${machine.manufacturer} ${machine.model}`,
        manufacturer: machine.manufacturer,
        score: round2(score),
        fit_notes: fitNotes,
        limitations,
      });
    }

    // Sort by score descending
    recommended.sort((a, b) => b.score - a.score);

    return { recommended_machines: recommended, rejected_machines: rejected };
  }

  // ==========================================================================
  // MS4 U02 — Wire Type Selector
  // ==========================================================================

  selectWire(input: WireSelectionInput): WireSelectionResult {
    const mat = resolveMaterial(input.material);
    const priority = input.priority || "speed";

    // Filter wires that meet corner radius requirement
    const viable = Object.values(WIRE_DB).filter(w => w.min_corner_radius_mm <= input.min_corner_radius_mm);

    if (viable.length === 0) {
      // Nothing meets corner — recommend smallest available
      const smallest = Object.values(WIRE_DB).sort((a, b) => a.diameter_mm - b.diameter_mm)[0];
      return {
        recommended_wire: smallest.key,
        wire_type: smallest.type,
        diameter_mm: smallest.diameter_mm,
        rationale: [`No wire meets corner radius ${input.min_corner_radius_mm}mm — using smallest available: ${smallest.key}`],
        alternatives: [],
        estimated_speed_mm_min: smallest.speed_range_mm_min[0],
      };
    }

    // Score each viable wire
    const scored = viable.map(w => {
      let score = 0;
      const notes: string[] = [];

      // Height compatibility
      if (input.thickness_mm > w.max_height_mm) {
        return { wire: w, score: -100, notes: [`Exceeds max height ${w.max_height_mm}mm`] };
      }

      // Priority-based scoring
      switch (priority) {
        case "speed":
          score += w.speed_range_mm_min[1] * 3;
          score += w.speed_boost * 10;
          score += w.diameter_mm * 20; // Larger wire = faster
          break;
        case "cost":
          score += (0.35 - w.cost_per_m_usd) * 100; // Lower cost = higher score
          score += w.diameter_mm * 10; // Larger wire wastes less per m consumed
          break;
        case "accuracy":
          score += (0.30 - w.diameter_mm) * 50; // Smaller wire = better accuracy
          if (w.type === "coated") score += 5; // Coated = more consistent
          break;
      }

      // Material-specific adjustments
      if (mat) {
        if (mat.flags.includes("SLOW") && w.type === "coated") {
          score += 10;
          notes.push("Coated wire recommended for difficult materials — improved speed");
        }
        if (mat.thermal_conductivity_W_mK > 100 && w.diameter_mm >= 0.20) {
          score += 5;
          notes.push("High-conductivity material benefits from larger wire diameter");
        }
        if (mat.resistivity_uOhm_cm > 100 && w.type === "coated") {
          score += 8;
          notes.push("High-resistivity material — coated wire improves ignition reliability");
        }
      }

      // Surface finish
      if (input.target_surface_finish_Ra_um && input.target_surface_finish_Ra_um < 0.5) {
        if (w.diameter_mm <= 0.20) score += 10;
        if (w.type === "coated") score += 5;
      }

      return { wire: w, score, notes };
    });

    scored.sort((a, b) => b.score - a.score);
    const best = scored[0];

    // Estimate speed based on material and wire
    const mrrFactor = mat ? mat.mrr_factor : 0.8;
    const baseSpeed = (best.wire.speed_range_mm_min[0] + best.wire.speed_range_mm_min[1]) / 2;
    const estimatedSpeed = round2(baseSpeed * mrrFactor * best.wire.speed_boost);

    return {
      recommended_wire: best.wire.key,
      wire_type: best.wire.type,
      diameter_mm: best.wire.diameter_mm,
      rationale: [
        `Selected ${best.wire.key} (${best.wire.type} ${best.wire.diameter_mm}mm) for ${priority} priority`,
        `Corner radius ${input.min_corner_radius_mm}mm ≥ wire minimum ${best.wire.min_corner_radius_mm}mm`,
        ...best.notes,
      ],
      alternatives: scored.slice(1).filter(s => s.score > -50).map(s => ({
        wire_key: s.wire.key,
        diameter_mm: s.wire.diameter_mm,
        reason_not_primary: s.notes.length > 0 ? s.notes[0] : `Lower ${priority} score`,
      })),
      estimated_speed_mm_min: estimatedSpeed,
    };
  }

  // ==========================================================================
  // MS4 U03 — Wire Diameter Optimizer
  // ==========================================================================

  optimizeWireDiameter(minCornerRadius: number, thickness: number): WireDiameterOptResult {
    // The optimal wire is the largest diameter that still meets the corner requirement
    // Larger wire = faster cut, more stable, cheaper per meter

    // Wire kerf ≈ wire diameter + 2 × spark gap (~0.01-0.02mm per side)
    // Minimum inside corner radius ≈ wire_radius + spark_gap ≈ (wire_diameter / 2) + 0.015

    const allWires = Object.values(WIRE_DB).sort((a, b) => b.diameter_mm - a.diameter_mm); // Largest first

    const viable = allWires.map(w => {
      const meetsCorner = w.min_corner_radius_mm <= minCornerRadius;
      const meetsHeight = thickness <= w.max_height_mm;
      return {
        wire_key: w.key,
        diameter_mm: w.diameter_mm,
        meets_corner: meetsCorner && meetsHeight,
        speed_factor: w.speed_boost * (w.diameter_mm / 0.25), // Normalize to 0.25mm baseline
      };
    });

    // Find the largest wire that meets all requirements
    const optimal = viable.find(v => v.meets_corner);

    if (!optimal) {
      // No wire meets requirements — use smallest available
      const smallest = viable[viable.length - 1];
      return {
        optimal_diameter_mm: smallest.diameter_mm,
        wire_key: smallest.wire_key,
        corner_clearance_mm: round2(minCornerRadius - WIRE_DB[smallest.wire_key].min_corner_radius_mm),
        rationale: `No wire fully meets corner radius ${minCornerRadius}mm — using smallest available (${smallest.diameter_mm}mm). Consider orbiting or radius compensation.`,
        all_viable: viable,
      };
    }

    const wireSpec = WIRE_DB[optimal.wire_key];

    return {
      optimal_diameter_mm: optimal.diameter_mm,
      wire_key: optimal.wire_key,
      corner_clearance_mm: round2(minCornerRadius - wireSpec.min_corner_radius_mm),
      rationale: `${optimal.wire_key} (${optimal.diameter_mm}mm) is the largest wire meeting corner radius ${minCornerRadius}mm with ${round2(minCornerRadius - wireSpec.min_corner_radius_mm)}mm clearance`,
      all_viable: viable,
    };
  }

  // ==========================================================================
  // MS4 U04 — Wire Tension Calculator
  // ==========================================================================

  calculateTension(
    wireKey: string,
    thickness: number,
    dischargeEnergy: "low" | "medium" | "high" = "medium",
  ): WireTensionResult {
    const wire = WIRE_DB[wireKey];
    if (!wire) {
      return {
        optimal_tension_N: 10,
        tension_pct_of_uts: 50,
        wire_key: wireKey,
        adjustments: [`Unknown wire "${wireKey}" — using conservative 10N default`],
        break_risk: "moderate",
        recommendations: ["Verify wire specification and re-calculate"],
      };
    }

    // Base tension: typically 40-60% of UTS for brass, 30-50% for fine wires
    let basePct: number;
    if (wire.type === "brass" || wire.type === "coated") {
      basePct = 55; // Start at 55% UTS
    } else if (wire.type === "molybdenum") {
      basePct = 45; // Moly is more brittle
    } else {
      basePct = 35; // Tungsten — very thin, conservative
    }

    const adjustments: string[] = [];

    // Height adjustment: taller parts need more tension to keep wire straight
    if (thickness > 100) {
      const heightBoost = Math.min((thickness - 100) / 500 * 10, 10); // Up to +10%
      basePct += heightBoost;
      adjustments.push(`+${round2(heightBoost)}% for tall workpiece (${thickness}mm)`);
    }
    if (thickness < 10) {
      basePct -= 5;
      adjustments.push("-5% for thin workpiece — reduced deflection force");
    }

    // Discharge energy adjustment
    if (dischargeEnergy === "high") {
      basePct -= 5;
      adjustments.push("-5% for high discharge energy — reduces break risk during heavy roughing");
    } else if (dischargeEnergy === "low") {
      basePct += 3;
      adjustments.push("+3% for low discharge energy — fine finishing benefits from tighter wire");
    }

    // Clamp to safe range
    basePct = clamp(basePct, 25, 70);

    const optimalTension = round2(wire.tensile_strength_N * basePct / 100);

    // Break risk assessment
    let breakRisk: "low" | "moderate" | "high";
    if (basePct > 65) {
      breakRisk = "high";
    } else if (basePct > 55) {
      breakRisk = "moderate";
    } else {
      breakRisk = "low";
    }

    const recommendations: string[] = [];
    if (breakRisk === "high") {
      recommendations.push("Tension approaching wire UTS — monitor for wire breaks; reduce if breaks occur");
    }
    if (thickness > 200) {
      recommendations.push("Tall workpiece — consider increasing flushing pressure to assist wire straightness");
      recommendations.push("Use upper/lower flushing nozzles as close to workpiece as possible");
    }
    recommendations.push(`Optimal tension: ${optimalTension}N (${basePct}% of ${wire.tensile_strength_N}N UTS)`);
    if (wire.type === "molybdenum" || wire.type === "tungsten") {
      recommendations.push("Fine wire — start at calculated tension and reduce 5% if breaks occur");
    }

    return {
      optimal_tension_N: optimalTension,
      tension_pct_of_uts: basePct,
      wire_key: wireKey,
      adjustments,
      break_risk: breakRisk,
      recommendations,
    };
  }

  // ==========================================================================
  // MS4 U05 — Wire Consumption Estimator
  // ==========================================================================

  estimateWireCost(
    wireKey: string,
    cutLength: number,
    thickness: number,
    numPasses: number = 4,
    numParts: number = 1,
  ): WireCostResult {
    const wire = WIRE_DB[wireKey];
    if (!wire) {
      return {
        wire_key: wireKey,
        cut_length_mm: cutLength,
        wire_consumed_m: 0,
        wire_consumed_kg: 0,
        cost_usd: 0,
        cost_per_part_usd: 0,
        breakdown: { roughing_m: 0, finishing_m: 0, threading_waste_m: 0 },
      };
    }

    // Wire feed speed determines consumption (wire is single-use in most WEDM)
    // Typical wire feed: 5-15 m/min for brass, 1-5 m/min for fine wires

    // Roughing: wire feeds faster (higher discharge energy needs fresh wire)
    // For each mm of cut length, wire consumed = cut_time_min × wire_feed_m_per_min

    // Estimate cut speed (mm/min) based on wire and average thickness
    const avgSpeed = (wire.speed_range_mm_min[0] + wire.speed_range_mm_min[1]) / 2;
    const thicknessAdjust = Math.max(0.3, 1 - (thickness - 50) / 500); // Thicker = slower
    const roughCutSpeed = avgSpeed * thicknessAdjust; // mm/min of profile cut

    // Wire feed rate (m/min) — how fast wire moves through the kerf
    const wireFeedRate = wire.type === "brass" || wire.type === "coated" ? 10 : wire.type === "molybdenum" ? 3 : 1.5;

    // Roughing time (minutes)
    const roughTime = cutLength / roughCutSpeed;

    // Roughing wire consumption
    const roughingWire = roughTime * wireFeedRate; // meters

    // Finishing passes: typically 2-3 skim passes at 60-80% reduced wire feed
    const finishPasses = Math.max(0, numPasses - 1);
    const finishWireFeedReduction = 0.6; // Skim passes use less wire
    const finishSpeedMultiple = 1.5; // Skim passes are faster (less material removal)
    const finishTime = finishPasses * (cutLength / (roughCutSpeed * finishSpeedMultiple));
    const finishingWire = finishTime * wireFeedRate * finishWireFeedReduction;

    // Threading waste: ~0.5m per thread/rethread event
    const threadEvents = numPasses; // One thread per pass typically
    const threadingWaste = threadEvents * 0.5;

    const totalWirePerPart = roughingWire + finishingWire + threadingWaste;
    const totalWire = totalWirePerPart * numParts;

    // Wire weight (approximate: brass wire density ~8500 kg/m³)
    const wireArea = Math.PI * (wire.diameter_mm / 2000) ** 2; // m²
    const wireDensity = wire.type === "brass" || wire.type === "coated" ? 8500
      : wire.type === "molybdenum" ? 10220 : 19300; // kg/m³
    const wireKg = round2(totalWire * wireArea * wireDensity);

    const totalCost = round2(totalWire * wire.cost_per_m_usd);
    const costPerPart = round2(totalWirePerPart * wire.cost_per_m_usd);

    return {
      wire_key: wireKey,
      cut_length_mm: cutLength,
      wire_consumed_m: round2(totalWire),
      wire_consumed_kg: wireKg,
      cost_usd: totalCost,
      cost_per_part_usd: costPerPart,
      breakdown: {
        roughing_m: round2(roughingWire * numParts),
        finishing_m: round2(finishingWire * numParts),
        threading_waste_m: round2(threadingWaste * numParts),
      },
    };
  }

  // ==========================================================================
  // MS4 U06 — Controller Capability Mapper
  // ==========================================================================

  mapController(controller: ControllerBrand): ControllerCapabilityResult {
    const data = CONTROLLER_DB[controller];
    if (!data) {
      return {
        controller,
        features: [],
        strengths: [`Unknown controller brand: ${controller}`],
        limitations: ["No data available"],
        compatibility_notes: ["Verify controller capabilities with manufacturer"],
      };
    }

    const compatNotes: string[] = [];
    // Cross-compatibility notes
    if (controller === "Fanuc") {
      compatNotes.push("Fanuc controllers accept standard ISO G-code with minimal modification");
      compatNotes.push("Most CAM systems (Mastercam, Esprit, DCAM) have Fanuc WEDM post processors");
    } else if (controller === "Sodick") {
      compatNotes.push("Sodick uses standard G-code with proprietary M-codes for adaptive functions");
      compatNotes.push("Sodick LN-series controller is Windows-based — USB program transfer");
    } else if (controller === "Makino") {
      compatNotes.push("Makino Hyper-i controller uses proprietary format for HyperCut technology");
      compatNotes.push("Standard G-code accepted but loses HyperCut optimization");
    } else if (controller === "Mitsubishi") {
      compatNotes.push("D-CUBES controller uses standard G-code with Mitsubishi-specific tech tables");
      compatNotes.push("Built-in material/wire technology database reduces programming effort");
    } else if (controller === "AgieCharmilles") {
      compatNotes.push("AgieCharmilles uses AC CAM post for full IPG integration");
      compatNotes.push("POWER-EXPERT and TAPER-EXPERT require native post processor");
    } else if (controller === "Accutex") {
      compatNotes.push("Open-architecture Windows CNC — accepts standard G-code readily");
      compatNotes.push("Compatible with most CAM system WEDM posts with minor customization");
    }

    return {
      controller,
      features: data.features,
      strengths: data.strengths,
      limitations: data.limitations,
      compatibility_notes: compatNotes,
    };
  }

  // ==========================================================================
  // ACTION: full_selection (combined MS3+MS4 pipeline)
  // ==========================================================================

  fullSelection(input: FullSelectionInput): FullSelectionResult {
    // MS3: Material assessment
    const materialAssessment = this.assessMaterial({
      material: input.material,
      heat_treat_state: input.heat_treat_state,
      hardness_hrc: input.hardness_hrc,
      thickness_mm: input.part_z_mm,
    });

    // MS4 U01: Machine selection
    const machineSelection = this.selectMachine({
      part_x_mm: input.part_x_mm,
      part_y_mm: input.part_y_mm,
      part_z_mm: input.part_z_mm,
      part_weight_kg: input.part_weight_kg,
      material: input.material,
      min_corner_radius_mm: input.min_corner_radius_mm,
      taper_required_deg: input.taper_required_deg,
      preferred_controller: input.preferred_controller,
    });

    // MS4 U03: Wire diameter optimization (before wire selection — feeds into it)
    const wireDiameterOpt = this.optimizeWireDiameter(input.min_corner_radius_mm, input.part_z_mm);

    // MS4 U02: Wire type selection
    const wireSelection = this.selectWire({
      material: input.material,
      thickness_mm: input.part_z_mm,
      min_corner_radius_mm: input.min_corner_radius_mm,
      target_surface_finish_Ra_um: input.target_surface_finish_Ra_um,
      priority: input.priority,
    });

    // MS4 U04: Wire tension
    const dischargeLevel = input.target_surface_finish_Ra_um && input.target_surface_finish_Ra_um < 0.5
      ? "low" as const
      : input.target_surface_finish_Ra_um && input.target_surface_finish_Ra_um > 2.0
        ? "high" as const
        : "medium" as const;

    const wireTension = this.calculateTension(
      wireSelection.recommended_wire,
      input.part_z_mm,
      dischargeLevel,
    );

    // MS4 U05: Wire cost
    const numPasses = input.target_surface_finish_Ra_um && input.target_surface_finish_Ra_um < 0.5 ? 5
      : input.target_surface_finish_Ra_um && input.target_surface_finish_Ra_um < 1.0 ? 4
      : 3;

    const wireCost = this.estimateWireCost(
      wireSelection.recommended_wire,
      input.cut_length_mm,
      input.part_z_mm,
      numPasses,
      input.num_parts || 1,
    );

    // MS4 U06: Controller mapping (use top machine's controller)
    const topMachine = machineSelection.recommended_machines[0];
    const controllerBrand = topMachine
      ? (MACHINE_DB.find(m => `${m.manufacturer} ${m.model}` === topMachine.model)?.controller || "Fanuc")
      : "Fanuc";
    const controllerMap = this.mapController(controllerBrand);

    // Summary
    const summary: string[] = [];
    summary.push(`Material: ${materialAssessment.material_key} — Class ${materialAssessment.machinability_class} (${materialAssessment.class_description})`);
    if (topMachine) {
      summary.push(`Machine: ${topMachine.model} (score: ${topMachine.score})`);
    }
    summary.push(`Wire: ${wireSelection.recommended_wire} (${wireSelection.diameter_mm}mm ${wireSelection.wire_type})`);
    summary.push(`Tension: ${wireTension.optimal_tension_N}N (${wireTension.tension_pct_of_uts}% UTS) — break risk: ${wireTension.break_risk}`);
    summary.push(`Wire cost: $${wireCost.cost_usd} (${wireCost.wire_consumed_m}m consumed, ${wireCost.wire_consumed_kg}kg)`);
    summary.push(`Recast risk: ${materialAssessment.recast.risk_level} (${materialAssessment.recast.crack_probability_pct}% crack probability)`);
    if (materialAssessment.warnings.length > 0) {
      summary.push(`Warnings: ${materialAssessment.warnings.join("; ")}`);
    }

    return {
      material_assessment: materialAssessment,
      machine_selection: machineSelection,
      wire_selection: wireSelection,
      wire_diameter_optimization: wireDiameterOpt,
      wire_tension: wireTension,
      wire_cost: wireCost,
      controller_map: controllerMap,
      summary,
    };
  }

  // ==========================================================================
  // ACTION DISPATCHER
  // ==========================================================================

  execute(action: string, params: Record<string, unknown>): unknown {
    switch (action) {
      case "assess_material":
        return this.assessMaterial(params as unknown as MaterialAssessmentInput);

      case "select_machine":
        return this.selectMachine(params as unknown as MachineSelectionInput);

      case "select_wire":
        return this.selectWire(params as unknown as WireSelectionInput);

      case "optimize_wire_diameter":
        return this.optimizeWireDiameter(
          params.min_corner_radius_mm as number,
          params.thickness_mm as number,
        );

      case "calculate_tension":
        return this.calculateTension(
          params.wire_key as string,
          params.thickness_mm as number,
          (params.discharge_energy as "low" | "medium" | "high") || "medium",
        );

      case "estimate_wire_cost":
        return this.estimateWireCost(
          params.wire_key as string,
          params.cut_length_mm as number,
          params.thickness_mm as number,
          (params.num_passes as number) || 4,
          (params.num_parts as number) || 1,
        );

      case "map_controller":
        return this.mapController(params.controller as ControllerBrand);

      case "full_selection":
        return this.fullSelection(params as unknown as FullSelectionInput);

      default:
        return {
          error: `Unknown action: ${action}`,
          available_actions: [
            "assess_material", "select_machine", "select_wire",
            "optimize_wire_diameter", "calculate_tension", "estimate_wire_cost",
            "map_controller", "full_selection",
          ],
        };
    }
  }

  /** Look up UV travel limits for a machine by model name or manufacturer.
   *  UV travel is derived from max_taper_deg and guide_distance.
   *  @param input.machine - Machine model name or partial match
   *  @param input.guide_distance_mm - Guide distance in mm (default: 60)
   */
  getUvTravel(input: { machine?: string; guide_distance_mm?: number }): {
    machines: Array<{
      model: string;
      manufacturer: string;
      has_uv_axis: boolean;
      max_taper_deg: number;
      uv_travel_mm: number;
      x_travel_mm: number;
      y_travel_mm: number;
      z_travel_mm: number;
    }>;
  } {
    const guideDist = input.guide_distance_mm ?? 60;
    const query = (input.machine ?? "").toLowerCase();
    const matches = query
      ? MACHINE_DB.filter(m =>
          m.model.toLowerCase().includes(query) ||
          m.manufacturer.toLowerCase().includes(query))
      : MACHINE_DB;

    return {
      machines: matches.map(m => ({
        model: `${m.manufacturer} ${m.model}`,
        manufacturer: m.manufacturer,
        has_uv_axis: m.uv_axis,
        max_taper_deg: m.max_taper_deg,
        uv_travel_mm: m.uv_axis
          ? Math.round(guideDist * Math.tan(m.max_taper_deg * Math.PI / 180) * 1000) / 1000
          : 0,
        x_travel_mm: m.x_travel_mm,
        y_travel_mm: m.y_travel_mm,
        z_travel_mm: m.z_travel_mm,
      })),
    };
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const edmMaterialMachineWireEngine = new EDMMaterialMachineWireEngine();
