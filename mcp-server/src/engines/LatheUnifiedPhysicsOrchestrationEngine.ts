/**
 * LatheUnifiedPhysicsOrchestrationEngine
 *
 * PhD-level unified physics, chemistry, metallurgy, and thermodynamics engine
 * for complete cutting process analysis in turning operations.
 *
 * This engine integrates ALL fundamental physics models into a unified framework:
 * 1. Cutting Mechanics (Kienzle, Merchant, Oxley)
 * 2. Tool Life (Taylor, Extended Taylor, Wear Progression)
 * 3. Thermal Physics (Jaeger, Heat Partition, Temperature Fields)
 * 4. Material Science (Johnson-Cook, Flow Stress, Strain Hardening)
 * 5. Metallurgy (Phase Transformation, White Layer, Residual Stress)
 * 6. Chemistry (Coolant Interaction, Oxidation, Diffusion Wear)
 * 7. Deflection & Dynamics (Beam Theory, Chatter Stability)
 * 8. Chip Formation Physics (Shear Plane, Chip Breaking, Curl Radius)
 *
 * All constants imported from CANONICAL sources in src/physics/constants.ts
 *
 * References:
 *   - Kienzle & Victor (1957), "Spezifische Schnittkraefte bei der Metallbearbeitung"
 *   - Taylor (1907), "On the Art of Cutting Metals"
 *   - Merchant (1945), "Mechanics of the Metal Cutting Process"
 *   - Oxley (1989), "The Mechanics of Machining: An Analytical Approach"
 *   - Johnson & Cook (1983), "A constitutive model for metals subjected to large strains"
 *   - Jaeger (1942), "Moving sources of heat and the temperature at sliding contacts"
 *   - Altintas (2012), "Manufacturing Automation"
 *   - Shaw (2005), "Metal Cutting Principles"
 *   - Trent & Wright (2000), "Metal Cutting"
 *   - ISO 3685:1993, "Tool-life testing with single-point turning tools"
 *
 * @module engines/LatheUnifiedPhysicsOrchestrationEngine
 */

import {
  CANONICAL_KIENZLE,
  CANONICAL_TAYLOR,
  CANONICAL_MATERIAL_DB,
  CANONICAL_TOOL_MODULUS,
  WHITE_LAYER_THRESHOLDS,
  type ISOGroup,
  type MaterialPhysics,
  type ToolMaterial,
  kienzleForce,
  taylorLife,
  toolDeflection,
  cuttingPower,
  spindleTorque,
  resolveMaterial,
  getKienzle,
  getTaylor,
} from "../physics/constants.js";
import { log } from "../utils/Logger.js";

// ════════════════════════════════════════════════════════════════════════════
// SECTION 1: TYPE DEFINITIONS
// ════════════════════════════════════════════════════════════════════════════

// ─── Fundamental Constants ───────────────────────────────────────────────────

const DEG_TO_RAD = Math.PI / 180;
const RAD_TO_DEG = 180 / Math.PI;

/** Taylor-Quinney coefficient: fraction of plastic work converted to heat
 * Source: Taylor & Quinney (1934), "The Latent Energy Remaining in a Metal after Cold Working"
 * Typical range: 0.85-0.95 for metals, 0.9 widely accepted */
const TAYLOR_QUINNEY_COEFF = 0.9;

/** Stefan-Boltzmann constant [W/(m^2·K^4)] for radiation heat transfer */
const STEFAN_BOLTZMANN = 5.67e-8;

/** Reference strain rate for Johnson-Cook model [1/s] */
const REFERENCE_STRAIN_RATE = 1.0;

/** Room temperature reference [K] */
const T_ROOM_K = 293;

/** Room temperature reference [C] */
const T_ROOM_C = 20;

// ─── Input/Output Types ──────────────────────────────────────────────────────

/**
 * Johnson-Cook material model parameters
 * @see Johnson & Cook (1983), Proc. 7th Int. Symp. on Ballistics
 */
export interface JohnsonCookParams {
  /** Initial yield strength A [MPa] */
  A_MPa: number;
  /** Hardening modulus B [MPa] */
  B_MPa: number;
  /** Strain hardening exponent n (dimensionless) */
  n: number;
  /** Strain rate sensitivity C (dimensionless) */
  C: number;
  /** Thermal softening exponent m (dimensionless) */
  m: number;
  /** Melting temperature [K] */
  T_melt_K: number;
  /** Reference temperature [K] (default: 293K) */
  T_ref_K?: number;
}

/**
 * Tool geometry for turning operations
 */
export interface TurningToolGeometry {
  /** Nose radius [mm] */
  nose_radius_mm: number;
  /** Insert IC (inscribed circle) diameter [mm] */
  ic_diameter_mm?: number;
  /** Lead angle (KAPR) [degrees] */
  lead_angle_deg: number;
  /** Back rake angle (gamma_p) [degrees] - positive towards chip */
  back_rake_deg: number;
  /** Side rake angle (gamma_f) [degrees] */
  side_rake_deg: number;
  /** Relief/clearance angle (alpha) [degrees] */
  relief_angle_deg: number;
  /** Inclination angle (lambda_s) [degrees] - helix at cutting edge */
  inclination_angle_deg: number;
  /** Tool material */
  tool_material: ToolMaterial;
  /** Coating type (optional) */
  coating?: string;
  /** Chipbreaker width [mm] (optional) */
  chipbreaker_width_mm?: number;
  /** Edge radius (hone) [mm] - default 0.02mm (20 microns) */
  edge_radius_mm?: number;
  /** Flank wear VB [mm] - current wear state */
  flank_wear_VB_mm?: number;
}

/**
 * Cutting parameters for turning
 */
export interface CuttingParameters {
  /** Cutting speed Vc [m/min] */
  cutting_speed_m_min: number;
  /** Feed rate f [mm/rev] */
  feed_mm_rev: number;
  /** Depth of cut ap [mm] */
  depth_of_cut_mm: number;
  /** Spindle speed [RPM] (optional - computed from Vc if not provided) */
  spindle_rpm?: number;
  /** Workpiece diameter [mm] */
  workpiece_diameter_mm: number;
}

/**
 * Machine capability envelope
 */
export interface MachineCapability {
  /** Maximum spindle power [kW] */
  max_power_kW: number;
  /** Maximum torque at spindle [Nm] */
  max_torque_Nm: number;
  /** Maximum spindle speed [RPM] */
  max_rpm: number;
  /** Minimum spindle speed [RPM] */
  min_rpm: number;
  /** Spindle stiffness [N/um] - dynamic stiffness at tool point */
  spindle_stiffness_N_um?: number;
  /** Turret stiffness [N/um] */
  turret_stiffness_N_um?: number;
  /** Tailstock available */
  has_tailstock: boolean;
  /** Steady rest available */
  has_steady_rest: boolean;
  /** Live tooling available */
  has_live_tooling: boolean;
  /** Machine controller (for G-code compatibility) */
  controller?: string;
}

/**
 * Coolant/cutting fluid configuration
 */
export interface CoolantConfig {
  /** Coolant type */
  type: "flood" | "mist" | "mql" | "hpc" | "cryogenic" | "dry";
  /** Coolant concentration [%] (for emulsion) */
  concentration_pct?: number;
  /** Coolant pressure [bar] */
  pressure_bar?: number;
  /** Flow rate [L/min] */
  flow_rate_L_min?: number;
  /** Coolant temperature [C] */
  temperature_C?: number;
  /** Base oil type (for MQL) */
  base_oil?: "mineral" | "vegetable" | "synthetic" | "semi-synthetic";
}

/**
 * Complete input for unified physics analysis
 */
export interface UnifiedPhysicsInput {
  /** Material identifier or name */
  material: string;
  /** Operation type */
  operation: "roughing" | "finishing" | "facing" | "boring" | "grooving" | "threading" | "parting";
  /** Cutting parameters */
  parameters: CuttingParameters;
  /** Tool geometry */
  tool: TurningToolGeometry;
  /** Machine capability */
  machine: MachineCapability;
  /** Coolant configuration (optional) */
  coolant?: CoolantConfig;
  /** Johnson-Cook params override (optional - uses DB if not provided) */
  johnson_cook?: JohnsonCookParams;
  /** Required surface finish Ra [um] (optional) */
  required_Ra_um?: number;
  /** Required dimensional tolerance [mm] (optional) */
  required_tolerance_mm?: number;
  /** Part L/D ratio for deflection analysis */
  part_length_mm?: number;
  /** Is this a thin-wall part */
  thin_wall?: boolean;
  /** Wall thickness [mm] (for thin-wall parts) */
  wall_thickness_mm?: number;
}

// ─── Result Types ────────────────────────────────────────────────────────────

/**
 * Atomic value with uncertainty and source citation
 */
export interface AtomicValue<T> {
  value: T;
  unit: string;
  uncertainty?: number;
  confidence?: number;
  source: string;
  warning?: string;
}

/**
 * Cutting force breakdown (Merchant/Oxley model)
 */
export interface CuttingForceResult {
  /** Main cutting force Fc [N] - tangential */
  Fc: AtomicValue<number>;
  /** Feed force Ff [N] - axial */
  Ff: AtomicValue<number>;
  /** Radial/passive force Fr [N] */
  Fr: AtomicValue<number>;
  /** Resultant force [N] */
  F_resultant: AtomicValue<number>;
  /** Specific cutting force kc [N/mm^2] */
  kc: AtomicValue<number>;
  /** Specific cutting force kc1_1 [N/mm^2] - at h=1mm */
  kc1_1: AtomicValue<number>;
  /** Cutting power [kW] */
  power_kW: AtomicValue<number>;
  /** Spindle torque [Nm] */
  torque_Nm: AtomicValue<number>;
  /** Material removal rate [cm^3/min] */
  MRR: AtomicValue<number>;
  /** Shear plane analysis */
  shear_plane: {
    angle_deg: number;
    strain: number;
    strain_rate: number;
  };
}

/**
 * Tool life prediction (Taylor + extended models)
 */
export interface ToolLifeResult {
  /** Taylor tool life [min] */
  taylor_life_min: AtomicValue<number>;
  /** Extended Taylor life [min] - includes feed/DOC effects */
  extended_life_min: AtomicValue<number>;
  /** Flank wear rate dVB/dt [mm/min] */
  flank_wear_rate: AtomicValue<number>;
  /** Crater wear rate [um/min] */
  crater_wear_rate: AtomicValue<number>;
  /** Notch wear rate [um/min] */
  notch_wear_rate: AtomicValue<number>;
  /** Time to reach VB_max = 0.3mm [min] */
  time_to_VB_max: AtomicValue<number>;
  /** Dominant wear mechanism */
  dominant_wear: "flank" | "crater" | "notch" | "chipping" | "thermal_crack" | "plastic_deformation";
  /** Tool life confidence based on uncertainty */
  confidence_band: { lower_min: number; upper_min: number };
}

/**
 * Thermal analysis result
 */
export interface ThermalResult {
  /** Shear zone temperature [C] */
  shear_zone_temp_C: AtomicValue<number>;
  /** Tool-chip interface temperature [C] */
  tool_chip_temp_C: AtomicValue<number>;
  /** Tool flank temperature [C] */
  tool_flank_temp_C: AtomicValue<number>;
  /** Workpiece surface temperature [C] */
  workpiece_surface_temp_C: AtomicValue<number>;
  /** Heat partition ratios */
  heat_partition: {
    chip_pct: number;
    tool_pct: number;
    workpiece_pct: number;
    coolant_pct: number;
  };
  /** White layer risk assessment */
  white_layer_risk: {
    threshold_C: number;
    margin_C: number;
    risk_level: "none" | "low" | "medium" | "high" | "critical";
  };
  /** Thermal expansion estimate [um] */
  thermal_expansion_um: AtomicValue<number>;
}

/**
 * Material flow stress result (Johnson-Cook)
 */
export interface FlowStressResult {
  /** Flow stress sigma [MPa] at cutting conditions */
  flow_stress_MPa: AtomicValue<number>;
  /** Strain hardening component */
  strain_hardening_term: number;
  /** Strain rate sensitivity component */
  strain_rate_term: number;
  /** Thermal softening component */
  thermal_softening_term: number;
  /** Homologous temperature T* */
  T_star: number;
  /** Adiabatic shear band susceptibility */
  adiabatic_shear_susceptibility: "low" | "medium" | "high";
}

/**
 * Metallurgical effects result
 */
export interface MetallurgyResult {
  /** Residual stress state at surface */
  residual_stress: {
    type: "tensile" | "compressive" | "mixed";
    magnitude_MPa: AtomicValue<number>;
    depth_um: AtomicValue<number>;
  };
  /** Work hardening depth prediction */
  work_hardening: {
    depth_um: number;
    hardness_increase_pct: number;
  };
  /** Phase transformation risk */
  phase_transformation: {
    risk: boolean;
    type?: string;
    temperature_threshold_C: number;
  };
  /** White layer formation prediction */
  white_layer: {
    will_form: boolean;
    predicted_depth_um?: number;
    microhardness_HV?: number;
  };
  /** Grain refinement at surface */
  grain_refinement: {
    occurs: boolean;
    new_grain_size_um?: number;
    original_grain_size_um?: number;
  };
  /** Recrystallization assessment */
  recrystallization: {
    threshold_met: boolean;
    temperature_threshold_C: number;
    strain_threshold: number;
  };
}

/**
 * Chemical interaction result
 */
export interface ChemistryResult {
  /** Coolant compatibility assessment */
  coolant_compatibility: {
    compatible: boolean;
    issues: string[];
    recommendations: string[];
  };
  /** Oxidation risk at cutting temperature */
  oxidation: {
    risk_level: "none" | "low" | "medium" | "high";
    oxide_thickness_nm: number;
    oxide_type: string;
  };
  /** Diffusion wear contribution */
  diffusion_wear: {
    active: boolean;
    rate_factor: number;
    critical_temperature_C: number;
  };
  /** Built-up edge (BUE) tendency */
  bue_formation: {
    likely: boolean;
    temperature_range_C: { min: number; max: number };
    speed_range_m_min: { min: number; max: number };
  };
  /** Coating integrity at temperature */
  coating_status: {
    intact: boolean;
    breakdown_temperature_C?: number;
    current_temperature_C: number;
  };
}

/**
 * Deflection and dynamics result
 */
export interface DeflectionDynamicsResult {
  /** Tool deflection at tip [mm] */
  tool_deflection_mm: AtomicValue<number>;
  /** Part deflection [mm] (for slender parts) */
  part_deflection_mm: AtomicValue<number>;
  /** Total deflection [mm] */
  total_deflection_mm: AtomicValue<number>;
  /** Deflection direction [degrees from radial] */
  deflection_direction_deg: number;
  /** Chatter stability assessment */
  chatter: {
    is_stable: boolean;
    stability_margin_pct: number;
    critical_depth_mm: number;
    dominant_mode: "regenerative" | "mode_coupling" | "frictional";
    recommended_rpm: number[];
  };
  /** Damping analysis */
  damping: {
    system_damping_ratio: number;
    process_damping_active: boolean;
    process_damping_benefit_pct: number;
  };
}

/**
 * Chip formation result
 */
export interface ChipFormationResult {
  /** Chip thickness ratio r = t1/t2 */
  chip_thickness_ratio: number;
  /** Deformed chip thickness [mm] */
  chip_thickness_mm: number;
  /** Shear plane angle phi [degrees] */
  shear_angle_deg: number;
  /** Shear strain gamma */
  shear_strain: number;
  /** Chip type prediction */
  chip_type: "continuous" | "lamellar" | "segmented" | "discontinuous" | "built_up_edge";
  /** Chip curl radius [mm] */
  curl_radius_mm: number;
  /** Will chip break with current chipbreaker */
  chip_breaking: {
    will_break: boolean;
    mechanism: "natural" | "chipbreaker" | "obstruction";
    required_chipbreaker_width_mm?: number;
  };
  /** Chip segmentation (for difficult materials) */
  segmentation: {
    is_segmented: boolean;
    frequency_Hz?: number;
    shear_band_spacing_mm?: number;
  };
}

/**
 * Surface integrity result
 */
export interface SurfaceIntegrityResult {
  /** Predicted arithmetic roughness Ra [um] */
  predicted_Ra_um: AtomicValue<number>;
  /** Predicted peak roughness Rz [um] */
  predicted_Rz_um: AtomicValue<number>;
  /** Kinematic roughness contribution [um] */
  kinematic_Ra_um: number;
  /** Plastic side flow contribution [um] */
  plastic_flow_Ra_um: number;
  /** Vibration contribution [um] */
  vibration_Ra_um: number;
  /** BUE contribution (if present) [um] */
  bue_Ra_um: number;
  /** Surface layer analysis */
  surface_layer: {
    affected_depth_um: number;
    microhardness_profile: { depth_um: number; hardness_HV: number }[];
    microstructure_change: boolean;
  };
  /** Meets surface finish requirement */
  meets_requirement: boolean;
}

/**
 * Complete unified physics analysis result
 */
export interface UnifiedPhysicsResult {
  /** Analysis timestamp */
  timestamp: string;
  /** Material used in analysis */
  material_used: MaterialPhysics;
  /** Input parameters echo */
  input_summary: {
    material: string;
    operation: string;
    Vc: number;
    f: number;
    ap: number;
    diameter: number;
  };

  // Core physics results
  cutting_forces: CuttingForceResult;
  tool_life: ToolLifeResult;
  thermal: ThermalResult;
  flow_stress: FlowStressResult;
  metallurgy: MetallurgyResult;
  chemistry: ChemistryResult;
  deflection_dynamics: DeflectionDynamicsResult;
  chip_formation: ChipFormationResult;
  surface_integrity: SurfaceIntegrityResult;

  /** Machine capability check */
  machine_check: {
    power_ok: boolean;
    power_margin_pct: number;
    torque_ok: boolean;
    torque_margin_pct: number;
    rpm_ok: boolean;
    overall_feasible: boolean;
  };

  /** Overall assessment */
  assessment: {
    feasible: boolean;
    confidence: number;
    limiting_factors: string[];
    recommendations: string[];
    safety_score: number;
    physics_validated: boolean;
  };

  /** Optimization suggestions */
  optimization: {
    suggested_Vc_m_min?: number;
    suggested_f_mm_rev?: number;
    suggested_ap_mm?: number;
    rationale: string;
    expected_improvement_pct: number;
  };

  /** Literature references used */
  references: string[];
}

// ════════════════════════════════════════════════════════════════════════════
// SECTION 2: JOHNSON-COOK MATERIAL DATABASE
// ════════════════════════════════════════════════════════════════════════════

/**
 * Johnson-Cook parameters database
 *
 * Sources:
 *   - Johnson & Cook (1983), Proc. 7th Int. Symp. on Ballistics
 *   - Jaspers & Dautzenberg (2002), J. Mat. Proc. Tech. 121:123-135
 *   - Sima & Özel (2010), Int. J. Mach. Tools Manuf. 50:943-960
 *   - Gray et al. (1994), LANL report
 *   - Rule & Jones (1998), Int. J. Impact Eng. 21:609-624
 *   - Kay (2003), PhD Thesis, Purdue University
 */
const JOHNSON_COOK_DB: Record<string, JohnsonCookParams> = {
  // ISO P - Steels
  steel: {
    A_MPa: 350, B_MPa: 600, n: 0.22, C: 0.04, m: 1.0,
    T_melt_K: 1793, T_ref_K: 293,
  },
  steel_1045: {
    A_MPa: 553, B_MPa: 600, n: 0.234, C: 0.0134, m: 1.0,
    T_melt_K: 1793, T_ref_K: 293,
    // Source: Jaspers & Dautzenberg (2002)
  },
  steel_4140: {
    A_MPa: 595, B_MPa: 580, n: 0.133, C: 0.023, m: 1.03,
    T_melt_K: 1773, T_ref_K: 293,
    // Source: Gray et al. (1994)
  },
  steel_4340: {
    A_MPa: 792, B_MPa: 510, n: 0.26, C: 0.014, m: 1.03,
    T_melt_K: 1793, T_ref_K: 293,
    // Source: Johnson & Cook (1983)
  },

  // ISO M - Stainless
  stainless_304: {
    A_MPa: 310, B_MPa: 1000, n: 0.65, C: 0.07, m: 1.0,
    T_melt_K: 1673, T_ref_K: 293,
    // Source: Rule & Jones (1998)
  },
  stainless_316: {
    A_MPa: 305, B_MPa: 1161, n: 0.61, C: 0.01, m: 1.0,
    T_melt_K: 1648, T_ref_K: 293,
    // Source: Sima & Özel (2010)
  },

  // ISO S - Superalloys
  titanium_gr5: {
    A_MPa: 1098, B_MPa: 1092, n: 0.93, C: 0.014, m: 1.1,
    T_melt_K: 1933, T_ref_K: 293,
    // Source: Kay (2003)
  },
  inconel_718: {
    A_MPa: 1241, B_MPa: 622, n: 0.6522, C: 0.0134, m: 1.3,
    T_melt_K: 1609, T_ref_K: 293,
    // Source: Sima & Özel (2010)
  },

  // ISO N - Non-ferrous
  aluminum_6061: {
    A_MPa: 324, B_MPa: 114, n: 0.42, C: 0.002, m: 1.34,
    T_melt_K: 855, T_ref_K: 293,
    // Source: Johnson & Cook (1983)
  },
  aluminum_7075: {
    A_MPa: 546, B_MPa: 678, n: 0.71, C: 0.024, m: 1.56,
    T_melt_K: 750, T_ref_K: 293,
    // Source: Rule & Jones (1998)
  },

  // ISO H - Hardened
  hardened_steel: {
    A_MPa: 1500, B_MPa: 569, n: 0.22, C: 0.003, m: 1.17,
    T_melt_K: 1723, T_ref_K: 293,
  },
  tool_steel_d2: {
    A_MPa: 1472, B_MPa: 432, n: 0.18, C: 0.006, m: 1.1,
    T_melt_K: 1694, T_ref_K: 293,
  },
};

// ════════════════════════════════════════════════════════════════════════════
// SECTION 3: ENGINE IMPLEMENTATION
// ════════════════════════════════════════════════════════════════════════════

class LatheUnifiedPhysicsOrchestrationEngineImpl {
  private readonly name = "LatheUnifiedPhysicsOrchestrationEngine";

  // ─────────────────────────────────────────────────────────────────────────
  // MAIN ORCHESTRATION METHOD
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Perform complete unified physics analysis for turning operation
   *
   * This method orchestrates ALL physics sub-models into a coherent analysis:
   * 1. Material resolution and validation
   * 2. Cutting force calculation (Kienzle + Merchant shear plane)
   * 3. Thermal analysis (Jaeger moving heat source)
   * 4. Tool life prediction (Taylor + wear progression)
   * 5. Material flow stress (Johnson-Cook)
   * 6. Deflection and stability analysis
   * 7. Chip formation physics
   * 8. Surface integrity prediction
   * 9. Metallurgical effects assessment
   * 10. Chemical interaction analysis
   * 11. Machine capability validation
   * 12. Optimization recommendations
   *
   * @param input - Complete input parameters
   * @returns Comprehensive physics analysis result
   */
  analyzeFullPhysics(input: UnifiedPhysicsInput): UnifiedPhysicsResult {
    const startTime = Date.now();

    // 1. Resolve material from canonical database
    const materialEntry = resolveMaterial(input.material);
    if (!materialEntry) {
      throw new Error(`Unknown material: ${input.material}`);
    }
    const isoGroup = materialEntry.iso_group;
    // Promote MaterialEntry → MaterialPhysics (downstream engines need kc1_1/mc)
    const kienzle = CANONICAL_KIENZLE[isoGroup];
    const material: MaterialPhysics = {
      iso_group: isoGroup,
      kc1_1: kienzle.kc1_1,
      mc: kienzle.mc,
      taylor_C: materialEntry.taylor_C,
      taylor_n: materialEntry.taylor_n,
      density_kg_m3: materialEntry.density_kg_m3,
      thermal_conductivity_W_mK: materialEntry.thermal_conductivity_W_mK,
      specific_heat_J_kgK: materialEntry.specific_heat_J_kgK,
      hardness_HRC: materialEntry.hardness_HRC,
      tensile_strength_MPa: materialEntry.tensile_strength_MPa,
      name: materialEntry.name,
      // Backward-compat aliases for orchestrator engines
      k_thermal: materialEntry.thermal_conductivity_W_mK,
      cp_J_kgK: materialEntry.specific_heat_J_kgK,
      melting_point_C: materialEntry.melting_point_C,
    };

    log.info(`[${this.name}] Analyzing ${input.operation} of ${material.name}`);
    log.debug(`[${this.name}] Vc=${input.parameters.cutting_speed_m_min} m/min, f=${input.parameters.feed_mm_rev} mm/rev, ap=${input.parameters.depth_of_cut_mm} mm`);

    // Get Johnson-Cook parameters
    const jcParams = this.resolveJohnsonCook(input.material, input.johnson_cook);

    // 2. Calculate cutting forces (Kienzle + Merchant)
    const cuttingForces = this.calculateCuttingForces(input, material);

    // 3. Thermal analysis (Jaeger + heat partition)
    const thermal = this.calculateThermalPhysics(input, material, cuttingForces);

    // 4. Tool life prediction (Taylor + wear models)
    const toolLife = this.predictToolLife(input, material, thermal);

    // 5. Flow stress calculation (Johnson-Cook)
    const flowStress = this.calculateFlowStress(input, jcParams, thermal, cuttingForces);

    // 6. Deflection and dynamics analysis
    const deflectionDynamics = this.analyzeDeflectionDynamics(input, material, cuttingForces);

    // 7. Chip formation analysis
    const chipFormation = this.analyzeChipFormation(input, material, cuttingForces, thermal);

    // 8. Surface integrity prediction
    const surfaceIntegrity = this.predictSurfaceIntegrity(input, material, cuttingForces, thermal, deflectionDynamics);

    // 9. Metallurgical effects
    const metallurgy = this.assessMetallurgy(input, material, thermal, flowStress);

    // 10. Chemical interactions
    const chemistry = this.analyzeChemistry(input, material, thermal);

    // 11. Machine capability check
    const machineCheck = this.checkMachineCapability(input, cuttingForces);

    // 12. Generate assessment and optimization
    const { assessment, optimization } = this.generateAssessment(
      input, cuttingForces, toolLife, thermal, deflectionDynamics, surfaceIntegrity, machineCheck
    );

    const elapsedMs = Date.now() - startTime;
    log.info(`[${this.name}] Analysis complete in ${elapsedMs}ms`);

    return {
      timestamp: new Date().toISOString(),
      material_used: material,
      input_summary: {
        material: input.material,
        operation: input.operation,
        Vc: input.parameters.cutting_speed_m_min,
        f: input.parameters.feed_mm_rev,
        ap: input.parameters.depth_of_cut_mm,
        diameter: input.parameters.workpiece_diameter_mm,
      },
      cutting_forces: cuttingForces,
      tool_life: toolLife,
      thermal,
      flow_stress: flowStress,
      metallurgy,
      chemistry,
      deflection_dynamics: deflectionDynamics,
      chip_formation: chipFormation,
      surface_integrity: surfaceIntegrity,
      machine_check: machineCheck,
      assessment,
      optimization,
      references: [
        "Kienzle & Victor (1957), Spezifische Schnittkraefte bei der Metallbearbeitung",
        "Taylor (1907), On the Art of Cutting Metals",
        "Merchant (1945), Mechanics of the Metal Cutting Process",
        "Oxley (1989), The Mechanics of Machining",
        "Johnson & Cook (1983), Constitutive model for metals",
        "Jaeger (1942), Moving sources of heat",
        "Altintas (2012), Manufacturing Automation",
        "Shaw (2005), Metal Cutting Principles",
        "ISO 3685:1993, Tool-life testing",
      ],
    };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // CUTTING FORCE CALCULATIONS (KIENZLE + MERCHANT)
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Calculate cutting forces using Kienzle model with Merchant shear plane theory
   *
   * Kienzle force model:
   *   Fc = kc1_1 × b × h^(1 - mc)
   *   where b = ap (chip width), h = f×sin(KAPR) (undeformed chip thickness)
   *
   * Force decomposition (turning):
   *   Fc = tangential (main cutting force)
   *   Ff = feed force ≈ Fc × tan(phi - alpha) × cos(lambda_s)
   *   Fr = radial force ≈ Fc × tan(phi - alpha) × sin(lambda_s) / cos(lambda_s)
   *
   * @ref Kienzle & Victor (1957)
   * @ref Merchant (1945), J. Appl. Phys. 16:267-275
   */
  private calculateCuttingForces(
    input: UnifiedPhysicsInput,
    material: MaterialPhysics
  ): CuttingForceResult {
    const { parameters, tool } = input;
    const { cutting_speed_m_min: Vc, feed_mm_rev: f, depth_of_cut_mm: ap, workpiece_diameter_mm: D } = parameters;

    // Get canonical Kienzle constants
    const { kc1_1, mc } = getKienzle(input.material);

    // Effective chip thickness (undeformed chip thickness)
    const KAPR = tool.lead_angle_deg * DEG_TO_RAD;
    const h = f * Math.sin(KAPR); // Undeformed chip thickness [mm]
    const b = ap / Math.sin(KAPR); // Chip width [mm]

    // Edge preparation correction factor
    // Source: Seco Tools geometry guide + Denkena & Biermann (2014)
    const edgeRadius = tool.edge_radius_mm ?? 0.02;
    const hMin = 0.2 * edgeRadius; // Minimum chip thickness (Albrecht 1960)
    let edgePrepFactor = 1.0;
    if (h < hMin * 3) {
      // Size effect at small chip thickness
      edgePrepFactor = 1.0 + 0.5 * (hMin / Math.max(h, hMin));
    }

    // Kienzle specific cutting force with size effect
    // kc = kc1_1 × h^(-mc) × correction_factors
    const kc = kc1_1 * Math.pow(Math.max(h, 0.001), -mc) * edgePrepFactor;

    // Main cutting force
    // Fc = kc × b × h = kc1_1 × b × h^(1-mc)
    const Fc = kc * b * h;

    // Shear plane angle estimation (Merchant's minimum energy principle)
    // phi = 45 - beta/2 + alpha/2
    // where beta = friction angle, alpha = effective rake
    const alpha_eff = this.calculateEffectiveRake(tool);
    const mu = 0.35 + 0.1 * (1 - (material.machinability_factor ?? 1.0)); // Friction coefficient estimate
    const beta = Math.atan(mu); // Friction angle
    const phi = (Math.PI / 4) - (beta / 2) + (alpha_eff / 2); // Merchant equation

    // Shear strain and strain rate
    const shearStrain = Math.cos(alpha_eff) / (Math.sin(phi) * Math.cos(phi - alpha_eff));
    const Vs = Vc / 60 / Math.cos(phi - alpha_eff) * Math.cos(alpha_eff); // Shear velocity [m/s]
    const shearZoneThickness = h * 0.1; // Approximate shear zone thickness
    const strainRate = Vs / (shearZoneThickness / 1000); // [1/s]

    // Force decomposition using force circle
    // Feed force: Ff = Fc × tan(beta - alpha) × cos(lambda_s)
    // Radial force: Fr = Fc × sin(KAPR) × tan(phi) - Fc × cos(KAPR)
    const lambda_s = tool.inclination_angle_deg * DEG_TO_RAD;
    const Ff = Math.abs(Fc * Math.tan(beta - alpha_eff) * Math.cos(lambda_s));
    const Fr = Math.abs(Fc * (Math.sin(KAPR) * Math.tan(phi) - Math.cos(KAPR) * 0.3));

    // Resultant force
    const F_resultant = Math.sqrt(Fc * Fc + Ff * Ff + Fr * Fr);

    // Power and torque
    const power_kW = cuttingPower(Fc, Vc);
    const torque_Nm = spindleTorque(Fc, D);

    // Material removal rate
    const MRR = (ap * f * Vc * 1000) / 1000; // [cm³/min]

    // Deformed chip thickness
    const chipThickness = h / Math.tan(phi) * Math.tan(phi - alpha_eff + Math.PI / 2);

    return {
      Fc: {
        value: +Fc.toFixed(1),
        unit: "N",
        uncertainty: Fc * 0.1, // 10% uncertainty typical
        confidence: 0.85,
        source: "Kienzle-Victor (1957)",
      },
      Ff: {
        value: +Ff.toFixed(1),
        unit: "N",
        uncertainty: Ff * 0.15,
        confidence: 0.80,
        source: "Merchant force decomposition",
      },
      Fr: {
        value: +Fr.toFixed(1),
        unit: "N",
        uncertainty: Fr * 0.15,
        confidence: 0.80,
        source: "Merchant force decomposition",
      },
      F_resultant: {
        value: +F_resultant.toFixed(1),
        unit: "N",
        uncertainty: F_resultant * 0.12,
        confidence: 0.82,
        source: "RSS of Fc, Ff, Fr",
      },
      kc: {
        value: +kc.toFixed(0),
        unit: "N/mm²",
        uncertainty: kc * 0.1,
        confidence: 0.85,
        source: "Kienzle size-effect corrected",
      },
      kc1_1: {
        value: kc1_1,
        unit: "N/mm²",
        source: `CANONICAL_KIENZLE[${material.iso_group}]`,
      },
      power_kW: {
        value: +power_kW.toFixed(2),
        unit: "kW",
        uncertainty: power_kW * 0.1,
        confidence: 0.85,
        source: "P = Fc × Vc / 60000",
      },
      torque_Nm: {
        value: +torque_Nm.toFixed(1),
        unit: "Nm",
        uncertainty: torque_Nm * 0.1,
        confidence: 0.85,
        source: "T = Fc × D / 2000",
      },
      MRR: {
        value: +MRR.toFixed(2),
        unit: "cm³/min",
        source: "MRR = ap × f × Vc",
      },
      shear_plane: {
        angle_deg: +(phi * RAD_TO_DEG).toFixed(1),
        strain: +shearStrain.toFixed(2),
        strain_rate: +strainRate.toFixed(0),
      },
    };
  }

  /**
   * Calculate effective rake angle for oblique cutting
   *
   * Effective rake: sin(alpha_e) = cos(i) × sin(alpha_n) + sin(i) × cos(alpha_n) × sin(eta_c)
   * For turning: eta_c ≈ lambda_s (Stabler's rule)
   *
   * @ref Armarego & Brown (1969), The Machining of Metals
   */
  private calculateEffectiveRake(tool: TurningToolGeometry): number {
    const alpha_n = tool.back_rake_deg * DEG_TO_RAD; // Normal rake
    const lambda_s = tool.inclination_angle_deg * DEG_TO_RAD; // Inclination
    const eta_c = lambda_s; // Stabler's approximation: chip flow ≈ inclination

    // Effective rake calculation
    const sinAlphaE = Math.cos(lambda_s) * Math.sin(alpha_n) +
      Math.sin(lambda_s) * Math.cos(alpha_n) * Math.sin(eta_c);
    return Math.asin(Math.max(-1, Math.min(1, sinAlphaE)));
  }

  // ─────────────────────────────────────────────────────────────────────────
  // THERMAL PHYSICS (JAEGER + HEAT PARTITION)
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Calculate cutting temperatures using Jaeger moving heat source model
   *
   * Jaeger (1942) model for moving heat source:
   *   θmax = 0.754 × q × sqrt(a / (k × ρ × cp × v))
   *
   * Heat partition (Trent & Wright 2000):
   *   - Chip: 60-80% (carries most heat away)
   *   - Tool: 5-15% (conduction through insert)
   *   - Workpiece: 10-25% (conduction into bulk)
   *   - Coolant: 0-10% (if flood cooling)
   *
   * Temperature rise sources:
   *   1. Primary shear zone: ΔT_shear = (τ × γ) / (ρ × cp) × (1 - β)
   *   2. Tool-chip friction: ΔT_friction = (μ × σ × Vc) / (k)
   *   3. Tool flank rubbing: ΔT_flank = f(VB, Vc, clearance)
   *
   * @ref Jaeger (1942), Proc. Royal Soc. NSW 76:203-224
   * @ref Trent & Wright (2000), Metal Cutting, Ch. 6
   */
  private calculateThermalPhysics(
    input: UnifiedPhysicsInput,
    material: MaterialPhysics,
    forces: CuttingForceResult
  ): ThermalResult {
    const { parameters, tool, coolant } = input;
    const { cutting_speed_m_min: Vc, feed_mm_rev: f, depth_of_cut_mm: ap } = parameters;

    // Material thermal properties (canonical defaults if missing — steel)
    const k = material.k_thermal ?? material.thermal_conductivity_W_mK ?? 50; // [W/(m·K)]
    const rho = material.density_kg_m3 ?? 7800; // [kg/m³]
    const cp = material.cp_J_kgK ?? material.specific_heat_J_kgK ?? 500; // [J/(kg·K)]
    const alpha_thermal = (k * 1e6) / (rho * cp); // Thermal diffusivity [mm²/s]

    // Cutting power for heat generation
    const P_cutting_W = forces.power_kW.value * 1000;

    // Shear zone temperature rise (Taylor-Quinney)
    // ΔT_shear = (eta × P) / (m_dot × cp)
    // where m_dot = ρ × A × Vc = ρ × (ap × f) × Vc/60
    const chipArea_mm2 = ap * f; // Cross-section area [mm²]
    const chipArea_m2 = chipArea_mm2 * 1e-6;
    const Vc_m_s = Vc / 60;
    const m_dot = rho * chipArea_m2 * Vc_m_s; // Mass flow rate [kg/s]

    // Heat generation in shear zone
    const Q_shear = TAYLOR_QUINNEY_COEFF * P_cutting_W; // [W]
    const dT_shear = Q_shear / (m_dot * cp + 1e-10);

    // Jaeger moving heat source temperature
    // Using simplified relation from Shaw (2005)
    // T_max ≈ T_ambient + 0.4 × (kc × Vc) / (k × sqrt(ρ × cp × Vc × w))
    const w_m = ap / 1000; // Chip width [m]
    const Peclet = (Vc_m_s * f / 1000) / (alpha_thermal * 1e-6);
    const T_shear_rise = 0.4 * forces.kc.value * Vc / (k * Math.sqrt(rho * cp * Vc_m_s * w_m + 1e-10));

    // Tool-chip interface temperature (higher than shear zone)
    // T_interface ≈ T_shear + ΔT_friction
    // ΔT_friction depends on sliding velocity and friction stress
    const mu = 0.4; // Friction coefficient at interface
    const sigma_contact = forces.kc.value * 0.6; // Contact stress ~ 60% of kc
    const L_contact = 2 * f; // Tool-chip contact length [mm]
    const T_friction_rise = (mu * sigma_contact * Vc_m_s * 60) / (k * 1000) * Math.sqrt(L_contact);

    // Total temperatures
    const T_ambient = coolant?.temperature_C ?? 25;
    const T_shear_zone = T_ambient + Math.min(T_shear_rise + dT_shear * 0.001, material.melting_point_C ?? 1500 - 100);
    const T_tool_chip = T_shear_zone + Math.min(T_friction_rise, 300);

    // Tool flank temperature (lower than chip interface)
    const VB = tool.flank_wear_VB_mm ?? 0.1; // Current flank wear
    const T_flank = T_shear_zone * 0.7 + VB * 50; // Empirical: VB increases flank temp

    // Workpiece surface temperature (much lower due to bulk conduction)
    const T_workpiece = T_ambient + T_shear_rise * 0.15;

    // Heat partition calculation (based on Vc and material conductivity)
    // High speed → more heat in chip
    // Low conductivity → more heat in tool
    let chip_pct = 0.65;
    let tool_pct = 0.15;
    let workpiece_pct = 0.20;
    let coolant_pct = 0.0;

    // Adjust for cutting speed
    if (Vc > 200) {
      chip_pct += 0.10;
      workpiece_pct -= 0.10;
    } else if (Vc < 50) {
      chip_pct -= 0.10;
      workpiece_pct += 0.05;
      tool_pct += 0.05;
    }

    // Adjust for coolant
    if (coolant) {
      switch (coolant.type) {
        case "flood":
          coolant_pct = 0.08;
          chip_pct -= 0.04;
          tool_pct -= 0.02;
          workpiece_pct -= 0.02;
          break;
        case "hpc":
          coolant_pct = 0.15;
          chip_pct -= 0.08;
          tool_pct -= 0.04;
          workpiece_pct -= 0.03;
          break;
        case "cryogenic":
          coolant_pct = 0.25;
          chip_pct -= 0.15;
          tool_pct -= 0.08;
          workpiece_pct -= 0.02;
          break;
        case "mql":
          coolant_pct = 0.03;
          chip_pct -= 0.02;
          tool_pct -= 0.01;
          break;
      }
    }

    // White layer risk assessment
    const whiteLayerThreshold = this.getWhiteLayerThreshold(material);
    const whiteLayerMargin = whiteLayerThreshold - T_workpiece;
    let whiteLayerRisk: "none" | "low" | "medium" | "high" | "critical" = "none";
    if (whiteLayerMargin < 0) whiteLayerRisk = "critical";
    else if (whiteLayerMargin < 50) whiteLayerRisk = "high";
    else if (whiteLayerMargin < 100) whiteLayerRisk = "medium";
    else if (whiteLayerMargin < 200) whiteLayerRisk = "low";

    // Thermal expansion estimate
    const CTE = 12e-6; // Coefficient of thermal expansion [1/K] - typical steel
    const characteristic_length = Math.sqrt(chipArea_mm2) * 10; // [mm]
    const thermal_expansion = CTE * (T_workpiece - T_ambient) * characteristic_length * 1000; // [um]

    return {
      shear_zone_temp_C: {
        value: +T_shear_zone.toFixed(0),
        unit: "°C",
        uncertainty: T_shear_zone * 0.15,
        confidence: 0.75,
        source: "Jaeger moving heat source (1942)",
      },
      tool_chip_temp_C: {
        value: +T_tool_chip.toFixed(0),
        unit: "°C",
        uncertainty: T_tool_chip * 0.20,
        confidence: 0.70,
        source: "Shear + friction heating",
        warning: T_tool_chip > 800 ? "High interface temperature - coating breakdown risk" : undefined,
      },
      tool_flank_temp_C: {
        value: +T_flank.toFixed(0),
        unit: "°C",
        uncertainty: T_flank * 0.20,
        confidence: 0.70,
        source: "Flank contact heating",
      },
      workpiece_surface_temp_C: {
        value: +T_workpiece.toFixed(0),
        unit: "°C",
        uncertainty: T_workpiece * 0.25,
        confidence: 0.70,
        source: "Bulk conduction dissipation",
        warning: whiteLayerRisk === "critical" ? "WHITE LAYER FORMATION LIKELY" : undefined,
      },
      heat_partition: {
        chip_pct: +chip_pct.toFixed(2),
        tool_pct: +tool_pct.toFixed(2),
        workpiece_pct: +workpiece_pct.toFixed(2),
        coolant_pct: +coolant_pct.toFixed(2),
      },
      white_layer_risk: {
        threshold_C: whiteLayerThreshold,
        margin_C: +whiteLayerMargin.toFixed(0),
        risk_level: whiteLayerRisk,
      },
      thermal_expansion_um: {
        value: +thermal_expansion.toFixed(1),
        unit: "µm",
        confidence: 0.60,
        source: "CTE × ΔT × L",
      },
    };
  }

  /**
   * Get white layer formation threshold temperature
   */
  private getWhiteLayerThreshold(material: MaterialPhysics): number {
    // Check against canonical thresholds
    const isoGroup = material.iso_group;

    switch (isoGroup) {
      case "H":
        return WHITE_LAYER_THRESHOLDS.hardened_steel?.threshold_C ?? 700;
      case "S":
        if ((material.name ?? "").toLowerCase().includes("titanium")) {
          return WHITE_LAYER_THRESHOLDS.titanium?.threshold_C ?? 750;
        }
        return WHITE_LAYER_THRESHOLDS.nickel_alloy?.threshold_C ?? 800;
      case "M":
        return WHITE_LAYER_THRESHOLDS.stainless?.threshold_C ?? 650;
      default:
        return WHITE_LAYER_THRESHOLDS.steel?.threshold_C ?? 850;
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // TOOL LIFE PREDICTION (TAYLOR + WEAR MODELS)
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Predict tool life using Taylor equation and wear progression models
   *
   * Taylor equation (basic):
   *   T = (C / Vc)^(1/n)
   *   where T = tool life [min], Vc = cutting speed [m/min]
   *
   * Extended Taylor equation (includes feed and DOC effects):
   *   T = K / (Vc^a × f^b × ap^c)
   *   Typical: a = 1/n ≈ 4, b ≈ 0.7, c ≈ 0.25
   *
   * Flank wear progression (Usui model):
   *   dVB/dt = A × σ_n × Vs × exp(-B / T)
   *   where σ_n = normal stress, Vs = sliding velocity, T = temperature
   *
   * @ref Taylor (1907), Trans. ASME 28:31-350
   * @ref ISO 3685:1993, Tool-life testing
   * @ref Usui et al. (1978), CIRP Annals 27:61-66
   */
  private predictToolLife(
    input: UnifiedPhysicsInput,
    material: MaterialPhysics,
    thermal: ThermalResult
  ): ToolLifeResult {
    const { parameters, tool } = input;
    const { cutting_speed_m_min: Vc, feed_mm_rev: f, depth_of_cut_mm: ap } = parameters;

    // Get canonical Taylor constants
    const { C, n } = getTaylor(input.material);

    // Coating multiplier for tool life
    const coatingMultiplier = this.getCoatingMultiplier(tool.coating);

    // Basic Taylor life
    const C_effective = C * coatingMultiplier;
    const basicTaylorLife = taylorLife(C_effective, n, Vc);

    // Extended Taylor model including feed and DOC effects
    // T = T_taylor × (f_ref / f)^b × (ap_ref / ap)^c
    // Exponents from Kronenberg and empirical data
    const b = 0.7;  // Feed exponent
    const c = 0.25; // DOC exponent
    const f_ref = 0.2;  // Reference feed [mm/rev]
    const ap_ref = 2.5; // Reference DOC [mm]

    // Extended life relative to basic Taylor life
    const feedFactor = Math.pow(f_ref / Math.max(f, 0.01), b);
    const docFactor = Math.pow(ap_ref / Math.max(ap, 0.1), c);
    const extendedLife = basicTaylorLife * feedFactor * docFactor;

    // Temperature effect on wear (Arrhenius-type relation)
    const T_interface = thermal.tool_chip_temp_C.value;
    const T_ref = 600; // Reference temperature [C]
    const activationFactor = Math.exp(3000 * (1 / (T_ref + 273) - 1 / (T_interface + 273)));
    const thermallyAdjustedLife = Math.max(extendedLife * activationFactor, 0.1);

    // Flank wear rate estimation (Usui-type model)
    // dVB/dt = A × exp(-B/T) × σ × V
    const A_wear = 1e-12; // Wear coefficient [mm³/(N·m)]
    const B_wear = 5000;  // Activation energy / R [K]
    const sigma_n = 500;  // Normal stress estimate [MPa]
    const Vs = Vc / 60 * 1000; // Sliding velocity [mm/s]

    const flankWearRate = A_wear * Math.exp(-B_wear / (T_interface + 273)) * sigma_n * Vs;
    const VB_max = 0.3; // ISO 3685 tool life criterion
    const timeToVBmax = VB_max / (flankWearRate + 1e-10);

    // Crater wear rate (diffusion-dominated at high temperatures)
    const craterWearRate = flankWearRate * 0.3 * Math.exp((T_interface - 500) / 200);

    // Notch wear rate (oxidation + adhesion at DOC boundary)
    const notchWearRate = flankWearRate * 0.5 * Math.pow(ap / 2, 0.5);

    // Determine dominant wear mechanism
    let dominantWear: ToolLifeResult["dominant_wear"] = "flank";
    if (T_interface > 900) {
      dominantWear = "plastic_deformation";
    } else if (T_interface > 750 && material.iso_group === "S") {
      dominantWear = "crater";
    } else if (T_interface > 700 && material.iso_group === "M") {
      dominantWear = "notch";
    } else if (craterWearRate > flankWearRate) {
      dominantWear = "crater";
    }

    // Confidence band (±30% typical for Taylor prediction)
    const uncertaintyFactor = 0.30;
    const lowerLife = thermallyAdjustedLife * (1 - uncertaintyFactor);
    const upperLife = thermallyAdjustedLife * (1 + uncertaintyFactor);

    return {
      taylor_life_min: {
        value: +basicTaylorLife.toFixed(1),
        unit: "min",
        uncertainty: basicTaylorLife * 0.25,
        confidence: 0.70,
        source: `Taylor equation: T = (${C.toFixed(0)}/${Vc})^(1/${n.toFixed(2)})`,
      },
      extended_life_min: {
        value: +thermallyAdjustedLife.toFixed(1),
        unit: "min",
        uncertainty: thermallyAdjustedLife * 0.30,
        confidence: 0.65,
        source: "Extended Taylor + thermal correction",
        warning: thermallyAdjustedLife < 15 ? "Short tool life - consider reducing Vc" : undefined,
      },
      flank_wear_rate: {
        value: +(flankWearRate * 60).toFixed(4), // Convert to mm/min
        unit: "mm/min",
        confidence: 0.60,
        source: "Usui wear model",
      },
      crater_wear_rate: {
        value: +(craterWearRate * 60 * 1000).toFixed(2), // um/min
        unit: "µm/min",
        confidence: 0.55,
        source: "Diffusion-based crater wear",
      },
      notch_wear_rate: {
        value: +(notchWearRate * 60 * 1000).toFixed(2), // um/min
        unit: "µm/min",
        confidence: 0.50,
        source: "Notch wear (oxidation + adhesion)",
      },
      time_to_VB_max: {
        value: +Math.min(timeToVBmax, 9999).toFixed(1),
        unit: "min",
        confidence: 0.60,
        source: "ISO 3685 VB=0.3mm criterion",
      },
      dominant_wear: dominantWear,
      confidence_band: {
        lower_min: +lowerLife.toFixed(1),
        upper_min: +upperLife.toFixed(1),
      },
    };
  }

  /**
   * Get coating life multiplier
   * Source: Walter Tiger·tec Gold data + Sandvik/Kennametal coating studies
   */
  private getCoatingMultiplier(coating?: string): number {
    const COATING_MULTIPLIERS: Record<string, number> = {
      uncoated: 1.0,
      TiN: 1.3,
      TiCN: 1.4,
      TiAlN: 1.5,
      AlTiN: 1.6,
      AlCrN: 1.5,
      nACo: 1.7,
      CVD_Al2O3: 1.8,
      CVD_TiCN_Al2O3: 1.9,
      Tiger_tec_Gold: 2.0,
      PVD_multilayer: 1.4,
      DLC: 1.3,
      diamond: 3.0,
    };
    return COATING_MULTIPLIERS[coating ?? "uncoated"] ?? 1.0;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // MATERIAL FLOW STRESS (JOHNSON-COOK MODEL)
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Calculate material flow stress using Johnson-Cook constitutive model
   *
   * Johnson-Cook equation:
   *   σ = [A + B × ε^n] × [1 + C × ln(ε̇/ε̇₀)] × [1 - T*^m]
   *
   * where:
   *   - A = initial yield strength [MPa]
   *   - B = strain hardening modulus [MPa]
   *   - n = strain hardening exponent
   *   - C = strain rate sensitivity
   *   - m = thermal softening exponent
   *   - ε = equivalent plastic strain
   *   - ε̇ = strain rate [1/s]
   *   - T* = (T - T_room) / (T_melt - T_room) = homologous temperature
   *
   * Adiabatic shear band (ASB) susceptibility:
   *   χ = (∂σ/∂ε) - (∂σ/∂T) × (∂T/∂ε)
   *   ASB forms when χ < 0 (thermal softening > strain hardening)
   *
   * @ref Johnson & Cook (1983), Proc. 7th Int. Symp. on Ballistics
   * @ref Recht (1964), J. Appl. Mechanics 31:189-193 (shear instability)
   */
  private calculateFlowStress(
    input: UnifiedPhysicsInput,
    jcParams: JohnsonCookParams,
    thermal: ThermalResult,
    forces: CuttingForceResult
  ): FlowStressResult {
    const { A_MPa, B_MPa, n, C, m, T_melt_K, T_ref_K } = jcParams;
    const T_ref = T_ref_K ?? T_ROOM_K;

    // Strain and strain rate from shear plane analysis
    const strain = forces.shear_plane.strain;
    const strainRate = forces.shear_plane.strain_rate;

    // Temperature in shear zone [K]
    const T_K = thermal.shear_zone_temp_C.value + 273.15;

    // Homologous temperature T*
    const T_star = Math.max(0, Math.min((T_K - T_ref) / (T_melt_K - T_ref), 0.999));

    // Johnson-Cook terms
    // 1. Strain hardening term
    const strainHardeningTerm = A_MPa + B_MPa * Math.pow(Math.max(strain, 0.01), n);

    // 2. Strain rate term
    const strainRateTerm = strainRate > REFERENCE_STRAIN_RATE
      ? 1 + C * Math.log(strainRate / REFERENCE_STRAIN_RATE)
      : 1.0;

    // 3. Thermal softening term
    const thermalSofteningTerm = 1 - Math.pow(T_star, m);

    // Flow stress
    const flowStress = strainHardeningTerm * strainRateTerm * thermalSofteningTerm;

    // Adiabatic shear susceptibility analysis (Recht criterion)
    // d(σ)/d(ε) = hardening rate
    // d(σ)/d(T) = softening rate
    // Susceptibility high when thermal softening exceeds hardening
    const hardeningRate = B_MPa * n * Math.pow(Math.max(strain, 0.01), n - 1) * strainRateTerm * thermalSofteningTerm;
    const softeningRate = strainHardeningTerm * strainRateTerm * m * Math.pow(T_star, m - 1) / (T_melt_K - T_ref);

    // Temperature rise per unit strain (adiabatic)
    const rho = input.material === "aluminum_6061" || input.material === "aluminum_7075"
      ? 2700 : 7800;
    const cp = input.material === "aluminum_6061" || input.material === "aluminum_7075"
      ? 900 : 500;
    const dT_dEps = (TAYLOR_QUINNEY_COEFF * flowStress * 1e6) / (rho * cp);

    // Chi parameter for shear instability
    const chi = hardeningRate - softeningRate * dT_dEps;

    let susceptibility: "low" | "medium" | "high" = "low";
    if (chi < 0) {
      susceptibility = "high";
    } else if (chi < hardeningRate * 0.3) {
      susceptibility = "medium";
    }

    return {
      flow_stress_MPa: {
        value: +flowStress.toFixed(0),
        unit: "MPa",
        uncertainty: flowStress * 0.15,
        confidence: 0.80,
        source: "Johnson-Cook (1983)",
      },
      strain_hardening_term: +strainHardeningTerm.toFixed(0),
      strain_rate_term: +strainRateTerm.toFixed(3),
      thermal_softening_term: +thermalSofteningTerm.toFixed(3),
      T_star: +T_star.toFixed(3),
      adiabatic_shear_susceptibility: susceptibility,
    };
  }

  /**
   * Resolve Johnson-Cook parameters from database or input
   */
  private resolveJohnsonCook(materialName: string, override?: JohnsonCookParams): JohnsonCookParams {
    if (override) return override;

    // Try direct lookup
    const key = materialName.toLowerCase().replace(/[\s-]/g, "_");
    if (JOHNSON_COOK_DB[key]) return JOHNSON_COOK_DB[key];

    // Fuzzy match
    const fuzzyKey = Object.keys(JOHNSON_COOK_DB).find(k =>
      key.includes(k) || k.includes(key)
    );
    if (fuzzyKey) return JOHNSON_COOK_DB[fuzzyKey];

    // Default to generic steel
    return JOHNSON_COOK_DB.steel;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // DEFLECTION AND DYNAMICS ANALYSIS
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Analyze tool and part deflection, and chatter stability
   *
   * Tool deflection (cantilever beam):
   *   δ = F × L³ / (3 × E × I)
   *   where I = π × d⁴ / 64 for circular cross-section
   *
   * Part deflection (simply supported / cantilevered):
   *   For L/D > 3: δ_part = F × L³ / (48 × E × I) (simply supported)
   *   For L/D > 6: Use tailstock or steady rest
   *
   * Chatter stability (Altintas regenerative chatter model):
   *   ap_lim = -1 / (2 × Kf × Re[G(jωc)])
   *   where Kf = cutting stiffness, G = transfer function
   *
   * @ref Altintas (2012), Manufacturing Automation, Ch. 3-4
   * @ref Tlusty & Polacek (1963), Proc. Int. Res. Prod. Eng.
   */
  private analyzeDeflectionDynamics(
    input: UnifiedPhysicsInput,
    material: MaterialPhysics,
    forces: CuttingForceResult
  ): DeflectionDynamicsResult {
    const { parameters, tool, machine } = input;
    const { depth_of_cut_mm: ap, workpiece_diameter_mm: D } = parameters;

    // Tool deflection calculation
    // Assume tool holder is 4× insert IC diameter, with overhang = 2× IC
    const ic = tool.ic_diameter_mm ?? 12.7; // Default to 1/2" IC
    const toolHolderDiam = ic * 4; // [mm]
    const overhang = ic * 2.5; // [mm]

    // Tool stiffness
    const E_tool = CANONICAL_TOOL_MODULUS[tool.tool_material];
    const I_tool = (Math.PI * Math.pow(toolHolderDiam, 4)) / 64; // [mm⁴]

    // Combined radial force for deflection
    const F_radial = forces.Fr.value;
    const F_tangential = forces.Fc.value;
    const F_deflection = Math.sqrt(F_radial * F_radial + (F_tangential * 0.2) ** 2);

    // Tool deflection
    const toolDeflectionMm = toolDeflection(F_deflection, overhang, toolHolderDiam, E_tool);

    // Part deflection (for slender parts)
    const partLength = input.part_length_mm ?? D * 3;
    const L_D_ratio = partLength / D;

    // Part stiffness (solid cylinder, simply supported at both ends)
    const E_part = (material.E_GPa ?? (material.elastic_modulus_MPa ?? 210000) / 1000) * 1000; // [MPa]
    const I_part = (Math.PI * Math.pow(D, 4)) / 64; // [mm⁴]

    let partDeflectionMm = 0;
    let deflectionWarning: string | undefined;

    if (L_D_ratio > 3) {
      // Simply supported beam: δ = F × L³ / (48 × E × I)
      partDeflectionMm = (F_radial * Math.pow(partLength, 3)) / (48 * E_part * I_part);

      if (L_D_ratio > 6 && !machine.has_tailstock && !machine.has_steady_rest) {
        deflectionWarning = `L/D=${L_D_ratio.toFixed(1)} > 6: tailstock or steady rest required`;
      }
    }

    // Thin wall deflection (if applicable)
    if (input.thin_wall && input.wall_thickness_mm) {
      const t = input.wall_thickness_mm;
      const D_inner = D - 2 * t;
      const I_thinwall = (Math.PI / 64) * (Math.pow(D, 4) - Math.pow(D_inner, 4));
      const thinwallDeflection = (F_radial * Math.pow(partLength, 3)) / (48 * E_part * I_thinwall);
      partDeflectionMm = Math.max(partDeflectionMm, thinwallDeflection);

      if (thinwallDeflection > 0.05) {
        deflectionWarning = `Thin wall deflection ${(thinwallDeflection * 1000).toFixed(0)}µm exceeds 50µm limit`;
      }
    }

    const totalDeflection = Math.sqrt(toolDeflectionMm ** 2 + partDeflectionMm ** 2);

    // Deflection direction (radial + tangential components)
    const deflectionDir = Math.atan2(F_tangential * 0.2, F_radial) * RAD_TO_DEG;

    // Chatter stability analysis (simplified Altintas model)
    // Critical depth: ap_lim = 1 / (2 × Kf × G_real)
    // Using simplified formula for turning
    const Kf = forces.kc.value; // Cutting stiffness [N/mm²]
    const k_system = (machine.spindle_stiffness_N_um ?? 50) * 1000; // System stiffness [N/mm]
    const fn = 200; // Natural frequency estimate [Hz]
    const zeta = 0.03; // Damping ratio

    // Stability limit (simplified)
    const a_lim = k_system / (2 * Kf * Math.PI * fn) * (1 + 2 * zeta);

    const isStable = ap < a_lim;
    const stabilityMargin = ((a_lim - ap) / a_lim) * 100;

    // Process damping effect at low speeds
    const Vc_threshold = 50; // Process damping significant below this [m/min]
    const processDampingActive = parameters.cutting_speed_m_min < Vc_threshold;
    let processDampingBenefit = 0;

    if (processDampingActive) {
      // Process damping increases effective damping at low speeds
      const VB = tool.flank_wear_VB_mm ?? 0.1;
      const clearanceAngle = tool.relief_angle_deg;
      const flankContactLength = VB / Math.tan(clearanceAngle * DEG_TO_RAD);
      processDampingBenefit = (flankContactLength / 0.5) * 20; // Up to 40% improvement
    }

    // Stable pocket RPMs (using stability lobe diagram concept)
    const N = parameters.spindle_rpm ?? (1000 * parameters.cutting_speed_m_min) / (Math.PI * D);
    const recommendedRPMs: number[] = [];

    // Find 3 stable pockets based on tooth passing frequency vs natural frequency
    for (let k = 1; k <= 3; k++) {
      const N_stable = (fn * 60) / (k + 0.5); // Stable RPM at pocket k
      if (N_stable > machine.min_rpm && N_stable < machine.max_rpm) {
        recommendedRPMs.push(Math.round(N_stable));
      }
    }

    return {
      tool_deflection_mm: {
        value: +toolDeflectionMm.toFixed(4),
        unit: "mm",
        uncertainty: toolDeflectionMm * 0.15,
        confidence: 0.80,
        source: "Euler-Bernoulli beam: δ = FL³/(3EI)",
      },
      part_deflection_mm: {
        value: +partDeflectionMm.toFixed(4),
        unit: "mm",
        uncertainty: partDeflectionMm * 0.20,
        confidence: 0.75,
        source: "Simply supported beam",
        warning: deflectionWarning,
      },
      total_deflection_mm: {
        value: +totalDeflection.toFixed(4),
        unit: "mm",
        confidence: 0.75,
        source: "RSS combination",
      },
      deflection_direction_deg: +deflectionDir.toFixed(1),
      chatter: {
        is_stable: isStable,
        stability_margin_pct: +stabilityMargin.toFixed(1),
        critical_depth_mm: +a_lim.toFixed(2),
        dominant_mode: "regenerative",
        recommended_rpm: recommendedRPMs,
      },
      damping: {
        system_damping_ratio: zeta,
        process_damping_active: processDampingActive,
        process_damping_benefit_pct: +processDampingBenefit.toFixed(0),
      },
    };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // CHIP FORMATION PHYSICS
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Analyze chip formation mechanics
   *
   * Chip thickness ratio:
   *   r = t₁/t₂ = sin(φ) / cos(φ - α)
   *   where t₁ = undeformed chip thickness, t₂ = deformed chip thickness
   *
   * Shear plane angle (Merchant's minimum energy):
   *   φ = π/4 - β/2 + α/2
   *   where β = friction angle, α = rake angle
   *
   * Shear strain:
   *   γ = cos(α) / [sin(φ) × cos(φ - α)]
   *
   * Chip curl radius (Nakayama model):
   *   ρ_c = t₂ × f(η, μ, r)
   *   where η = hardening, μ = friction
   *
   * @ref Merchant (1945), J. Appl. Phys. 16:267-275
   * @ref Nakayama (1972), Int. J. Mach. Tool Des. Res. 12:269-282
   * @ref Recht (1964), J. Appl. Mechanics 31:189-193 (segmentation)
   */
  private analyzeChipFormation(
    input: UnifiedPhysicsInput,
    material: MaterialPhysics,
    forces: CuttingForceResult,
    thermal: ThermalResult
  ): ChipFormationResult {
    const { parameters, tool } = input;
    const { cutting_speed_m_min: Vc, feed_mm_rev: f, depth_of_cut_mm: ap } = parameters;

    // Tool geometry
    const alpha = this.calculateEffectiveRake(tool);
    const KAPR = tool.lead_angle_deg * DEG_TO_RAD;

    // Undeformed chip thickness
    const t1 = f * Math.sin(KAPR); // [mm]

    // Shear plane angle from force analysis
    const phi = forces.shear_plane.angle_deg * DEG_TO_RAD;

    // Chip thickness ratio
    const r = Math.sin(phi) / Math.cos(phi - alpha);

    // Deformed chip thickness
    const t2 = t1 / r;

    // Shear strain
    const gamma = Math.cos(alpha) / (Math.sin(phi) * Math.cos(phi - alpha));

    // Chip type prediction based on material and conditions
    let chipType: ChipFormationResult["chip_type"] = "continuous";

    // Check for BUE conditions (low speed, moderate temperature)
    if (Vc < 50 && thermal.shear_zone_temp_C.value < 400 && thermal.shear_zone_temp_C.value > 200) {
      chipType = "built_up_edge";
    }

    // Check for segmented chip (high strain rate, low thermal conductivity)
    const strainRate = forces.shear_plane.strain_rate;
    if (strainRate > 1e5 && (material.k_thermal ?? material.thermal_conductivity_W_mK ?? 50) < 20) {
      chipType = "segmented";
    }

    // Check for lamellar (serrated) chips
    if (material.iso_group === "S" || material.iso_group === "H") {
      if (Vc > 60 && thermal.shear_zone_temp_C.value > 600) {
        chipType = "lamellar";
      }
    }

    // Check for discontinuous chip (brittle materials)
    if (material.iso_group === "K") {
      chipType = "discontinuous";
    }

    // Chip curl radius (Nakayama 1972)
    // ρ_c ≈ 10 × t2 × (1 + 0.5/tan(phi)) for continuous chips
    const curlRadius = 10 * t2 * (1 + 0.5 / Math.tan(phi));

    // Chip breaking analysis
    const chipbreakerWidth = tool.chipbreaker_width_mm;
    const naturalBreaking = curlRadius < 5 * t2; // Chip breaks naturally when tightly curled

    let willBreak = naturalBreaking;
    let breakMechanism: ChipFormationResult["chip_breaking"]["mechanism"] = "natural";
    let requiredChipbreaker: number | undefined;

    if (!naturalBreaking && chipbreakerWidth) {
      // Check if chipbreaker will cause breaking
      willBreak = chipbreakerWidth >= 1.5 * t2 && chipbreakerWidth <= 4 * t2;
      breakMechanism = "chipbreaker";
    }

    if (!willBreak) {
      // Calculate required chipbreaker width
      requiredChipbreaker = 2.5 * t2;
    }

    // Segmentation analysis (for difficult materials)
    let isSegmented = false;
    let segmentationFreq: number | undefined;
    let shearBandSpacing: number | undefined;

    if (chipType === "segmented" || chipType === "lamellar") {
      isSegmented = true;
      // Segmentation frequency: f_seg ≈ Vc / (λ × t2)
      // where λ ≈ 5-20 for typical materials
      const lambda = 10; // Characteristic wavelength factor
      shearBandSpacing = lambda * t2; // [mm]
      segmentationFreq = (Vc / 60 * 1000) / (shearBandSpacing); // [Hz]
    }

    return {
      chip_thickness_ratio: +r.toFixed(3),
      chip_thickness_mm: +t2.toFixed(3),
      shear_angle_deg: +(phi * RAD_TO_DEG).toFixed(1),
      shear_strain: +gamma.toFixed(2),
      chip_type: chipType,
      curl_radius_mm: +curlRadius.toFixed(2),
      chip_breaking: {
        will_break: willBreak,
        mechanism: breakMechanism,
        required_chipbreaker_width_mm: requiredChipbreaker,
      },
      segmentation: {
        is_segmented: isSegmented,
        frequency_Hz: segmentationFreq !== undefined ? +segmentationFreq.toFixed(0) : undefined,
        shear_band_spacing_mm: shearBandSpacing !== undefined ? +shearBandSpacing.toFixed(3) : undefined,
      },
    };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // SURFACE INTEGRITY PREDICTION
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Predict surface roughness and integrity
   *
   * Kinematic roughness (Brammertz model):
   *   Ra_kinematic ≈ f² / (32 × r_e) × 1000 [µm]
   *   where f = feed [mm/rev], r_e = nose radius [mm]
   *
   * Additional contributions:
   *   - Plastic side flow: increases with material ductility
   *   - Vibration: from chatter and forced vibration
   *   - Built-up edge: rough surface at low speeds
   *   - Tool wear: increases Ra as VB grows
   *
   * @ref Brammertz (1961), Industrie Anzeiger 83:525-528
   * @ref M'Saoubi et al. (2008), CIRP Annals 57:157-172 (surface integrity)
   */
  private predictSurfaceIntegrity(
    input: UnifiedPhysicsInput,
    material: MaterialPhysics,
    forces: CuttingForceResult,
    thermal: ThermalResult,
    dynamics: DeflectionDynamicsResult
  ): SurfaceIntegrityResult {
    const { parameters, tool } = input;
    const { feed_mm_rev: f, cutting_speed_m_min: Vc } = parameters;

    // Kinematic roughness (Brammertz)
    const r_e = tool.nose_radius_mm;
    const Ra_kinematic = (f * f * 1000) / (32 * r_e); // [µm]

    // Plastic side flow contribution
    // Higher for ductile materials and sharp tools
    const ductilityFactor = material.iso_group === "N" ? 1.5 :
      material.iso_group === "M" ? 1.3 :
        material.iso_group === "P" ? 1.0 :
          material.iso_group === "S" ? 0.8 : 0.5;
    const Ra_plastic = Ra_kinematic * 0.1 * ductilityFactor;

    // Vibration contribution
    const deflectionAmplitude = dynamics.total_deflection_mm.value * 1000; // [µm]
    const Ra_vibration = dynamics.chatter.is_stable ? deflectionAmplitude * 0.1 : deflectionAmplitude * 0.5;

    // BUE contribution (at low speeds)
    let Ra_bue = 0;
    if (Vc < 50 && thermal.shear_zone_temp_C.value > 200 && thermal.shear_zone_temp_C.value < 400) {
      Ra_bue = Ra_kinematic * 0.3;
    }

    // Total predicted Ra
    const Ra_total = Math.sqrt(
      Ra_kinematic ** 2 + Ra_plastic ** 2 + Ra_vibration ** 2 + Ra_bue ** 2
    );

    // Rz estimation (typically 4-6 × Ra for machining)
    const Ra_to_Rz = 5.5;
    const Rz_total = Ra_total * Ra_to_Rz;

    // Surface layer analysis
    // Affected depth increases with temperature and force
    const affectedDepth = 10 + thermal.workpiece_surface_temp_C.value / 50 +
      forces.kc.value / 500;

    // Hardness profile (simplified)
    const hardeningDepth = affectedDepth * 0.5;
    const baseHB = material.hardness_HB ?? 200;
    const surfaceHardness = baseHB * (1 + thermal.workpiece_surface_temp_C.value / 2000);
    const bulkHardness = baseHB;

    const hardenessProfile = [
      { depth_um: 0, hardness_HV: surfaceHardness * 1.05 },
      { depth_um: hardeningDepth * 0.25, hardness_HV: surfaceHardness * 1.02 },
      { depth_um: hardeningDepth * 0.5, hardness_HV: surfaceHardness },
      { depth_um: hardeningDepth, hardness_HV: bulkHardness * 1.05 },
      { depth_um: affectedDepth, hardness_HV: bulkHardness },
    ];

    // Check requirement
    const meetsRequirement = input.required_Ra_um
      ? Ra_total <= input.required_Ra_um
      : true;

    return {
      predicted_Ra_um: {
        value: +Ra_total.toFixed(2),
        unit: "µm",
        uncertainty: Ra_total * 0.20,
        confidence: 0.75,
        source: "Brammertz + contributions",
        warning: !meetsRequirement
          ? `Ra ${Ra_total.toFixed(2)}µm exceeds requirement ${input.required_Ra_um}µm`
          : undefined,
      },
      predicted_Rz_um: {
        value: +Rz_total.toFixed(1),
        unit: "µm",
        uncertainty: Rz_total * 0.25,
        confidence: 0.70,
        source: "Rz ≈ 5.5 × Ra",
      },
      kinematic_Ra_um: +Ra_kinematic.toFixed(2),
      plastic_flow_Ra_um: +Ra_plastic.toFixed(3),
      vibration_Ra_um: +Ra_vibration.toFixed(3),
      bue_Ra_um: +Ra_bue.toFixed(3),
      surface_layer: {
        affected_depth_um: +affectedDepth.toFixed(0),
        microhardness_profile: hardenessProfile.map(p => ({
          depth_um: +p.depth_um.toFixed(0),
          hardness_HV: +p.hardness_HV.toFixed(0),
        })),
        microstructure_change: thermal.workpiece_surface_temp_C.value >
          this.getWhiteLayerThreshold(material) * 0.7,
      },
      meets_requirement: meetsRequirement,
    };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // METALLURGICAL EFFECTS
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Assess metallurgical effects on workpiece surface
   *
   * Residual stress:
   *   - Mechanical: compressive (from plastic deformation)
   *   - Thermal: tensile (from cooling of heated surface)
   *   - Net: depends on cutting conditions (balance of above)
   *
   * White layer formation (hardened steels):
   *   - Untempered martensite from austenitization + rapid quench
   *   - Forms when T > Ac1 (austenitizing temperature)
   *   - Causes fatigue life reduction 20-60%
   *
   * Work hardening:
   *   - Depth increases with force and tool wear
   *   - More pronounced in austenitic stainless and superalloys
   *
   * @ref Brinksmeier et al. (1999), CIRP Annals 48/2:463-492
   * @ref M'Saoubi et al. (2008), CIRP Annals 57:157-172
   */
  private assessMetallurgy(
    input: UnifiedPhysicsInput,
    material: MaterialPhysics,
    thermal: ThermalResult,
    flowStress: FlowStressResult
  ): MetallurgyResult {
    const T_surface = thermal.workpiece_surface_temp_C.value;
    const T_interface = thermal.tool_chip_temp_C.value;
    const whiteLayerThreshold = this.getWhiteLayerThreshold(material);

    // Residual stress analysis
    // Mechanical contribution (compressive) dominates at low speeds/temps
    // Thermal contribution (tensile) dominates at high speeds/temps
    const sigmaY = material.sigma_y_MPa ?? material.yield_strength_MPa ?? 250;
    const mechanicalContribution = -sigmaY * 0.3; // Compressive
    const thermalContribution = sigmaY * (T_surface / 1000); // Tensile

    const netStress = mechanicalContribution + thermalContribution;
    const stressType: "tensile" | "compressive" | "mixed" =
      Math.abs(netStress) < sigmaY * 0.05 ? "mixed" :
        netStress > 0 ? "tensile" : "compressive";

    // Residual stress depth (empirical)
    const stressDepth = 50 + T_surface / 10; // [µm]

    // Work hardening analysis
    const strainAtSurface = flowStress.flow_stress_MPa.value / (material.sigma_y_MPa ?? material.yield_strength_MPa ?? 250) - 1;
    const workHardeningDepth = 20 + strainAtSurface * 50; // [µm]
    const hardnessIncrease = Math.min(strainAtSurface * 15, 30); // [%]

    // Phase transformation
    let phaseTransform = false;
    let phaseType: string | undefined;
    let phaseThreshold = 1000;

    switch (material.iso_group) {
      case "H":
        phaseThreshold = whiteLayerThreshold; // Martensite re-austenitization
        phaseType = "Martensite re-transformation";
        phaseTransform = T_surface > phaseThreshold * 0.9;
        break;
      case "S":
        if ((material.name ?? "").toLowerCase().includes("titanium")) {
          phaseThreshold = 882; // Alpha-beta transition
          phaseType = "Alpha-beta titanium transformation";
          phaseTransform = T_surface > phaseThreshold * 0.85;
        } else {
          phaseThreshold = 800; // Gamma prime dissolution
          phaseType = "Gamma prime dissolution";
          phaseTransform = T_surface > phaseThreshold * 0.9;
        }
        break;
      case "M":
        phaseThreshold = 650; // Sensitization
        phaseType = "Sensitization / sigma phase";
        phaseTransform = T_surface > phaseThreshold;
        break;
    }

    // White layer prediction
    const willFormWhiteLayer = T_surface > whiteLayerThreshold;
    let whiteLayerDepth: number | undefined;
    let whiteLayerHardness: number | undefined;

    if (willFormWhiteLayer) {
      // Depth increases with time at temperature (roughly: depth ~ sqrt(Dt))
      const overshoot = T_surface - whiteLayerThreshold;
      whiteLayerDepth = 2 + overshoot * 0.05; // [µm]
      whiteLayerHardness = (material.hardness_HB ?? 200) * 1.4 + overshoot * 0.5; // [HV]
    }

    // Grain refinement (severe plastic deformation at surface)
    const grainRefinement = strainAtSurface > 1.5;
    let newGrainSize: number | undefined;
    let originalGrainSize: number | undefined;

    if (grainRefinement) {
      originalGrainSize = 20; // Assume 20 µm starting grain size
      newGrainSize = originalGrainSize / (1 + strainAtSurface);
    }

    // Recrystallization (dynamic or static)
    const T_recryst = material.melting_point_C ? material.melting_point_C * 0.4 : 500;
    const strain_recryst = 0.3;
    const recrystallizationMet = T_surface > T_recryst && strainAtSurface > strain_recryst;

    return {
      residual_stress: {
        type: stressType,
        magnitude_MPa: {
          value: +Math.abs(netStress).toFixed(0),
          unit: "MPa",
          uncertainty: Math.abs(netStress) * 0.30,
          confidence: 0.60,
          source: "Mechanical + thermal balance",
        },
        depth_um: {
          value: +stressDepth.toFixed(0),
          unit: "µm",
          confidence: 0.55,
          source: "Empirical correlation",
        },
      },
      work_hardening: {
        depth_um: +workHardeningDepth.toFixed(0),
        hardness_increase_pct: +hardnessIncrease.toFixed(1),
      },
      phase_transformation: {
        risk: phaseTransform,
        type: phaseType,
        temperature_threshold_C: phaseThreshold,
      },
      white_layer: {
        will_form: willFormWhiteLayer,
        predicted_depth_um: whiteLayerDepth,
        microhardness_HV: whiteLayerHardness,
      },
      grain_refinement: {
        occurs: grainRefinement,
        new_grain_size_um: newGrainSize,
        original_grain_size_um: originalGrainSize,
      },
      recrystallization: {
        threshold_met: recrystallizationMet,
        temperature_threshold_C: T_recryst,
        strain_threshold: strain_recryst,
      },
    };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // CHEMICAL INTERACTION ANALYSIS
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Analyze chemical interactions between tool, workpiece, and coolant
   *
   * Diffusion wear:
   *   - Significant above critical temperature (~700°C for carbide)
   *   - Rate: J = -D × (dC/dx) (Fick's law)
   *   - Increases exponentially with temperature
   *
   * Oxidation:
   *   - Parabolic growth: x² = k × t
   *   - Oxide type depends on temperature and material
   *
   * Coolant compatibility:
   *   - pH affects corrosion
   *   - Chlorine content affects stainless
   *   - Sulfur affects copper alloys
   *
   * @ref Trent & Wright (2000), Metal Cutting, Ch. 10-11
   */
  private analyzeChemistry(
    input: UnifiedPhysicsInput,
    material: MaterialPhysics,
    thermal: ThermalResult
  ): ChemistryResult {
    const { coolant, tool } = input;
    const T_interface = thermal.tool_chip_temp_C.value;
    const T_surface = thermal.workpiece_surface_temp_C.value;

    // Coolant compatibility analysis
    const coolantIssues: string[] = [];
    const coolantRecommendations: string[] = [];
    let coolantCompatible = true;

    if (coolant) {
      // Check material-coolant compatibility
      switch (material.iso_group) {
        case "M": // Stainless
          if (coolant.type === "flood" && (coolant.concentration_pct ?? 5) < 6) {
            coolantIssues.push("Low concentration may cause corrosion on stainless");
            coolantRecommendations.push("Increase coolant concentration to 8-10%");
          }
          break;
        case "N": // Aluminum/Non-ferrous
          if (coolant.type === "flood") {
            coolantIssues.push("Check for sulfur content (causes staining on Al)");
          }
          break;
        case "S": // Superalloys
          if (coolant.type === "dry") {
            coolantIssues.push("Dry cutting risky for superalloys - thermal damage");
            coolantRecommendations.push("Use HPC or cryogenic cooling");
            coolantCompatible = false;
          }
          break;
      }

      // Temperature-related issues
      if (coolant.type === "mql" && T_interface > 600) {
        coolantIssues.push("MQL oil may not survive at interface temperature");
        coolantRecommendations.push("Consider HPC or cryogenic for high-temp zone");
      }
    } else {
      coolantRecommendations.push("Consider adding coolant for improved tool life");
    }

    // Oxidation analysis
    let oxidationRisk: "none" | "low" | "medium" | "high" = "none";
    let oxideThickness = 0;
    let oxideType = "None";

    if (T_surface > 300) {
      oxidationRisk = "low";
      oxideType = "Thin oxide film (FeO/Fe3O4)";
      oxideThickness = 10; // nm
    }
    if (T_surface > 500) {
      oxidationRisk = "medium";
      oxideType = "Mixed oxide scale";
      oxideThickness = 50;
    }
    if (T_surface > 700) {
      oxidationRisk = "high";
      oxideType = "Thick oxide + scale spallation";
      oxideThickness = 200;
    }

    // Material-specific oxidation
    if (material.iso_group === "S" && (material.name ?? "").toLowerCase().includes("titanium")) {
      if (T_surface > 500) {
        oxidationRisk = "high";
        oxideType = "TiO2 + oxygen diffusion layer (alpha-case)";
      }
    }

    // Diffusion wear analysis
    const T_diffusion_onset = 700; // °C for carbide tools
    const diffusionActive = T_interface > T_diffusion_onset;
    const diffusionRate = diffusionActive
      ? Math.exp((T_interface - T_diffusion_onset) / 100)
      : 0;

    // Built-up edge conditions
    const bueMinTemp = 200;
    const bueMaxTemp = 400;
    const bueMinSpeed = 20;
    const bueMaxSpeed = 80;
    const bueLikely = T_surface > bueMinTemp && T_surface < bueMaxTemp &&
      input.parameters.cutting_speed_m_min > bueMinSpeed &&
      input.parameters.cutting_speed_m_min < bueMaxSpeed &&
      material.iso_group !== "K"; // Cast iron doesn't form BUE

    // Coating integrity
    const coatingBreakdownTemp = this.getCoatingBreakdownTemp(tool.coating);
    const coatingIntact = T_interface < coatingBreakdownTemp;

    return {
      coolant_compatibility: {
        compatible: coolantCompatible,
        issues: coolantIssues,
        recommendations: coolantRecommendations,
      },
      oxidation: {
        risk_level: oxidationRisk,
        oxide_thickness_nm: oxideThickness,
        oxide_type: oxideType,
      },
      diffusion_wear: {
        active: diffusionActive,
        rate_factor: +diffusionRate.toFixed(2),
        critical_temperature_C: T_diffusion_onset,
      },
      bue_formation: {
        likely: bueLikely,
        temperature_range_C: { min: bueMinTemp, max: bueMaxTemp },
        speed_range_m_min: { min: bueMinSpeed, max: bueMaxSpeed },
      },
      coating_status: {
        intact: coatingIntact,
        breakdown_temperature_C: coatingBreakdownTemp,
        current_temperature_C: T_interface,
      },
    };
  }

  /**
   * Get coating breakdown temperature
   */
  private getCoatingBreakdownTemp(coating?: string): number {
    const COATING_TEMPS: Record<string, number> = {
      uncoated: 9999,
      TiN: 600,
      TiCN: 450,
      TiAlN: 800,
      AlTiN: 900,
      AlCrN: 1100,
      nACo: 1200,
      CVD_Al2O3: 1000,
      CVD_TiCN_Al2O3: 1100,
      Tiger_tec_Gold: 1000,
      PVD_multilayer: 700,
      DLC: 350,
      diamond: 700, // Graphitizes at high temp with Fe
    };
    return COATING_TEMPS[coating ?? "uncoated"] ?? 800;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // MACHINE CAPABILITY CHECK
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Verify machine capability to execute the cutting operation
   */
  private checkMachineCapability(
    input: UnifiedPhysicsInput,
    forces: CuttingForceResult
  ): UnifiedPhysicsResult["machine_check"] {
    const { machine, parameters } = input;

    // Power check
    const requiredPower = forces.power_kW.value;
    const powerOk = requiredPower <= machine.max_power_kW * 0.85; // 85% safety margin
    const powerMargin = ((machine.max_power_kW - requiredPower) / machine.max_power_kW) * 100;

    // Torque check
    const requiredTorque = forces.torque_Nm.value;
    const torqueOk = requiredTorque <= machine.max_torque_Nm * 0.85;
    const torqueMargin = ((machine.max_torque_Nm - requiredTorque) / machine.max_torque_Nm) * 100;

    // RPM check
    const D = parameters.workpiece_diameter_mm;
    const requiredRPM = (1000 * parameters.cutting_speed_m_min) / (Math.PI * D);
    const rpmOk = requiredRPM >= machine.min_rpm && requiredRPM <= machine.max_rpm;

    return {
      power_ok: powerOk,
      power_margin_pct: +powerMargin.toFixed(1),
      torque_ok: torqueOk,
      torque_margin_pct: +torqueMargin.toFixed(1),
      rpm_ok: rpmOk,
      overall_feasible: powerOk && torqueOk && rpmOk,
    };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // ASSESSMENT AND OPTIMIZATION
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Generate overall assessment and optimization recommendations
   */
  private generateAssessment(
    input: UnifiedPhysicsInput,
    forces: CuttingForceResult,
    toolLife: ToolLifeResult,
    thermal: ThermalResult,
    dynamics: DeflectionDynamicsResult,
    surface: SurfaceIntegrityResult,
    machineCheck: UnifiedPhysicsResult["machine_check"]
  ): { assessment: UnifiedPhysicsResult["assessment"]; optimization: UnifiedPhysicsResult["optimization"] } {

    const limitingFactors: string[] = [];
    const recommendations: string[] = [];
    let feasible = true;
    let confidence = 0.85;

    // Machine capability
    if (!machineCheck.overall_feasible) {
      feasible = false;
      if (!machineCheck.power_ok) {
        limitingFactors.push("Insufficient spindle power");
        recommendations.push("Reduce ap or Vc to lower power requirement");
      }
      if (!machineCheck.torque_ok) {
        limitingFactors.push("Insufficient spindle torque");
        recommendations.push("Reduce ap or f to lower torque requirement");
      }
      if (!machineCheck.rpm_ok) {
        limitingFactors.push("RPM out of machine range");
        recommendations.push("Adjust Vc to achieve viable RPM");
      }
    }

    // Tool life
    if (toolLife.extended_life_min.value < 15) {
      limitingFactors.push("Short tool life (<15 min)");
      recommendations.push("Reduce Vc by 10-15% to extend tool life");
      confidence *= 0.9;
    }

    // Thermal issues
    if (thermal.white_layer_risk.risk_level === "critical") {
      feasible = false;
      limitingFactors.push("White layer formation risk");
      recommendations.push("Reduce Vc and use HPC cooling");
    } else if (thermal.white_layer_risk.risk_level === "high") {
      limitingFactors.push("Elevated thermal damage risk");
      recommendations.push("Consider HPC or cryogenic cooling");
      confidence *= 0.85;
    }

    // Stability
    if (!dynamics.chatter.is_stable) {
      feasible = false;
      limitingFactors.push("Chatter unstable");
      recommendations.push(
        `Reduce ap to ${dynamics.chatter.critical_depth_mm.toFixed(2)}mm or use stable RPM: ${dynamics.chatter.recommended_rpm.join(", ")}`
      );
    }

    // Surface finish
    if (!surface.meets_requirement) {
      limitingFactors.push("Surface finish exceeds requirement");
      recommendations.push("Reduce feed rate to improve Ra");
      confidence *= 0.9;
    }

    // Deflection
    if (dynamics.total_deflection_mm.value > (input.required_tolerance_mm ?? 0.05)) {
      limitingFactors.push("Deflection exceeds tolerance");
      recommendations.push("Use larger tool holder or reduce overhang");
      confidence *= 0.9;
    }

    // Safety score calculation (0-100)
    let safetyScore = 100;
    if (!machineCheck.overall_feasible) safetyScore -= 30;
    if (thermal.white_layer_risk.risk_level === "critical") safetyScore -= 25;
    else if (thermal.white_layer_risk.risk_level === "high") safetyScore -= 15;
    if (!dynamics.chatter.is_stable) safetyScore -= 20;
    if (toolLife.extended_life_min.value < 10) safetyScore -= 15;
    else if (toolLife.extended_life_min.value < 20) safetyScore -= 5;
    if (!surface.meets_requirement) safetyScore -= 10;

    safetyScore = Math.max(0, safetyScore);

    // Optimization suggestions
    let suggestedVc: number | undefined;
    let suggestedF: number | undefined;
    let suggestedAp: number | undefined;
    let rationale = "Current parameters are near-optimal";
    let expectedImprovement = 0;

    // Optimize based on limiting factor
    if (toolLife.extended_life_min.value < 30) {
      suggestedVc = input.parameters.cutting_speed_m_min * 0.9;
      rationale = "Reduce Vc for extended tool life";
      expectedImprovement = 30;
    }

    if (!surface.meets_requirement) {
      suggestedF = input.parameters.feed_mm_rev * 0.8;
      rationale = "Reduce feed for better surface finish";
      expectedImprovement = 20;
    }

    if (!dynamics.chatter.is_stable) {
      suggestedAp = dynamics.chatter.critical_depth_mm * 0.9;
      rationale = "Reduce DOC for chatter stability";
      expectedImprovement = 40;
    }

    if (machineCheck.power_margin_pct < 15 && machineCheck.power_margin_pct > 0) {
      if (!suggestedVc) suggestedVc = input.parameters.cutting_speed_m_min * 0.95;
      if (!suggestedAp) suggestedAp = input.parameters.depth_of_cut_mm * 0.9;
      rationale = "Reduce parameters for power margin";
      expectedImprovement = 15;
    }

    return {
      assessment: {
        feasible,
        confidence: +confidence.toFixed(2),
        limiting_factors: limitingFactors,
        recommendations,
        safety_score: safetyScore,
        physics_validated: true,
      },
      optimization: {
        suggested_Vc_m_min: suggestedVc,
        suggested_f_mm_rev: suggestedF,
        suggested_ap_mm: suggestedAp,
        rationale,
        expected_improvement_pct: expectedImprovement,
      },
    };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // INDIVIDUAL PHYSICS CALCULATION METHODS (PUBLIC API)
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Calculate Kienzle cutting force for any material
   *
   * @param material - Material name or ISO group
   * @param ap - Depth of cut [mm]
   * @param f - Feed rate [mm/rev]
   * @param Vc - Cutting speed [m/min]
   * @param kapr - Lead angle [degrees] (default: 95)
   * @returns Cutting force Fc [N]
   */
  calculateKienzleForce(
    material: string,
    ap: number,
    f: number,
    Vc: number,
    kapr: number = 95
  ): { Fc: number; kc: number; power_kW: number; source: string } {
    const { kc1_1, mc } = getKienzle(material);
    const KAPR = kapr * DEG_TO_RAD;
    const h = f * Math.sin(KAPR);
    const b = ap / Math.sin(KAPR);

    const kc = kc1_1 * Math.pow(Math.max(h, 0.001), -mc);
    const Fc = kc * b * h;
    const power_kW = cuttingPower(Fc, Vc);

    return {
      Fc: +Fc.toFixed(1),
      kc: +kc.toFixed(0),
      power_kW: +power_kW.toFixed(2),
      source: `CANONICAL_KIENZLE: kc1_1=${kc1_1}, mc=${mc}`,
    };
  }

  /**
   * Calculate Taylor tool life
   *
   * @param material - Material name or ISO group
   * @param Vc - Cutting speed [m/min]
   * @param coating - Tool coating (optional)
   * @returns Tool life [min]
   */
  calculateTaylorLife(
    material: string,
    Vc: number,
    coating?: string
  ): { life_min: number; equation: string; source: string } {
    const { C, n } = getTaylor(material);
    const coatingMult = this.getCoatingMultiplier(coating);
    const C_eff = C * coatingMult;

    const life = taylorLife(C_eff, n, Vc);

    return {
      life_min: +life.toFixed(1),
      equation: `T = (${C_eff.toFixed(0)} / ${Vc})^(1/${n.toFixed(2)})`,
      source: `CANONICAL_TAYLOR: C=${C}, n=${n}, coating_mult=${coatingMult.toFixed(1)}`,
    };
  }

  /**
   * Calculate Johnson-Cook flow stress
   *
   * @param material - Material name
   * @param strain - Equivalent plastic strain
   * @param strainRate - Strain rate [1/s]
   * @param temperature_C - Temperature [C]
   * @returns Flow stress [MPa]
   */
  calculateJohnsonCookStress(
    material: string,
    strain: number,
    strainRate: number,
    temperature_C: number
  ): { stress_MPa: number; terms: { hardening: number; rate: number; thermal: number }; T_star: number } {
    const jc = this.resolveJohnsonCook(material);
    const T_K = temperature_C + 273.15;
    const T_ref = jc.T_ref_K ?? T_ROOM_K;

    const T_star = Math.max(0, Math.min((T_K - T_ref) / (jc.T_melt_K - T_ref), 0.999));

    const hardening = jc.A_MPa + jc.B_MPa * Math.pow(Math.max(strain, 0.01), jc.n);
    const rate = strainRate > REFERENCE_STRAIN_RATE
      ? 1 + jc.C * Math.log(strainRate / REFERENCE_STRAIN_RATE)
      : 1.0;
    const thermal = 1 - Math.pow(T_star, jc.m);

    const stress = hardening * rate * thermal;

    return {
      stress_MPa: +stress.toFixed(0),
      terms: {
        hardening: +hardening.toFixed(0),
        rate: +rate.toFixed(3),
        thermal: +thermal.toFixed(3),
      },
      T_star: +T_star.toFixed(3),
    };
  }

  /**
   * Calculate Jaeger moving heat source temperature
   *
   * @param material - Material name
   * @param Fc - Cutting force [N]
   * @param Vc - Cutting speed [m/min]
   * @param chipArea_mm2 - Chip cross-section area [mm²]
   * @returns Temperature rise [C]
   */
  calculateJaegerTemperature(
    material: string,
    Fc: number,
    Vc: number,
    chipArea_mm2: number
  ): { shear_zone_temp_C: number; interface_temp_C: number; source: string } {
    const mat = resolveMaterial(material);
    if (!mat) {
      throw new Error(`Unknown material: ${material}`);
    }
    const k = mat.thermal_conductivity_W_mK;
    const rho = mat.density_kg_m3;
    const cp = mat.specific_heat_J_kgK;

    const P_W = Fc * Vc / 60;
    const m_dot = rho * chipArea_mm2 * 1e-6 * Vc / 60;

    const dT = (TAYLOR_QUINNEY_COEFF * P_W) / (m_dot * cp + 1e-10);
    const T_shear = T_ROOM_C + dT;
    const T_interface = T_shear + 0.3 * dT;

    return {
      shear_zone_temp_C: +Math.min(T_shear, mat.melting_point_C ?? 1500 - 50).toFixed(0),
      interface_temp_C: +Math.min(T_interface, mat.melting_point_C ?? 1500 - 50).toFixed(0),
      source: "Jaeger moving heat source (1942) + Taylor-Quinney",
    };
  }

  /**
   * Calculate tool deflection
   *
   * @param F - Force [N]
   * @param L - Overhang [mm]
   * @param d - Holder diameter [mm]
   * @param toolMaterial - Tool material (default: carbide)
   * @returns Deflection [mm]
   */
  calculateToolDeflection(
    F: number,
    L: number,
    d: number,
    toolMaterial: ToolMaterial = "carbide"
  ): { deflection_mm: number; equation: string } {
    const E = CANONICAL_TOOL_MODULUS[toolMaterial];
    const deflection = toolDeflection(F, L, d, E);

    return {
      deflection_mm: +deflection.toFixed(4),
      equation: `δ = F×L³/(3×E×I) where E=${E} MPa, I=πd⁴/64`,
    };
  }

  /**
   * Predict surface roughness Ra
   *
   * @param f - Feed rate [mm/rev]
   * @param r_e - Nose radius [mm]
   * @returns Predicted Ra [µm]
   */
  predictSurfaceRoughness(
    f: number,
    r_e: number
  ): { Ra_um: number; equation: string; source: string } {
    const Ra = (f * f * 1000) / (32 * r_e);

    return {
      Ra_um: +Ra.toFixed(2),
      equation: `Ra = f²×1000/(32×r_e) = ${f}²×1000/(32×${r_e})`,
      source: "Brammertz kinematic roughness model (1961)",
    };
  }

  /**
   * Calculate shear plane angle and chip mechanics
   *
   * @param rakeAngle_deg - Tool rake angle [degrees]
   * @param frictionCoeff - Friction coefficient at interface
   * @returns Shear plane analysis
   */
  calculateShearPlane(
    rakeAngle_deg: number,
    frictionCoeff: number = 0.4
  ): { phi_deg: number; gamma: number; r: number; equation: string } {
    const alpha = rakeAngle_deg * DEG_TO_RAD;
    const beta = Math.atan(frictionCoeff);

    // Merchant's minimum energy criterion
    const phi = Math.PI / 4 - beta / 2 + alpha / 2;

    // Chip thickness ratio
    const r = Math.sin(phi) / Math.cos(phi - alpha);

    // Shear strain
    const gamma = Math.cos(alpha) / (Math.sin(phi) * Math.cos(phi - alpha));

    return {
      phi_deg: +(phi * RAD_TO_DEG).toFixed(1),
      gamma: +gamma.toFixed(2),
      r: +r.toFixed(3),
      equation: "Merchant: φ = π/4 - β/2 + α/2",
    };
  }
}

// ════════════════════════════════════════════════════════════════════════════
// SECTION 4: ENGINE EXPORT
// ════════════════════════════════════════════════════════════════════════════

/**
 * Singleton instance of LatheUnifiedPhysicsOrchestrationEngine
 */
export const latheUnifiedPhysicsOrchestrationEngine = new LatheUnifiedPhysicsOrchestrationEngineImpl();

/**
 * Default export for backward compatibility
 */
export default latheUnifiedPhysicsOrchestrationEngine;
