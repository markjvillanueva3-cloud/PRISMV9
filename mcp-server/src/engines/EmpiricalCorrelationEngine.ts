/**
 * PRISM MCP Server - Empirical Correlation Engine
 * "Engineering Handbook in Code" — established industry correlations
 * linking material properties, process parameters, and outcomes.
 *
 * Correlations Implemented:
 * - Hardness scale conversions (ASTM E140 polynomial fits)
 * - Mechanical property estimation from hardness (UTS, yield, fatigue)
 * - Thermal property estimation from composition/temperature
 * - Cutting speed from hardness (Sandvik/ISCAR empirical)
 * - Feed from surface finish (Ra ↔ feed with Brammertz correction)
 * - Depth of cut limits (deflection, power, stability)
 * - Surface integrity correlations (residual stress, white layer)
 * - Tool life multipliers (coolant, coating, interruption)
 * - Chip breakability index (ISO 3685 classification)
 * - Cost per part (Gilbert's economic tool life)
 * - Productivity correlations (MRR vs quality trade space)
 *
 * SAFETY CRITICAL: These correlations are empirical approximations.
 * Always validate against material-specific test data for production use.
 */

import { log } from "../utils/Logger.js";

// ============================================================================
// TYPES
// ============================================================================

type HardnessScale = "HRC" | "HB" | "HV" | "HRA" | "HRB" | "shore_d";
type MaterialClass = "carbon_steel" | "alloy_steel" | "stainless" | "aluminum" | "titanium";
type ToolMaterial = "carbide" | "HSS" | "ceramic" | "CBN";
type Operation = "turning" | "milling" | "drilling";
type CoolantType = "dry" | "flood" | "mql" | "cryogenic";
type CoatingType = "none" | "TiN" | "TiAlN" | "AlCrN" | "DLC" | "CVD_diamond";
type ChipForm = "long_ribbon" | "short_tubular" | "comma" | "arc" | "broken";
type QualityTarget = "rough" | "semi_finish" | "finish" | "super_finish";
type ResidualStressType = "tensile" | "compressive";

interface HardnessConversionInput {
  value: number;
  from_scale: HardnessScale;
}

interface HardnessConversionResult {
  HRC: number | null;
  HB: number | null;
  HV: number | null;
  HRA: number | null;
  HRB: number | null;
  shore_d: number | null;
  tensile_strength_mpa: number | null;
}

interface MechanicalFromHardnessInput {
  hardness_HB: number;
  material_class: MaterialClass;
}

interface MechanicalFromHardnessResult {
  uts_mpa: number;
  yield_mpa: number;
  elastic_modulus_gpa: number;
  fatigue_limit_mpa: number;
  elongation_pct_estimate: number;
  reduction_area_pct_estimate: number;
  machinability_rating: number;
}

interface ThermalPropertiesInput {
  material_class: MaterialClass;
  temperature_c?: number;
  carbon_pct?: number;
  alloy_content_pct?: number;
}

interface ThermalPropertiesResult {
  thermal_conductivity_w_mk: number;
  specific_heat_j_kgk: number;
  thermal_diffusivity_m2s: number;
  density_kg_m3: number;
}

interface CuttingSpeedInput {
  hardness_HB: number;
  tool_material: ToolMaterial;
  operation: Operation;
}

interface CuttingSpeedResult {
  recommended_speed_mpm: number;
  speed_range: [number, number];
  reference_source: string;
  confidence: number;
}

interface FeedFromFinishInput {
  target_ra_um: number;
  nose_radius_mm: number;
  cutting_speed_mpm?: number;
  edge_radius_um?: number;
}

interface FeedFromFinishResult {
  recommended_feed_mm_rev: number;
  max_feed_for_target: number;
  achievable_ra_um: number;
  limiting_factor: string;
}

interface DepthOfCutInput {
  tool_diameter_mm: number;
  overhang_mm: number;
  tool_material: string;
  machine_power_kw: number;
  spindle_rpm: number;
  material_kc_mpa: number;
  material_type: string;
}

interface DepthOfCutResult {
  max_depth_deflection_mm: number;
  max_depth_power_mm: number;
  max_depth_stability_mm: number;
  recommended_depth_mm: number;
  limiting_factor: string;
}

interface SurfaceIntegrityInput {
  cutting_speed_mpm: number;
  feed_mm_rev: number;
  depth_mm: number;
  material_hardness_HB: number;
  tool_nose_radius_mm: number;
  tool_wear_vb_mm?: number;
  coolant?: boolean;
}

interface SurfaceIntegrityResult {
  residual_stress_mpa: number;
  residual_stress_type: ResidualStressType;
  white_layer_depth_um: number;
  work_hardened_depth_um: number;
  microhardness_change_pct: number;
  surface_quality_index: number;
}

interface ToolLifeMultipliersInput {
  base_tool_life_min: number;
  coolant_type: CoolantType;
  coating: CoatingType;
  workpiece_hardness_HRC?: number;
  interrupted_cut?: boolean;
  entry_angle_deg?: number;
}

interface ToolLifeMultipliersResult {
  adjusted_tool_life_min: number;
  multipliers: Record<string, number>;
  dominant_factor: string;
  confidence_level: number;
}

interface ChipBreakabilityInput {
  feed_mm_rev: number;
  depth_mm: number;
  nose_radius_mm: number;
  material_type: string;
  chip_breaker?: boolean;
}

interface ChipBreakabilityResult {
  chip_form: ChipForm;
  breakability_index: number;
  iso_3685_class: string;
  recommendation: string;
}

interface CostPerPartInput {
  cutting_time_min: number;
  tool_life_min: number;
  tool_cost: number;
  machine_rate_per_hour: number;
  tool_change_time_min: number;
  batch_size: number;
}

interface CostPerPartResult {
  cost_per_part: number;
  tool_cost_per_part: number;
  machine_cost_per_part: number;
  tool_changes_per_batch: number;
  economic_cutting_speed_mpm: number;
  sensitivity: { to_tool_cost: number; to_machine_rate: number };
}

interface ProductivityInput {
  material_type: string;
  operation: Operation;
  machine_power_kw: number;
  quality_target: QualityTarget;
}

interface ProductivityResult {
  mrr_range_cm3_min: [number, number];
  expected_ra_range_um: [number, number];
  typical_tool_life_min: number;
  cost_index: number;
  bottleneck: "power" | "finish" | "tool_life" | "stability";
}

// ============================================================================
// ASTM E140 HARDNESS CONVERSION DATA (polynomial fits)
// ============================================================================

/**
 * ASTM E140 HRC↔HB conversion (non-austenitic steels, carbide ball).
 * Polynomial fit valid for HRC 20–65 range.
 */
function hrcToHb(hrc: number): number {
  // 4th-order polynomial fit to ASTM E140 table
  if (hrc < 20) return hrbToHb(hrcToHrb(hrc) ?? 0);
  if (hrc > 65) return Math.round(4.29 * hrc * hrc - 311.6 * hrc + 8364);
  // Fit: HB = 0.0426×HRC³ - 3.258×HRC² + 114.4×HRC - 790
  // Simplified piecewise for better accuracy:
  if (hrc <= 40) {
    return Math.round(-0.0198 * hrc * hrc * hrc + 2.295 * hrc * hrc - 79.13 * hrc + 1154);
  }
  return Math.round(0.0453 * hrc * hrc * hrc - 5.862 * hrc * hrc + 275.4 * hrc - 3849);
}

function hbToHrc(hb: number): number {
  // Inverse of ASTM E140
  if (hb < 200) return Math.max(0, (hb - 104) / 9.4); // approximate for low range
  if (hb > 739) return 65;
  // Polynomial fit: HRC = -2.13e-7×HB³ + 3.19e-4×HB² + 0.0746×HB - 12.4
  return Math.round(
    (-2.13e-7 * hb * hb * hb + 3.19e-4 * hb * hb + 0.0746 * hb - 12.4) * 10
  ) / 10;
}

function hrcToHv(hrc: number): number {
  // HV ≈ HB / 0.95 for steels (approximate), refined with ASTM fit
  const hb = hrcToHb(hrc);
  if (hrc < 20) return Math.round(hb / 0.95);
  // For HRC > 20, HV diverges upward from HB
  const ratio = 1.0 + 0.002 * (hrc - 20); // ratio increases with hardness
  return Math.round(hb * ratio / 0.95);
}

function hvToHrc(hv: number): number {
  // Approximate inverse
  const hb = Math.round(hv * 0.95);
  return hbToHrc(hb);
}

function hrcToHra(hrc: number): number {
  // ASTM E140: HRA ≈ 0.4985×HRC + 60.7 (linear fit for HRC 20-65)
  return Math.round((0.4985 * hrc + 60.7) * 10) / 10;
}

function hraToHrc(hra: number): number {
  // Inverse: HRC ≈ (HRA - 60.7) / 0.4985
  return Math.round(((hra - 60.7) / 0.4985) * 10) / 10;
}

function hrcToHrb(hrc: number): number | null {
  // HRB is only defined for softer materials (HRB < ~100, HRC < ~20)
  if (hrc > 22) return null;
  // Approximate: HRB ≈ 4.7×HRC + 5 (only valid for overlap zone HRC 18-22)
  return Math.round(Math.min(100, 4.7 * hrc + 5));
}

function hrbToHb(hrb: number): number {
  // Approximate: HB ≈ 1.42×HRB + 47 (for HRB 60-100)
  return Math.round(1.42 * hrb + 47);
}

function hrbToHrc(hrb: number): number {
  // Only valid at upper range HRB > 90
  return Math.max(0, Math.round(((hrb - 5) / 4.7) * 10) / 10);
}

function hrcToShoreD(hrc: number): number | null {
  // Shore D is primarily for polymers/elastomers; mapping to metals is approximate
  // Shore D ≈ HRC + 18 (very rough, mainly for reference)
  if (hrc > 60) return null;
  return Math.round(hrc + 18);
}

function shoreDToHrc(shoreD: number): number {
  return Math.max(0, shoreD - 18);
}

// ============================================================================
// MATERIAL PROPERTY DATABASES
// ============================================================================

const MATERIAL_ELASTIC_MODULUS: Record<MaterialClass, number> = {
  carbon_steel: 210,
  alloy_steel: 210,
  stainless: 193,
  aluminum: 70,
  titanium: 114,
};

const MATERIAL_DENSITY: Record<MaterialClass, number> = {
  carbon_steel: 7850,
  alloy_steel: 7850,
  stainless: 7900,
  aluminum: 2700,
  titanium: 4510,
};

const MATERIAL_BASE_THERMAL_K: Record<MaterialClass, { k0: number; coeff: number }> = {
  carbon_steel: { k0: 51.9, coeff: -0.034 },    // W/mK at 20°C, coeff per °C
  alloy_steel: { k0: 42.0, coeff: -0.028 },
  stainless: { k0: 16.3, coeff: 0.012 },          // austenitic SS increases slightly
  aluminum: { k0: 237, coeff: -0.08 },
  titanium: { k0: 7.0, coeff: 0.005 },
};

const MATERIAL_SPECIFIC_HEAT: Record<MaterialClass, number> = {
  carbon_steel: 486,
  alloy_steel: 486,
  stainless: 500,
  aluminum: 900,
  titanium: 520,
};

// Cutting speed reference data: V_ref at HB_ref=200, n_hardness exponent
const CUTTING_SPEED_REF: Record<ToolMaterial, Record<Operation, { v_ref: number; n: number }>> = {
  HSS: {
    turning: { v_ref: 35, n: 0.8 },
    milling: { v_ref: 30, n: 0.75 },
    drilling: { v_ref: 20, n: 0.7 },
  },
  carbide: {
    turning: { v_ref: 200, n: 0.6 },
    milling: { v_ref: 180, n: 0.55 },
    drilling: { v_ref: 100, n: 0.5 },
  },
  ceramic: {
    turning: { v_ref: 500, n: 0.4 },
    milling: { v_ref: 400, n: 0.4 },
    drilling: { v_ref: 150, n: 0.45 },
  },
  CBN: {
    turning: { v_ref: 250, n: 0.3 },
    milling: { v_ref: 200, n: 0.35 },
    drilling: { v_ref: 120, n: 0.35 },
  },
};

// Tool elastic modulus for deflection calculations
const TOOL_ELASTIC_MODULUS: Record<string, number> = {
  carbide: 600, // QA-MS3 FIX: canonical CANONICAL_TOOL_MODULUS (was 580)      // GPa
  HSS: 210,
  ceramic: 380,
  CBN: 680,
  steel: 210,
};

// Coolant multipliers for tool life
const COOLANT_MULTIPLIERS: Record<CoolantType, number> = {
  dry: 1.0,
  flood: 1.8,
  mql: 1.5,
  cryogenic: 2.2,
};

// Coating multipliers for tool life
const COATING_MULTIPLIERS: Record<CoatingType, number> = {
  none: 1.0,
  TiN: 1.5,
  TiAlN: 2.0,
  AlCrN: 2.2,
  DLC: 1.8,
  CVD_diamond: 3.0,
};

// ============================================================================
// ENGINE CLASS
// ============================================================================

export class EmpiricalCorrelationEngine {
  // --------------------------------------------------------------------------
  // Category 1: Material Property Correlations
  // --------------------------------------------------------------------------

  /**
   * Full conversion between all hardness scales.
   * Based on ASTM E140 polynomial fits for non-austenitic steels.
   */
  hardnessConversions(params: HardnessConversionInput): HardnessConversionResult {
    const { value, from_scale } = params;

    if (value < 0) {
      throw new Error("Hardness value must be non-negative");
    }

    // First convert everything to HRC as the pivot scale
    let hrc: number;

    switch (from_scale) {
      case "HRC":
        hrc = value;
        break;
      case "HB":
        hrc = hbToHrc(value);
        break;
      case "HV":
        hrc = hvToHrc(value);
        break;
      case "HRA":
        hrc = hraToHrc(value);
        break;
      case "HRB":
        hrc = hrbToHrc(value);
        break;
      case "shore_d":
        hrc = shoreDToHrc(value);
        break;
      default:
        throw new Error(`Unknown hardness scale: ${from_scale}`);
    }

    // Clamp HRC to valid range
    hrc = Math.max(0, Math.min(70, hrc));

    const hb = hrcToHb(hrc);
    const hv = hrcToHv(hrc);
    const hra = hrcToHra(hrc);
    const hrb = hrcToHrb(hrc);
    const shoreD = hrcToShoreD(hrc);

    // UTS from HB (for steel): UTS ≈ 3.45 × HB
    const uts = hb > 0 ? Math.round(3.45 * hb) : null;

    log.debug( `Hardness conversion from ${from_scale}=${value}: HRC=${hrc}`);

    return {
      HRC: Math.round(hrc * 10) / 10,
      HB: hb,
      HV: hv,
      HRA: hra,
      HRB: hrb,
      shore_d: shoreD,
      tensile_strength_mpa: uts,
    };
  }

  /**
   * Estimate mechanical properties from Brinell hardness and material class.
   * Uses established correlations from ASM Handbook and Cahoon relationships.
   */
  mechanicalFromHardness(params: MechanicalFromHardnessInput): MechanicalFromHardnessResult {
    const { hardness_HB, material_class } = params;

    if (hardness_HB <= 0) {
      throw new Error("Hardness must be positive");
    }

    let uts_mpa: number;
    let yield_ratio: number;
    let fatigue_ratio: number;
    let elongation: number;
    let reduction_area: number;

    switch (material_class) {
      case "carbon_steel":
      case "alloy_steel":
        // UTS ≈ 3.45 × HB (MPa) — well-established for steels
        uts_mpa = 3.45 * hardness_HB;
        yield_ratio = material_class === "carbon_steel" ? 0.70 : 0.75;
        // Fatigue limit ≈ 0.5×UTS for steel below 1400 MPa (Marin)
        fatigue_ratio = uts_mpa <= 1400 ? 0.5 : 700 / uts_mpa;
        // Elongation decreases with hardness
        elongation = Math.max(2, 45 - 0.12 * hardness_HB);
        reduction_area = Math.max(5, 70 - 0.18 * hardness_HB);
        break;

      case "stainless":
        // Austenitic SS: UTS ≈ 3.24 × HB
        uts_mpa = 3.24 * hardness_HB;
        yield_ratio = 0.45; // austenitic has large gap between yield and UTS
        fatigue_ratio = 0.4;
        elongation = Math.max(5, 55 - 0.15 * hardness_HB);
        reduction_area = Math.max(10, 65 - 0.15 * hardness_HB);
        break;

      case "aluminum":
        // Aluminum: UTS ≈ 3.07 × HB (lower coefficient)
        uts_mpa = 3.07 * hardness_HB;
        yield_ratio = 0.85; // wrought Al alloys, high yield ratio
        fatigue_ratio = 0.35; // lower fatigue ratio than steel
        elongation = Math.max(1, 30 - 0.15 * hardness_HB);
        reduction_area = Math.max(3, 40 - 0.15 * hardness_HB);
        break;

      case "titanium":
        // Titanium: UTS ≈ 3.36 × HB
        uts_mpa = 3.36 * hardness_HB;
        yield_ratio = 0.90;
        fatigue_ratio = 0.45;
        elongation = Math.max(2, 25 - 0.08 * hardness_HB);
        reduction_area = Math.max(5, 35 - 0.10 * hardness_HB);
        break;

      default:
        throw new Error(`Unknown material class: ${material_class}`);
    }

    const yield_mpa = uts_mpa * yield_ratio;
    const fatigue_limit_mpa = uts_mpa * fatigue_ratio;
    const elastic_modulus_gpa = MATERIAL_ELASTIC_MODULUS[material_class];

    // Machinability rating: 100 = AISI 1212 (HB ≈ 167)
    // Higher hardness → lower machinability; material class matters
    let machinability_base: number;
    switch (material_class) {
      case "carbon_steel": machinability_base = 75; break;
      case "alloy_steel": machinability_base = 60; break;
      case "stainless": machinability_base = 45; break;
      case "aluminum": machinability_base = 150; break;
      case "titanium": machinability_base = 25; break;
    }
    // Adjust for hardness: normalized around HB 200
    const machinability_rating = Math.max(5,
      Math.round(machinability_base * Math.pow(200 / hardness_HB, 0.5))
    );

    log.debug(
      `Mechanical from HB=${hardness_HB} (${material_class}): UTS=${Math.round(uts_mpa)} MPa`);

    return {
      uts_mpa: Math.round(uts_mpa),
      yield_mpa: Math.round(yield_mpa),
      elastic_modulus_gpa,
      fatigue_limit_mpa: Math.round(fatigue_limit_mpa),
      elongation_pct_estimate: Math.round(elongation * 10) / 10,
      reduction_area_pct_estimate: Math.round(reduction_area * 10) / 10,
      machinability_rating,
    };
  }

  /**
   * Estimate thermal properties from material class, temperature, and composition.
   * Steel: k ≈ 51.9 - 0.034×T (W/mK), reduced by alloying.
   */
  thermalPropertiesEstimate(params: ThermalPropertiesInput): ThermalPropertiesResult {
    const { material_class, temperature_c = 20, carbon_pct = 0.2, alloy_content_pct = 0 } = params;

    const base = MATERIAL_BASE_THERMAL_K[material_class];
    if (!base) {
      throw new Error(`Unknown material class: ${material_class}`);
    }

    // Thermal conductivity: base + temperature effect + alloy reduction
    let k = base.k0 + base.coeff * (temperature_c - 20);

    // Alloying reduces conductivity in steels (roughly -1.5% per wt% alloy)
    if (material_class === "carbon_steel" || material_class === "alloy_steel") {
      k *= (1 - 0.015 * alloy_content_pct);
      // Carbon also reduces conductivity
      k *= (1 - 0.1 * Math.max(0, carbon_pct - 0.1));
    }

    k = Math.max(1, k); // physical minimum

    const density = MATERIAL_DENSITY[material_class];
    const cp = MATERIAL_SPECIFIC_HEAT[material_class];

    // Thermal diffusivity α = k / (ρ × cp)
    const alpha = k / (density * cp);

    log.debug(
      `Thermal props for ${material_class} at ${temperature_c}°C: k=${k.toFixed(1)} W/mK`);

    return {
      thermal_conductivity_w_mk: Math.round(k * 100) / 100,
      specific_heat_j_kgk: cp,
      thermal_diffusivity_m2s: parseFloat(alpha.toExponential(3)),
      density_kg_m3: density,
    };
  }

  // --------------------------------------------------------------------------
  // Category 2: Cutting Parameter Correlations
  // --------------------------------------------------------------------------

  /**
   * Empirical cutting speed from hardness.
   * Vc = V_ref × (HB_ref / HB)^n_hardness
   * Reference data from Sandvik Coromant and ISCAR catalogs.
   */
  cuttingSpeedFromHardness(params: CuttingSpeedInput): CuttingSpeedResult {
    const { hardness_HB, tool_material, operation } = params;

    if (hardness_HB <= 0) {
      throw new Error("Hardness must be positive");
    }

    const ref = CUTTING_SPEED_REF[tool_material]?.[operation];
    if (!ref) {
      throw new Error(`No data for ${tool_material}/${operation}`);
    }

    const HB_REF = 200;
    const vc = ref.v_ref * Math.pow(HB_REF / hardness_HB, ref.n);

    // Speed range: ±20% around recommended
    const speed_low = vc * 0.8;
    const speed_high = vc * 1.2;

    // Confidence decreases outside the main HB range (150-400)
    let confidence = 0.85;
    if (hardness_HB < 100 || hardness_HB > 500) confidence = 0.6;
    else if (hardness_HB < 150 || hardness_HB > 400) confidence = 0.75;

    log.debug(
      `Cutting speed for HB=${hardness_HB}, ${tool_material}/${operation}: ${vc.toFixed(0)} m/min`);

    return {
      recommended_speed_mpm: Math.round(vc * 10) / 10,
      speed_range: [Math.round(speed_low * 10) / 10, Math.round(speed_high * 10) / 10],
      reference_source: `Sandvik/ISCAR empirical (HB_ref=${HB_REF}, V_ref=${ref.v_ref}, n=${ref.n})`,
      confidence,
    };
  }

  /**
   * Inverse surface finish calculation: required feed for target Ra.
   * Ra = f² / (32 × r_nose), with Brammertz minimum chip thickness correction.
   */
  feedFromSurfaceFinish(params: FeedFromFinishInput): FeedFromFinishResult {
    const { target_ra_um, nose_radius_mm, cutting_speed_mpm, edge_radius_um } = params;

    if (target_ra_um <= 0 || nose_radius_mm <= 0) {
      throw new Error("Ra target and nose radius must be positive");
    }

    // Ideal: Ra = f²/(32×r) → f = √(32×Ra×r)
    // Ra in μm, r in mm → f in mm
    const f_ideal = Math.sqrt(32 * target_ra_um * nose_radius_mm / 1000);
    // Note: Ra in μm = f²(mm²) × 1000 / (32 × r(mm)) → f = √(32 × Ra/1000 × r)

    let limiting_factor = "geometric";
    let f_recommended = f_ideal;

    // Brammertz minimum chip thickness correction
    // Below minimum chip thickness, ploughing dominates → worse finish
    if (edge_radius_um && edge_radius_um > 0) {
      const h_min_mm = edge_radius_um / 1000 * 0.3; // ~30% of edge radius
      const f_min = Math.sqrt(2 * nose_radius_mm * h_min_mm);
      if (f_recommended < f_min) {
        f_recommended = f_min;
        limiting_factor = "brammertz_min_chip_thickness";
      }
    }

    // Speed effect on BUE: at low speed, BUE can worsen finish
    if (cutting_speed_mpm && cutting_speed_mpm < 50) {
      // BUE correction: reduce feed slightly for low-speed compensation
      const bue_factor = 1.0 + 0.1 * (50 - cutting_speed_mpm) / 50;
      const ra_corrected = target_ra_um / bue_factor;
      const f_bue = Math.sqrt(32 * ra_corrected * nose_radius_mm / 1000);
      if (f_bue < f_recommended) {
        f_recommended = f_bue;
        limiting_factor = "bue_correction";
      }
    }

    // Calculate achievable Ra with recommended feed
    const achievable_ra = (f_recommended * f_recommended * 1000) / (32 * nose_radius_mm);

    log.debug(
      `Feed for Ra=${target_ra_um}μm, r=${nose_radius_mm}mm: f=${f_recommended.toFixed(3)} mm/rev`);

    return {
      recommended_feed_mm_rev: Math.round(f_recommended * 10000) / 10000,
      max_feed_for_target: Math.round(f_ideal * 10000) / 10000,
      achievable_ra_um: Math.round(achievable_ra * 100) / 100,
      limiting_factor,
    };
  }

  /**
   * Maximum depth of cut from deflection, power, and stability constraints.
   * Returns the minimum (most limiting) constraint.
   */
  depthOfCutLimits(params: DepthOfCutInput): DepthOfCutResult {
    const {
      tool_diameter_mm, overhang_mm, tool_material, machine_power_kw,
      spindle_rpm, material_kc_mpa, material_type
    } = params;

    if (tool_diameter_mm <= 0 || overhang_mm <= 0) {
      throw new Error("Tool diameter and overhang must be positive");
    }

    // --- Deflection limit ---
    // Cantilever beam: δ = F×L³/(3EI), I = π×d⁴/64
    // F = kc × ap × f (approximate, f ≈ 0.1 mm/rev for estimation)
    const E_gpa = TOOL_ELASTIC_MODULUS[tool_material] || TOOL_ELASTIC_MODULUS["carbide"];
    const E_pa = E_gpa * 1e9;
    const d_m = tool_diameter_mm / 1000;
    const L_m = overhang_mm / 1000;
    const I = Math.PI * Math.pow(d_m, 4) / 64;
    const delta_max = 0.01 * d_m; // max deflection = 1% of tool diameter
    const f_est = 0.1; // mm/rev estimation for force
    // F = kc × ap × f (N), where kc in MPa, ap in mm, f in mm
    // δ = F×L³/(3EI) → ap_max = δ_max × 3EI / (kc×f×L³)
    // units: ap in meters → convert to mm
    const ap_deflection_m = (delta_max * 3 * E_pa * I) / (material_kc_mpa * 1e6 * (f_est / 1000) * Math.pow(L_m, 3));
    const max_depth_deflection = ap_deflection_m * 1000; // mm

    // --- Power limit ---
    // P = kc × ap × f × Vc / (60×10⁶) kW
    // Vc = π×d×n/1000 m/min
    const vc = Math.PI * tool_diameter_mm * spindle_rpm / 1000;
    const P_available = machine_power_kw * 0.85; // 85% efficiency
    // ap_max = P×60×10⁶ / (kc × f × Vc) in mm
    const ap_power = (P_available * 60e6) / (material_kc_mpa * f_est * vc);

    // --- Stability limit (simplified) ---
    // Simplified: ap_lim ≈ (1 / (2×kc×K)) where K is tool compliance
    // K = L³/(3EI) compliance in m/N
    const K_compliance = Math.pow(L_m, 3) / (3 * E_pa * I); // m/N
    const ap_stability = 1 / (2 * material_kc_mpa * 1e6 * K_compliance) * 1000; // mm

    // Take minimum
    const limits = [
      { value: max_depth_deflection, name: "deflection" },
      { value: ap_power, name: "power" },
      { value: ap_stability, name: "stability" },
    ];

    // Clamp to reasonable values
    for (const l of limits) {
      l.value = Math.max(0.05, Math.min(l.value, tool_diameter_mm * 2));
    }

    limits.sort((a, b) => a.value - b.value);
    const recommended = limits[0].value;
    const limiting = limits[0].name;

    log.debug(
      `DOC limits d=${tool_diameter_mm}mm, L=${overhang_mm}mm: rec=${recommended.toFixed(2)}mm (${limiting})`);

    return {
      max_depth_deflection_mm: Math.round(max_depth_deflection * 100) / 100,
      max_depth_power_mm: Math.round(ap_power * 100) / 100,
      max_depth_stability_mm: Math.round(ap_stability * 100) / 100,
      recommended_depth_mm: Math.round(recommended * 100) / 100,
      limiting_factor: limiting,
    };
  }

  // --------------------------------------------------------------------------
  // Category 3: Process Outcome Correlations
  // --------------------------------------------------------------------------

  /**
   * Empirical surface integrity correlations: residual stress, white layer,
   * work hardening from cutting conditions.
   */
  surfaceIntegrityCorrelations(params: SurfaceIntegrityInput): SurfaceIntegrityResult {
    const {
      cutting_speed_mpm, feed_mm_rev, depth_mm, material_hardness_HB,
      tool_nose_radius_mm, tool_wear_vb_mm = 0, coolant = true
    } = params;

    // --- Residual stress empirical model ---
    // At low speed → compressive (mechanical dominant)
    // At high speed → tensile (thermal dominant)
    // Worn tool → more tensile
    // σ_res ≈ A₀ + A₁×Vc + A₂×f + A₃×VB
    const A0 = -200; // base compressive (MPa)
    const A1 = 2.5;  // speed effect (tensile contributor)
    const A2 = 300;  // feed effect
    const A3 = 800;  // wear effect (strong tensile)
    let sigma_res = A0 + A1 * cutting_speed_mpm + A2 * feed_mm_rev + A3 * tool_wear_vb_mm;

    // Coolant reduces thermal → more compressive
    if (coolant) {
      sigma_res -= 50;
    }

    const stress_type: ResidualStressType = sigma_res >= 0 ? "tensile" : "compressive";

    // --- White layer depth (hard turning, HRC > 50 → HB > ~480) ---
    let white_layer = 0;
    const hrc_approx = hbToHrc(material_hardness_HB);
    if (hrc_approx > 50) {
      // White layer forms due to phase transformation
      // d_wl ≈ 0.5 + 0.008×Vc + 15×VB (μm) — Ramesh et al.
      white_layer = 0.5 + 0.008 * cutting_speed_mpm + 15 * tool_wear_vb_mm;
      if (coolant) white_layer *= 0.7; // coolant reduces white layer
    }

    // --- Work hardening depth ---
    // d_wh ≈ 20 + 100×f + 30×ap (μm) — increases with mechanical loading
    let work_hardened_depth = 20 + 100 * feed_mm_rev + 30 * depth_mm;
    // Harder materials work-harden less depth but more intensity
    work_hardened_depth *= (300 / Math.max(150, material_hardness_HB));

    // --- Microhardness change ---
    // Positive = work hardened surface, negative = thermally softened
    let hardness_change = 5 + 10 * feed_mm_rev * 10; // feed contribution
    if (cutting_speed_mpm > 200 && !coolant) {
      hardness_change -= 3; // thermal softening at high speed dry
    }
    if (tool_wear_vb_mm > 0.2) {
      hardness_change += 5; // worn tool creates more plastic deformation
    }

    // --- Surface quality index (0-100) ---
    // Based on all factors: lower is worse
    let sqi = 80;
    sqi -= Math.max(0, (feed_mm_rev - 0.1) * 100);        // feed penalty
    sqi -= Math.max(0, (tool_wear_vb_mm - 0.1) * 80);     // wear penalty
    sqi -= Math.abs(sigma_res) / 50;                         // stress penalty
    sqi -= white_layer * 2;                                  // white layer penalty
    if (coolant) sqi += 5;
    sqi = Math.max(0, Math.min(100, Math.round(sqi)));

    log.debug(
      `Surface integrity: σ_res=${sigma_res.toFixed(0)} MPa (${stress_type}), SQI=${sqi}`);

    return {
      residual_stress_mpa: Math.round(sigma_res),
      residual_stress_type: stress_type,
      white_layer_depth_um: Math.round(white_layer * 100) / 100,
      work_hardened_depth_um: Math.round(work_hardened_depth * 10) / 10,
      microhardness_change_pct: Math.round(hardness_change * 10) / 10,
      surface_quality_index: sqi,
    };
  }

  /**
   * Empirical tool life multipliers from coolant, coating, hardness,
   * interrupted cuts, and entry angle.
   */
  toolLifeMultipliers(params: ToolLifeMultipliersInput): ToolLifeMultipliersResult {
    const {
      base_tool_life_min, coolant_type, coating,
      workpiece_hardness_HRC, interrupted_cut = false, entry_angle_deg
    } = params;

    if (base_tool_life_min <= 0) {
      throw new Error("Base tool life must be positive");
    }

    const multipliers: Record<string, number> = {};

    // Coolant multiplier
    multipliers.coolant = COOLANT_MULTIPLIERS[coolant_type];

    // Coating multiplier
    multipliers.coating = COATING_MULTIPLIERS[coating];

    // Hardness multiplier: higher hardness → shorter life
    if (workpiece_hardness_HRC !== undefined && workpiece_hardness_HRC > 0) {
      // Baseline at HRC 30, each HRC point above reduces life ~3%
      multipliers.hardness = Math.max(0.1, Math.pow(0.97, workpiece_hardness_HRC - 30));
    } else {
      multipliers.hardness = 1.0;
    }

    // Interrupted cut penalty
    if (interrupted_cut) {
      multipliers.interrupted = 0.6; // 40% reduction typical
    } else {
      multipliers.interrupted = 1.0;
    }

    // Entry angle: 45° is ideal, 90° gives impact, <30° gives thin chip exit
    if (entry_angle_deg !== undefined) {
      if (entry_angle_deg >= 40 && entry_angle_deg <= 50) {
        multipliers.entry_angle = 1.0;
      } else if (entry_angle_deg > 50) {
        multipliers.entry_angle = Math.max(0.7, 1 - (entry_angle_deg - 50) * 0.005);
      } else {
        multipliers.entry_angle = Math.max(0.8, 1 - (40 - entry_angle_deg) * 0.005);
      }
    } else {
      multipliers.entry_angle = 1.0;
    }

    // Combined multiplier
    let combined = 1.0;
    let dominant_factor = "base";
    let min_mult = Infinity;

    for (const [key, val] of Object.entries(multipliers)) {
      combined *= val;
      if (val < min_mult) {
        min_mult = val;
        dominant_factor = key;
      }
    }

    // If a multiplier > 1 is the most impactful (largest absolute effect), note it
    let max_effect = 0;
    for (const [key, val] of Object.entries(multipliers)) {
      const effect = Math.abs(Math.log(val));
      if (effect > max_effect) {
        max_effect = effect;
        dominant_factor = key;
      }
    }

    const adjusted = base_tool_life_min * combined;

    // Confidence: more multipliers deviate from 1.0 → lower confidence
    const deviations = Object.values(multipliers).map(v => Math.abs(v - 1));
    const totalDeviation = deviations.reduce((a, b) => a + b, 0);
    const confidence = Math.max(0.5, 1 - totalDeviation * 0.15);

    log.debug(
      `Tool life: base=${base_tool_life_min}min × ${combined.toFixed(2)} = ${adjusted.toFixed(1)}min`);

    return {
      adjusted_tool_life_min: Math.round(adjusted * 10) / 10,
      multipliers,
      dominant_factor,
      confidence_level: Math.round(confidence * 100) / 100,
    };
  }

  /**
   * Predict chip form from cutting conditions using chip breaking parameter.
   * λ = f × ap / r_nose — determines chip morphology per ISO 3685.
   */
  chipBreakabilityIndex(params: ChipBreakabilityInput): ChipBreakabilityResult {
    const { feed_mm_rev, depth_mm, nose_radius_mm, material_type, chip_breaker = false } = params;

    // Chip breaking parameter
    const lambda = (feed_mm_rev * depth_mm) / nose_radius_mm;

    // Effective lambda with chip breaker
    const effective_lambda = chip_breaker ? lambda * 2.5 : lambda;

    // Material ductility factor: ductile materials → harder to break
    let ductility_factor = 1.0;
    const mt = material_type.toLowerCase();
    if (mt.includes("aluminum") || mt.includes("copper") || mt.includes("brass")) {
      ductility_factor = 0.5; // harder to break chips in ductile materials
    } else if (mt.includes("cast_iron") || mt.includes("cast iron")) {
      ductility_factor = 3.0; // cast iron chips break easily
    } else if (mt.includes("titanium")) {
      ductility_factor = 1.5; // segmented chips typical
    } else if (mt.includes("stainless")) {
      ductility_factor = 0.7; // stringy chips
    }

    const breakability = Math.min(1, effective_lambda * ductility_factor / 0.15);

    // Classify chip form
    let chip_form: ChipForm;
    let iso_class: string;
    let recommendation: string;

    if (breakability < 0.2) {
      chip_form = "long_ribbon";
      iso_class = "1.1 - Ribbon (long)";
      recommendation = "Increase feed or depth. Consider chip breaker insert.";
    } else if (breakability < 0.4) {
      chip_form = "short_tubular";
      iso_class = "2.2 - Tubular (short)";
      recommendation = "Acceptable chip form. Minor adjustments may improve.";
    } else if (breakability < 0.6) {
      chip_form = "arc";
      iso_class = "4.1 - Arc (connected)";
      recommendation = "Good chip form. Monitor for consistency.";
    } else if (breakability < 0.8) {
      chip_form = "comma";
      iso_class = "6.1 - Comma (short)";
      recommendation = "Excellent chip form for automated machining.";
    } else {
      chip_form = "broken";
      iso_class = "8.1 - Broken (small)";
      recommendation = "Chips well broken. Verify not over-breaking (powder).";
    }

    log.debug(
      `Chip breakability: λ=${lambda.toFixed(4)}, index=${breakability.toFixed(2)}, form=${chip_form}`);

    return {
      chip_form,
      breakability_index: Math.round(breakability * 1000) / 1000,
      iso_3685_class: iso_class,
      recommendation,
    };
  }

  // --------------------------------------------------------------------------
  // Category 4: Economic Correlations
  // --------------------------------------------------------------------------

  /**
   * Cost per part from cutting parameters using Gilbert's model.
   * Includes economic cutting speed optimization.
   */
  costPerPartCorrelation(params: CostPerPartInput): CostPerPartResult {
    const {
      cutting_time_min, tool_life_min, tool_cost,
      machine_rate_per_hour, tool_change_time_min, batch_size
    } = params;

    if (batch_size <= 0 || tool_life_min <= 0) {
      throw new Error("Batch size and tool life must be positive");
    }

    const machine_rate_per_min = machine_rate_per_hour / 60;

    // Machine cost per part
    const machine_cost_per_part = cutting_time_min * machine_rate_per_min;

    // Tool changes per batch
    const total_cutting_time = cutting_time_min * batch_size;
    const tool_changes = Math.ceil(total_cutting_time / tool_life_min) - 1;
    const tool_changes_per_batch = Math.max(0, tool_changes);

    // Tool cost per part: (tools consumed × tool_cost + tool_change_time × machine_rate) / batch_size
    const tools_consumed = Math.ceil(total_cutting_time / tool_life_min);
    const total_tool_cost = tools_consumed * tool_cost;
    const total_change_cost = tool_changes_per_batch * tool_change_time_min * machine_rate_per_min;
    const tool_cost_per_part = (total_tool_cost + total_change_cost) / batch_size;

    // Total cost per part
    const cost_per_part = machine_cost_per_part + tool_cost_per_part;

    // Gilbert's economic tool life
    // T_opt = tool_change_time × ((1/n) - 1) where n is Taylor exponent
    // Simplified: use n ≈ 0.25 for carbide
    const n_taylor = 0.25;
    const T_economic = tool_change_time_min * ((1 / n_taylor) - 1);
    // Economic speed: V_opt = C / T_economic^n (relative to current)
    const speed_ratio = Math.pow(tool_life_min / T_economic, n_taylor);
    // Approximate current speed from context (use 200 m/min as baseline)
    const economic_speed = 200 * speed_ratio;

    // Sensitivity analysis: ∂cost/∂tool_cost and ∂cost/∂machine_rate
    const delta = 0.01;
    // Tool cost sensitivity: cost change per 1% tool cost increase
    const new_tool_total = tools_consumed * (tool_cost * (1 + delta));
    const new_tool_cpp = (new_tool_total + total_change_cost) / batch_size + machine_cost_per_part;
    const sens_tool = (new_tool_cpp - cost_per_part) / (cost_per_part * delta);

    // Machine rate sensitivity
    const new_machine_cpp = cutting_time_min * (machine_rate_per_hour * (1 + delta)) / 60 + tool_cost_per_part;
    const sens_machine = (new_machine_cpp - cost_per_part) / (cost_per_part * delta);

    log.debug(
      `Cost/part: $${cost_per_part.toFixed(2)} (machine: $${machine_cost_per_part.toFixed(2)}, tool: $${tool_cost_per_part.toFixed(2)})`);

    return {
      cost_per_part: Math.round(cost_per_part * 100) / 100,
      tool_cost_per_part: Math.round(tool_cost_per_part * 100) / 100,
      machine_cost_per_part: Math.round(machine_cost_per_part * 100) / 100,
      tool_changes_per_batch,
      economic_cutting_speed_mpm: Math.round(economic_speed * 10) / 10,
      sensitivity: {
        to_tool_cost: Math.round(sens_tool * 1000) / 1000,
        to_machine_rate: Math.round(sens_machine * 1000) / 1000,
      },
    };
  }

  /**
   * Productivity correlations: MRR vs quality vs cost trade space.
   * Returns ranges for given quality target.
   */
  productivityCorrelations(params: ProductivityInput): ProductivityResult {
    const { material_type, operation, machine_power_kw, quality_target } = params;

    // Material-specific cutting coefficient for MRR estimation
    let kc_base = 1800; // MPa default (ISO P steel)
    const mt = material_type.toLowerCase();
    if (mt.includes("aluminum")) kc_base = 700;
    else if (mt.includes("cast_iron") || mt.includes("cast iron")) kc_base = 1100;
    else if (mt.includes("titanium")) kc_base = 2800;
    else if (mt.includes("stainless")) kc_base = 2100;
    else if (mt.includes("steel")) kc_base = 1800;
    else if (mt.includes("inconel") || mt.includes("nickel")) kc_base = 2800;

    // Power-limited MRR: Q = P × η × 60000 / kc (cm³/min)
    const eta = 0.85;
    const mrr_power_max = (machine_power_kw * eta * 60000) / kc_base; // mm³/min
    const mrr_power_max_cm3 = mrr_power_max / 1000; // cm³/min

    // Quality target adjustments
    let mrr_factor_low: number;
    let mrr_factor_high: number;
    let ra_low: number;
    let ra_high: number;
    let tool_life: number;
    let cost_index: number;
    let bottleneck: "power" | "finish" | "tool_life" | "stability";

    switch (quality_target) {
      case "rough":
        mrr_factor_low = 0.5;
        mrr_factor_high = 1.0;
        ra_low = 6.3;
        ra_high = 25;
        tool_life = 15;
        cost_index = 1.0;
        bottleneck = "power";
        break;
      case "semi_finish":
        mrr_factor_low = 0.2;
        mrr_factor_high = 0.5;
        ra_low = 1.6;
        ra_high = 6.3;
        tool_life = 25;
        cost_index = 1.5;
        bottleneck = "tool_life";
        break;
      case "finish":
        mrr_factor_low = 0.05;
        mrr_factor_high = 0.2;
        ra_low = 0.4;
        ra_high = 1.6;
        tool_life = 30;
        cost_index = 2.5;
        bottleneck = "finish";
        break;
      case "super_finish":
        mrr_factor_low = 0.01;
        mrr_factor_high = 0.05;
        ra_low = 0.05;
        ra_high = 0.4;
        tool_life = 40;
        cost_index = 5.0;
        bottleneck = "finish";
        break;
      default:
        throw new Error(`Unknown quality target: ${quality_target}`);
    }

    // Operation factor: milling ~80% of turning MRR, drilling ~50%
    let op_factor = 1.0;
    if (operation === "milling") op_factor = 0.8;
    if (operation === "drilling") op_factor = 0.5;

    const mrr_low = mrr_power_max_cm3 * mrr_factor_low * op_factor;
    const mrr_high = mrr_power_max_cm3 * mrr_factor_high * op_factor;

    log.debug(
      `Productivity ${quality_target}: MRR=${mrr_low.toFixed(1)}-${mrr_high.toFixed(1)} cm³/min`);

    return {
      mrr_range_cm3_min: [
        Math.round(mrr_low * 100) / 100,
        Math.round(mrr_high * 100) / 100,
      ],
      expected_ra_range_um: [ra_low, ra_high],
      typical_tool_life_min: tool_life,
      cost_index,
      bottleneck,
    };
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const empiricalCorrelationEngine = new EmpiricalCorrelationEngine();
