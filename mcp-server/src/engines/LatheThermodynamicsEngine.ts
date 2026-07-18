/**
 * LatheThermodynamicsEngine — Comprehensive Thermal Phenomena in Lathe Cutting
 * =============================================================================
 *
 * Models all thermal aspects of turning/lathe operations:
 *
 *   1. Heat Generation
 *      - Primary shear zone heat (plastic deformation)
 *      - Secondary shear zone heat (chip-tool friction)
 *      - Tertiary zone heat (tool-workpiece rubbing)
 *      - Total cutting heat: Q = Fc * Vc (nearly all energy becomes heat)
 *
 *   2. Heat Partition
 *      - Chip carries 60-80% (higher at high speeds)
 *      - Tool absorbs 10-20%
 *      - Workpiece receives 5-20%
 *      - Coolant removes variable amount
 *      - Partition coefficient: R = sqrt(kρcp)_chip / sqrt(kρcp)_work
 *
 *   3. Temperature Distribution
 *      - Jaeger moving heat source solution
 *      - Maximum tool-chip interface temperature
 *      - Tool flank temperature
 *      - Workpiece surface temperature
 *      - Subsurface temperature gradient (depth vs temperature)
 *
 *   4. Thermal Effects on Materials
 *      - Thermal softening (Johnson-Cook T* term)
 *      - Phase transformation thresholds (Ac1, Ac3)
 *      - Tempering of hardened steels (>300C)
 *      - White layer formation (>Ac1, rapid quench)
 *      - Oxide layer formation (surface discoloration)
 *
 *   5. Thermal Effects on Tools
 *      - Coating breakdown temperatures
 *      - Diffusion wear acceleration (Arrhenius)
 *      - Thermal shock (interrupted cutting)
 *      - Thermal fatigue crack formation
 *
 *   6. Coolant Thermodynamics
 *      - Heat removal rate: Q = m_dot * cp * deltaT
 *      - Film boiling threshold (Leidenfrost effect)
 *      - Coolant penetration effectiveness
 *      - High-pressure coolant (HPC) modeling
 *      - Cryogenic cooling (LN2, CO2)
 *
 *   7. Thermal Distortion
 *      - Spindle growth prediction
 *      - Workpiece thermal expansion
 *      - Tool holder expansion
 *      - Compensation strategies
 *
 * Key References:
 * - Loewen, E.G. & Shaw, M.C. (1954). "On the Analysis of Cutting-Tool Temperatures"
 * - Jaeger, J.C. (1942). "Moving Sources of Heat and Temperature at Sliding Contacts"
 * - Komanduri, R. & Hou, Z.B. (2001). "Thermal Modeling of the Metal Cutting Process"
 * - Trent, E.M. & Wright, P.K. (2000). "Metal Cutting", Ch. 5 (Temperature)
 * - Sandvik Coromant (2024). "Thermal Load Application Guide"
 * - Shaw, M.C. (2005). "Metal Cutting Principles", Ch. 9
 *
 * @module engines/LatheThermodynamicsEngine
 * @version 1.0.0
 */

import { resolveMaterial, type MaterialPhysics } from "../physics/constants.js";
import { log } from "../utils/Logger.js";

// ============================================================================
// TYPES
// ============================================================================

/** Atomic value with uncertainty and source traceability */
export interface AtomicValue {
  value: number;
  unit: string;
  uncertainty: number;
  source: string;
  warning?: string;
}

/** Cutting parameters for thermal analysis */
export interface CuttingParameters {
  /** Cutting speed [m/min] */
  cutting_speed_m_min: number;
  /** Feed rate [mm/rev] */
  feed_mm_rev: number;
  /** Depth of cut [mm] */
  depth_of_cut_mm: number;
  /** Cutting force [N] — if known, otherwise estimated */
  cutting_force_N?: number;
  /** Thrust force [N] */
  thrust_force_N?: number;
  /** Feed force [N] */
  feed_force_N?: number;
}

/** Tool geometry for thermal calculations */
export interface ToolGeometry {
  /** Tool nose radius [mm] */
  nose_radius_mm: number;
  /** Rake angle [degrees] */
  rake_angle_deg: number;
  /** Clearance angle [degrees] */
  clearance_angle_deg: number;
  /** Insert thickness [mm] */
  insert_thickness_mm?: number;
  /** Tool holder overhang [mm] */
  overhang_mm?: number;
  /** Chip contact length [mm] — if known */
  chip_contact_length_mm?: number;
}

/** Tool coating specification */
export type ToolCoating =
  | "uncoated"
  | "TiN"
  | "TiCN"
  | "TiAlN"
  | "AlTiN"
  | "AlCrN"
  | "Al2O3"
  | "CVD_diamond"
  | "PCD"
  | "CBN";

/** Tool substrate material */
export type ToolSubstrate =
  | "carbide_P10"
  | "carbide_P20"
  | "carbide_P30"
  | "carbide_K10"
  | "carbide_K20"
  | "cermet"
  | "ceramic_Al2O3"
  | "ceramic_Si3N4"
  | "CBN"
  | "PCD"
  | "HSS";

/** Coolant type */
export type CoolantType =
  | "dry"
  | "air_blast"
  | "mist"
  | "mql"
  | "flood"
  | "through_tool"
  | "high_pressure"
  | "cryogenic_LN2"
  | "cryogenic_CO2";

/** Coolant properties */
export interface CoolantProperties {
  type: CoolantType;
  /** Flow rate [L/min] for liquid coolants */
  flow_rate_L_min?: number;
  /** Pressure [bar] for HPC */
  pressure_bar?: number;
  /** Temperature [C] */
  temperature_C?: number;
  /** Concentration [%] for water-soluble */
  concentration_pct?: number;
  /** Coolant specific heat [J/(kg·K)] */
  cp_J_kgK?: number;
  /** Coolant density [kg/m3] */
  density_kg_m3?: number;
}

/** Material specification for thermal analysis */
export interface MaterialSpec {
  /** Material identifier (from CANONICAL_MATERIAL_DB or custom) */
  material_id: string;
  /** Override thermal conductivity [W/(m·K)] */
  k_thermal_override?: number;
  /** Override specific heat [J/(kg·K)] */
  cp_override?: number;
  /** Override density [kg/m3] */
  density_override?: number;
  /** Initial temperature [C] */
  initial_temp_C?: number;
  /** Hardness [HRC] */
  hardness_HRC?: number;
  /** Phase transformation temperature Ac1 [C] */
  Ac1_C?: number;
  /** Phase transformation temperature Ac3 [C] */
  Ac3_C?: number;
}

// ============================================================================
// HEAT GENERATION RESULTS
// ============================================================================

/** Heat generation analysis result */
export interface HeatGenerationResult {
  /** Total cutting power [W] */
  total_power_W: AtomicValue;
  /** Total heat generated [W] — nearly equal to total power */
  total_heat_W: AtomicValue;
  /** Primary shear zone heat [W] */
  primary_shear_heat_W: AtomicValue;
  /** Secondary shear zone heat (chip-tool friction) [W] */
  secondary_shear_heat_W: AtomicValue;
  /** Tertiary zone heat (flank rubbing) [W] */
  tertiary_rubbing_heat_W: AtomicValue;
  /** Heat flux at tool-chip interface [W/mm2] */
  heat_flux_W_mm2: AtomicValue;
  /** Specific cutting energy [J/mm3] */
  specific_energy_J_mm3: AtomicValue;
  /** Material removal rate [mm3/min] */
  mrr_mm3_min: AtomicValue;
  /** Energy efficiency (useful work / total power) */
  efficiency_pct: AtomicValue;
  /** Breakdown of heat sources */
  heat_breakdown: {
    primary_pct: number;
    secondary_pct: number;
    tertiary_pct: number;
  };
  warnings: string[];
}

// ============================================================================
// HEAT PARTITION RESULTS
// ============================================================================

/** Heat partition analysis result */
export interface HeatPartitionResult {
  /** Heat to chip [%] */
  chip_fraction_pct: AtomicValue;
  /** Heat to tool [%] */
  tool_fraction_pct: AtomicValue;
  /** Heat to workpiece [%] */
  workpiece_fraction_pct: AtomicValue;
  /** Heat removed by coolant [%] */
  coolant_fraction_pct: AtomicValue;
  /** Absolute heat to chip [W] */
  heat_to_chip_W: AtomicValue;
  /** Absolute heat to tool [W] */
  heat_to_tool_W: AtomicValue;
  /** Absolute heat to workpiece [W] */
  heat_to_workpiece_W: AtomicValue;
  /** Absolute heat removed by coolant [W] */
  heat_removed_coolant_W: AtomicValue;
  /** Partition coefficient R (chip/work effusivity ratio) */
  partition_coefficient_R: AtomicValue;
  /** Peclet number (speed-based heat conduction regime) */
  peclet_number: AtomicValue;
  /** Temperature regime */
  regime: "conduction_dominant" | "convection_dominant" | "mixed";
  /** Partitioning model used */
  model: string;
  recommendations: string[];
  warnings: string[];
}

// ============================================================================
// TEMPERATURE DISTRIBUTION RESULTS
// ============================================================================

/** Temperature distribution analysis result */
export interface TemperatureDistributionResult {
  /** Maximum tool-chip interface temperature [C] */
  max_interface_temp_C: AtomicValue;
  /** Average tool-chip interface temperature [C] */
  avg_interface_temp_C: AtomicValue;
  /** Tool rake face temperature [C] */
  rake_face_temp_C: AtomicValue;
  /** Tool flank face temperature [C] */
  flank_face_temp_C: AtomicValue;
  /** Tool substrate temperature (below coating) [C] */
  substrate_temp_C: AtomicValue;
  /** Chip temperature (bulk) [C] */
  chip_bulk_temp_C: AtomicValue;
  /** Workpiece surface temperature [C] */
  workpiece_surface_temp_C: AtomicValue;
  /** Temperature gradient into workpiece [C/mm] */
  workpiece_gradient_C_mm: AtomicValue;
  /** Depth of heat affected zone [mm] */
  haz_depth_mm: AtomicValue;
  /** Temperature at specific depths below surface */
  subsurface_profile: SubsurfaceTemperature[];
  /** Thermal penetration depth (time-dependent) [mm] */
  thermal_penetration_mm: AtomicValue;
  /** Model used (Jaeger, Loewen-Shaw, FEM approximation) */
  model: string;
  warnings: string[];
}

/** Subsurface temperature profile point */
export interface SubsurfaceTemperature {
  depth_mm: number;
  temperature_C: number;
  cooling_rate_C_s?: number;
}

// ============================================================================
// THERMAL DAMAGE ASSESSMENT
// ============================================================================

/** Thermal damage assessment result */
export interface ThermalDamageResult {
  /** Overall thermal damage risk [0-100] */
  damage_risk_score: AtomicValue;
  /** Risk category */
  risk_category: "negligible" | "low" | "moderate" | "high" | "critical";
  /** Material thermal effects */
  material_effects: {
    /** Is thermal softening significant? */
    thermal_softening_active: boolean;
    /** Softening factor (0-1, 1 = full strength) */
    softening_factor: number;
    /** Temperature relative to melting */
    homologous_temperature: number;
    /** Risk of phase transformation */
    phase_transformation_risk: boolean;
    /** Distance to Ac1 [C] */
    margin_to_Ac1_C?: number;
    /** Tempering risk for hardened steels */
    tempering_risk: boolean;
    /** Predicted hardness loss [HRC] */
    hardness_loss_HRC?: number;
    /** White layer formation risk */
    white_layer_risk: boolean;
    /** Predicted white layer depth [um] */
    white_layer_depth_um?: number;
    /** Oxide layer (discoloration) risk */
    oxide_formation_risk: boolean;
    /** Predicted oxide thickness [um] */
    oxide_thickness_um?: number;
  };
  /** Tool thermal effects */
  tool_effects: {
    /** Is coating at risk? */
    coating_at_risk: boolean;
    /** Margin to coating limit [C] */
    coating_margin_C: number;
    /** Coating degradation rate [relative] */
    coating_degradation_rate: number;
    /** Diffusion wear active? */
    diffusion_wear_active: boolean;
    /** Diffusion acceleration factor */
    diffusion_factor: number;
    /** Thermal shock risk (interrupted cutting) */
    thermal_shock_risk: boolean;
    /** Thermal fatigue risk */
    thermal_fatigue_risk: boolean;
    /** Predicted thermal crack depth [um] */
    thermal_crack_depth_um?: number;
  };
  /** Detailed assessments */
  assessments: ThermalAssessment[];
  recommendations: string[];
  warnings: string[];
}

/** Individual thermal assessment */
export interface ThermalAssessment {
  effect: string;
  severity: "none" | "minor" | "moderate" | "severe" | "critical";
  temperature_C: number;
  threshold_C: number;
  margin_C: number;
  description: string;
  mitigation?: string;
}

// ============================================================================
// COOLANT OPTIMIZATION RESULTS
// ============================================================================

/** Coolant optimization result */
export interface CoolantOptimizationResult {
  /** Recommended coolant type */
  recommended_type: CoolantType;
  /** Confidence in recommendation [%] */
  confidence_pct: AtomicValue;
  /** Heat removal capacity [W] */
  heat_removal_W: AtomicValue;
  /** Temperature reduction achieved [C] */
  temp_reduction_C: AtomicValue;
  /** New interface temperature with coolant [C] */
  new_interface_temp_C: AtomicValue;
  /** Coolant effectiveness [%] */
  coolant_effectiveness_pct: AtomicValue;
  /** Optimal parameters */
  optimal_params: {
    flow_rate_L_min?: number;
    pressure_bar?: number;
    nozzle_angle_deg?: number;
    nozzle_distance_mm?: number;
  };
  /** Film boiling risk */
  film_boiling_risk: boolean;
  /** Leidenfrost temperature [C] */
  leidenfrost_temp_C?: number;
  /** Penetration into cut zone [%] */
  penetration_pct: AtomicValue;
  /** Cost effectiveness [relative rating 1-10] */
  cost_effectiveness: number;
  /** Environmental impact [relative rating 1-10] */
  environmental_impact: number;
  /** Alternatives considered */
  alternatives: CoolantAlternative[];
  recommendations: string[];
}

/** Coolant alternative comparison */
export interface CoolantAlternative {
  type: CoolantType;
  effectiveness_pct: number;
  temp_reduction_C: number;
  cost_factor: number;
  environmental_factor: number;
  notes: string;
}

// ============================================================================
// THERMAL DISTORTION RESULTS
// ============================================================================

/** Thermal distortion prediction result */
export interface ThermalDistortionResult {
  /** Total dimensional error [um] */
  total_error_um: AtomicValue;
  /** Spindle thermal growth [um] */
  spindle_growth_um: AtomicValue;
  /** Workpiece expansion [um] */
  workpiece_expansion_um: AtomicValue;
  /** Tool holder expansion [um] */
  toolholder_expansion_um: AtomicValue;
  /** Chuck jaw expansion [um] */
  chuck_expansion_um: AtomicValue;
  /** Time to thermal equilibrium [min] */
  equilibrium_time_min: AtomicValue;
  /** Worst-case error direction */
  worst_direction: "radial" | "axial" | "combined";
  /** Error components by axis */
  axis_errors: {
    X_radial_um: number;
    Z_axial_um: number;
  };
  /** Compensation strategy */
  compensation: {
    strategy: "none" | "warmup" | "adaptive" | "probing" | "model_based";
    recommended_warmup_min?: number;
    offset_adjustment_um?: number;
    probe_interval_parts?: number;
  };
  /** Transient analysis over time */
  transient_profile?: ThermalTransient[];
  recommendations: string[];
}

/** Thermal transient point */
export interface ThermalTransient {
  time_min: number;
  spindle_growth_um: number;
  workpiece_temp_C: number;
  total_error_um: number;
}

// ============================================================================
// FULL THERMAL ANALYSIS RESULT
// ============================================================================

/** Complete thermal analysis result */
export interface ThermalAnalysisResult {
  /** Heat generation analysis */
  heat_generation: HeatGenerationResult;
  /** Heat partition analysis */
  heat_partition: HeatPartitionResult;
  /** Temperature distribution */
  temperature_distribution: TemperatureDistributionResult;
  /** Thermal damage assessment */
  thermal_damage: ThermalDamageResult;
  /** Coolant recommendations */
  coolant_optimization?: CoolantOptimizationResult;
  /** Thermal distortion prediction */
  thermal_distortion?: ThermalDistortionResult;
  /** Summary metrics */
  summary: {
    max_temperature_C: number;
    damage_risk_score: number;
    tool_life_factor: number;
    quality_risk: "low" | "moderate" | "high";
    productivity_impact: "none" | "minor" | "significant" | "severe";
  };
  /** Overall recommendations */
  recommendations: string[];
  /** All warnings collected */
  warnings: string[];
  /** Calculation metadata */
  metadata: {
    model_version: string;
    calculation_time_ms: number;
    assumptions: string[];
  };
}

// ============================================================================
// COATING THERMAL LIMITS DATABASE
// ============================================================================

/**
 * Tool coating maximum service temperatures and properties.
 * Sources: Sandvik Coromant, Kennametal, Mitsubishi Materials
 */
interface CoatingProperties {
  /** Maximum continuous service temperature [C] */
  max_temp_C: number;
  /** Peak (short-term) temperature limit [C] */
  peak_temp_C: number;
  /** Thermal conductivity [W/(m·K)] */
  k_thermal: number;
  /** Coating thickness [um] */
  typical_thickness_um: number;
  /** Oxidation resistance rating [1-5] */
  oxidation_resistance: number;
  /** Thermal shock resistance [1-5] */
  thermal_shock_resistance: number;
  /** Diffusion barrier effectiveness [1-5] */
  diffusion_barrier: number;
  /** Friction coefficient (dry) */
  friction_coefficient: number;
  /** Best for materials */
  best_for: string[];
}

const COATING_DATABASE: Record<ToolCoating, CoatingProperties> = {
  uncoated: {
    max_temp_C: 400,
    peak_temp_C: 500,
    k_thermal: 80, // Carbide substrate
    typical_thickness_um: 0,
    oxidation_resistance: 1,
    thermal_shock_resistance: 5,
    diffusion_barrier: 1,
    friction_coefficient: 0.6,
    best_for: ["aluminum", "brass", "copper"],
  },
  TiN: {
    max_temp_C: 550,
    peak_temp_C: 650,
    k_thermal: 20,
    typical_thickness_um: 3,
    oxidation_resistance: 3,
    thermal_shock_resistance: 4,
    diffusion_barrier: 3,
    friction_coefficient: 0.4,
    best_for: ["steel", "cast_iron"],
  },
  TiCN: {
    max_temp_C: 650,
    peak_temp_C: 750,
    k_thermal: 25,
    typical_thickness_um: 4,
    oxidation_resistance: 3,
    thermal_shock_resistance: 3,
    diffusion_barrier: 4,
    friction_coefficient: 0.35,
    best_for: ["steel", "stainless", "cast_iron"],
  },
  TiAlN: {
    max_temp_C: 800,
    peak_temp_C: 900,
    k_thermal: 5,
    typical_thickness_um: 4,
    oxidation_resistance: 5,
    thermal_shock_resistance: 3,
    diffusion_barrier: 5,
    friction_coefficient: 0.35,
    best_for: ["steel", "stainless", "titanium", "hardened"],
  },
  AlTiN: {
    max_temp_C: 900,
    peak_temp_C: 1000,
    k_thermal: 4,
    typical_thickness_um: 4,
    oxidation_resistance: 5,
    thermal_shock_resistance: 2,
    diffusion_barrier: 5,
    friction_coefficient: 0.3,
    best_for: ["hardened", "high_speed"],
  },
  AlCrN: {
    max_temp_C: 1100,
    peak_temp_C: 1200,
    k_thermal: 4,
    typical_thickness_um: 3,
    oxidation_resistance: 5,
    thermal_shock_resistance: 3,
    diffusion_barrier: 5,
    friction_coefficient: 0.35,
    best_for: ["hardened", "nickel_alloys", "high_speed"],
  },
  Al2O3: {
    max_temp_C: 1200,
    peak_temp_C: 1400,
    k_thermal: 30,
    typical_thickness_um: 8,
    oxidation_resistance: 5,
    thermal_shock_resistance: 2,
    diffusion_barrier: 5,
    friction_coefficient: 0.3,
    best_for: ["steel", "cast_iron", "high_speed"],
  },
  CVD_diamond: {
    max_temp_C: 600,
    peak_temp_C: 700,
    k_thermal: 1500,
    typical_thickness_um: 20,
    oxidation_resistance: 1,
    thermal_shock_resistance: 1,
    diffusion_barrier: 5,
    friction_coefficient: 0.1,
    best_for: ["aluminum", "composites", "graphite"],
  },
  PCD: {
    max_temp_C: 700,
    peak_temp_C: 750,
    k_thermal: 600,
    typical_thickness_um: 500,
    oxidation_resistance: 2,
    thermal_shock_resistance: 2,
    diffusion_barrier: 5,
    friction_coefficient: 0.08,
    best_for: ["aluminum", "composites", "copper"],
  },
  CBN: {
    max_temp_C: 1200,
    peak_temp_C: 1400,
    k_thermal: 100,
    typical_thickness_um: 2000,
    oxidation_resistance: 4,
    thermal_shock_resistance: 3,
    diffusion_barrier: 4,
    friction_coefficient: 0.2,
    best_for: ["hardened_steel", "cast_iron", "nickel_alloys"],
  },
};

// ============================================================================
// SUBSTRATE THERMAL PROPERTIES
// ============================================================================

interface SubstrateProperties {
  /** Thermal conductivity [W/(m·K)] */
  k_thermal: number;
  /** Specific heat [J/(kg·K)] */
  cp: number;
  /** Density [kg/m3] */
  density: number;
  /** Max service temperature [C] */
  max_temp_C: number;
  /** Thermal expansion coefficient [1e-6/K] */
  alpha: number;
  /** Elastic modulus [GPa] */
  E_GPa: number;
}

const SUBSTRATE_DATABASE: Record<ToolSubstrate, SubstrateProperties> = {
  carbide_P10: {
    k_thermal: 80,
    cp: 200,
    density: 14500,
    max_temp_C: 1000,
    alpha: 5.5,
    E_GPa: 620,
  },
  carbide_P20: {
    k_thermal: 70,
    cp: 210,
    density: 13800,
    max_temp_C: 950,
    alpha: 5.8,
    E_GPa: 590,
  },
  carbide_P30: {
    k_thermal: 60,
    cp: 220,
    density: 13200,
    max_temp_C: 900,
    alpha: 6.0,
    E_GPa: 560,
  },
  carbide_K10: {
    k_thermal: 100,
    cp: 180,
    density: 15200,
    max_temp_C: 1000,
    alpha: 5.0,
    E_GPa: 650,
  },
  carbide_K20: {
    k_thermal: 85,
    cp: 190,
    density: 14600,
    max_temp_C: 950,
    alpha: 5.3,
    E_GPa: 620,
  },
  cermet: {
    k_thermal: 15,
    cp: 500,
    density: 6500,
    max_temp_C: 1100,
    alpha: 8.0,
    E_GPa: 400,
  },
  ceramic_Al2O3: {
    k_thermal: 30,
    cp: 800,
    density: 3900,
    max_temp_C: 1400,
    alpha: 8.0,
    E_GPa: 380,
  },
  ceramic_Si3N4: {
    k_thermal: 25,
    cp: 700,
    density: 3200,
    max_temp_C: 1200,
    alpha: 3.2,
    E_GPa: 310,
  },
  CBN: {
    k_thermal: 100,
    cp: 800,
    density: 3500,
    max_temp_C: 1400,
    alpha: 4.0,
    E_GPa: 700,
  },
  PCD: {
    k_thermal: 600,
    cp: 520,
    density: 3500,
    max_temp_C: 700,
    alpha: 2.0,
    E_GPa: 800,
  },
  HSS: {
    k_thermal: 25,
    cp: 420,
    density: 8000,
    max_temp_C: 600,
    alpha: 11.0,
    E_GPa: 230,
  },
};

// ============================================================================
// COOLANT PROPERTIES DATABASE
// ============================================================================

interface CoolantThermalProperties {
  /** Specific heat [J/(kg·K)] */
  cp: number;
  /** Density [kg/m3] */
  density: number;
  /** Thermal conductivity [W/(m·K)] */
  k_thermal: number;
  /** Boiling point [C] */
  boiling_point_C: number;
  /** Typical heat transfer coefficient [W/(m2·K)] */
  h_typical: number;
  /** Temperature reduction factor (multiplier) */
  temp_reduction_factor: number;
  /** Penetration effectiveness [0-1] */
  penetration_factor: number;
  /** Cost factor [relative] */
  cost_factor: number;
  /** Environmental factor [1=good, 5=poor] */
  environmental_factor: number;
}

const COOLANT_DATABASE: Record<CoolantType, CoolantThermalProperties> = {
  dry: {
    cp: 1000,
    density: 1.2,
    k_thermal: 0.025,
    boiling_point_C: -1,
    h_typical: 10,
    temp_reduction_factor: 1.0,
    penetration_factor: 0,
    cost_factor: 0,
    environmental_factor: 1,
  },
  air_blast: {
    cp: 1000,
    density: 1.2,
    k_thermal: 0.025,
    boiling_point_C: -1,
    h_typical: 100,
    temp_reduction_factor: 0.92,
    penetration_factor: 0.2,
    cost_factor: 0.1,
    environmental_factor: 1,
  },
  mist: {
    cp: 2000,
    density: 50,
    k_thermal: 0.1,
    boiling_point_C: 100,
    h_typical: 500,
    temp_reduction_factor: 0.80,
    penetration_factor: 0.4,
    cost_factor: 0.5,
    environmental_factor: 2,
  },
  mql: {
    cp: 2000,
    density: 900,
    k_thermal: 0.15,
    boiling_point_C: 200,
    h_typical: 800,
    temp_reduction_factor: 0.85,
    penetration_factor: 0.5,
    cost_factor: 0.8,
    environmental_factor: 2,
  },
  flood: {
    cp: 3800,
    density: 1000,
    k_thermal: 0.6,
    boiling_point_C: 100,
    h_typical: 5000,
    temp_reduction_factor: 0.65,
    penetration_factor: 0.7,
    cost_factor: 1.0,
    environmental_factor: 3,
  },
  through_tool: {
    cp: 3800,
    density: 1000,
    k_thermal: 0.6,
    boiling_point_C: 100,
    h_typical: 10000,
    temp_reduction_factor: 0.55,
    penetration_factor: 0.9,
    cost_factor: 1.5,
    environmental_factor: 3,
  },
  high_pressure: {
    cp: 3800,
    density: 1000,
    k_thermal: 0.6,
    boiling_point_C: 100,
    h_typical: 20000,
    temp_reduction_factor: 0.45,
    penetration_factor: 0.95,
    cost_factor: 2.0,
    environmental_factor: 3,
  },
  cryogenic_LN2: {
    cp: 2000,
    density: 808,
    k_thermal: 0.14,
    boiling_point_C: -196,
    h_typical: 50000,
    temp_reduction_factor: 0.30,
    penetration_factor: 0.6,
    cost_factor: 5.0,
    environmental_factor: 1,
  },
  cryogenic_CO2: {
    cp: 850,
    density: 1100,
    k_thermal: 0.015,
    boiling_point_C: -78,
    h_typical: 30000,
    temp_reduction_factor: 0.40,
    penetration_factor: 0.7,
    cost_factor: 3.0,
    environmental_factor: 1,
  },
};

// ============================================================================
// PHASE TRANSFORMATION DATA (STEELS)
// ============================================================================

interface PhaseTransformationData {
  /** Lower critical temperature Ac1 [C] */
  Ac1_C: number;
  /** Upper critical temperature Ac3 [C] */
  Ac3_C: number;
  /** Martensite start temperature Ms [C] */
  Ms_C: number;
  /** Tempering threshold (significant softening) [C] */
  tempering_threshold_C: number;
  /** White layer formation threshold [C] — Ac1 + rapid quench */
  white_layer_threshold_C: number;
  /** Oxidation start (visible coloring) [C] */
  oxidation_start_C: number;
}

const PHASE_TRANSFORMATION_DB: Record<string, PhaseTransformationData> = {
  // Carbon steels
  steel: {
    Ac1_C: 727,
    Ac3_C: 850,
    Ms_C: 350,
    tempering_threshold_C: 200,
    white_layer_threshold_C: 750,
    oxidation_start_C: 250,
  },
  alloy_steel: {
    Ac1_C: 740,
    Ac3_C: 820,
    Ms_C: 320,
    tempering_threshold_C: 220,
    white_layer_threshold_C: 760,
    oxidation_start_C: 280,
  },
  tool_steel: {
    Ac1_C: 800,
    Ac3_C: 870,
    Ms_C: 250,
    tempering_threshold_C: 180,
    white_layer_threshold_C: 820,
    oxidation_start_C: 300,
  },
  hardened_steel: {
    Ac1_C: 760,
    Ac3_C: 840,
    Ms_C: 220,
    tempering_threshold_C: 150,
    white_layer_threshold_C: 780,
    oxidation_start_C: 280,
  },
  stainless_304: {
    Ac1_C: 850,
    Ac3_C: 950,
    Ms_C: -100, // Austenitic, no martensite
    tempering_threshold_C: 500,
    white_layer_threshold_C: 900,
    oxidation_start_C: 350,
  },
  stainless_316: {
    Ac1_C: 850,
    Ac3_C: 950,
    Ms_C: -150,
    tempering_threshold_C: 520,
    white_layer_threshold_C: 900,
    oxidation_start_C: 350,
  },
  titanium_gr5: {
    Ac1_C: 980, // Beta transus
    Ac3_C: 1050,
    Ms_C: 850,
    tempering_threshold_C: 400,
    white_layer_threshold_C: 1000,
    oxidation_start_C: 200,
  },
  inconel_718: {
    Ac1_C: 1000,
    Ac3_C: 1150,
    Ms_C: 0, // Complex precipitation
    tempering_threshold_C: 600,
    white_layer_threshold_C: 1050,
    oxidation_start_C: 400,
  },
  aluminum_6061: {
    Ac1_C: 580, // Solidus
    Ac3_C: 650, // Liquidus
    Ms_C: 0, // No phase transformation
    tempering_threshold_C: 170, // T6 temper loss
    white_layer_threshold_C: 600,
    oxidation_start_C: 400,
  },
  aluminum_7075: {
    Ac1_C: 480,
    Ac3_C: 630,
    Ms_C: 0,
    tempering_threshold_C: 120, // T6 temper sensitive
    white_layer_threshold_C: 500,
    oxidation_start_C: 400,
  },
};

// ============================================================================
// ENGINE IMPLEMENTATION
// ============================================================================

export class LatheThermodynamicsEngine {
  private static readonly VERSION = "1.0.0";
  private static readonly DEFAULT_AMBIENT_TEMP_C = 20;

  // ========================================================================
  // HELPER FUNCTIONS
  // ========================================================================

  /**
   * Create an AtomicValue with proper typing
   */
  private av(
    value: number,
    unit: string,
    uncertainty: number,
    source: string,
    warning?: string
  ): AtomicValue {
    return {
      value: this.round(value, 4),
      unit,
      uncertainty: this.round(uncertainty, 4),
      source,
      warning,
    };
  }

  /**
   * Round to specified decimal places
   */
  private round(value: number, decimals: number = 2): number {
    const factor = Math.pow(10, decimals);
    return Math.round(value * factor) / factor;
  }

  /**
   * Resolve material properties from ID or use overrides
   */
  private getMaterialProps(spec: MaterialSpec): MaterialPhysics & {
    k_thermal: number;
    cp_J_kgK: number;
    density_kg_m3: number;
    melting_point_C: number;
    initial_temp_C: number;
    Ac1_C?: number;
    Ac3_C?: number;
  } {
    // resolveMaterial returns MaterialEntry | undefined; fall back to "steel"
    // (always present) so downstream property access is safe.
    const base = resolveMaterial(spec.material_id) ?? resolveMaterial("steel")!;
    const phase = PHASE_TRANSFORMATION_DB[spec.material_id];

    // MaterialEntry uses canonical SI names; this engine uses shorthand aliases.
    // Map at the boundary so consumers (line 1300+) can read the aliases directly.
    const k_thermal_canonical = base.thermal_conductivity_W_mK;
    const cp_canonical = base.specific_heat_J_kgK;
    const density_canonical = base.density_kg_m3;
    const melting_canonical = base.melting_point_C;

    return {
      // base is a MaterialEntry (extends MaterialPhysics) — spread it so every
      // MaterialPhysics field (kc1_1, mc, vc_base_*, machinability_factor,
      // E_GPa, sigma_y_MPa, hardness_HB, Vc_typical/Vc_max ...) is carried
      // through with its canonical value; explicit fields below override.
      ...base,
      // MaterialPhysics required fields (kc1_1, mc, taylor_C, taylor_n, iso_group)
      iso_group: base.iso_group,
      kc1_1: base.kc1_1, // canonical Kienzle; thermo path does not use it directly
      mc: base.mc,
      taylor_C: base.taylor_C,
      taylor_n: base.taylor_n,
      // Engine-level shorthands (legacy names mapped from MaterialEntry SI fields)
      k_thermal: spec.k_thermal_override ?? k_thermal_canonical,
      cp_J_kgK: spec.cp_override ?? cp_canonical,
      density_kg_m3: spec.density_override ?? density_canonical,
      melting_point_C: melting_canonical,
      // Optional MaterialPhysics carries from base
      thermal_conductivity_W_mK: k_thermal_canonical,
      specific_heat_J_kgK: cp_canonical,
      hardness_HRC: base.hardness_HRC,
      tensile_strength_MPa: base.tensile_strength_MPa,
      name: base.name,
      // Phase + initial-condition fields owned by the thermo engine
      initial_temp_C: spec.initial_temp_C ?? LatheThermodynamicsEngine.DEFAULT_AMBIENT_TEMP_C,
      Ac1_C: spec.Ac1_C ?? phase?.Ac1_C,
      Ac3_C: spec.Ac3_C ?? phase?.Ac3_C,
    };
  }

  /**
   * Estimate cutting force if not provided using Kienzle model
   * Fc = kc1_1 * ap * f^(1-mc)
   */
  private estimateCuttingForce(
    params: CuttingParameters,
    material: MaterialPhysics
  ): number {
    if (params.cutting_force_N) {
      return params.cutting_force_N;
    }

    const ap = params.depth_of_cut_mm;
    const f = params.feed_mm_rev;
    const kc1_1 = material.kc1_1;
    const mc = material.mc ?? 0.25;

    // Kienzle specific cutting force
    const kc = kc1_1 * Math.pow(f, -mc);

    // Cross-sectional area [mm2]
    const A = ap * f;

    // Cutting force [N]
    const Fc = kc * A;

    return Fc;
  }

  /**
   * Calculate chip contact length using empirical models
   * Lc = f * (1 + tan(alpha)) / cos(alpha) * r_chip
   * Where r_chip = chip compression ratio (typically 2-3)
   */
  private estimateChipContactLength(
    params: CuttingParameters,
    tool: ToolGeometry
  ): number {
    if (tool.chip_contact_length_mm) {
      return tool.chip_contact_length_mm;
    }

    const f = params.feed_mm_rev;
    const alpha_rad = (tool.rake_angle_deg * Math.PI) / 180;

    // Chip compression ratio (empirical)
    const r_chip = 2.5;

    // Contact length model (Zorev, 1963)
    const Lc = f * r_chip * (1 + Math.tan(alpha_rad)) / Math.cos(alpha_rad);

    // Clamp to reasonable range
    return Math.max(0.5, Math.min(Lc, 5.0));
  }

  /**
   * Calculate thermal effusivity sqrt(k * rho * cp)
   * Used for heat partition calculations
   */
  private calculateEffusivity(
    k: number,
    rho: number,
    cp: number
  ): number {
    return Math.sqrt(k * rho * cp);
  }

  /**
   * Calculate Peclet number
   * Pe = V * L / (2 * alpha)
   * Where alpha = k / (rho * cp) is thermal diffusivity
   */
  private calculatePecletNumber(
    V_m_s: number,
    L_m: number,
    k: number,
    rho: number,
    cp: number
  ): number {
    const alpha = k / (rho * cp);
    return (V_m_s * L_m) / (2 * alpha);
  }

  // ========================================================================
  // HEAT GENERATION CALCULATION
  // ========================================================================

  /**
   * Calculate heat generation in all zones of the cutting process.
   *
   * Total cutting power: P = Fc * Vc
   * Nearly all mechanical energy converts to heat (>99%).
   *
   * Heat zones:
   * - Primary shear zone: Plastic deformation work (60-75% of total)
   * - Secondary shear zone: Chip-tool friction (20-30%)
   * - Tertiary zone: Tool-workpiece rubbing (5-15%)
   *
   * @param params Cutting parameters
   * @param material Material specification
   * @param tool Tool geometry
   * @returns Heat generation analysis
   */
  calculateHeatGeneration(
    params: CuttingParameters,
    material: MaterialSpec,
    tool: ToolGeometry
  ): HeatGenerationResult {
    const warnings: string[] = [];
    const mat = this.getMaterialProps(material);

    // Estimate cutting force if not provided
    const Fc = this.estimateCuttingForce(params, mat);
    const Ft = params.thrust_force_N ?? Fc * 0.5;
    const Ff = params.feed_force_N ?? Fc * 0.3;

    // Cutting speed [m/s]
    const Vc_m_s = params.cutting_speed_m_min / 60;

    // Total cutting power [W]
    // P = Fc * Vc + Ft * Vt + Ff * Vf
    // Thrust and feed velocities are much smaller, simplify:
    const V_feed = params.feed_mm_rev * (params.cutting_speed_m_min / (Math.PI * 50)) / 60; // Approximate
    const totalPower = Fc * Vc_m_s + Ft * V_feed * 0.001 + Ff * V_feed * 0.001;

    // Mechanical efficiency (nearly all becomes heat)
    // Only ~1% goes into new surface energy
    const mechanicalEfficiency = 0.99;
    const totalHeat = totalPower * mechanicalEfficiency;

    // Heat partition among zones
    // Varies with speed, material, and tool geometry
    // Higher speed = more heat in primary zone

    // Primary zone fraction (shear plane deformation)
    // Increases with cutting speed due to adiabatic conditions
    const speedFactor = Math.min(1.2, Math.max(0.8, Math.log10(params.cutting_speed_m_min / 50) + 1));
    const primaryFraction = 0.65 * speedFactor;

    // Secondary zone (chip-tool friction)
    const secondaryFraction = 0.25 / speedFactor;

    // Tertiary zone (flank rubbing)
    const tertiaryFraction = 1 - primaryFraction - secondaryFraction;

    // Heat by zone [W]
    const primaryHeat = totalHeat * Math.max(0.1, Math.min(0.8, primaryFraction));
    const secondaryHeat = totalHeat * Math.max(0.1, Math.min(0.4, secondaryFraction));
    const tertiaryHeat = totalHeat * Math.max(0.02, Math.min(0.2, tertiaryFraction));

    // Heat flux at tool-chip interface [W/mm2]
    const contactLength = this.estimateChipContactLength(params, tool);
    const contactWidth = params.depth_of_cut_mm;
    const contactArea_mm2 = contactLength * contactWidth;
    const heatFlux = (secondaryHeat + tertiaryHeat) / Math.max(contactArea_mm2, 0.1);

    // Specific cutting energy [J/mm3]
    const MRR_mm3_s = params.cutting_speed_m_min * 1000 / 60 * params.feed_mm_rev * params.depth_of_cut_mm;
    const specificEnergy = totalPower / Math.max(MRR_mm3_s, 0.001);

    // MRR [mm3/min]
    const MRR_mm3_min = MRR_mm3_s * 60;

    // Energy efficiency (useful work / total power)
    // Useful work is primarily surface creation
    const surfaceArea_mm2_s = params.cutting_speed_m_min * 1000 / 60 * params.depth_of_cut_mm * 2;
    const surfaceEnergy_J_mm2 = 0.003; // Typical for metals
    const usefulPower = surfaceArea_mm2_s * surfaceEnergy_J_mm2;
    const efficiency = (usefulPower / totalPower) * 100;

    // Warnings
    if (heatFlux > 50) {
      warnings.push(`Very high heat flux (${this.round(heatFlux)} W/mm2) — tool thermal damage risk`);
    }
    if (specificEnergy > 5) {
      warnings.push(`High specific energy (${this.round(specificEnergy)} J/mm3) — inefficient cutting`);
    }
    if (totalPower > 20000) {
      warnings.push(`High cutting power (${this.round(totalPower / 1000)} kW) — verify machine capacity`);
    }

    return {
      total_power_W: this.av(totalPower, "W", totalPower * 0.1, "P = Fc × Vc"),
      total_heat_W: this.av(totalHeat, "W", totalHeat * 0.1, "Q = 0.99 × P (Shaw, 2005)"),
      primary_shear_heat_W: this.av(
        primaryHeat,
        "W",
        primaryHeat * 0.15,
        "Primary shear zone (plastic deformation)"
      ),
      secondary_shear_heat_W: this.av(
        secondaryHeat,
        "W",
        secondaryHeat * 0.15,
        "Secondary shear zone (chip-tool friction)"
      ),
      tertiary_rubbing_heat_W: this.av(
        tertiaryHeat,
        "W",
        tertiaryHeat * 0.2,
        "Tertiary zone (flank rubbing)"
      ),
      heat_flux_W_mm2: this.av(
        heatFlux,
        "W/mm2",
        heatFlux * 0.2,
        "q = Q_tool / A_contact"
      ),
      specific_energy_J_mm3: this.av(
        specificEnergy,
        "J/mm3",
        specificEnergy * 0.1,
        "u = P / MRR"
      ),
      mrr_mm3_min: this.av(
        MRR_mm3_min,
        "mm3/min",
        MRR_mm3_min * 0.01,
        "MRR = Vc × f × ap"
      ),
      efficiency_pct: this.av(
        efficiency,
        "%",
        0.5,
        "Useful work / Total power"
      ),
      heat_breakdown: {
        primary_pct: this.round(primaryFraction * 100, 1),
        secondary_pct: this.round(secondaryFraction * 100, 1),
        tertiary_pct: this.round(tertiaryFraction * 100, 1),
      },
      warnings,
    };
  }

  // ========================================================================
  // HEAT PARTITION CALCULATION
  // ========================================================================

  /**
   * Calculate heat partition between chip, tool, workpiece, and coolant.
   *
   * Heat partition is governed by:
   * 1. Thermal effusivity ratio: R = sqrt(k*rho*cp)_chip / sqrt(k*rho*cp)_work
   * 2. Peclet number: Pe = V*L / (2*alpha) — determines regime
   * 3. Coolant effectiveness
   *
   * At high Peclet numbers (high speed), chip carries most heat.
   * At low Peclet numbers, heat conducts into workpiece and tool.
   *
   * Reference: Loewen & Shaw (1954), Komanduri & Hou (2001)
   *
   * @param params Cutting parameters
   * @param material Material specification
   * @param coolant Coolant properties
   * @returns Heat partition analysis
   */
  predictHeatPartition(
    params: CuttingParameters,
    material: MaterialSpec,
    coolant?: CoolantProperties
  ): HeatPartitionResult {
    const warnings: string[] = [];
    const recommendations: string[] = [];
    const mat = this.getMaterialProps(material);

    // Get coolant properties
    const coolantProps = coolant?.type
      ? COOLANT_DATABASE[coolant.type]
      : COOLANT_DATABASE.dry;

    // Cutting speed [m/s]
    const Vc_m_s = params.cutting_speed_m_min / 60;

    // Estimate chip thermal properties
    // Chip is work-hardened and at elevated temperature
    // Conductivity decreases ~30%, specific heat increases ~10%
    const k_chip = mat.k_thermal * 0.7;
    const cp_chip = mat.cp_J_kgK * 1.1;
    const rho_chip = mat.density_kg_m3;

    // Workpiece thermal properties
    const k_work = mat.k_thermal;
    const cp_work = mat.cp_J_kgK;
    const rho_work = mat.density_kg_m3;

    // Thermal effusivity calculation
    const effusivity_chip = this.calculateEffusivity(k_chip, rho_chip, cp_chip);
    const effusivity_work = this.calculateEffusivity(k_work, rho_work, cp_work);

    // Partition coefficient R (Loewen-Shaw)
    const R = effusivity_chip / effusivity_work;

    // Characteristic length (chip contact length converted to meters)
    const L_m = params.feed_mm_rev / 1000;

    // Peclet number
    const Pe = this.calculatePecletNumber(Vc_m_s, L_m, k_work, rho_work, cp_work);

    // Determine thermal regime
    let regime: "conduction_dominant" | "convection_dominant" | "mixed";
    if (Pe < 1) {
      regime = "conduction_dominant";
    } else if (Pe > 10) {
      regime = "convection_dominant";
    } else {
      regime = "mixed";
    }

    // Calculate heat partition based on Peclet number and effusivity ratio
    // High Pe: Most heat goes to chip
    // Low Pe: More heat to workpiece and tool

    // Chip fraction model (empirical fit to published data)
    // Increases with speed, saturates around 80%
    let chipFraction: number;
    if (Pe < 0.5) {
      chipFraction = 0.5 + 0.1 * Pe;
    } else if (Pe < 10) {
      chipFraction = 0.55 + 0.025 * Pe;
    } else {
      chipFraction = 0.75 + 0.05 * Math.log10(Pe);
    }
    chipFraction = Math.min(0.85, Math.max(0.40, chipFraction));

    // Tool fraction (concentrated heat from friction)
    // Typically 10-25% depending on coating and lubrication
    let toolFraction: number;
    if (coolant?.type && coolant.type !== "dry") {
      toolFraction = 0.10 + 0.05 * (1 - coolantProps.penetration_factor);
    } else {
      toolFraction = 0.20;
    }

    // Coolant fraction (heat actively removed)
    const coolantEffectiveness = coolant?.type
      ? (1 - coolantProps.temp_reduction_factor) * coolantProps.penetration_factor
      : 0;
    const coolantFraction = coolantEffectiveness * 0.3;

    // Workpiece fraction (remainder)
    let workpieceFraction = 1 - chipFraction - toolFraction - coolantFraction;
    workpieceFraction = Math.max(0.05, workpieceFraction);

    // Normalize to 100%
    const total = chipFraction + toolFraction + workpieceFraction + coolantFraction;
    const normChip = chipFraction / total;
    const normTool = toolFraction / total;
    const normWork = workpieceFraction / total;
    const normCoolant = coolantFraction / total;

    // Estimate total heat [W]
    const Fc = this.estimateCuttingForce(params, mat);
    const totalHeat = Fc * Vc_m_s * 0.99;

    // Absolute heat values
    const heatChip = totalHeat * normChip;
    const heatTool = totalHeat * normTool;
    const heatWork = totalHeat * normWork;
    const heatCoolant = totalHeat * normCoolant;

    // Recommendations based on partition
    if (normTool > 0.25) {
      recommendations.push("High heat to tool — consider through-tool or high-pressure coolant");
    }
    if (normWork > 0.25) {
      recommendations.push("Significant heat to workpiece — may cause thermal distortion");
    }
    if (Pe < 2 && coolant?.type === "dry") {
      recommendations.push("Low Peclet number with dry cutting — workpiece thermal damage risk");
    }
    if (regime === "conduction_dominant") {
      recommendations.push("Conduction-dominant regime — increase speed to shift heat to chip");
    }

    // Warnings
    if (heatTool > 500) {
      warnings.push(`High heat to tool (${this.round(heatTool)}W) — accelerated wear expected`);
    }
    if (normWork > 0.30) {
      warnings.push("More than 30% of heat to workpiece — thermal distortion risk");
    }

    return {
      chip_fraction_pct: this.av(
        normChip * 100,
        "%",
        5,
        `Loewen-Shaw partition (Pe=${this.round(Pe, 2)})`
      ),
      tool_fraction_pct: this.av(
        normTool * 100,
        "%",
        3,
        "Friction heat concentration"
      ),
      workpiece_fraction_pct: this.av(
        normWork * 100,
        "%",
        4,
        "Conduction into bulk material"
      ),
      coolant_fraction_pct: this.av(
        normCoolant * 100,
        "%",
        2,
        `${coolant?.type ?? "dry"} cooling effectiveness`
      ),
      heat_to_chip_W: this.av(heatChip, "W", heatChip * 0.1, "Q_chip = Q_total × f_chip"),
      heat_to_tool_W: this.av(heatTool, "W", heatTool * 0.15, "Q_tool = Q_total × f_tool"),
      heat_to_workpiece_W: this.av(heatWork, "W", heatWork * 0.1, "Q_work = Q_total × f_work"),
      heat_removed_coolant_W: this.av(heatCoolant, "W", heatCoolant * 0.2, "Q_coolant = Q_total × f_coolant"),
      partition_coefficient_R: this.av(
        R,
        "dimensionless",
        R * 0.1,
        "R = sqrt(k·rho·cp)_chip / sqrt(k·rho·cp)_work"
      ),
      peclet_number: this.av(Pe, "dimensionless", Pe * 0.05, "Pe = V·L / (2·alpha)"),
      regime,
      model: "Loewen-Shaw (1954) with Peclet modification",
      recommendations,
      warnings,
    };
  }

  // ========================================================================
  // TEMPERATURE DISTRIBUTION CALCULATION
  // ========================================================================

  /**
   * Calculate temperature distribution using Jaeger moving heat source solution.
   *
   * The Jaeger solution models a moving heat source on a semi-infinite solid.
   * For high-speed cutting:
   *   T_max = 0.754 × q × sqrt(L / (k × rho × cp × V))
   *
   * Where:
   * - q = heat flux [W/m2]
   * - L = contact length [m]
   * - V = cutting speed [m/s]
   *
   * Tool-chip interface temperature follows Loewen-Shaw empirical correlation:
   *   T = T_amb + C × Vc^0.4 × f^0.2
   *
   * Reference: Jaeger (1942), Loewen & Shaw (1954), Trent & Wright (2000)
   *
   * @param params Cutting parameters
   * @param material Material specification
   * @param tool Tool geometry
   * @param coating Tool coating type
   * @param coolant Coolant properties
   * @returns Temperature distribution analysis
   */
  calculateCuttingTemperature(
    params: CuttingParameters,
    material: MaterialSpec,
    tool: ToolGeometry,
    coating: ToolCoating = "TiAlN",
    coolant?: CoolantProperties
  ): TemperatureDistributionResult {
    const warnings: string[] = [];
    const mat = this.getMaterialProps(material);
    const coatingProps = COATING_DATABASE[coating];
    const coolantProps = coolant?.type
      ? COOLANT_DATABASE[coolant.type]
      : COOLANT_DATABASE.dry;

    // Cutting parameters
    const Vc = params.cutting_speed_m_min;
    const f = params.feed_mm_rev;
    const ap = params.depth_of_cut_mm;
    const Vc_m_s = Vc / 60;

    // Contact geometry
    const contactLength_mm = this.estimateChipContactLength(params, tool);
    const contactWidth_mm = ap;
    const contactArea_mm2 = contactLength_mm * contactWidth_mm;

    // Calculate heat generation for this cut
    const heatGen = this.calculateHeatGeneration(params, material, tool);
    const totalHeat = heatGen.total_heat_W.value;

    // Heat partition
    const partition = this.predictHeatPartition(params, material, coolant);
    const heatToTool = partition.heat_to_tool_W.value;
    const heatToWork = partition.heat_to_workpiece_W.value;

    // Heat flux at interface [W/mm2]
    const q_mm2 = heatToTool / Math.max(contactArea_mm2, 0.1);

    // Loewen-Shaw interface temperature model
    // T = T_amb + C × Vc^0.4 × f^0.2
    // C depends on material thermal properties
    //
    // Calibrated against published data:
    // - Steel at 200 m/min, 0.25 mm/rev → ~400-500°C interface
    // - Titanium at 60 m/min, 0.15 mm/rev → ~600-800°C interface
    // - Aluminum at 400 m/min, 0.3 mm/rev → ~150-250°C interface
    //
    // Base coefficient calibration:
    // For steel (k=50): target 450°C rise at Vc=200, f=0.25
    // 450 = C × 200^0.4 × 0.25^0.2 = C × 10.4 × 0.76 = C × 7.9
    // C_base = 57, then scale by 1/sqrt(k/50)

    // Temperature coefficient scaled by thermal conductivity
    // Lower conductivity = higher local temperature
    const k_ref = 50; // Reference conductivity (steel)
    const C_base = 57; // Base coefficient calibrated for steel
    const conductivityRatio = Math.sqrt(k_ref / Math.max(mat.k_thermal, 1));
    const C_temp = C_base * conductivityRatio;

    // Base interface temperature rise
    const tempRise = C_temp * Math.pow(Vc, 0.4) * Math.pow(f, 0.2);

    // Additional factor for very low conductivity materials (Ti, Inconel)
    // These have more localized heating
    const lowCondBoost = mat.k_thermal < 20 ? 1.0 + (20 - mat.k_thermal) / 40 : 1.0;

    // Adjusted temperature rise
    const adjTempRise = tempRise * lowCondBoost;

    // Ambient temperature
    const T_amb = mat.initial_temp_C;

    // Apply coolant reduction
    const coolantReduction = coolantProps.temp_reduction_factor;
    const maxInterfaceTemp = T_amb + adjTempRise * coolantReduction;

    // Average interface temperature (typically 70-80% of max)
    const avgInterfaceTemp = T_amb + adjTempRise * coolantReduction * 0.75;

    // Rake face temperature (at contact zone)
    const rakeFaceTemp = avgInterfaceTemp * 0.95;

    // Flank face temperature (lower due to rubbing only)
    const flankFaceTemp = T_amb + adjTempRise * coolantReduction * 0.4;

    // Substrate temperature (below coating)
    // Temperature drops through coating, but limited to reasonable values
    // The coating acts as a thermal barrier, but the drop is typically 20-100°C
    const coatingThickness_m = coatingProps.typical_thickness_um * 1e-6;
    const heatFlux_W_m2 = Math.min(q_mm2 * 1e6, 100e6); // Cap heat flux for coating calc
    const tempDropCoating = Math.min(
      (heatFlux_W_m2 * coatingThickness_m) / Math.max(coatingProps.k_thermal, 1),
      maxInterfaceTemp * 0.15 // Coating drop limited to 15% of interface temp
    );
    const substrateTemp = Math.max(T_amb + 10, maxInterfaceTemp - tempDropCoating);

    // Chip bulk temperature (below interface)
    const chipBulkTemp = T_amb + adjTempRise * coolantReduction *
      partition.chip_fraction_pct.value / 100 * 0.6;

    // Workpiece surface temperature
    // The surface receives heat but at lower intensity than tool-chip interface
    // Scale by workpiece heat fraction and apply a multiplier to ensure reasonable temps
    const workHeatFrac = partition.workpiece_fraction_pct.value / 100;
    const workSurfaceTemp = T_amb + adjTempRise * coolantReduction * Math.max(workHeatFrac, 0.15) * 0.5;

    // Temperature gradient into workpiece [C/mm]
    // Exponential decay model
    const thermalDiffusivity_mm2_s = mat.k_thermal / (mat.density_kg_m3 * mat.cp_J_kgK) * 1e6;
    const contactTime_s = contactLength_mm / (Vc_m_s * 1000);
    const penetrationDepth_mm = Math.sqrt(4 * thermalDiffusivity_mm2_s * contactTime_s);
    const tempGradient = (workSurfaceTemp - T_amb) / Math.max(penetrationDepth_mm, 0.1);

    // Heat affected zone depth
    // Where temperature rise is >20% of surface rise
    const hazDepth = penetrationDepth_mm * 2;

    // Subsurface profile
    const subsurfaceProfile: SubsurfaceTemperature[] = [];
    for (let depth = 0.05; depth <= 2.0; depth += 0.05) {
      const decayFactor = Math.exp(-depth / penetrationDepth_mm);
      const temp = T_amb + (workSurfaceTemp - T_amb) * decayFactor;

      // Cooling rate estimate (simplified)
      const coolingRate = (temp - T_amb) / contactTime_s;

      if (depth <= hazDepth) {
        subsurfaceProfile.push({
          depth_mm: this.round(depth, 2),
          temperature_C: this.round(temp, 1),
          cooling_rate_C_s: this.round(coolingRate, 0),
        });
      }
    }

    // Warnings
    if (maxInterfaceTemp > coatingProps.max_temp_C) {
      warnings.push(
        `Interface temperature (${this.round(maxInterfaceTemp)}C) exceeds ${coating} limit ` +
        `(${coatingProps.max_temp_C}C) — coating degradation expected`
      );
    }
    if (maxInterfaceTemp > (mat.melting_point_C ?? 1500) * 0.6) {
      warnings.push("Interface temperature approaching material softening point");
    }
    if (workSurfaceTemp > 200 && material.material_id.includes("aluminum")) {
      warnings.push("Aluminum surface temperature elevated — T6 temper may be affected");
    }
    if (tempGradient > 500) {
      warnings.push(`High temperature gradient (${this.round(tempGradient)} C/mm) — residual stress risk`);
    }

    return {
      max_interface_temp_C: this.av(
        maxInterfaceTemp,
        "C",
        maxInterfaceTemp * 0.15,
        "Loewen-Shaw: T = T_amb + C × Vc^0.4 × f^0.2"
      ),
      avg_interface_temp_C: this.av(
        avgInterfaceTemp,
        "C",
        avgInterfaceTemp * 0.12,
        "Average over contact zone"
      ),
      rake_face_temp_C: this.av(
        rakeFaceTemp,
        "C",
        rakeFaceTemp * 0.12,
        "Tool rake face temperature"
      ),
      flank_face_temp_C: this.av(
        flankFaceTemp,
        "C",
        flankFaceTemp * 0.15,
        "Tool flank face (rubbing zone)"
      ),
      substrate_temp_C: this.av(
        substrateTemp,
        "C",
        substrateTemp * 0.10,
        `Below ${coating} coating (${coatingProps.typical_thickness_um}um)`
      ),
      chip_bulk_temp_C: this.av(
        chipBulkTemp,
        "C",
        chipBulkTemp * 0.15,
        "Chip bulk temperature (below interface)"
      ),
      workpiece_surface_temp_C: this.av(
        workSurfaceTemp,
        "C",
        workSurfaceTemp * 0.12,
        "Machined surface temperature"
      ),
      workpiece_gradient_C_mm: this.av(
        tempGradient,
        "C/mm",
        tempGradient * 0.2,
        "Temperature gradient into workpiece"
      ),
      haz_depth_mm: this.av(
        hazDepth,
        "mm",
        hazDepth * 0.25,
        "Heat affected zone depth (T > 20% rise)"
      ),
      subsurface_profile: subsurfaceProfile,
      thermal_penetration_mm: this.av(
        penetrationDepth_mm,
        "mm",
        penetrationDepth_mm * 0.2,
        `sqrt(4 × alpha × t) at contact time ${this.round(contactTime_s * 1000, 2)}ms`
      ),
      model: "Jaeger moving heat source with Loewen-Shaw empirical correction",
      warnings,
    };
  }

  // ========================================================================
  // THERMAL DAMAGE ASSESSMENT
  // ========================================================================

  /**
   * Assess thermal damage risk to material and tool.
   *
   * Material effects:
   * - Thermal softening (Johnson-Cook T* term)
   * - Phase transformation (Ac1, Ac3)
   * - Tempering of hardened steels (>300C)
   * - White layer formation (>Ac1 with rapid quench)
   * - Oxide layer formation (>200-300C)
   *
   * Tool effects:
   * - Coating breakdown
   * - Diffusion wear acceleration (Arrhenius)
   * - Thermal shock (interrupted cutting)
   * - Thermal fatigue cracks
   *
   * @param params Cutting parameters
   * @param material Material specification
   * @param tool Tool geometry
   * @param coating Tool coating
   * @param substrate Tool substrate
   * @param coolant Coolant properties
   * @param interrupted Is this interrupted cutting?
   * @returns Thermal damage assessment
   */
  assessThermalDamage(
    params: CuttingParameters,
    material: MaterialSpec,
    tool: ToolGeometry,
    coating: ToolCoating = "TiAlN",
    substrate: ToolSubstrate = "carbide_P20",
    coolant?: CoolantProperties,
    interrupted: boolean = false
  ): ThermalDamageResult {
    const warnings: string[] = [];
    const recommendations: string[] = [];
    const assessments: ThermalAssessment[] = [];

    const mat = this.getMaterialProps(material);
    const coatingProps = COATING_DATABASE[coating];
    const substrateProps = SUBSTRATE_DATABASE[substrate];
    const phase = PHASE_TRANSFORMATION_DB[material.material_id];

    // Calculate temperatures
    const tempDist = this.calculateCuttingTemperature(params, material, tool, coating, coolant);
    const maxTemp = tempDist.max_interface_temp_C.value;
    const workSurfaceTemp = tempDist.workpiece_surface_temp_C.value;
    const toolTemp = tempDist.rake_face_temp_C.value;
    const substrateTemp = tempDist.substrate_temp_C.value;

    // Reference temperatures
    const T_amb = mat.initial_temp_C;
    const T_melt = mat.melting_point_C ?? 1500;

    // ========== MATERIAL THERMAL EFFECTS ==========

    // 1. Thermal Softening (Johnson-Cook)
    // T* = (T - T_room) / (T_melt - T_room)
    const T_room_K = 293;
    const T_melt_K = T_melt + 273;
    const T_work_K = workSurfaceTemp + 273;
    const T_star = (T_work_K - T_room_K) / (T_melt_K - T_room_K);
    const thermalSofteningActive = T_star > 0.1;

    // Softening factor: [1 - T*^m] where m ≈ 1.0 for most steels
    const m = 1.0;
    const softeningFactor = Math.max(0.1, 1 - Math.pow(Math.max(0, T_star), m));

    // 2. Phase Transformation Risk
    const Ac1 = phase?.Ac1_C ?? mat.Ac1_C ?? 727;
    const Ac3 = phase?.Ac3_C ?? mat.Ac3_C ?? 850;
    const marginToAc1 = Ac1 - workSurfaceTemp;
    const phaseTransformationRisk = workSurfaceTemp > Ac1 * 0.9;

    assessments.push({
      effect: "Phase Transformation",
      severity: workSurfaceTemp > Ac1 ? "severe" : workSurfaceTemp > Ac1 * 0.9 ? "moderate" : "none",
      temperature_C: workSurfaceTemp,
      threshold_C: Ac1,
      margin_C: marginToAc1,
      description: workSurfaceTemp > Ac1
        ? "Surface exceeds Ac1 — austenite formation possible"
        : `${this.round(marginToAc1)}C below Ac1 threshold`,
      mitigation: phaseTransformationRisk ? "Reduce speed, increase coolant, or use cryogenic cooling" : undefined,
    });

    // 3. Tempering Risk (hardened steels)
    const temperingThreshold = phase?.tempering_threshold_C ?? 200;
    const temperingRisk = !!((material.material_id.includes("hardened") ||
      material.material_id.includes("tool_steel") ||
      (material.hardness_HRC && material.hardness_HRC > 40)) &&
      workSurfaceTemp > temperingThreshold);

    // Predict hardness loss (empirical)
    let hardnessLoss = 0;
    if (temperingRisk && material.hardness_HRC) {
      const tempExcess = workSurfaceTemp - temperingThreshold;
      hardnessLoss = Math.min(material.hardness_HRC * 0.3, tempExcess * 0.05);
    }

    assessments.push({
      effect: "Tempering (Softening)",
      severity: hardnessLoss > 5 ? "severe" : hardnessLoss > 2 ? "moderate" : temperingRisk ? "minor" : "none",
      temperature_C: workSurfaceTemp,
      threshold_C: temperingThreshold,
      margin_C: temperingThreshold - workSurfaceTemp,
      description: temperingRisk
        ? `Surface at ${this.round(workSurfaceTemp)}C may lose ${this.round(hardnessLoss)} HRC`
        : "No tempering risk",
      mitigation: temperingRisk ? "Use CBN tooling with aggressive cooling" : undefined,
    });

    // 4. White Layer Formation
    const whiteLayerThreshold = phase?.white_layer_threshold_C ?? 750;
    const whiteLayerRisk = workSurfaceTemp > whiteLayerThreshold * 0.85;

    // Predict white layer depth (empirical model)
    // Depth increases with temperature and decreases with cooling rate
    let whiteLayerDepth = 0;
    if (workSurfaceTemp > whiteLayerThreshold) {
      const tempExcess = workSurfaceTemp - whiteLayerThreshold;
      const coolingRateEffect = tempDist.subsurface_profile[0]?.cooling_rate_C_s ?? 1000;
      whiteLayerDepth = Math.max(0, (tempExcess / 100) * (5000 / coolingRateEffect) * 10);
    }

    assessments.push({
      effect: "White Layer Formation",
      severity: whiteLayerDepth > 10 ? "severe" : whiteLayerDepth > 5 ? "moderate" : whiteLayerRisk ? "minor" : "none",
      temperature_C: workSurfaceTemp,
      threshold_C: whiteLayerThreshold,
      margin_C: whiteLayerThreshold - workSurfaceTemp,
      description: whiteLayerRisk
        ? `White layer depth estimated at ${this.round(whiteLayerDepth)} um`
        : "No white layer risk",
      mitigation: whiteLayerRisk ? "Finishing pass required to remove affected layer" : undefined,
    });

    // 5. Oxide Layer (Discoloration)
    const oxidationStart = phase?.oxidation_start_C ?? 250;
    const oxidationRisk = workSurfaceTemp > oxidationStart;

    // Oxide thickness estimate (parabolic kinetics)
    let oxideThickness = 0;
    if (oxidationRisk) {
      const contactTime_ms = tempDist.thermal_penetration_mm.value /
        (params.cutting_speed_m_min * 1000 / 60) * 1000;
      oxideThickness = 0.1 * Math.sqrt(contactTime_ms) * (workSurfaceTemp - oxidationStart) / 100;
    }

    assessments.push({
      effect: "Oxide Formation (Discoloration)",
      severity: oxideThickness > 1 ? "moderate" : oxidationRisk ? "minor" : "none",
      temperature_C: workSurfaceTemp,
      threshold_C: oxidationStart,
      margin_C: oxidationStart - workSurfaceTemp,
      description: oxidationRisk
        ? `Surface oxidation likely, thickness ~${this.round(oxideThickness, 2)} um`
        : "No oxidation risk",
      mitigation: oxidationRisk ? "Cosmetic issue only — may require post-process cleaning" : undefined,
    });

    // ========== TOOL THERMAL EFFECTS ==========

    // 1. Coating Degradation
    const coatingMargin = coatingProps.max_temp_C - toolTemp;
    const coatingAtRisk = toolTemp > coatingProps.max_temp_C;

    // Coating degradation rate (Arrhenius-type)
    const Q_activation = 150000; // J/mol (typical for TiAlN oxidation)
    const R_gas = 8.314;
    const degradationRate = coatingAtRisk
      ? Math.exp(-Q_activation / (R_gas * (toolTemp + 273)))
      : 0;
    const normalizedDegradation = degradationRate /
      Math.exp(-Q_activation / (R_gas * (coatingProps.max_temp_C + 273)));

    assessments.push({
      effect: "Coating Degradation",
      severity: coatingAtRisk ? "severe" : coatingMargin < 100 ? "moderate" : coatingMargin < 200 ? "minor" : "none",
      temperature_C: toolTemp,
      threshold_C: coatingProps.max_temp_C,
      margin_C: coatingMargin,
      description: coatingAtRisk
        ? `${coating} coating at ${this.round(toolTemp)}C exceeds limit (${coatingProps.max_temp_C}C)`
        : `${this.round(coatingMargin)}C margin to coating limit`,
      mitigation: coatingAtRisk ? `Use ${this.recommendBetterCoating(toolTemp)} coating` : undefined,
    });

    // 2. Diffusion Wear
    // Arrhenius: k = A * exp(-Q/RT)
    const diffusionActive = toolTemp > 400;
    const Q_diffusion = 200000; // J/mol (carbide diffusion into steel)
    const diffusionFactor = diffusionActive
      ? Math.exp(-(Q_diffusion / R_gas) * (1 / (toolTemp + 273) - 1 / (400 + 273)))
      : 1;

    assessments.push({
      effect: "Diffusion Wear",
      severity: diffusionFactor > 10 ? "severe" : diffusionFactor > 3 ? "moderate" : diffusionActive ? "minor" : "none",
      temperature_C: toolTemp,
      threshold_C: 400,
      margin_C: 400 - toolTemp,
      description: diffusionActive
        ? `Diffusion wear accelerated ${this.round(diffusionFactor)}× at ${this.round(toolTemp)}C`
        : "Diffusion wear negligible below 400C",
      mitigation: diffusionFactor > 3 ? "Use Al2O3 coating or ceramic insert as diffusion barrier" : undefined,
    });

    // 3. Thermal Shock (Interrupted Cutting)
    const thermalShockRisk = interrupted && (maxTemp - T_amb) > 300;
    const tempSwing = maxTemp - T_amb;

    assessments.push({
      effect: "Thermal Shock",
      severity: interrupted && tempSwing > 500 ? "severe" : thermalShockRisk ? "moderate" : "none",
      temperature_C: tempSwing,
      threshold_C: 300,
      margin_C: 300 - tempSwing,
      description: thermalShockRisk
        ? `Temperature swing of ${this.round(tempSwing)}C in interrupted cutting`
        : interrupted ? "Moderate thermal cycling" : "Continuous cutting — no thermal shock",
      mitigation: thermalShockRisk ? "Use dry cutting or consistent coolant (no intermittent)" : undefined,
    });

    // 4. Thermal Fatigue
    const thermalFatigueRisk = interrupted && tempSwing > 200;
    let thermalCrackDepth = 0;
    if (thermalFatigueRisk) {
      // Simplified crack propagation model
      const cycles = 1000; // Assumed
      thermalCrackDepth = 0.001 * tempSwing * Math.sqrt(cycles);
    }

    assessments.push({
      effect: "Thermal Fatigue Cracking",
      severity: thermalCrackDepth > 50 ? "severe" : thermalCrackDepth > 20 ? "moderate" : thermalFatigueRisk ? "minor" : "none",
      temperature_C: tempSwing,
      threshold_C: 200,
      margin_C: 200 - tempSwing,
      description: thermalFatigueRisk
        ? `Thermal fatigue risk — crack depth estimate ${this.round(thermalCrackDepth)} um after 1000 cycles`
        : "Low thermal fatigue risk",
      mitigation: thermalFatigueRisk ? "Consider cermet or ceramic with higher thermal shock resistance" : undefined,
    });

    // ========== OVERALL RISK SCORE ==========

    // Calculate weighted risk score
    let riskScore = 0;

    // Material effects
    if (phaseTransformationRisk) riskScore += 30;
    if (temperingRisk) riskScore += hardnessLoss * 3;
    if (whiteLayerRisk) riskScore += whiteLayerDepth * 2;
    if (oxidationRisk) riskScore += 5;

    // Tool effects
    if (coatingAtRisk) riskScore += 25;
    if (diffusionFactor > 3) riskScore += (diffusionFactor - 1) * 5;
    if (thermalShockRisk) riskScore += 15;
    if (thermalFatigueRisk) riskScore += thermalCrackDepth * 0.5;

    riskScore = Math.min(100, Math.max(0, riskScore));

    // Risk category
    let riskCategory: "negligible" | "low" | "moderate" | "high" | "critical";
    if (riskScore < 10) riskCategory = "negligible";
    else if (riskScore < 25) riskCategory = "low";
    else if (riskScore < 50) riskCategory = "moderate";
    else if (riskScore < 75) riskCategory = "high";
    else riskCategory = "critical";

    // Generate recommendations
    if (riskScore > 25) {
      recommendations.push("Reduce cutting speed by 15-25% to lower temperatures");
    }
    if (coatingAtRisk || coatingMargin < 100) {
      recommendations.push(`Upgrade to ${this.recommendBetterCoating(toolTemp)} coating`);
    }
    if (workSurfaceTemp > temperingThreshold && material.hardness_HRC) {
      recommendations.push("Add finishing pass to remove heat-affected layer");
    }
    if (diffusionFactor > 5) {
      recommendations.push("Use ceramic inserts or coated grades with Al2O3 layer");
    }
    if (!coolant || coolant.type === "dry") {
      recommendations.push("Apply flood coolant or high-pressure cooling");
    }

    // Warnings
    if (riskScore > 50) {
      warnings.push("High thermal damage risk — process modifications strongly recommended");
    }
    if (phaseTransformationRisk && material.material_id.includes("hardened")) {
      warnings.push("CRITICAL: Hardened surface may be softened — verify with hardness test");
    }

    return {
      damage_risk_score: this.av(
        riskScore,
        "%",
        riskScore * 0.1,
        "Weighted thermal damage assessment"
      ),
      risk_category: riskCategory,
      material_effects: {
        thermal_softening_active: thermalSofteningActive,
        softening_factor: this.round(softeningFactor, 3),
        homologous_temperature: this.round(T_star, 3),
        phase_transformation_risk: phaseTransformationRisk,
        margin_to_Ac1_C: marginToAc1,
        tempering_risk: temperingRisk,
        hardness_loss_HRC: hardnessLoss > 0 ? this.round(hardnessLoss, 1) : undefined,
        white_layer_risk: whiteLayerRisk,
        white_layer_depth_um: whiteLayerDepth > 0 ? this.round(whiteLayerDepth, 1) : undefined,
        oxide_formation_risk: oxidationRisk,
        oxide_thickness_um: oxideThickness > 0 ? this.round(oxideThickness, 2) : undefined,
      },
      tool_effects: {
        coating_at_risk: coatingAtRisk,
        coating_margin_C: this.round(coatingMargin, 0),
        coating_degradation_rate: this.round(normalizedDegradation, 3),
        diffusion_wear_active: diffusionActive,
        diffusion_factor: this.round(diffusionFactor, 2),
        thermal_shock_risk: thermalShockRisk,
        thermal_fatigue_risk: thermalFatigueRisk,
        thermal_crack_depth_um: thermalCrackDepth > 0 ? this.round(thermalCrackDepth, 1) : undefined,
      },
      assessments,
      recommendations,
      warnings,
    };
  }

  /**
   * Recommend better coating based on temperature
   */
  private recommendBetterCoating(temp_C: number): ToolCoating {
    if (temp_C > 1100) return "CBN";
    if (temp_C > 900) return "Al2O3";
    if (temp_C > 800) return "AlCrN";
    if (temp_C > 700) return "AlTiN";
    if (temp_C > 600) return "TiAlN";
    return "TiCN";
  }

  // ========================================================================
  // COOLANT OPTIMIZATION
  // ========================================================================

  /**
   * Optimize coolant selection and parameters for target temperature.
   *
   * Considers:
   * - Heat removal capacity: Q = m_dot × cp × deltaT
   * - Penetration into cut zone
   * - Film boiling (Leidenfrost effect)
   * - Cost and environmental factors
   *
   * @param params Cutting parameters
   * @param material Material specification
   * @param tool Tool geometry
   * @param coating Tool coating
   * @param targetTemp_C Target interface temperature (default: coating limit - 100C)
   * @param constraints Optimization constraints
   * @returns Coolant optimization result
   */
  optimizeCoolant(
    params: CuttingParameters,
    material: MaterialSpec,
    tool: ToolGeometry,
    coating: ToolCoating = "TiAlN",
    targetTemp_C?: number,
    constraints?: {
      exclude_types?: CoolantType[];
      max_cost_factor?: number;
      require_low_environmental_impact?: boolean;
    }
  ): CoolantOptimizationResult {
    const recommendations: string[] = [];
    const coatingProps = COATING_DATABASE[coating];

    // Target temperature (default: coating limit - 100C margin)
    const target = targetTemp_C ?? coatingProps.max_temp_C - 100;

    // Calculate dry cutting temperature as baseline
    const dryTemp = this.calculateCuttingTemperature(
      params, material, tool, coating, { type: "dry" }
    );
    const dryInterfaceTemp = dryTemp.max_interface_temp_C.value;

    // Required temperature reduction
    const requiredReduction = Math.max(0, dryInterfaceTemp - target);

    // Evaluate all coolant types
    const alternatives: CoolantAlternative[] = [];
    const excludeTypes = new Set(constraints?.exclude_types ?? []);

    for (const [type, props] of Object.entries(COOLANT_DATABASE) as [CoolantType, CoolantThermalProperties][]) {
      if (excludeTypes.has(type)) continue;
      if (constraints?.max_cost_factor && props.cost_factor > constraints.max_cost_factor) continue;
      if (constraints?.require_low_environmental_impact && props.environmental_factor > 2) continue;

      const tempReduction = dryInterfaceTemp * (1 - props.temp_reduction_factor);
      const newTemp = dryInterfaceTemp - tempReduction;
      const effectiveness = tempReduction / Math.max(requiredReduction, 1) * 100;

      alternatives.push({
        type,
        effectiveness_pct: this.round(Math.min(100, effectiveness), 1),
        temp_reduction_C: this.round(tempReduction, 0),
        cost_factor: props.cost_factor,
        environmental_factor: props.environmental_factor,
        notes: this.getCoolantNotes(type, newTemp, coatingProps.max_temp_C),
      });
    }

    // Sort by effectiveness
    alternatives.sort((a, b) => b.effectiveness_pct - a.effectiveness_pct);

    // Select best option that meets target
    const bestOption = alternatives.find(a =>
      dryInterfaceTemp - a.temp_reduction_C <= target
    ) ?? alternatives[0];

    const selectedType = bestOption.type;
    const selectedProps = COOLANT_DATABASE[selectedType];

    // Calculate final temperature with selected coolant
    const newInterfaceTemp = dryInterfaceTemp - bestOption.temp_reduction_C;

    // Calculate heat removal capacity
    const heatGen = this.calculateHeatGeneration(params, material, tool);
    const totalHeat = heatGen.total_heat_W.value;
    const heatRemovalCapacity = totalHeat * (1 - selectedProps.temp_reduction_factor) *
      selectedProps.penetration_factor;

    // Optimal parameters based on coolant type
    const optimalParams: { flow_rate_L_min?: number; pressure_bar?: number; nozzle_angle_deg?: number; nozzle_distance_mm?: number } = {};

    switch (selectedType) {
      case "flood":
        optimalParams.flow_rate_L_min = 10 + totalHeat / 500;
        optimalParams.nozzle_angle_deg = 30;
        optimalParams.nozzle_distance_mm = 50;
        break;
      case "through_tool":
        optimalParams.flow_rate_L_min = 5 + totalHeat / 800;
        optimalParams.pressure_bar = 20 + totalHeat / 200;
        break;
      case "high_pressure":
        optimalParams.flow_rate_L_min = 8 + totalHeat / 600;
        optimalParams.pressure_bar = 70 + totalHeat / 100;
        optimalParams.nozzle_angle_deg = 15;
        optimalParams.nozzle_distance_mm = 25;
        break;
      case "mql":
        optimalParams.flow_rate_L_min = 0.05;
        optimalParams.pressure_bar = 5;
        optimalParams.nozzle_angle_deg = 20;
        optimalParams.nozzle_distance_mm = 30;
        break;
      case "cryogenic_LN2":
      case "cryogenic_CO2":
        optimalParams.flow_rate_L_min = 0.5;
        optimalParams.pressure_bar = 10;
        optimalParams.nozzle_angle_deg = 25;
        optimalParams.nozzle_distance_mm = 40;
        break;
    }

    // Film boiling check
    // Leidenfrost point for water-based coolants ~250-350C
    const leidenfrostTemp = 300; // Approximate for water-based
    const filmBoilingRisk = selectedProps.boiling_point_C > 0 &&
      newInterfaceTemp > leidenfrostTemp;

    // Cost-effectiveness rating (1-10)
    const costEffectiveness = 10 - (selectedProps.cost_factor * 2);

    // Environmental rating (1-10)
    const environmentalImpact = 12 - selectedProps.environmental_factor * 2;

    // Recommendations
    if (newInterfaceTemp > target) {
      recommendations.push(`Target temperature of ${target}C not achieved — consider reducing speed`);
    }
    if (filmBoilingRisk) {
      recommendations.push("Film boiling risk — increase coolant pressure or flow rate");
    }
    if (selectedType === "flood" && newInterfaceTemp > coatingProps.max_temp_C * 0.9) {
      recommendations.push("Consider upgrading to high-pressure or through-tool coolant");
    }
    if (selectedType === "dry" && newInterfaceTemp > coatingProps.max_temp_C) {
      recommendations.push("CRITICAL: Dry cutting exceeds coating limit — coolant required");
    }
    if (selectedType !== "dry" && selectedProps.penetration_factor < 0.5) {
      recommendations.push("Low coolant penetration — optimize nozzle position for better access");
    }

    // Confidence based on how well target is met
    const confidence = newInterfaceTemp <= target ? 90 : 60 - (newInterfaceTemp - target) * 0.5;

    return {
      recommended_type: selectedType,
      confidence_pct: this.av(
        Math.max(30, Math.min(95, confidence)),
        "%",
        10,
        "Based on target temperature achievement"
      ),
      heat_removal_W: this.av(
        heatRemovalCapacity,
        "W",
        heatRemovalCapacity * 0.2,
        "Q = effectiveness × penetration × total_heat"
      ),
      temp_reduction_C: this.av(
        bestOption.temp_reduction_C,
        "C",
        bestOption.temp_reduction_C * 0.15,
        `${selectedType} cooling effect`
      ),
      new_interface_temp_C: this.av(
        newInterfaceTemp,
        "C",
        newInterfaceTemp * 0.12,
        "T_dry - T_reduction"
      ),
      coolant_effectiveness_pct: this.av(
        bestOption.effectiveness_pct,
        "%",
        10,
        "Required reduction achieved"
      ),
      optimal_params: optimalParams,
      film_boiling_risk: filmBoilingRisk,
      leidenfrost_temp_C: selectedProps.boiling_point_C > 0 ? leidenfrostTemp : undefined,
      penetration_pct: this.av(
        selectedProps.penetration_factor * 100,
        "%",
        10,
        `${selectedType} penetration into cut zone`
      ),
      cost_effectiveness: this.round(costEffectiveness, 1),
      environmental_impact: this.round(environmentalImpact, 1),
      alternatives: alternatives.slice(0, 5), // Top 5 alternatives
      recommendations,
    };
  }

  /**
   * Get notes for coolant type based on conditions
   */
  private getCoolantNotes(type: CoolantType, newTemp: number, coatingLimit: number): string {
    if (newTemp > coatingLimit) return "Does not meet coating temperature limit";
    if (newTemp > coatingLimit * 0.9) return "Marginal — close to coating limit";

    switch (type) {
      case "dry":
        return "No cooling — for materials that don't need it";
      case "air_blast":
        return "Chip clearing only — minimal cooling";
      case "mist":
        return "Light cooling — environmental option";
      case "mql":
        return "Minimal lubrication — good for most materials";
      case "flood":
        return "Standard cooling — reliable for general use";
      case "through_tool":
        return "Excellent penetration — ideal for drilling/deep cuts";
      case "high_pressure":
        return "Maximum cooling — for difficult materials";
      case "cryogenic_LN2":
        return "Extreme cooling — for titanium/superalloys";
      case "cryogenic_CO2":
        return "Very high cooling — cost-effective cryogenic";
      default:
        return "";
    }
  }

  // ========================================================================
  // THERMAL DISTORTION PREDICTION
  // ========================================================================

  /**
   * Predict thermal distortion in lathe machining.
   *
   * Sources of thermal distortion:
   * 1. Spindle thermal growth (bearing heat, motor heat)
   * 2. Workpiece expansion (cutting heat, coolant differential)
   * 3. Tool holder expansion (conduction from tool)
   * 4. Chuck jaw expansion (workpiece heat transfer)
   *
   * @param params Cutting parameters
   * @param material Material specification
   * @param tool Tool geometry
   * @param machineParams Machine parameters
   * @param coolant Coolant properties
   * @returns Thermal distortion prediction
   */
  predictThermalDistortion(
    params: CuttingParameters,
    material: MaterialSpec,
    tool: ToolGeometry,
    machineParams: {
      spindle_thermal_growth_um_per_kW?: number;
      spindle_power_kW?: number;
      workpiece_diameter_mm: number;
      workpiece_length_mm: number;
      holder_length_mm?: number;
      chuck_jaw_length_mm?: number;
      time_cutting_min?: number;
    },
    coolant?: CoolantProperties
  ): ThermalDistortionResult {
    const recommendations: string[] = [];
    const mat = this.getMaterialProps(material);

    // Cutting parameters
    const Fc = this.estimateCuttingForce(params, mat);
    const Vc_m_s = params.cutting_speed_m_min / 60;
    const cuttingPower_kW = (Fc * Vc_m_s) / 1000;

    // Default parameters
    const spindleGrowthCoeff = machineParams.spindle_thermal_growth_um_per_kW ?? 5;
    const spindlePower = machineParams.spindle_power_kW ?? cuttingPower_kW * 1.3;
    const holderLength = machineParams.holder_length_mm ?? 100;
    const chuckJawLength = machineParams.chuck_jaw_length_mm ?? 50;
    const cuttingTime = machineParams.time_cutting_min ?? 10;

    // Get temperatures
    const tempDist = this.calculateCuttingTemperature(params, material, tool, "TiAlN", coolant);
    const workSurfaceTemp = tempDist.workpiece_surface_temp_C.value;
    const T_amb = mat.initial_temp_C;

    // Material thermal expansion coefficient [1/C]
    // Typical values: steel 11e-6, aluminum 23e-6, titanium 8.5e-6
    const alpha_material = this.getMaterialAlpha(material.material_id);

    // 1. Spindle Thermal Growth
    // Growth increases with time, approaching equilibrium
    const timeConstant_min = 30; // Typical spindle thermal time constant
    const equilibriumFactor = 1 - Math.exp(-cuttingTime / timeConstant_min);
    const spindleGrowth = spindleGrowthCoeff * spindlePower * equilibriumFactor;

    // 2. Workpiece Expansion
    // deltaD = D × alpha × deltaT
    const workpieceTempRise = (workSurfaceTemp - T_amb) * 0.5; // Average through section
    const workpieceRadialExpansion = machineParams.workpiece_diameter_mm *
      alpha_material * workpieceTempRise * 1000; // Convert to um

    const workpieceAxialExpansion = machineParams.workpiece_length_mm *
      alpha_material * workpieceTempRise * 1000;

    // 3. Tool Holder Expansion
    // Heat from tool conducts into holder
    const holderTempRise = Math.max(0, (tempDist.substrate_temp_C.value - T_amb) * 0.3);
    const alpha_holder = 11e-6; // Steel holder
    const holderExpansion = Math.abs(holderLength * alpha_holder * holderTempRise * 1000);

    // 4. Chuck Jaw Expansion
    // Heat from workpiece conducts into jaws
    const chuckTempRise = workpieceTempRise * 0.2;
    const alpha_chuck = 11e-6; // Steel jaws
    const chuckExpansion = chuckJawLength * alpha_chuck * chuckTempRise * 1000;

    // Total radial error
    const radialError = Math.abs(spindleGrowth) + Math.abs(workpieceRadialExpansion / 2) +
      Math.abs(holderExpansion * 0.1); // Holder mostly affects axial

    // Total axial error
    const axialError = Math.abs(workpieceAxialExpansion) + Math.abs(holderExpansion) +
      Math.abs(chuckExpansion);

    // Combined error (RSS)
    const totalError = Math.sqrt(radialError * radialError + axialError * axialError);

    // Worst direction
    const worstDirection: "radial" | "axial" | "combined" =
      radialError > axialError * 1.5 ? "radial" :
      axialError > radialError * 1.5 ? "axial" : "combined";

    // Time to thermal equilibrium
    const equilibriumTime = timeConstant_min * 3; // ~95% of final value

    // Compensation strategy
    let strategy: "none" | "warmup" | "adaptive" | "probing" | "model_based" = "none";
    let warmupTime: number | undefined;
    let offsetAdjustment: number | undefined;
    let probeInterval: number | undefined;

    if (totalError < 5) {
      strategy = "none";
    } else if (totalError < 15) {
      strategy = "warmup";
      warmupTime = Math.ceil(timeConstant_min * 2);
    } else if (totalError < 30) {
      strategy = "probing";
      probeInterval = Math.ceil(30 / (totalError / 10));
    } else {
      strategy = "adaptive";
      offsetAdjustment = totalError * 0.8;
    }

    // Transient profile
    const transientProfile: ThermalTransient[] = [];
    for (let t = 0; t <= 60; t += 5) {
      const eqFactor = 1 - Math.exp(-t / timeConstant_min);
      const sGrowth = spindleGrowthCoeff * spindlePower * eqFactor;
      const wTemp = T_amb + (workSurfaceTemp - T_amb) * eqFactor * 0.5;
      const wExpansion = machineParams.workpiece_diameter_mm * alpha_material * (wTemp - T_amb) * 1000 / 2;
      const tError = Math.sqrt(sGrowth * sGrowth + wExpansion * wExpansion);

      transientProfile.push({
        time_min: t,
        spindle_growth_um: this.round(sGrowth, 1),
        workpiece_temp_C: this.round(wTemp, 1),
        total_error_um: this.round(tError, 1),
      });
    }

    // Recommendations
    if (totalError > 10) {
      recommendations.push(`Allow ${warmupTime ?? 20} minute warm-up before precision cuts`);
    }
    if (workpieceRadialExpansion > 10) {
      recommendations.push("Use consistent coolant temperature to minimize workpiece expansion");
    }
    if (spindleGrowth > 5) {
      recommendations.push("Monitor spindle temperature — consider spindle chiller");
    }
    if (strategy === "probing") {
      recommendations.push(`Probe workpiece every ${probeInterval} parts to track thermal drift`);
    }
    if (axialError > radialError * 1.2) {
      recommendations.push("Axial errors dominant — face critical surfaces last");
    }

    return {
      total_error_um: this.av(
        totalError,
        "um",
        totalError * 0.2,
        "RSS combination of all error sources"
      ),
      spindle_growth_um: this.av(
        spindleGrowth,
        "um",
        spindleGrowth * 0.25,
        `${spindleGrowthCoeff} um/kW × ${this.round(spindlePower, 1)} kW`
      ),
      workpiece_expansion_um: this.av(
        (workpieceRadialExpansion + workpieceAxialExpansion) / 2,
        "um",
        workpieceRadialExpansion * 0.15,
        `D × alpha × deltaT (alpha=${alpha_material * 1e6} ppm/C)`
      ),
      toolholder_expansion_um: this.av(
        holderExpansion,
        "um",
        holderExpansion * 0.3,
        "Heat conduction from tool"
      ),
      chuck_expansion_um: this.av(
        chuckExpansion,
        "um",
        chuckExpansion * 0.35,
        "Heat from workpiece"
      ),
      equilibrium_time_min: this.av(
        equilibriumTime,
        "min",
        equilibriumTime * 0.2,
        "3 × thermal time constant"
      ),
      worst_direction: worstDirection,
      axis_errors: {
        X_radial_um: this.round(radialError, 1),
        Z_axial_um: this.round(axialError, 1),
      },
      compensation: {
        strategy,
        recommended_warmup_min: warmupTime,
        offset_adjustment_um: offsetAdjustment,
        probe_interval_parts: probeInterval,
      },
      transient_profile: transientProfile,
      recommendations,
    };
  }

  /**
   * Get thermal expansion coefficient for material
   */
  private getMaterialAlpha(materialId: string): number {
    const alphaMap: Record<string, number> = {
      steel: 11e-6,
      alloy_steel: 11.5e-6,
      tool_steel: 10.5e-6,
      hardened_steel: 11e-6,
      stainless_304: 17.3e-6,
      stainless_316: 16e-6,
      cast_iron: 10.5e-6,
      ductile_iron: 11e-6,
      aluminum_6061: 23.6e-6,
      aluminum_7075: 23.4e-6,
      titanium_gr5: 8.6e-6,
      inconel_718: 13e-6,
      brass: 19e-6,
      copper_c110: 17e-6,
    };

    return alphaMap[materialId] ?? 11e-6; // Default to steel
  }

  // ========================================================================
  // COMPREHENSIVE THERMAL ANALYSIS
  // ========================================================================

  /**
   * Perform complete thermal analysis of a lathe cutting operation.
   *
   * Combines all thermal models into a comprehensive assessment:
   * - Heat generation
   * - Heat partition
   * - Temperature distribution
   * - Thermal damage
   * - Coolant optimization
   * - Thermal distortion
   *
   * @param params Cutting parameters
   * @param material Material specification
   * @param tool Tool geometry
   * @param options Analysis options
   * @returns Complete thermal analysis
   */
  analyzeComplete(
    params: CuttingParameters,
    material: MaterialSpec,
    tool: ToolGeometry,
    options?: {
      coating?: ToolCoating;
      substrate?: ToolSubstrate;
      coolant?: CoolantProperties;
      interrupted?: boolean;
      workpiece_diameter_mm?: number;
      workpiece_length_mm?: number;
      include_coolant_optimization?: boolean;
      include_distortion_prediction?: boolean;
    }
  ): ThermalAnalysisResult {
    const startTime = Date.now();
    const warnings: string[] = [];
    const recommendations: string[] = [];
    const assumptions: string[] = [];

    // Defaults
    const coating = options?.coating ?? "TiAlN";
    const substrate = options?.substrate ?? "carbide_P20";
    const coolant = options?.coolant;
    const interrupted = options?.interrupted ?? false;

    // Core analyses
    const heatGeneration = this.calculateHeatGeneration(params, material, tool);
    const heatPartition = this.predictHeatPartition(params, material, coolant);
    const temperatureDistribution = this.calculateCuttingTemperature(
      params, material, tool, coating, coolant
    );
    const thermalDamage = this.assessThermalDamage(
      params, material, tool, coating, substrate, coolant, interrupted
    );

    // Optional analyses
    let coolantOptimization: CoolantOptimizationResult | undefined;
    if (options?.include_coolant_optimization !== false) {
      coolantOptimization = this.optimizeCoolant(params, material, tool, coating);
    }

    let thermalDistortion: ThermalDistortionResult | undefined;
    if (options?.include_distortion_prediction !== false &&
        options?.workpiece_diameter_mm) {
      thermalDistortion = this.predictThermalDistortion(
        params, material, tool,
        {
          workpiece_diameter_mm: options.workpiece_diameter_mm,
          workpiece_length_mm: options.workpiece_length_mm ?? options.workpiece_diameter_mm * 2,
        },
        coolant
      );
    }

    // Collect all warnings and recommendations
    warnings.push(...heatGeneration.warnings);
    warnings.push(...heatPartition.warnings);
    warnings.push(...temperatureDistribution.warnings);
    warnings.push(...thermalDamage.warnings);

    recommendations.push(...heatPartition.recommendations);
    recommendations.push(...thermalDamage.recommendations);
    if (coolantOptimization) {
      recommendations.push(...coolantOptimization.recommendations);
    }
    if (thermalDistortion) {
      recommendations.push(...thermalDistortion.recommendations);
    }

    // De-duplicate recommendations
    const uniqueRecs = Array.from(new Set(recommendations));

    // Summary metrics
    const maxTemp = temperatureDistribution.max_interface_temp_C.value;
    const damageScore = thermalDamage.damage_risk_score.value;

    // Tool life factor (based on temperature vs coating limit)
    const coatingProps = COATING_DATABASE[coating];
    const tempRatio = maxTemp / coatingProps.max_temp_C;
    const toolLifeFactor = tempRatio < 0.8 ? 1.0 :
      tempRatio < 1.0 ? 1.0 - (tempRatio - 0.8) * 2.5 :
      Math.max(0.1, 1.0 / tempRatio);

    // Quality risk
    const qualityRisk: "low" | "moderate" | "high" =
      damageScore < 20 ? "low" :
      damageScore < 50 ? "moderate" : "high";

    // Productivity impact
    const productivityImpact: "none" | "minor" | "significant" | "severe" =
      toolLifeFactor > 0.9 ? "none" :
      toolLifeFactor > 0.7 ? "minor" :
      toolLifeFactor > 0.4 ? "significant" : "severe";

    // Assumptions
    assumptions.push("Steady-state thermal conditions assumed");
    assumptions.push("Material properties treated as temperature-independent");
    assumptions.push("Heat partition based on Loewen-Shaw model with Peclet correction");
    assumptions.push("Tool wear effects on heat generation not included");

    const calculationTime = Date.now() - startTime;

    return {
      heat_generation: heatGeneration,
      heat_partition: heatPartition,
      temperature_distribution: temperatureDistribution,
      thermal_damage: thermalDamage,
      coolant_optimization: coolantOptimization,
      thermal_distortion: thermalDistortion,
      summary: {
        max_temperature_C: this.round(maxTemp, 0),
        damage_risk_score: this.round(damageScore, 0),
        tool_life_factor: this.round(toolLifeFactor, 2),
        quality_risk: qualityRisk,
        productivity_impact: productivityImpact,
      },
      recommendations: uniqueRecs,
      warnings: Array.from(new Set(warnings)),
      metadata: {
        model_version: LatheThermodynamicsEngine.VERSION,
        calculation_time_ms: calculationTime,
        assumptions,
      },
    };
  }

  // ========================================================================
  // UTILITY METHODS
  // ========================================================================

  /**
   * Get coating database for external use
   */
  getCoatingProperties(coating: ToolCoating): CoatingProperties {
    return { ...COATING_DATABASE[coating] };
  }

  /**
   * Get all available coatings
   */
  getAvailableCoatings(): ToolCoating[] {
    return Object.keys(COATING_DATABASE) as ToolCoating[];
  }

  /**
   * Get substrate database for external use
   */
  getSubstrateProperties(substrate: ToolSubstrate): SubstrateProperties {
    return { ...SUBSTRATE_DATABASE[substrate] };
  }

  /**
   * Get all available substrates
   */
  getAvailableSubstrates(): ToolSubstrate[] {
    return Object.keys(SUBSTRATE_DATABASE) as ToolSubstrate[];
  }

  /**
   * Get coolant database for external use
   */
  getCoolantProperties(coolant: CoolantType): CoolantThermalProperties {
    return { ...COOLANT_DATABASE[coolant] };
  }

  /**
   * Get all available coolant types
   */
  getAvailableCoolants(): CoolantType[] {
    return Object.keys(COOLANT_DATABASE) as CoolantType[];
  }

  /**
   * Get phase transformation data for material
   */
  getPhaseTransformationData(materialId: string): PhaseTransformationData | undefined {
    return PHASE_TRANSFORMATION_DB[materialId]
      ? { ...PHASE_TRANSFORMATION_DB[materialId] }
      : undefined;
  }

  /**
   * Calculate homologous temperature T* for Johnson-Cook
   * T* = (T - T_room) / (T_melt - T_room)
   */
  calculateHomologousTemperature(
    temperature_C: number,
    melting_point_C: number,
    room_temp_C: number = 20
  ): number {
    const T = temperature_C + 273;
    const T_room = room_temp_C + 273;
    const T_melt = melting_point_C + 273;

    return Math.max(0, (T - T_room) / (T_melt - T_room));
  }

  /**
   * Calculate thermal softening factor [1 - T*^m]
   */
  calculateThermalSofteningFactor(
    temperature_C: number,
    melting_point_C: number,
    m: number = 1.0,
    room_temp_C: number = 20
  ): number {
    const T_star = this.calculateHomologousTemperature(
      temperature_C, melting_point_C, room_temp_C
    );

    return Math.max(0.1, 1 - Math.pow(T_star, m));
  }

  /**
   * Estimate temperature from color (heat tint) for steels
   * Returns temperature range based on visible oxidation color
   */
  estimateTemperatureFromColor(
    color: "straw" | "gold" | "purple" | "blue" | "gray" | "white"
  ): { min_C: number; max_C: number; material: string } {
    const colorMap = {
      straw: { min_C: 220, max_C: 250, material: "steel" },
      gold: { min_C: 250, max_C: 280, material: "steel" },
      purple: { min_C: 280, max_C: 310, material: "steel" },
      blue: { min_C: 310, max_C: 340, material: "steel" },
      gray: { min_C: 340, max_C: 400, material: "steel" },
      white: { min_C: 400, max_C: 500, material: "steel" },
    };

    return colorMap[color];
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

// WIRE-EXEMPT: physics calculation library (calculateHeatGeneration, predictHeatPartition,
// calculateCuttingTemperature, predictThermalDistortion, assessThermalDamage). Engine has
// been singleton-exported for ~2 months without a dispatcher consumer; reads from canonical
// COATING/SUBSTRATE/COOLANT/PHASE_TRANSFORMATION databases. Pending pipeline integration in
// the lathe thermal track — companion test file (LatheThermodynamicsEngine.test.ts, 18
// cases) exercises the deterministic public surface.
export const latheThermodynamicsEngine = new LatheThermodynamicsEngine();

// Default export
export default latheThermodynamicsEngine;
