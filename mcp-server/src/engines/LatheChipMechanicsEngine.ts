/**
 * LatheChipMechanicsEngine - Comprehensive Chip Formation Physics for Turning
 *
 * Models chip formation mechanics specific to lathe/turning operations:
 * - Merchant's minimum energy principle for shear plane angle
 * - Chip thickness ratio and shear strain calculations
 * - Chip type classification (continuous, discontinuous, segmented, BUE)
 * - Chip breaking mechanics and breaker design
 * - Adiabatic shear band formation and saw-tooth morphology
 * - Chip flow direction (Stabler's rule) and evacuation
 * - Chip-related problems diagnosis and solutions
 *
 * References:
 * - Merchant (1945): "Mechanics of the Metal Cutting Process"
 * - Lee & Shaffer (1951): "Theory of Plasticity Applied to Machining"
 * - Recht (1964): "Catastrophic Thermoplastic Shear"
 * - Stabler (1951): "The Fundamental Geometry of Cutting Tools"
 * - Nakayama (1962, 1972): "Chip Curl and Chip Breaking"
 * - Komanduri & Brown (1981): "Shear Instability and Adiabatic Shear Bands"
 * - Shaw (2005): "Metal Cutting Principles" 2nd ed.
 * - Astakhov (2006): "Tribology of Metal Cutting"
 * - Klocke (2011): "Manufacturing Processes 1"
 *
 * Actions: lathe_chip_mechanics (turningDispatcher)
 */

import { log } from "../utils/Logger.js";
import {
  CANONICAL_KIENZLE,
  CANONICAL_MATERIAL_DB,
  type ISOGroup,
  type MaterialPhysics,
} from "../physics/constants.js";

// ===========================
// CONSTANTS
// ===========================

const DEG_TO_RAD = Math.PI / 180;
const RAD_TO_DEG = 180 / Math.PI;
const TAYLOR_QUINNEY_COEFFICIENT = 0.9; // Fraction of plastic work converted to heat

/** Critical strain rate for adiabatic shear band formation [1/s] */
const CRITICAL_STRAIN_RATE_ASB = 1e4;

/** Minimum feed for effective chip breaking [mm/rev] */
const MIN_FEED_CHIP_BREAKING = 0.08;

/** Edge hone radius to minimum chip thickness ratio (Albrecht criterion) */
const ALBRECHT_RATIO = 0.2;

// ===========================
// TYPES
// ===========================

/**
 * AtomicValue with uncertainty tracking for physics calculations.
 */
export interface AtomicValue {
  value: number;
  unit: string;
  uncertainty: number;
  source: string;
  warning?: string;
}

/**
 * Chip type classification based on morphology.
 */
export type ChipType =
  | "continuous"           // Ductile material, sharp tool, moderate speed
  | "continuous_with_bue"  // Continuous but with built-up edge
  | "lamellar"             // Wavy continuous chip
  | "segmented"            // Saw-tooth pattern from adiabatic shear
  | "discontinuous"        // Brittle material or high feed
  | "elemental"            // Very brittle, needle-like chips
  | "stringy"              // Long tangled chips (problem type)
  | "birds_nest";          // Severely tangled mass

/**
 * Chip shape classification per ISO 3685.
 */
export type ChipShape =
  | "ribbon"               // Long ribbon, poor control
  | "snarled"              // Tangled mass
  | "tubular"              // Hollow tube
  | "washer"               // Flat spiral
  | "helical"              // 3D helix, good control
  | "spiral"               // Flat or conical spiral
  | "arc"                  // Short arc segments
  | "comma"                // Comma-shaped, good breaking
  | "needle"               // Very short, discontinuous
  | "connected_arc";       // Loosely connected arcs

/**
 * Chip control quality assessment.
 */
export type ChipControlQuality =
  | "excellent"   // Short, predictable chips
  | "good"        // Acceptable chip form
  | "marginal"    // Borderline, may cause issues
  | "poor"        // Long chips, handling problems
  | "dangerous";  // Safety hazard (stringy, snarled)

/**
 * Material classification for chip formation.
 */
export interface ChipMaterialProperties {
  iso_group: ISOGroup;
  name: string;
  /** Ductility: elongation at break [%] */
  elongation_pct: number;
  /** Yield strength [MPa] */
  yield_strength_MPa: number;
  /** Thermal conductivity [W/(m·K)] */
  thermal_conductivity: number;
  /** Specific heat [J/(kg·K)] */
  specific_heat: number;
  /** Density [kg/m^3] */
  density: number;
  /** Friction coefficient at tool-chip interface */
  friction_coefficient: number;
  /** Hardness [HRC] (optional) */
  hardness_HRC?: number;
  /** Work hardening exponent n (optional) */
  work_hardening_n?: number;
  /** Johnson-Cook A parameter [MPa] (optional) */
  jc_A?: number;
  /** Johnson-Cook B parameter [MPa] (optional) */
  jc_B?: number;
  /** Johnson-Cook n exponent (optional) */
  jc_n?: number;
  /** Johnson-Cook C parameter (optional) */
  jc_C?: number;
  /** Johnson-Cook m exponent (optional) */
  jc_m?: number;
  /** Melting temperature [C] (optional) */
  melting_temp_C?: number;
}

/**
 * Cutting parameters for chip mechanics analysis.
 */
export interface CuttingParameters {
  /** Cutting speed [m/min] */
  cutting_speed_mpm: number;
  /** Feed rate [mm/rev] */
  feed_mm_rev: number;
  /** Depth of cut [mm] */
  depth_of_cut_mm: number;
  /** Tool rake angle [deg] - positive is relief */
  rake_angle_deg: number;
  /** Tool clearance angle [deg] */
  clearance_angle_deg?: number;
  /** Tool nose radius [mm] */
  nose_radius_mm?: number;
  /** Tool inclination angle [deg] (side cutting edge angle) */
  inclination_angle_deg?: number;
  /** Edge hone radius [mm] */
  edge_radius_mm?: number;
  /** Chipbreaker type */
  chipbreaker?: "none" | "light" | "medium" | "heavy" | "high_feed";
  /** Chipbreaker groove width [mm] */
  chipbreaker_width_mm?: number;
  /** Chipbreaker groove depth [mm] */
  chipbreaker_depth_mm?: number;
  /** Coolant type */
  coolant?: "none" | "flood" | "mist" | "high_pressure" | "cryogenic";
  /** Coolant pressure [bar] */
  coolant_pressure_bar?: number;
}

/**
 * Shear angle calculation result.
 */
export interface ShearAngleResult {
  merchant_angle: AtomicValue;
  lee_shaffer_angle: AtomicValue;
  oxley_angle: AtomicValue;
  recommended_angle: AtomicValue;
  friction_angle: AtomicValue;
  chip_thickness_ratio: AtomicValue;
  shear_strain: AtomicValue;
  shear_strain_rate: AtomicValue;
  chip_velocity: AtomicValue;
}

/**
 * Chip type prediction result.
 */
export interface ChipTypePrediction {
  predicted_type: ChipType;
  confidence: number;
  predicted_shape: ChipShape;
  chip_control_quality: ChipControlQuality;
  bue_risk: AtomicValue;
  segmentation_risk: AtomicValue;
  transition_speed_continuous_segmented: AtomicValue;
  recommendations: string[];
  warnings: string[];
}

/**
 * Chip breaker design result.
 */
export interface ChipBreakerDesign {
  recommended_type: "none" | "light" | "medium" | "heavy" | "high_feed";
  groove_width_mm: AtomicValue;
  groove_depth_mm: AtomicValue;
  land_width_mm: AtomicValue;
  effective_rake_with_breaker: AtomicValue;
  min_doc_for_engagement: AtomicValue;
  operating_window: {
    min_feed_mm_rev: number;
    max_feed_mm_rev: number;
    min_doc_mm: number;
    max_doc_mm: number;
  };
  chip_curl_radius: AtomicValue;
  self_breaking_possible: boolean;
  high_pressure_coolant_effective: boolean;
  recommendations: string[];
}

/**
 * Adiabatic shear band analysis result.
 */
export interface AdiabaticShearBandResult {
  is_segmented: boolean;
  recht_parameter: AtomicValue;
  critical_speed_for_segmentation: AtomicValue;
  shear_band_spacing: AtomicValue;
  shear_band_width: AtomicValue;
  segmentation_frequency: AtomicValue;
  saw_tooth_amplitude: AtomicValue;
  thermal_softening_rate: AtomicValue;
  strain_hardening_rate: AtomicValue;
  deformation_mode: "uniform" | "localized" | "adiabatic_shear";
}

/**
 * Chip flow analysis result.
 */
export interface ChipFlowResult {
  chip_flow_angle: AtomicValue;
  stabler_angle: AtomicValue;
  colwell_angle: AtomicValue;
  side_curl_radius: AtomicValue;
  back_curl_radius: AtomicValue;
  natural_curl_direction: "side" | "back" | "combined";
  chip_space_required: AtomicValue;
  evacuation_difficulty: "easy" | "moderate" | "difficult";
  tangling_risk: AtomicValue;
  conveyor_compatible: boolean;
}

/**
 * Chip control assessment result.
 */
export interface ChipControlAssessment {
  overall_quality: ChipControlQuality;
  score: AtomicValue;
  chip_length_class: "short" | "medium" | "long" | "very_long" | "continuous";
  estimated_chip_length_mm: AtomicValue;
  handling_difficulty: "easy" | "moderate" | "difficult" | "hazardous";
  surface_damage_risk: AtomicValue;
  part_interference_risk: AtomicValue;
  tool_wear_impact: AtomicValue;
  issues_detected: string[];
  solutions: string[];
}

/**
 * Optimized parameters for chip breaking.
 */
export interface OptimizedChipBreakingParams {
  original_params: CuttingParameters;
  optimized_feed: AtomicValue;
  optimized_doc: AtomicValue;
  optimized_speed: AtomicValue;
  chipbreaker_recommendation: string;
  coolant_recommendation: string;
  predicted_improvement: AtomicValue;
  trade_offs: string[];
}

// ===========================
// MATERIAL DATABASE
// ===========================

/**
 * Material properties for chip formation analysis.
 * Derived from canonical constants with chip-specific additions.
 */
const CHIP_MATERIAL_DB: Record<string, ChipMaterialProperties> = {
  steel: {
    iso_group: "P",
    name: "Carbon Steel",
    elongation_pct: 25,
    yield_strength_MPa: 350,
    thermal_conductivity: 50,
    specific_heat: 486,
    density: 7850,
    friction_coefficient: 0.5,
    hardness_HRC: 20,
    work_hardening_n: 0.25,
    jc_A: 350, jc_B: 600, jc_n: 0.25, jc_C: 0.02, jc_m: 1.0,
    melting_temp_C: 1500,
  },
  stainless: {
    iso_group: "M",
    name: "Stainless Steel 304/316",
    elongation_pct: 40,
    yield_strength_MPa: 290,
    thermal_conductivity: 16,
    specific_heat: 500,
    density: 7930,
    friction_coefficient: 0.6,
    hardness_HRC: 22,
    work_hardening_n: 0.45,
    jc_A: 310, jc_B: 1000, jc_n: 0.45, jc_C: 0.03, jc_m: 1.0,
    melting_temp_C: 1400,
  },
  aluminum: {
    iso_group: "N",
    name: "Aluminum 6061-T6",
    elongation_pct: 12,
    yield_strength_MPa: 276,
    thermal_conductivity: 167,
    specific_heat: 896,
    density: 2700,
    friction_coefficient: 0.35,
    hardness_HRC: 0,
    work_hardening_n: 0.15,
    jc_A: 276, jc_B: 135, jc_n: 0.15, jc_C: 0.01, jc_m: 1.3,
    melting_temp_C: 582,
  },
  cast_iron: {
    iso_group: "K",
    name: "Gray Cast Iron",
    elongation_pct: 3,  // Cast iron has low but non-zero elongation - discontinuous chips
    yield_strength_MPa: 250,
    thermal_conductivity: 48,
    specific_heat: 460,
    density: 7200,
    friction_coefficient: 0.35,
    hardness_HRC: 20,
    work_hardening_n: 0.05,
    melting_temp_C: 1200,
  },
  titanium: {
    iso_group: "S",
    name: "Titanium Ti-6Al-4V",
    elongation_pct: 14,
    yield_strength_MPa: 880,
    thermal_conductivity: 6.7,
    specific_heat: 526,
    density: 4430,
    friction_coefficient: 0.55,
    hardness_HRC: 36,
    work_hardening_n: 0.12,
    jc_A: 1098, jc_B: 1092, jc_n: 0.93, jc_C: 0.014, jc_m: 1.1,
    melting_temp_C: 1660,
  },
  inconel: {
    iso_group: "S",
    name: "Inconel 718",
    elongation_pct: 30,
    yield_strength_MPa: 1100,
    thermal_conductivity: 11.4,
    specific_heat: 435,
    density: 8190,
    friction_coefficient: 0.6,
    hardness_HRC: 40,
    work_hardening_n: 0.35,
    jc_A: 1241, jc_B: 622, jc_n: 0.65, jc_C: 0.017, jc_m: 1.3,
    melting_temp_C: 1336,
  },
  brass: {
    iso_group: "N",
    name: "Free-Cutting Brass",
    elongation_pct: 30,
    yield_strength_MPa: 200,
    thermal_conductivity: 120,
    specific_heat: 380,
    density: 8500,
    friction_coefficient: 0.25,
    hardness_HRC: 0,
    work_hardening_n: 0.20,
    melting_temp_C: 900,
  },
  copper: {
    iso_group: "N",
    name: "Copper C110",
    elongation_pct: 45,
    yield_strength_MPa: 69,
    thermal_conductivity: 390,
    specific_heat: 385,
    density: 8960,
    friction_coefficient: 0.45,
    hardness_HRC: 0,
    work_hardening_n: 0.30,
    melting_temp_C: 1085,
  },
  tool_steel: {
    iso_group: "H",
    name: "Tool Steel D2/H13",
    elongation_pct: 2,
    yield_strength_MPa: 1500,
    thermal_conductivity: 25,
    specific_heat: 460,
    density: 7800,
    friction_coefficient: 0.45,
    hardness_HRC: 58,
    work_hardening_n: 0.08,
    jc_A: 1500, jc_B: 400, jc_n: 0.08, jc_C: 0.01, jc_m: 0.9,
    melting_temp_C: 1421,
  },
  hardened_steel: {
    iso_group: "H",
    name: "Hardened Steel (55+ HRC)",
    elongation_pct: 1,
    yield_strength_MPa: 2000,
    thermal_conductivity: 30,
    specific_heat: 450,
    density: 7850,
    friction_coefficient: 0.4,
    hardness_HRC: 60,
    work_hardening_n: 0.05,
    melting_temp_C: 1500,
  },
};

/**
 * Chipbreaker geometry database.
 */
interface ChipbreakerGeometry {
  type: "none" | "light" | "medium" | "heavy" | "high_feed";
  groove_width_mm: { min: number; max: number };
  groove_depth_mm: { min: number; max: number };
  land_width_mm: { min: number; max: number };
  feed_range_mm_rev: { min: number; max: number };
  doc_range_mm: { min: number; max: number };
  effective_rake_reduction_deg: number;
}

const CHIPBREAKER_DB: Record<string, ChipbreakerGeometry> = {
  none: {
    type: "none",
    groove_width_mm: { min: 0, max: 0 },
    groove_depth_mm: { min: 0, max: 0 },
    land_width_mm: { min: 0, max: 0 },
    feed_range_mm_rev: { min: 0.05, max: 0.8 },
    doc_range_mm: { min: 0.1, max: 10 },
    effective_rake_reduction_deg: 0,
  },
  light: {
    type: "light",
    groove_width_mm: { min: 1.5, max: 2.5 },
    groove_depth_mm: { min: 0.08, max: 0.15 },
    land_width_mm: { min: 0.1, max: 0.2 },
    feed_range_mm_rev: { min: 0.05, max: 0.25 },
    doc_range_mm: { min: 0.2, max: 2.5 },
    effective_rake_reduction_deg: 3,
  },
  medium: {
    type: "medium",
    groove_width_mm: { min: 2.0, max: 3.5 },
    groove_depth_mm: { min: 0.12, max: 0.25 },
    land_width_mm: { min: 0.15, max: 0.3 },
    feed_range_mm_rev: { min: 0.15, max: 0.50 },
    doc_range_mm: { min: 0.5, max: 5.0 },
    effective_rake_reduction_deg: 5,
  },
  heavy: {
    type: "heavy",
    groove_width_mm: { min: 3.0, max: 5.0 },
    groove_depth_mm: { min: 0.20, max: 0.40 },
    land_width_mm: { min: 0.2, max: 0.5 },
    feed_range_mm_rev: { min: 0.30, max: 0.80 },
    doc_range_mm: { min: 1.0, max: 10.0 },
    effective_rake_reduction_deg: 8,
  },
  high_feed: {
    type: "high_feed",
    groove_width_mm: { min: 4.0, max: 6.0 },
    groove_depth_mm: { min: 0.30, max: 0.50 },
    land_width_mm: { min: 0.3, max: 0.6 },
    feed_range_mm_rev: { min: 0.50, max: 1.20 },
    doc_range_mm: { min: 2.0, max: 12.0 },
    effective_rake_reduction_deg: 10,
  },
};

// ===========================
// ENGINE IMPLEMENTATION
// ===========================

/**
 * LatheChipMechanicsEngine - Comprehensive chip formation physics for turning.
 */
export class LatheChipMechanicsEngine {
  /**
   * Calculate shear plane angle using multiple models.
   * Primary model: Merchant's minimum energy principle.
   * Secondary models: Lee-Shaffer (upper bound), Oxley (predictive).
   *
   * Merchant: phi = pi/4 - beta/2 + alpha/2
   * Lee-Shaffer: phi = pi/4 - beta + alpha
   * Oxley: Iterative solution based on flow stress
   *
   * @param rakeAngleDeg Tool rake angle [deg]
   * @param frictionCoeff Friction coefficient at tool-chip interface
   * @param material Material properties (optional, for Oxley model)
   * @returns Shear angle calculation results
   */
  calculateShearAngle(
    rakeAngleDeg: number,
    frictionCoeff: number,
    material?: ChipMaterialProperties
  ): ShearAngleResult {
    const alpha = rakeAngleDeg * DEG_TO_RAD;
    const beta = Math.atan(frictionCoeff); // Friction angle
    const betaDeg = beta * RAD_TO_DEG;

    // Merchant's minimum energy criterion
    // phi = pi/4 - beta/2 + alpha/2
    const phiMerchant = Math.PI / 4 - beta / 2 + alpha / 2;
    const phiMerchantDeg = Math.max(5, Math.min(45, phiMerchant * RAD_TO_DEG));

    // Lee-Shaffer slip-line solution (upper bound)
    // phi = pi/4 - beta + alpha
    const phiLS = Math.PI / 4 - beta + alpha;
    const phiLSDeg = Math.max(5, Math.min(45, phiLS * RAD_TO_DEG));

    // Oxley predictive model (simplified - full version requires iteration)
    // Uses Johnson-Cook flow stress if material properties available
    let phiOxleyDeg = phiMerchantDeg;
    if (material?.jc_A && material?.jc_n) {
      // Oxley: phi varies with strain hardening
      // Simplified: phi_oxley = phi_merchant * (1 + 0.1 * (n - 0.25))
      const nFactor = 1 + 0.1 * ((material.jc_n ?? 0.25) - 0.25);
      phiOxleyDeg = Math.max(5, Math.min(45, phiMerchantDeg * nFactor));
    }

    // Recommended angle: weighted average favoring Merchant
    const phiRecDeg = 0.6 * phiMerchantDeg + 0.3 * phiOxleyDeg + 0.1 * phiLSDeg;
    const phiRec = phiRecDeg * DEG_TO_RAD;

    // Chip thickness ratio: r = t1/t2 = sin(phi)/cos(phi-alpha)
    const cosPmA = Math.cos(phiRec - alpha);
    const chipRatio = Math.abs(cosPmA) > 1e-10
      ? Math.sin(phiRec) / cosPmA
      : 0.3;

    // Shear strain: gamma = cos(alpha) / (sin(phi) * cos(phi-alpha))
    const sinPhi = Math.sin(phiRec);
    const shearStrain = (sinPhi > 1e-10 && Math.abs(cosPmA) > 1e-10)
      ? Math.cos(alpha) / (sinPhi * cosPmA)
      : 2.0;

    // Shear strain rate (placeholder - needs cutting speed for actual value)
    const shearStrainRate = 1e4; // Typical order of magnitude [1/s]

    // Chip velocity ratio: Vchip/Vc = chip thickness ratio
    const chipVelocityRatio = chipRatio;

    log.debug(
      `[LatheChipMechanics] ShearAngle: Merchant=${phiMerchantDeg.toFixed(1)}deg, ` +
      `LS=${phiLSDeg.toFixed(1)}deg, rec=${phiRecDeg.toFixed(1)}deg, ` +
      `r=${chipRatio.toFixed(3)}, gamma=${shearStrain.toFixed(2)}`
    );

    return {
      merchant_angle: {
        value: round2(phiMerchantDeg),
        unit: "deg",
        uncertainty: 3.0,
        source: "Merchant (1945): phi = pi/4 - beta/2 + alpha/2",
      },
      lee_shaffer_angle: {
        value: round2(phiLSDeg),
        unit: "deg",
        uncertainty: 5.0,
        source: "Lee-Shaffer (1951): phi = pi/4 - beta + alpha",
      },
      oxley_angle: {
        value: round2(phiOxleyDeg),
        unit: "deg",
        uncertainty: 4.0,
        source: "Oxley (1989): Iterative flow stress solution",
      },
      recommended_angle: {
        value: round2(phiRecDeg),
        unit: "deg",
        uncertainty: 3.0,
        source: "Weighted average (0.6 Merchant + 0.3 Oxley + 0.1 Lee-Shaffer)",
      },
      friction_angle: {
        value: round2(betaDeg),
        unit: "deg",
        uncertainty: 2.0,
        source: `beta = atan(mu), mu = ${frictionCoeff}`,
      },
      chip_thickness_ratio: {
        value: round3(chipRatio),
        unit: "dimensionless",
        uncertainty: chipRatio * 0.1,
        source: "r = sin(phi)/cos(phi-alpha)",
      },
      shear_strain: {
        value: round2(shearStrain),
        unit: "dimensionless",
        uncertainty: shearStrain * 0.15,
        source: "gamma = cos(alpha)/(sin(phi)*cos(phi-alpha))",
      },
      shear_strain_rate: {
        value: round0(shearStrainRate),
        unit: "1/s",
        uncertainty: shearStrainRate * 0.5,
        source: "Estimated (requires cutting speed for exact value)",
      },
      chip_velocity: {
        value: round3(chipVelocityRatio),
        unit: "ratio",
        uncertainty: chipVelocityRatio * 0.1,
        source: "Vchip/Vc = chip thickness ratio (continuity)",
      },
    };
  }

  /**
   * Predict chip type based on material properties and cutting parameters.
   *
   * Chip types and their formation conditions:
   * - Continuous: Ductile material (elongation > 10%), sharp tool, moderate speed
   * - Discontinuous: Brittle material (elongation < 5%) or high feed
   * - Segmented: High speed, low thermal conductivity, adiabatic shear
   * - Built-up edge: Low speed, ductile material, no coolant
   *
   * @param params Cutting parameters
   * @param material Material properties or material name
   * @returns Chip type prediction with confidence and recommendations
   */
  predictChipType(
    params: CuttingParameters,
    material: ChipMaterialProperties | string
  ): ChipTypePrediction {
    const mat = typeof material === "string"
      ? (CHIP_MATERIAL_DB[material] ?? CHIP_MATERIAL_DB.steel)
      : material;

    const warnings: string[] = [];
    const recommendations: string[] = [];

    const Vc = params.cutting_speed_mpm;
    const f = params.feed_mm_rev;
    const ap = params.depth_of_cut_mm;
    const rake = params.rake_angle_deg;

    // 1. Calculate base parameters
    const shearResult = this.calculateShearAngle(rake, mat.friction_coefficient, mat);
    const chipRatio = shearResult.chip_thickness_ratio.value;
    const shearStrain = shearResult.shear_strain.value;

    // 2. BUE risk calculation
    // BUE forms at low speed (typically Vc < 30-80 m/min for steel)
    // Reduced by coolant, coated tools, higher speed
    const bueSpeedThreshold = mat.iso_group === "P" ? 50
      : mat.iso_group === "M" ? 40
      : mat.iso_group === "N" ? 80
      : mat.iso_group === "S" ? 30
      : 60;

    let bueRisk = 0;
    if (Vc < bueSpeedThreshold && mat.elongation_pct > 10) {
      bueRisk = Math.min(1.0, (bueSpeedThreshold - Vc) / bueSpeedThreshold);
      if (params.coolant === "none") bueRisk *= 1.3;
      if (params.coolant === "flood") bueRisk *= 0.7;
      if (rake > 10) bueRisk *= 0.8; // Positive rake reduces BUE
      bueRisk = Math.min(1.0, bueRisk);
    }

    // 3. Segmentation risk (adiabatic shear)
    // High risk: titanium, superalloys, hardened steel at high speed
    // Recht criterion: thermal softening > strain hardening
    const thermalDiffusivity = mat.thermal_conductivity / (mat.density * mat.specific_heat) * 1e6;
    const rechtIndex = this._calculateRechtParameter(mat, Vc, f, rake);
    const segmentationRisk = Math.min(1.0, rechtIndex / 1.2);

    // 4. Transition speed: continuous -> segmented
    // Lower for low thermal conductivity materials
    const transitionSpeed = this._estimateSegmentationTransitionSpeed(mat);

    // 5. Determine chip type
    let chipType: ChipType;
    let confidence: number;
    let chipShape: ChipShape;

    if (mat.elongation_pct < 2) {
      // Very brittle: elemental chips
      chipType = "elemental";
      chipShape = "needle";
      confidence = 0.9;
    } else if (mat.elongation_pct < 5) {
      // Brittle: discontinuous chips (cast iron, hardened steel)
      chipType = "discontinuous";
      chipShape = "comma";
      confidence = 0.85;
    } else if (bueRisk > 0.6) {
      // Strong BUE tendency
      chipType = "continuous_with_bue";
      chipShape = "snarled";
      confidence = 0.7 + bueRisk * 0.2;
      warnings.push(`High BUE risk (${(bueRisk * 100).toFixed(0)}%) at Vc=${Vc} m/min`);
      recommendations.push(`Increase speed above ${bueSpeedThreshold} m/min to avoid BUE`);
    } else if (rechtIndex > 1.0) {
      // Adiabatic shear -> segmented chips
      chipType = "segmented";
      chipShape = "arc";
      confidence = 0.75 + Math.min(0.2, (rechtIndex - 1.0) * 0.4);
      if (mat.iso_group === "S") {
        recommendations.push("Segmented chips expected for superalloys - normal behavior");
      }
    } else if (rechtIndex > 0.7) {
      // Transition zone: lamellar chips
      chipType = "lamellar";
      chipShape = "helical";
      confidence = 0.65;
    } else {
      // Standard ductile: continuous chips
      chipType = "continuous";
      confidence = 0.80;

      // Determine shape based on feed and chipbreaker
      if (params.chipbreaker && params.chipbreaker !== "none") {
        if (f < 0.12) chipShape = "spiral";
        else if (f < 0.30) chipShape = "helical";
        else chipShape = "arc";
      } else {
        if (f < 0.10) chipShape = "ribbon";
        else if (f < 0.20) chipShape = "tubular";
        else chipShape = "snarled";

        if (chipShape === "ribbon" || chipShape === "snarled") {
          warnings.push("Long continuous chips without chipbreaker - tangling risk");
          recommendations.push("Add chipbreaker geometry or increase feed");
        }
      }
    }

    // 6. Check for problematic stringy/bird's nest conditions
    if (chipType === "continuous" && !params.chipbreaker) {
      if (f < MIN_FEED_CHIP_BREAKING && mat.elongation_pct > 15) {
        chipType = "stringy";
        chipShape = "ribbon";
        warnings.push(`DANGER: Stringy chips at f=${f} mm/rev - wrapping risk`);
        recommendations.push("Minimum feed for chip breaking: 0.08 mm/rev");
      }
    }

    // 7. Assess chip control quality
    let chipControlQuality: ChipControlQuality;
    if (chipType === "discontinuous" || chipType === "elemental") {
      chipControlQuality = "excellent";
    } else if (chipType === "segmented" || chipShape === "arc" || chipShape === "comma") {
      chipControlQuality = "good";
    } else if (chipShape === "helical" || chipShape === "spiral") {
      chipControlQuality = "good";
    } else if ((chipShape as ChipShape) === "tubular" || (chipShape as ChipShape) === "washer") {
      chipControlQuality = "marginal";
    } else if ((chipType as ChipType) === "stringy" || (chipShape as ChipShape) === "ribbon") {
      chipControlQuality = "poor";
      recommendations.push("Increase feed or use chipbreaker to improve chip control");
    } else if ((chipShape as ChipShape) === "snarled" || (chipType as ChipType) === "birds_nest") {
      chipControlQuality = "dangerous";
      warnings.push("SAFETY HAZARD: Snarled chips - stop and clear frequently");
    } else {
      chipControlQuality = "marginal";
    }

    log.debug(
      `[LatheChipMechanics] ChipType: ${chipType} (${(confidence * 100).toFixed(0)}%), ` +
      `shape=${chipShape}, BUE=${(bueRisk * 100).toFixed(0)}%, ` +
      `seg=${(segmentationRisk * 100).toFixed(0)}%`
    );

    return {
      predicted_type: chipType,
      confidence: round2(confidence),
      predicted_shape: chipShape,
      chip_control_quality: chipControlQuality,
      bue_risk: {
        value: round2(bueRisk),
        unit: "probability",
        uncertainty: 0.15,
        source: "Empirical BUE model based on speed, material, coolant",
        warning: bueRisk > 0.5 ? "High BUE risk - increase speed" : undefined,
      },
      segmentation_risk: {
        value: round2(segmentationRisk),
        unit: "probability",
        uncertainty: 0.2,
        source: "Recht instability criterion",
        warning: segmentationRisk > 0.8 ? "Segmented chips expected" : undefined,
      },
      transition_speed_continuous_segmented: {
        value: round0(transitionSpeed),
        unit: "m/min",
        uncertainty: transitionSpeed * 0.2,
        source: "Estimated from thermal diffusivity and hardness",
      },
      recommendations,
      warnings,
    };
  }

  /**
   * Design chipbreaker geometry for optimal chip control.
   *
   * Chipbreaker design principles:
   * - Groove width determines chip curl radius
   * - Groove depth affects chip breaking strain
   * - Land width protects cutting edge
   * - Operating window depends on material and geometry
   *
   * @param material Material properties or name
   * @param docMm Depth of cut [mm]
   * @param feedMmRev Feed rate [mm/rev] (optional)
   * @returns Chipbreaker design recommendations
   */
  designChipBreaker(
    material: ChipMaterialProperties | string,
    docMm: number,
    feedMmRev?: number
  ): ChipBreakerDesign {
    const mat = typeof material === "string"
      ? (CHIP_MATERIAL_DB[material] ?? CHIP_MATERIAL_DB.steel)
      : material;

    const recommendations: string[] = [];
    const feed = feedMmRev ?? 0.25; // Default to medium feed

    // 1. Determine recommended chipbreaker type
    let recType: "none" | "light" | "medium" | "heavy" | "high_feed";
    if (mat.elongation_pct <= 5 || mat.iso_group === "K") {
      // Brittle material or cast iron: no chipbreaker needed
      recType = "none";
      recommendations.push("Brittle material - chips break naturally without chipbreaker");
    } else if (feed < 0.12) {
      recType = "light";
    } else if (feed < 0.35) {
      recType = "medium";
    } else if (feed < 0.60) {
      recType = "heavy";
    } else {
      recType = "high_feed";
    }

    // Adjust for material
    if (mat.iso_group === "M" && recType !== "none") {
      // Stainless: use one grade heavier due to work hardening
      if (recType === "light") recType = "medium";
      else if (recType === "medium") recType = "heavy";
      recommendations.push("Stainless steel: use heavier chipbreaker due to work hardening");
    }

    if (mat.iso_group === "N" && mat.name.includes("Aluminum")) {
      // Aluminum: needs sharp chipbreaker with polished surface
      if (recType === "heavy") recType = "medium";
      recommendations.push("Aluminum: use sharp chipbreaker with polished rake face");
    }

    const breaker = CHIPBREAKER_DB[recType];

    // 2. Calculate groove dimensions
    const grooveWidth = (breaker.groove_width_mm.min + breaker.groove_width_mm.max) / 2;
    const grooveDepth = (breaker.groove_depth_mm.min + breaker.groove_depth_mm.max) / 2;
    const landWidth = (breaker.land_width_mm.min + breaker.land_width_mm.max) / 2;

    // 3. Calculate chip curl radius (Nakayama model)
    // R = W^2 / (8 * h) where W = groove width, h = chip thickness
    const chipThickness = feed / 0.5; // Approximate (needs shear angle)
    const curlRadius = recType !== "none"
      ? (grooveWidth * grooveWidth) / (8 * chipThickness)
      : chipThickness * 15; // Natural curl without breaker

    // 4. Calculate minimum DOC for chipbreaker engagement
    // Chipbreaker needs DOC > land width + some engagement
    const minDocEngagement = landWidth + grooveWidth * 0.3;

    // 5. Check self-breaking conditions
    // Self-breaking occurs when chip strain exceeds fracture strain
    const chipStrain = chipThickness / (2 * curlRadius);
    const fracStrain = mat.elongation_pct > 20 ? 0.5 : 0.3;
    const selfBreakingPossible = chipStrain > fracStrain;

    // 6. High-pressure coolant effectiveness
    // Effective for stringy materials and when chipbreaker insufficient
    const hpCoolantEffective = mat.elongation_pct > 20 || !selfBreakingPossible;

    // 7. Effective rake with chipbreaker
    const effectiveRake = 6 - breaker.effective_rake_reduction_deg; // Assuming 6deg nominal

    // Add recommendations
    if (docMm < minDocEngagement && recType !== "none") {
      recommendations.push(
        `DOC ${docMm}mm < min engagement ${minDocEngagement.toFixed(2)}mm - ` +
        "chipbreaker may not function"
      );
    }

    if (!selfBreakingPossible && mat.elongation_pct > 15) {
      recommendations.push("Self-breaking unlikely - consider high-pressure coolant");
    }

    if (hpCoolantEffective) {
      recommendations.push("High-pressure coolant (70+ bar) recommended for chip breaking assist");
    }

    log.debug(
      `[LatheChipMechanics] ChipBreaker: type=${recType}, W=${grooveWidth.toFixed(2)}mm, ` +
      `D=${grooveDepth.toFixed(2)}mm, curl_R=${curlRadius.toFixed(2)}mm`
    );

    return {
      recommended_type: recType,
      groove_width_mm: {
        value: round2(grooveWidth),
        unit: "mm",
        uncertainty: 0.3,
        source: "Chipbreaker database median value",
      },
      groove_depth_mm: {
        value: round3(grooveDepth),
        unit: "mm",
        uncertainty: 0.05,
        source: "Chipbreaker database median value",
      },
      land_width_mm: {
        value: round3(landWidth),
        unit: "mm",
        uncertainty: 0.05,
        source: "Chipbreaker database median value",
      },
      effective_rake_with_breaker: {
        value: round1(effectiveRake),
        unit: "deg",
        uncertainty: 1,
        source: "Nominal rake - chipbreaker rake reduction",
      },
      min_doc_for_engagement: {
        value: round2(minDocEngagement),
        unit: "mm",
        uncertainty: 0.1,
        source: "Land width + 30% groove width",
      },
      operating_window: {
        min_feed_mm_rev: breaker.feed_range_mm_rev.min,
        max_feed_mm_rev: breaker.feed_range_mm_rev.max,
        min_doc_mm: breaker.doc_range_mm.min,
        max_doc_mm: breaker.doc_range_mm.max,
      },
      chip_curl_radius: {
        value: round2(curlRadius),
        unit: "mm",
        uncertainty: curlRadius * 0.2,
        source: "Nakayama: R = W^2 / (8*h)",
      },
      self_breaking_possible: selfBreakingPossible,
      high_pressure_coolant_effective: hpCoolantEffective,
      recommendations,
    };
  }

  /**
   * Analyze adiabatic shear band formation.
   *
   * Adiabatic shear occurs when thermal softening exceeds strain hardening:
   * - Critical at high strain rates (>10^4 /s)
   * - Common in Ti, Ni-alloys, hardened steel
   * - Results in saw-tooth (segmented) chips
   *
   * Recht criterion: chi = (dσ/dT × dT/dε) / (dσ/dε) > 1
   *
   * @param material Material properties or name
   * @param cuttingSpeed Cutting speed [m/min]
   * @param feed Feed rate [mm/rev]
   * @param rakeAngleDeg Rake angle [deg]
   * @returns Adiabatic shear band analysis
   */
  analyzeAdiabaticShearBands(
    material: ChipMaterialProperties | string,
    cuttingSpeed: number,
    feed: number,
    rakeAngleDeg: number
  ): AdiabaticShearBandResult {
    const mat = typeof material === "string"
      ? (CHIP_MATERIAL_DB[material] ?? CHIP_MATERIAL_DB.steel)
      : material;

    const alpha = rakeAngleDeg * DEG_TO_RAD;
    const Vc = cuttingSpeed / 60; // m/s
    const t1 = feed / 1000; // m

    // Calculate shear angle using Merchant
    const beta = Math.atan(mat.friction_coefficient);
    const phi = Math.max(5 * DEG_TO_RAD, Math.PI / 4 - beta / 2 + alpha / 2);

    // Shear strain
    const cosPmA = Math.cos(phi - alpha);
    const sinPhi = Math.sin(phi);
    const gamma = Math.abs(cosPmA) > 1e-10 && sinPhi > 1e-10
      ? Math.cos(alpha) / (sinPhi * cosPmA)
      : 2.0;

    // Shear band width: typically 10-50 um for metals
    // Approximation: delta = 0.01 * feed (1% of chip thickness)
    const shearBandWidth = Math.max(0.01, t1 * 0.01) * 1000; // mm

    // Strain rate in shear band
    // gamma_dot = Vs / delta where Vs = Vc * cos(alpha) / cos(phi-alpha)
    const Vs = Math.abs(cosPmA) > 1e-10 ? Vc * Math.cos(alpha) / cosPmA : Vc;
    const strainRate = Vs / (shearBandWidth / 1000);

    // Johnson-Cook based thermal softening and strain hardening rates
    const rho = mat.density;
    const cp = mat.specific_heat;
    const eps = gamma / Math.sqrt(3);

    // Adiabatic temperature rise
    const A = mat.jc_A ?? mat.yield_strength_MPa;
    // Default B to a reasonable fraction of A for materials without J-C params
    const B = mat.jc_B ?? (mat.yield_strength_MPa * 0.5);
    const n = mat.jc_n ?? 0.25;
    const m = mat.jc_m ?? 1.0;
    const Tm = mat.melting_temp_C ?? 1500;
    const Tr = 20; // Reference temperature

    // Flow stress at reference conditions
    const sigma = A + B * Math.pow(Math.max(eps, 0.01), n);
    const Trise = (TAYLOR_QUINNEY_COEFFICIENT * sigma * 1e6 * gamma) / (rho * cp);
    const T = Math.min(Tr + Trise, Tm - 1);
    const Tstar = Math.max(0.01, (T - Tr) / (Tm - Tr)); // Ensure Tstar > 0

    // Strain hardening rate: dσ/dε = B * n * ε^(n-1)
    // Use work_hardening_n if available, otherwise use jc_n
    const hardeningExp = mat.work_hardening_n ?? n;
    const strainHardening = Math.max(1, B * hardeningExp * Math.pow(Math.max(eps, 0.01), hardeningExp - 1));

    // Thermal softening rate: |dσ/dT| * |dT/dε|
    // For materials without full J-C, estimate based on thermal diffusivity
    const dSigmaDT = (A + B * Math.pow(eps, n)) * m * Math.pow(Math.max(Tstar, 1e-6), m - 1) / (Tm - Tr);
    const dTdEps = (TAYLOR_QUINNEY_COEFFICIENT * sigma * 1e6) / (rho * cp * Math.sqrt(3));
    let thermalSoftening = Math.abs(dSigmaDT * dTdEps) / 1e6; // MPa/strain

    // Enhance thermal softening estimate for low thermal conductivity materials
    // (titanium, inconel are prone to segmentation due to poor heat dissipation)
    const thermalFactor = Math.max(1, 50 / mat.thermal_conductivity);
    thermalSoftening *= thermalFactor;

    // Recht instability parameter
    const rechtParam = strainHardening > 0 ? thermalSoftening / strainHardening : 0;
    const isSegmented = rechtParam > 1.0;

    // Deformation mode
    let deformationMode: "uniform" | "localized" | "adiabatic_shear";
    if (rechtParam < 0.5) {
      deformationMode = "uniform";
    } else if (rechtParam < 1.0) {
      deformationMode = "localized";
    } else {
      deformationMode = "adiabatic_shear";
    }

    // Critical speed for segmentation onset
    // Approximate: solve for Vc where rechtParam = 1
    // Lower thermal conductivity -> lower critical speed
    const critSpeedThermalFactor = Math.sqrt(mat.thermal_conductivity / 50); // Normalized to steel
    const criticalSpeed = cuttingSpeed / Math.max(rechtParam, 0.1) * critSpeedThermalFactor;

    // Shear band spacing (Komanduri-Brown model)
    // L = f(chip thickness, strain rate, material)
    // Approximation: spacing increases with chip thickness
    const shearBandSpacing = isSegmented
      ? feed * 0.5 * (1 + 1 / Math.max(rechtParam - 1, 0.1))
      : feed * 5;

    // Segmentation frequency
    const segFreq = isSegmented ? (Vc * 1000) / Math.max(shearBandSpacing, 0.001) : 0;

    // Saw-tooth amplitude (peak-to-valley height of serration)
    const sawToothAmplitude = isSegmented ? feed * 0.3 * rechtParam : 0;

    log.debug(
      `[LatheChipMechanics] ASB: Recht=${rechtParam.toFixed(3)}, segmented=${isSegmented}, ` +
      `mode=${deformationMode}, freq=${segFreq.toFixed(0)}Hz`
    );

    return {
      is_segmented: isSegmented,
      recht_parameter: {
        value: round3(rechtParam),
        unit: "dimensionless",
        uncertainty: rechtParam * 0.2,
        source: "Recht (1964): chi = thermal_softening / strain_hardening",
        warning: rechtParam > 1.0 ? "Adiabatic shear expected" : undefined,
      },
      critical_speed_for_segmentation: {
        value: round0(criticalSpeed),
        unit: "m/min",
        uncertainty: criticalSpeed * 0.3,
        source: "Estimated from Recht criterion inversion",
      },
      shear_band_spacing: {
        value: round3(shearBandSpacing),
        unit: "mm",
        uncertainty: shearBandSpacing * 0.3,
        source: "Komanduri-Brown approximation",
      },
      shear_band_width: {
        value: round4(shearBandWidth),
        unit: "mm",
        uncertainty: shearBandWidth * 0.5,
        source: "Estimated: 1% of uncut chip thickness",
      },
      segmentation_frequency: {
        value: round0(segFreq),
        unit: "Hz",
        uncertainty: segFreq * 0.3,
        source: "f = Vs / band_spacing",
      },
      saw_tooth_amplitude: {
        value: round3(sawToothAmplitude),
        unit: "mm",
        uncertainty: sawToothAmplitude * 0.4,
        source: "Empirical: 30% of feed * Recht parameter",
      },
      thermal_softening_rate: {
        value: round1(thermalSoftening),
        unit: "MPa/strain",
        uncertainty: thermalSoftening * 0.25,
        source: "Johnson-Cook thermal term derivative",
      },
      strain_hardening_rate: {
        value: round1(strainHardening),
        unit: "MPa/strain",
        uncertainty: strainHardening * 0.2,
        source: "Johnson-Cook hardening term derivative",
      },
      deformation_mode: deformationMode,
    };
  }

  /**
   * Analyze chip flow direction and evacuation.
   *
   * Chip flow direction models:
   * - Stabler's rule: chip flow angle = tool inclination angle
   * - Colwell's model: modified for nose radius effect
   *
   * @param params Cutting parameters
   * @param material Material properties or name
   * @returns Chip flow analysis
   */
  analyzeChipFlow(
    params: CuttingParameters,
    material: ChipMaterialProperties | string
  ): ChipFlowResult {
    const mat = typeof material === "string"
      ? (CHIP_MATERIAL_DB[material] ?? CHIP_MATERIAL_DB.steel)
      : material;

    const inclination = params.inclination_angle_deg ?? 0;
    const noseRadius = params.nose_radius_mm ?? 0.8;
    const doc = params.depth_of_cut_mm;
    const feed = params.feed_mm_rev;

    // 1. Stabler's rule: chip flow angle = inclination angle
    // eta_c = i (for straight cutting edge)
    const stablerAngle = inclination;

    // 2. Colwell's modification for nose radius
    // When DOC < nose radius, effective chip flow angle changes
    // eta_c = arctan(sin(kappa_r) * cos(lambda_s) / cos(kappa_r))
    // Simplified: Colwell angle = Stabler * (1 - nose_R / doc) for doc > nose_R
    const colwellFactor = doc > noseRadius ? 1.0 : doc / noseRadius;
    const colwellAngle = stablerAngle * colwellFactor;

    // 3. Effective chip flow angle (weighted)
    const chipFlowAngle = 0.7 * colwellAngle + 0.3 * stablerAngle;

    // 4. Side curl radius (from feed and geometry)
    // Side curl is primarily from the chip breaker or natural stress distribution
    const shearResult = this.calculateShearAngle(params.rake_angle_deg, mat.friction_coefficient);
    const chipThickness = feed / shearResult.chip_thickness_ratio.value;

    // Natural side curl (Nakayama): R_side = f(chip thickness, tool geometry)
    const sideCurlRadius = params.chipbreaker_width_mm
      ? (params.chipbreaker_width_mm ** 2) / (8 * chipThickness)
      : chipThickness * 12;

    // 5. Back curl radius (from inclination and DOC)
    // Back curl increases with DOC and decreases with inclination
    const backCurlRadius = (doc + noseRadius) * (2 + Math.abs(inclination) / 30);

    // 6. Determine natural curl direction
    let naturalCurlDir: "side" | "back" | "combined";
    if (Math.abs(inclination) < 5) {
      naturalCurlDir = "side";
    } else if (sideCurlRadius > backCurlRadius * 1.5) {
      naturalCurlDir = "back";
    } else {
      naturalCurlDir = "combined";
    }

    // 7. Chip space requirements
    // Volume ratio: (chip volume) / (cut volume) ~ 1/chip_ratio * expansion_factor
    const chipRatio = shearResult.chip_thickness_ratio.value;
    const volumeExpansion = 1.5; // Chips typically expand 1.5x when curled
    const chipSpaceRequired = doc * feed * (1 / chipRatio) * volumeExpansion;

    // 8. Evacuation difficulty
    let evacuationDifficulty: "easy" | "moderate" | "difficult";
    if (mat.elongation_pct < 5) {
      // Brittle chips: easy evacuation
      evacuationDifficulty = "easy";
    } else if (chipRatio > 0.5 && params.chipbreaker && params.chipbreaker !== "none") {
      evacuationDifficulty = "easy";
    } else if (chipRatio > 0.3) {
      evacuationDifficulty = "moderate";
    } else {
      evacuationDifficulty = "difficult";
    }

    // 9. Tangling risk
    let tanglingRisk = 0;
    if (mat.elongation_pct > 20 && !params.chipbreaker) {
      tanglingRisk = 0.7;
    } else if (mat.elongation_pct > 10 && feed < MIN_FEED_CHIP_BREAKING) {
      tanglingRisk = 0.5;
    } else if (mat.elongation_pct > 10) {
      tanglingRisk = 0.2;
    }

    if (params.coolant === "high_pressure" && params.coolant_pressure_bar && params.coolant_pressure_bar > 50) {
      tanglingRisk *= 0.5; // High pressure coolant helps chip evacuation
    }

    // 10. Conveyor compatibility
    // Good: short, segmented, discontinuous chips
    // Bad: long, snarled, ribbon chips
    const conveyorCompatible =
      mat.elongation_pct < 10 ||
      (params.chipbreaker && params.chipbreaker !== "none" && feed > 0.15);

    log.debug(
      `[LatheChipMechanics] ChipFlow: eta=${chipFlowAngle.toFixed(1)}deg, ` +
      `R_side=${sideCurlRadius.toFixed(2)}mm, R_back=${backCurlRadius.toFixed(2)}mm, ` +
      `evacuation=${evacuationDifficulty}`
    );

    return {
      chip_flow_angle: {
        value: round1(chipFlowAngle),
        unit: "deg",
        uncertainty: 5,
        source: "Weighted Stabler + Colwell model",
      },
      stabler_angle: {
        value: round1(stablerAngle),
        unit: "deg",
        uncertainty: 2,
        source: "Stabler (1951): eta_c = i (inclination)",
      },
      colwell_angle: {
        value: round1(colwellAngle),
        unit: "deg",
        uncertainty: 3,
        source: "Colwell: modified for nose radius effect",
      },
      side_curl_radius: {
        value: round2(sideCurlRadius),
        unit: "mm",
        uncertainty: sideCurlRadius * 0.25,
        source: "Nakayama curl model",
      },
      back_curl_radius: {
        value: round2(backCurlRadius),
        unit: "mm",
        uncertainty: backCurlRadius * 0.3,
        source: "Empirical: f(DOC, nose_R, inclination)",
      },
      natural_curl_direction: naturalCurlDir,
      chip_space_required: {
        value: round3(chipSpaceRequired),
        unit: "mm^3/mm",
        uncertainty: chipSpaceRequired * 0.3,
        source: "Volume expansion model",
      },
      evacuation_difficulty: evacuationDifficulty,
      tangling_risk: {
        value: round2(tanglingRisk),
        unit: "probability",
        uncertainty: 0.15,
        source: "Empirical model based on ductility, feed, chipbreaker",
      },
      conveyor_compatible: conveyorCompatible,
    };
  }

  /**
   * Assess overall chip control quality.
   *
   * Evaluates:
   * - Chip type and shape
   * - Chip length estimation
   * - Handling difficulty
   * - Surface damage risk
   * - Part interference
   *
   * @param params Cutting parameters
   * @param material Material properties or name
   * @returns Chip control assessment
   */
  assessChipControl(
    params: CuttingParameters,
    material: ChipMaterialProperties | string
  ): ChipControlAssessment {
    const mat = typeof material === "string"
      ? (CHIP_MATERIAL_DB[material] ?? CHIP_MATERIAL_DB.steel)
      : material;

    const chipPrediction = this.predictChipType(params, mat);
    const breakerDesign = this.designChipBreaker(mat, params.depth_of_cut_mm, params.feed_mm_rev);
    const flowAnalysis = this.analyzeChipFlow(params, mat);

    const issues: string[] = [];
    const solutions: string[] = [];

    // 1. Base score from chip type
    let score = 50;
    switch (chipPrediction.predicted_type) {
      case "discontinuous":
      case "elemental":
        score = 95;
        break;
      case "segmented":
        score = 85;
        break;
      case "lamellar":
        score = 70;
        break;
      case "continuous":
        if (params.chipbreaker && params.chipbreaker !== "none") {
          score = 75;
        } else {
          score = 40;
        }
        break;
      case "continuous_with_bue":
        score = 35;
        issues.push("Built-up edge causing irregular chip formation");
        solutions.push("Increase cutting speed or apply coolant");
        break;
      case "stringy":
        score = 20;
        issues.push("DANGER: Long stringy chips - wrapping hazard");
        solutions.push("Increase feed above 0.1 mm/rev");
        solutions.push("Use chipbreaker insert");
        break;
      case "birds_nest":
        score = 5;
        issues.push("CRITICAL: Bird's nest formation - stop machine");
        solutions.push("Clear chips, increase feed significantly");
        solutions.push("Use high-pressure coolant chip breaking");
        break;
    }

    // 2. Adjust for chip shape
    switch (chipPrediction.predicted_shape) {
      case "ribbon":
      case "snarled":
        score -= 20;
        issues.push(`${chipPrediction.predicted_shape} chips - poor control`);
        break;
      case "helical":
      case "spiral":
        score += 5;
        break;
      case "arc":
      case "comma":
        score += 10;
        break;
      case "needle":
        score += 15;
        break;
    }

    // 3. Chipbreaker effectiveness
    if (params.chipbreaker && params.chipbreaker !== "none") {
      const breaker = CHIPBREAKER_DB[params.chipbreaker];
      const feedInRange =
        params.feed_mm_rev >= breaker.feed_range_mm_rev.min &&
        params.feed_mm_rev <= breaker.feed_range_mm_rev.max;
      const docInRange =
        params.depth_of_cut_mm >= breaker.doc_range_mm.min &&
        params.depth_of_cut_mm <= breaker.doc_range_mm.max;

      if (feedInRange && docInRange) {
        score += 15;
      } else {
        if (!feedInRange) {
          issues.push(
            `Feed ${params.feed_mm_rev} mm/rev outside chipbreaker range ` +
            `(${breaker.feed_range_mm_rev.min}-${breaker.feed_range_mm_rev.max})`
          );
          solutions.push("Adjust feed to chipbreaker operating window");
        }
        if (!docInRange) {
          issues.push(
            `DOC ${params.depth_of_cut_mm} mm outside chipbreaker range ` +
            `(${breaker.doc_range_mm.min}-${breaker.doc_range_mm.max})`
          );
        }
      }
    }

    // 4. Coolant effect
    if (params.coolant === "high_pressure" && params.coolant_pressure_bar) {
      if (params.coolant_pressure_bar > 70) {
        score += 10;
      } else if (params.coolant_pressure_bar > 30) {
        score += 5;
      }
    }

    // Clamp score
    score = Math.max(0, Math.min(100, score));

    // 5. Determine overall quality
    let quality: ChipControlQuality;
    if (score >= 85) quality = "excellent";
    else if (score >= 70) quality = "good";
    else if (score >= 50) quality = "marginal";
    else if (score >= 30) quality = "poor";
    else quality = "dangerous";

    // 6. Estimate chip length
    let chipLengthClass: "short" | "medium" | "long" | "very_long" | "continuous";
    let estChipLength: number;

    if (chipPrediction.predicted_type === "discontinuous" || chipPrediction.predicted_type === "elemental") {
      chipLengthClass = "short";
      estChipLength = 5; // mm
    } else if (chipPrediction.predicted_type === "segmented") {
      chipLengthClass = "short";
      estChipLength = 20;
    } else if (params.chipbreaker && params.chipbreaker !== "none" && breakerDesign.self_breaking_possible) {
      chipLengthClass = "medium";
      estChipLength = 50;
    } else if (params.chipbreaker) {
      chipLengthClass = "long";
      estChipLength = 150;
    } else {
      chipLengthClass = "continuous";
      estChipLength = 1000;
      issues.push("Continuous chips - no natural breaking point");
    }

    // 7. Handling difficulty
    let handlingDifficulty: "easy" | "moderate" | "difficult" | "hazardous";
    if (chipLengthClass === "short") handlingDifficulty = "easy";
    else if (chipLengthClass === "medium") handlingDifficulty = "moderate";
    else if (chipLengthClass === "long") handlingDifficulty = "difficult";
    else handlingDifficulty = "hazardous";

    // 8. Surface damage risk
    // Long chips can scratch finished surfaces
    type ChipLengthType = "short" | "medium" | "long" | "very_long" | "continuous";
    const lengthClass = chipLengthClass as ChipLengthType;
    const surfaceDamageRisk = lengthClass === "continuous" || lengthClass === "very_long"
      ? 0.7
      : lengthClass === "long"
        ? 0.4
        : 0.1;

    if (surfaceDamageRisk > 0.5) {
      issues.push("Long chips may scratch finished surfaces");
      solutions.push("Improve chip breaking before finishing passes");
    }

    // 9. Part interference risk
    const partInterferenceRisk = flowAnalysis.tangling_risk.value * 0.8;

    // 10. Tool wear impact
    // Poor chip control can accelerate wear through re-cutting
    const toolWearImpact = lengthClass === "continuous" ? 1.3
      : lengthClass === "very_long" ? 1.2
      : lengthClass === "long" ? 1.1
      : 1.0;

    log.debug(
      `[LatheChipMechanics] ChipControl: score=${score}, quality=${quality}, ` +
      `length=${chipLengthClass} (~${estChipLength}mm)`
    );

    return {
      overall_quality: quality,
      score: {
        value: score,
        unit: "score",
        uncertainty: 10,
        source: "Composite score from type, shape, breaker, coolant",
      },
      chip_length_class: chipLengthClass,
      estimated_chip_length_mm: {
        value: round0(estChipLength),
        unit: "mm",
        uncertainty: estChipLength * 0.5,
        source: "Empirical estimation from chip type and breaking",
      },
      handling_difficulty: handlingDifficulty,
      surface_damage_risk: {
        value: round2(surfaceDamageRisk),
        unit: "probability",
        uncertainty: 0.15,
        source: "Based on chip length class",
      },
      part_interference_risk: {
        value: round2(partInterferenceRisk),
        unit: "probability",
        uncertainty: 0.2,
        source: "Derived from tangling risk",
      },
      tool_wear_impact: {
        value: round2(toolWearImpact),
        unit: "multiplier",
        uncertainty: 0.1,
        source: "Re-cutting factor from chip control",
      },
      issues_detected: issues,
      solutions,
    };
  }

  /**
   * Optimize cutting parameters for chip breaking.
   *
   * Adjusts feed, DOC, and speed to achieve better chip control
   * while maintaining productivity.
   *
   * @param currentParams Current cutting parameters
   * @param material Material properties or name
   * @returns Optimized parameters with trade-off analysis
   */
  optimizeForChipBreaking(
    currentParams: CuttingParameters,
    material: ChipMaterialProperties | string
  ): OptimizedChipBreakingParams {
    const mat = typeof material === "string"
      ? (CHIP_MATERIAL_DB[material] ?? CHIP_MATERIAL_DB.steel)
      : material;

    const currentAssessment = this.assessChipControl(currentParams, mat);
    const tradeOffs: string[] = [];

    // Start with current values
    let optFeed = currentParams.feed_mm_rev;
    let optDoc = currentParams.depth_of_cut_mm;
    let optSpeed = currentParams.cutting_speed_mpm;
    let chipbreakerRec = currentParams.chipbreaker ?? "medium";
    let coolantRec = currentParams.coolant ?? "flood";

    // 1. Feed optimization
    // If feed too low for chip breaking, increase it
    if (optFeed < MIN_FEED_CHIP_BREAKING && mat.elongation_pct > 10) {
      optFeed = Math.max(MIN_FEED_CHIP_BREAKING, optFeed * 1.5);
      tradeOffs.push(`Increased feed to ${optFeed.toFixed(2)} mm/rev for chip breaking`);
    }

    // If using chipbreaker, ensure feed is in operating window
    if (chipbreakerRec && chipbreakerRec !== "none") {
      const breaker = CHIPBREAKER_DB[chipbreakerRec];
      if (optFeed < breaker.feed_range_mm_rev.min) {
        optFeed = breaker.feed_range_mm_rev.min;
        tradeOffs.push(`Feed increased to chipbreaker minimum ${optFeed} mm/rev`);
      } else if (optFeed > breaker.feed_range_mm_rev.max) {
        // May need heavier chipbreaker
        if (chipbreakerRec === "light") {
          chipbreakerRec = "medium";
          tradeOffs.push("Upgraded to medium chipbreaker for higher feed");
        } else if (chipbreakerRec === "medium") {
          chipbreakerRec = "heavy";
          tradeOffs.push("Upgraded to heavy chipbreaker for higher feed");
        }
      }
    }

    // 2. DOC optimization
    // Ensure DOC engages chipbreaker
    if (chipbreakerRec && chipbreakerRec !== "none") {
      const breakerDesign = this.designChipBreaker(mat, optDoc, optFeed);
      if (optDoc < breakerDesign.min_doc_for_engagement.value) {
        optDoc = breakerDesign.min_doc_for_engagement.value;
        tradeOffs.push(`Increased DOC to ${optDoc.toFixed(2)} mm for chipbreaker engagement`);
      }
    }

    // 3. Speed optimization
    // Check for BUE risk
    const chipPrediction = this.predictChipType(
      { ...currentParams, feed_mm_rev: optFeed, depth_of_cut_mm: optDoc },
      mat
    );

    if (chipPrediction.bue_risk.value > 0.5) {
      // Increase speed to avoid BUE
      optSpeed = Math.max(optSpeed, chipPrediction.transition_speed_continuous_segmented.value * 0.8);
      tradeOffs.push(`Increased speed to ${optSpeed.toFixed(0)} m/min to avoid BUE`);
    }

    // 4. Chipbreaker recommendation
    if (mat.elongation_pct > 15 && !currentParams.chipbreaker) {
      chipbreakerRec = "medium";
      tradeOffs.push("Added medium chipbreaker for ductile material");
    }

    // 5. Coolant recommendation
    if (
      !breakerDesignEffective(mat, optFeed, optDoc, chipbreakerRec) &&
      mat.elongation_pct > 20
    ) {
      coolantRec = "high_pressure";
      tradeOffs.push("Recommended high-pressure coolant (70+ bar) for chip breaking assist");
    }

    // 6. Calculate improvement
    const optimizedParams: CuttingParameters = {
      ...currentParams,
      feed_mm_rev: optFeed,
      depth_of_cut_mm: optDoc,
      cutting_speed_mpm: optSpeed,
      chipbreaker: chipbreakerRec,
      coolant: coolantRec,
    };

    const optimizedAssessment = this.assessChipControl(optimizedParams, mat);
    const improvement =
      (optimizedAssessment.score.value - currentAssessment.score.value) /
      Math.max(currentAssessment.score.value, 1);

    log.debug(
      `[LatheChipMechanics] Optimize: score ${currentAssessment.score.value} -> ` +
      `${optimizedAssessment.score.value} (${(improvement * 100).toFixed(0)}% improvement)`
    );

    return {
      original_params: currentParams,
      optimized_feed: {
        value: round3(optFeed),
        unit: "mm/rev",
        uncertainty: optFeed * 0.05,
        source: "Optimized for chip breaking window",
      },
      optimized_doc: {
        value: round2(optDoc),
        unit: "mm",
        uncertainty: optDoc * 0.05,
        source: "Adjusted for chipbreaker engagement",
      },
      optimized_speed: {
        value: round0(optSpeed),
        unit: "m/min",
        uncertainty: optSpeed * 0.1,
        source: "Adjusted for BUE avoidance",
      },
      chipbreaker_recommendation: chipbreakerRec,
      coolant_recommendation: coolantRec,
      predicted_improvement: {
        value: round2(improvement),
        unit: "ratio",
        uncertainty: 0.1,
        source: "Score improvement ratio",
      },
      trade_offs: tradeOffs,
    };
  }

  /**
   * Diagnose chip-related problems from observed symptoms.
   *
   * @param symptom Description of observed chip problem
   * @param params Current cutting parameters (optional)
   * @param material Material (optional)
   * @returns Diagnosis and solutions
   */
  diagnoseChipProblem(
    symptom: string,
    params?: Partial<CuttingParameters>,
    material?: ChipMaterialProperties | string
  ): {
    problem: string;
    root_cause: string;
    solutions: string[];
    severity: "low" | "medium" | "high" | "critical";
  } {
    const symptomLower = symptom.toLowerCase();

    // Problem database
    const problems = [
      {
        keywords: ["stringy", "long", "continuous", "wrap", "wrapping"],
        problem: "Stringy/Long Continuous Chips",
        root_cause: "Insufficient chip breaking - feed too low, no chipbreaker, or ductile material",
        solutions: [
          "Increase feed rate above 0.10 mm/rev (min 0.08 mm/rev for steel)",
          "Use insert with chipbreaker geometry",
          "Apply high-pressure coolant (70+ bar) through tool",
          "Reduce rake angle to increase chip thickness",
        ],
        severity: "high" as const,
      },
      {
        keywords: ["bird", "nest", "tangl", "mass"],
        problem: "Bird's Nest Formation",
        root_cause: "Severe continuous chip tangling - extremely poor chip control",
        solutions: [
          "STOP immediately and clear chips safely",
          "Significantly increase feed rate (2x or more)",
          "Use heavy-duty chipbreaker insert",
          "Add high-pressure coolant if not present",
          "Consider peck cycle with dwell for chip clearing",
        ],
        severity: "critical" as const,
      },
      {
        keywords: ["bue", "built-up", "buildup", "edge"],
        problem: "Built-Up Edge (BUE)",
        root_cause: "Adhesion of workpiece material to tool at low cutting speed",
        solutions: [
          "Increase cutting speed above BUE threshold (50-80 m/min for steel)",
          "Apply coolant or switch to flood/mist",
          "Use coated insert (TiAlN, TiN)",
          "Increase rake angle",
          "Use insert with polished rake face",
        ],
        severity: "medium" as const,
      },
      {
        keywords: ["re-cut", "recut", "scratch", "damage", "surface"],
        problem: "Chip Re-cutting Surface Damage",
        root_cause: "Chips not evacuating, getting trapped between tool and workpiece",
        solutions: [
          "Improve chip breaking (see stringy chip solutions)",
          "Adjust chip flow direction with tool inclination",
          "Use air blast for chip evacuation",
          "Change to through-coolant tooling",
          "Adjust approach angle to direct chips away from finished surface",
        ],
        severity: "high" as const,
      },
      {
        keywords: ["blue", "purple", "discolor", "burn", "overheat"],
        problem: "Chip Overheating (Thermal Damage)",
        root_cause: "Excessive cutting temperature - chips turning blue/purple",
        solutions: [
          "Reduce cutting speed by 15-20%",
          "Increase coolant flow or switch to flood",
          "Check tool wear - replace if needed",
          "Reduce depth of cut",
          "Use insert with better heat resistance",
        ],
        severity: "medium" as const,
      },
      {
        keywords: ["chatter", "vibrat", "segment", "serrat"],
        problem: "Segmented/Serrated Chips with Vibration",
        root_cause: "Adiabatic shear band formation or chatter during cutting",
        solutions: [
          "For superalloys: segmented chips are normal, monitor for excessive vibration",
          "Reduce cutting speed if vibration occurs",
          "Increase system rigidity",
          "Adjust feed to move away from stability lobe boundary",
          "Use damped boring bars for long overhangs",
        ],
        severity: "medium" as const,
      },
      {
        keywords: ["thin", "rubbing", "ploughing", "shiny"],
        problem: "Chip Too Thin / Rubbing",
        root_cause: "Chip thickness below minimum - ploughing instead of cutting",
        solutions: [
          "Increase feed rate significantly",
          "Check edge radius - may need sharper insert",
          "Minimum chip thickness = 0.2 * edge radius",
          "Consider smaller nose radius insert",
        ],
        severity: "medium" as const,
      },
    ];

    // Find matching problem
    for (const prob of problems) {
      if (prob.keywords.some((kw) => symptomLower.includes(kw))) {
        return {
          problem: prob.problem,
          root_cause: prob.root_cause,
          solutions: prob.solutions,
          severity: prob.severity,
        };
      }
    }

    // Default response
    return {
      problem: "Unknown Chip Problem",
      root_cause: `Unable to diagnose from symptom: "${symptom}"`,
      solutions: [
        "Check chip type prediction using predictChipType()",
        "Review chipbreaker selection with designChipBreaker()",
        "Analyze chip flow with analyzeChipFlow()",
        "Run full assessment with assessChipControl()",
      ],
      severity: "low",
    };
  }

  /**
   * Get material properties for chip analysis.
   *
   * @param materialName Material name or ISO group
   * @returns Material properties
   */
  getMaterialProperties(materialName: string): ChipMaterialProperties | null {
    const nameLower = materialName.toLowerCase();

    // Direct match
    if (CHIP_MATERIAL_DB[nameLower]) {
      return CHIP_MATERIAL_DB[nameLower];
    }

    // Fuzzy match
    for (const [key, props] of Object.entries(CHIP_MATERIAL_DB)) {
      if (key.includes(nameLower) || props.name.toLowerCase().includes(nameLower)) {
        return props;
      }
    }

    // ISO group match
    const isoMap: Record<string, string> = {
      p: "steel",
      m: "stainless",
      k: "cast_iron",
      n: "aluminum",
      s: "titanium",
      h: "hardened_steel",
    };

    if (isoMap[nameLower]) {
      return CHIP_MATERIAL_DB[isoMap[nameLower]];
    }

    return null;
  }

  /**
   * List available materials in the chip mechanics database.
   *
   * @returns Array of material names and ISO groups
   */
  listAvailableMaterials(): Array<{ name: string; iso_group: ISOGroup }> {
    return Object.entries(CHIP_MATERIAL_DB).map(([key, props]) => ({
      name: props.name,
      iso_group: props.iso_group,
    }));
  }

  // ===========================
  // PRIVATE HELPER METHODS
  // ===========================

  /**
   * Calculate Recht instability parameter.
   */
  private _calculateRechtParameter(
    mat: ChipMaterialProperties,
    Vc: number,
    feed: number,
    rakeAngleDeg: number
  ): number {
    // Simplified Recht parameter estimation
    // chi = (thermal_softening) / (strain_hardening)

    // High thermal softening: low thermal conductivity, high speed
    const thermalFactor = (1 / (mat.thermal_conductivity + 1)) * Math.sqrt(Vc / 50);

    // Strain hardening factor: higher work_hardening_n = more hardening
    const hardeningFactor = mat.work_hardening_n ?? 0.25;

    // Material susceptibility
    const susceptibility =
      mat.iso_group === "S" ? 1.5  // Superalloys very susceptible
      : mat.iso_group === "H" ? 1.3  // Hardened steel
      : mat.iso_group === "M" ? 1.1  // Stainless
      : 1.0;

    return thermalFactor * susceptibility / Math.max(hardeningFactor, 0.1);
  }

  /**
   * Estimate transition speed from continuous to segmented chips.
   */
  private _estimateSegmentationTransitionSpeed(mat: ChipMaterialProperties): number {
    // Lower thermal conductivity = lower transition speed
    // Base: 200 m/min for steel with k=50

    const baseSpeed = 200;
    const thermalRatio = Math.sqrt(mat.thermal_conductivity / 50);
    const hardeningEffect = 1 + (mat.work_hardening_n ?? 0.25 - 0.25);

    return baseSpeed * thermalRatio * hardeningEffect;
  }
}

// ===========================
// HELPER FUNCTIONS
// ===========================

/**
 * Check if chipbreaker design is effective for given conditions.
 */
function breakerDesignEffective(
  mat: ChipMaterialProperties,
  feed: number,
  doc: number,
  breakerType: string
): boolean {
  if (breakerType === "none") return false;

  const breaker = CHIPBREAKER_DB[breakerType];
  if (!breaker) return false;

  const feedInRange =
    feed >= breaker.feed_range_mm_rev.min &&
    feed <= breaker.feed_range_mm_rev.max;
  const docInRange =
    doc >= breaker.doc_range_mm.min &&
    doc <= breaker.doc_range_mm.max;

  return feedInRange && docInRange;
}

// Rounding helpers
function round0(n: number): number {
  return Math.round(n);
}
function round1(n: number): number {
  return Math.round(n * 10) / 10;
}
function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}
function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

// ===========================
// SINGLETON EXPORT
// ===========================

/**
 * Singleton instance of LatheChipMechanicsEngine.
 */
export const latheChipMechanicsEngine = new LatheChipMechanicsEngine();

/**
 * Default export for convenience.
 */
export default latheChipMechanicsEngine;
