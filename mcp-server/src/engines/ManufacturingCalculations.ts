/**
 * PRISM MCP Server - Manufacturing Calculations Engine
 * Core physics-based calculations for CNC machining
 * 
 * Models Implemented:
 * - Kienzle Cutting Force Model (Fc = kc1.1 × h^mc × b)
 * - Taylor Tool Life Equation (VT^n = C)
 * - Johnson-Cook Constitutive Model
 * - Merchant's Shear Angle Model
 * - Surface Finish Prediction (Ra, Rz)
 * - MRR (Material Removal Rate)
 * - Power Consumption
 * - Chip Thickness Calculations
 * 
 * SAFETY CRITICAL: These calculations affect machine operations
 * where incorrect values can cause tool breakage, workpiece damage,
 * or operator injury. All calculations include validation and limits.
 */

import { log } from "../utils/Logger.js";

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export interface KienzleCoefficients {
  kc1_1: number;      // Specific cutting force at h=1mm, b=1mm [N/mm²]
  mc: number;         // Kienzle exponent (typically 0.15-0.35)
  material_id?: string;
  source?: string;
}

export interface TaylorCoefficients {
  C: number;          // Taylor constant (cutting speed at T=1 min)
  n: number;          // Taylor exponent (typically 0.1-0.5)
  material_id?: string;
  tool_material?: string;
  source?: string;
}

export interface JohnsonCookParams {
  A: number;          // Yield stress [MPa]
  B: number;          // Strain hardening coefficient [MPa]
  n: number;          // Strain hardening exponent
  C: number;          // Strain rate coefficient
  m: number;          // Thermal softening exponent
  T_melt: number;     // Melting temperature [°C]
  T_ref: number;      // Reference temperature [°C]
  material_id?: string;
}

export interface CuttingConditions {
  cutting_speed: number;      // Vc [m/min]
  feed_per_tooth: number;     // fz [mm/tooth]
  axial_depth: number;        // ap [mm]
  radial_depth: number;       // ae [mm]
  tool_diameter: number;      // D [mm]
  number_of_teeth: number;    // z
  rake_angle?: number;        // γ [degrees]
  tool_nose_radius?: number;  // r [mm]
}

export interface CuttingForceResult {
  Fc: number;           // Main cutting force [N]
  Ff: number;           // Feed force [N]
  Fp: number;           // Passive (radial) force [N]
  F_resultant: number;  // Resultant force [N]
  specific_force: number; // kc [N/mm²]
  chip_thickness: number; // h [mm]
  chip_width: number;     // b [mm]
  power: number;          // P [kW]
  torque: number;         // M [Nm]
  warnings: string[];
  calculation_method: string;
}

export interface ToolLifeResult {
  tool_life_minutes: number;
  tool_life_parts?: number;
  cost_per_part?: number;
  optimal_speed?: number;
  warnings: string[];
  calculation_method: string;
}

export interface SurfaceFinishResult {
  Ra: number;           // Arithmetic mean roughness [μm]
  Rz: number;           // Ten-point mean roughness [μm]
  Rt: number;           // Maximum roughness height [μm]
  theoretical_Ra: number;
  actual_Ra: number;
  finish_factor: number;
  warnings: string[];
}

export interface MRRResult {
  mrr: number;          // Material Removal Rate [cm³/min]
  mrr_mm3: number;      // MRR [mm³/min]
  feed_rate: number;    // Vf [mm/min]
  spindle_speed: number; // n [rpm]
  machining_time?: number; // [min] if volume provided
  warnings: string[];
}

// ============================================================================
// CONSTANTS & LIMITS
// ============================================================================

const SAFETY_LIMITS = {
  MAX_CUTTING_SPEED: 2000,      // m/min (HSM aluminum)
  MIN_CUTTING_SPEED: 1,         // m/min
  MAX_FEED_PER_TOOTH: 2.0,      // mm/tooth
  MIN_FEED_PER_TOOTH: 0.001,    // mm/tooth
  MAX_DEPTH_OF_CUT: 100,        // mm
  MIN_DEPTH_OF_CUT: 0.01,       // mm
  MAX_TOOL_DIAMETER: 500,       // mm
  MIN_TOOL_DIAMETER: 0.1,       // mm
  MAX_FORCE: 100000,            // N (sanity check)
  MAX_POWER: 500,               // kW (sanity check)
  MAX_TOOL_LIFE: 10000,         // minutes
  MIN_TOOL_LIFE: 0.1            // minutes
};

// Default material coefficients (AISI 1045 steel as baseline)
const DEFAULT_KIENZLE: KienzleCoefficients = {
  kc1_1: 1800,
  mc: 0.25,
  material_id: "AISI-1045",
  source: "Machining Data Handbook"
};

const DEFAULT_TAYLOR: TaylorCoefficients = {
  C: 200,
  n: 0.25,
  material_id: "AISI-1045",
  tool_material: "Carbide",
  source: "Machining Data Handbook"
};

// ============================================================================
// KIENZLE CUTTING FORCE MODEL
// ============================================================================

/**
 * Calculate cutting forces using the Kienzle model
 * Fc = kc1.1 × h^(-mc) × b × correction_factors
 */
export function calculateKienzleCuttingForce(
  conditions: CuttingConditions,
  coefficients: KienzleCoefficients = DEFAULT_KIENZLE
): CuttingForceResult {
  const warnings: string[] = [];
  
  validateCuttingConditions(conditions, warnings);
  
  const { cutting_speed, feed_per_tooth, axial_depth, radial_depth, tool_diameter, number_of_teeth, rake_angle = 6 } = conditions;
  const { kc1_1, mc } = coefficients;
  
  // Calculate chip geometry
  const engagement_ratio = radial_depth / tool_diameter;
  const h_mean = feed_per_tooth * Math.sqrt(engagement_ratio) * (180 / Math.PI) * Math.asin(Math.sqrt(engagement_ratio)) / 90;
  const b = axial_depth;
  const h = Math.max(h_mean, 0.001);
  
  // Specific cutting force with Kienzle equation
  const kc = kc1_1 * Math.pow(h, -mc);
  
  // Rake angle correction
  const rake_correction = 1 - 0.015 * (rake_angle - 6);
  
  // Forces — ratios vary by material group (Ref: Altintas "Manufacturing Automation" Table 2.2)
  // N-group (aluminum/nonferrous): Ff/Fc≈0.3, Fp/Fc≈0.2
  // P-group (steel): Ff/Fc≈0.4, Fp/Fc≈0.3
  // M-group (stainless): Ff/Fc≈0.45, Fp/Fc≈0.35
  // S-group (superalloys): Ff/Fc≈0.5, Fp/Fc≈0.4
  // H-group (hardened): Ff/Fc≈0.35, Fp/Fc≈0.4
  const isoGroup = (coefficients as any).iso_group || "P";
  const forceRatios: Record<string, [number, number]> = {
    "N": [0.3, 0.2], "P": [0.4, 0.3], "M": [0.45, 0.35],
    "K": [0.35, 0.25], "S": [0.5, 0.4], "H": [0.35, 0.4], "X": [0.4, 0.3]
  };
  const [ffRatio, fpRatio] = forceRatios[isoGroup] || [0.4, 0.3];
  const Fc_raw = kc * b * h * rake_correction;
  const Ff = Fc_raw * ffRatio;
  const Fp = Fc_raw * fpRatio;
  const F_resultant = Math.sqrt(Fc_raw * Fc_raw + Ff * Ff + Fp * Fp);
  
  const Fc = Math.min(Fc_raw, SAFETY_LIMITS.MAX_FORCE);
  if (Fc_raw > SAFETY_LIMITS.MAX_FORCE) {
    warnings.push(`Force ${Fc_raw.toFixed(0)}N exceeds limit, capped at ${SAFETY_LIMITS.MAX_FORCE}N`);
  }
  
  // Power and torque
  const power_raw = (Fc * cutting_speed) / 60000;
  const power = Math.min(power_raw, SAFETY_LIMITS.MAX_POWER);
  const torque = (Fc * tool_diameter) / 2000;
  
  log.debug(`[Kienzle] h=${h.toFixed(4)}, kc=${kc.toFixed(0)}, Fc=${Fc.toFixed(0)}N`);
  
  // W5: Uncertainty bounds — Kienzle model ±15% for verified data, ±25% for estimated
  const dataQuality = (coefficients as any).data_quality || "estimated";
  const uncertaintyPct = dataQuality === "verified" ? 0.15 : 0.25;
  
  return {
    Fc, Ff, Fp, F_resultant,
    specific_force: kc,
    chip_thickness: h,
    chip_width: b,
    power, torque, warnings,
    uncertainty: {
      Fc_range: [Fc * (1 - uncertaintyPct), Fc * (1 + uncertaintyPct)],
      power_range: [power * (1 - uncertaintyPct), power * (1 + uncertaintyPct)],
      confidence: dataQuality === "verified" ? 0.85 : 0.70,
      source: dataQuality
    },
    force_ratios: { Ff_over_Fc: ffRatio, Fp_over_Fc: fpRatio, iso_group: isoGroup },
    calculation_method: "Kienzle (Fc = kc1.1 × h^(-mc) × b)"
  };
}

// ============================================================================
// TAYLOR TOOL LIFE EQUATION
// ============================================================================

/**
 * Calculate tool life using Taylor's equation: V × T^n = C
 */
export function calculateTaylorToolLife(
  cutting_speed: number,
  coefficients: TaylorCoefficients = DEFAULT_TAYLOR,
  feed?: number,
  depth?: number
): ToolLifeResult {
  const warnings: string[] = [];
  
  if (cutting_speed < SAFETY_LIMITS.MIN_CUTTING_SPEED) {
    warnings.push(`Speed ${cutting_speed} below min, using ${SAFETY_LIMITS.MIN_CUTTING_SPEED}`);
    cutting_speed = SAFETY_LIMITS.MIN_CUTTING_SPEED;
  }
  if (cutting_speed > SAFETY_LIMITS.MAX_CUTTING_SPEED) {
    warnings.push(`Speed ${cutting_speed} above max, using ${SAFETY_LIMITS.MAX_CUTTING_SPEED}`);
    cutting_speed = SAFETY_LIMITS.MAX_CUTTING_SPEED;
  }
  
  const { C, n } = coefficients;
  let tool_life = Math.pow(C / cutting_speed, 1 / n);
  
  // Extended corrections
  if (feed !== undefined && feed > 0) {
    const a = 0.35;
    tool_life *= Math.pow(0.2 / feed, a);
  }
  if (depth !== undefined && depth > 0) {
    const b = 0.2;
    tool_life *= Math.pow(2.0 / depth, b);
  }
  
  // Clamp
  if (tool_life > SAFETY_LIMITS.MAX_TOOL_LIFE) {
    warnings.push(`Tool life ${tool_life.toFixed(0)} min exceeds limit`);
    tool_life = SAFETY_LIMITS.MAX_TOOL_LIFE;
  }
  if (tool_life < SAFETY_LIMITS.MIN_TOOL_LIFE) {
    warnings.push(`Tool life ${tool_life.toFixed(2)} min very low`);
    tool_life = SAFETY_LIMITS.MIN_TOOL_LIFE;
  }
  
  const optimal_speed = cutting_speed * 0.85;
  
  log.debug(`[Taylor] Vc=${cutting_speed}, T=${tool_life.toFixed(1)} min`);
  
  return {
    tool_life_minutes: Math.round(tool_life * 10) / 10,
    optimal_speed: Math.round(optimal_speed),
    warnings,
    calculation_method: "Taylor (V×T^n = C)"
  };
}

// ============================================================================
// JOHNSON-COOK CONSTITUTIVE MODEL
// ============================================================================

/**
 * Calculate flow stress using Johnson-Cook model
 */
export function calculateJohnsonCookStress(
  strain: number,
  strain_rate: number,
  temperature: number,
  params: JohnsonCookParams
): { stress: number; components: { strain_term: number; rate_term: number; thermal_term: number }; warnings: string[] } {
  const warnings: string[] = [];
  const { A, B, n, C, m, T_melt, T_ref } = params;
  
  const strain_rate_ref = 1.0;
  const strain_term = A + B * Math.pow(Math.max(strain, 0.001), n);
  const rate_ratio = Math.max(strain_rate / strain_rate_ref, 1);
  const rate_term = 1 + C * Math.log(rate_ratio);
  
  let thermal_term = 1.0;
  if (temperature > T_ref) {
    const T_star = Math.min((temperature - T_ref) / (T_melt - T_ref), 0.999);
    thermal_term = 1 - Math.pow(T_star, m);
    if (temperature > T_melt * 0.9) {
      warnings.push(`Temperature ${temperature}°C near melting ${T_melt}°C`);
    }
  }
  
  const stress = strain_term * rate_term * thermal_term;
  
  return {
    stress: Math.max(stress, 0),
    components: { strain_term, rate_term, thermal_term },
    warnings
  };
}

// ============================================================================
// SURFACE FINISH PREDICTION
// ============================================================================

/**
 * Calculate theoretical surface finish
 */
export function calculateSurfaceFinish(
  feed: number,
  nose_radius: number,
  is_milling: boolean = false,
  radial_depth?: number,
  tool_diameter?: number
): SurfaceFinishResult {
  const warnings: string[] = [];
  
  if (feed <= 0 || feed > 2) warnings.push(`Feed ${feed}mm outside range`);
  if (nose_radius <= 0 || nose_radius > 10) warnings.push(`Nose radius ${nose_radius}mm outside range`);
  
  let Ra_theoretical: number;
  if (is_milling && radial_depth && tool_diameter) {
    Ra_theoretical = (feed * feed * radial_depth) / (32 * tool_diameter * nose_radius);
  } else {
    Ra_theoretical = (feed * feed) / (32 * nose_radius);
  }
  Ra_theoretical *= 1000; // to μm
  
  const process_factor = 2.0;
  const Ra_actual = Ra_theoretical * process_factor;
  const Rz = Ra_actual * 5;
  const Rt = Rz * 1.3;
  
  if (Ra_actual > 12.5) warnings.push("Surface may be rough");
  
  return {
    Ra: Math.round(Ra_actual * 100) / 100,
    Rz: Math.round(Rz * 100) / 100,
    Rt: Math.round(Rt * 100) / 100,
    theoretical_Ra: Math.round(Ra_theoretical * 100) / 100,
    actual_Ra: Math.round(Ra_actual * 100) / 100,
    finish_factor: process_factor,
    warnings
  };
}

// ============================================================================
// MATERIAL REMOVAL RATE (MRR)
// ============================================================================

/**
 * Calculate Material Removal Rate
 */
export function calculateMRR(
  conditions: CuttingConditions,
  volume?: number
): MRRResult {
  const warnings: string[] = [];
  const { cutting_speed, feed_per_tooth, axial_depth, radial_depth, tool_diameter, number_of_teeth } = conditions;
  
  const spindle_speed = (1000 * cutting_speed) / (Math.PI * tool_diameter);
  const feed_rate = feed_per_tooth * number_of_teeth * spindle_speed;
  const mrr_mm3 = axial_depth * radial_depth * feed_rate;
  const mrr = mrr_mm3 / 1000;
  
  let machining_time: number | undefined;
  if (volume !== undefined && volume > 0) {
    machining_time = volume / mrr_mm3;
    if (machining_time > 480) warnings.push("Machining time exceeds 8 hours");
  }
  
  if (mrr > 1000) warnings.push("Very high MRR");
  if (mrr < 0.1) warnings.push("Very low MRR");
  
  return {
    mrr: Math.round(mrr * 100) / 100,
    mrr_mm3: Math.round(mrr_mm3),
    feed_rate: Math.round(feed_rate),
    spindle_speed: Math.round(spindle_speed),
    machining_time: machining_time ? Math.round(machining_time * 10) / 10 : undefined,
    warnings
  };
}

// ============================================================================
// SPEED & FEED CALCULATOR
// ============================================================================

export interface SpeedFeedInput {
  material_hardness?: number;
  tool_material: "HSS" | "Carbide" | "Ceramic" | "CBN" | "Diamond";
  operation: "roughing" | "finishing" | "semi-finishing";
  tool_diameter: number;
  number_of_teeth: number;
  kienzle?: KienzleCoefficients;
  taylor?: TaylorCoefficients;
}

export interface SpeedFeedResult {
  cutting_speed: number;
  spindle_speed: number;
  feed_per_tooth: number;
  feed_rate: number;
  axial_depth: number;
  radial_depth: number;
  warnings: string[];
  recommendations: string[];
}

/**
 * Calculate recommended speeds and feeds
 */
export function calculateSpeedFeed(input: SpeedFeedInput): SpeedFeedResult {
  const warnings: string[] = [];
  const recommendations: string[] = [];
  
  const { material_hardness = 200, tool_material, operation, tool_diameter, number_of_teeth } = input;
  
  const base_speeds: Record<string, number> = {
    "HSS": 30, "Carbide": 150, "Ceramic": 300, "CBN": 200, "Diamond": 500
  };
  
  let cutting_speed = base_speeds[tool_material] || 100;
  cutting_speed *= Math.pow(200 / material_hardness, 0.3);
  
  const operation_factors: Record<string, number> = { "roughing": 0.8, "semi-finishing": 1.0, "finishing": 1.2 };
  cutting_speed *= operation_factors[operation] || 1.0;
  
  const spindle_speed = (1000 * cutting_speed) / (Math.PI * tool_diameter);
  
  let feed_per_tooth = tool_diameter * 0.02;
  feed_per_tooth = Math.max(0.02, Math.min(0.5, feed_per_tooth));
  if (operation === "finishing") feed_per_tooth *= 0.5;
  else if (operation === "roughing") feed_per_tooth *= 1.2;
  
  const feed_rate = feed_per_tooth * number_of_teeth * spindle_speed;
  
  let axial_depth: number, radial_depth: number;
  if (operation === "roughing") {
    axial_depth = Math.min(tool_diameter * 1.0, 10);
    radial_depth = tool_diameter * 0.5;
  } else if (operation === "finishing") {
    axial_depth = Math.min(tool_diameter * 0.5, 3);
    radial_depth = tool_diameter * 0.1;
  } else {
    axial_depth = Math.min(tool_diameter * 0.75, 5);
    radial_depth = tool_diameter * 0.3;
  }
  
  if (material_hardness > 350) recommendations.push("Consider CBN or ceramic tooling");
  if (tool_diameter < 6) recommendations.push("Small tool - reduce feed, high RPM");
  if (operation === "roughing") recommendations.push("Use climb milling");
  
  return {
    cutting_speed: Math.round(cutting_speed),
    spindle_speed: Math.round(spindle_speed),
    feed_per_tooth: Math.round(feed_per_tooth * 1000) / 1000,
    feed_rate: Math.round(feed_rate),
    axial_depth: Math.round(axial_depth * 10) / 10,
    radial_depth: Math.round(radial_depth * 10) / 10,
    warnings, recommendations
  };
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function validateCuttingConditions(conditions: CuttingConditions, warnings: string[]): void {
  const { cutting_speed, feed_per_tooth, axial_depth, radial_depth, tool_diameter } = conditions;
  
  if (cutting_speed < SAFETY_LIMITS.MIN_CUTTING_SPEED || cutting_speed > SAFETY_LIMITS.MAX_CUTTING_SPEED)
    warnings.push(`Cutting speed ${cutting_speed} outside range`);
  if (feed_per_tooth < SAFETY_LIMITS.MIN_FEED_PER_TOOTH || feed_per_tooth > SAFETY_LIMITS.MAX_FEED_PER_TOOTH)
    warnings.push(`Feed ${feed_per_tooth} outside range`);
  if (radial_depth > tool_diameter)
    warnings.push(`Radial depth ${radial_depth} > tool diameter ${tool_diameter}`);
}

/**
 * Get default Kienzle coefficients
 */
export function getDefaultKienzle(material_group: string): KienzleCoefficients {
  const defaults: Record<string, KienzleCoefficients> = {
    "steel_low_carbon": { kc1_1: 1500, mc: 0.25, material_id: "Low Carbon Steel" },
    "steel_medium_carbon": { kc1_1: 1800, mc: 0.25, material_id: "Medium Carbon Steel" },
    "steel_high_carbon": { kc1_1: 2100, mc: 0.26, material_id: "High Carbon Steel" },
    "steel_alloy": { kc1_1: 2000, mc: 0.25, material_id: "Alloy Steel" },
    "stainless_austenitic": { kc1_1: 2100, mc: 0.21, material_id: "Austenitic Stainless" },
    "stainless_martensitic": { kc1_1: 1900, mc: 0.23, material_id: "Martensitic Stainless" },
    "cast_iron_gray": { kc1_1: 1100, mc: 0.28, material_id: "Gray Cast Iron" },
    "cast_iron_ductile": { kc1_1: 1300, mc: 0.26, material_id: "Ductile Cast Iron" },
    "aluminum_wrought": { kc1_1: 700, mc: 0.30, material_id: "Wrought Aluminum" },
    "aluminum_cast": { kc1_1: 600, mc: 0.28, material_id: "Cast Aluminum" },
    "titanium": { kc1_1: 1400, mc: 0.22, material_id: "Titanium Alloy" },
    "inconel": { kc1_1: 2800, mc: 0.20, material_id: "Inconel/Nickel Alloy" },
    "copper": { kc1_1: 800, mc: 0.30, material_id: "Copper Alloy" },
    "brass": { kc1_1: 600, mc: 0.28, material_id: "Brass" }
  };
  return defaults[material_group.toLowerCase()] || DEFAULT_KIENZLE;
}

/**
 * Get default Taylor coefficients
 */
export function getDefaultTaylor(material_group: string, tool_material: string = "Carbide"): TaylorCoefficients {
  const key = `${material_group.toLowerCase()}_${tool_material.toLowerCase()}`;
  const defaults: Record<string, TaylorCoefficients> = {
    "steel_hss": { C: 70, n: 0.125, tool_material: "HSS" },
    "steel_carbide": { C: 200, n: 0.25, tool_material: "Carbide" },
    "steel_ceramic": { C: 400, n: 0.30, tool_material: "Ceramic" },
    "stainless_hss": { C: 50, n: 0.12, tool_material: "HSS" },
    "stainless_carbide": { C: 150, n: 0.22, tool_material: "Carbide" },
    "cast_iron_carbide": { C: 180, n: 0.25, tool_material: "Carbide" },
    "aluminum_carbide": { C: 800, n: 0.30, tool_material: "Carbide" },
    "titanium_carbide": { C: 100, n: 0.20, tool_material: "Carbide" },
    "inconel_carbide": { C: 80, n: 0.18, tool_material: "Carbide" }
  };
  return defaults[key] || DEFAULT_TAYLOR;
}

// Export singleton
export const manufacturingCalculations = {
  kienzle: calculateKienzleCuttingForce,
  taylor: calculateTaylorToolLife,
  johnsonCook: calculateJohnsonCookStress,
  surfaceFinish: calculateSurfaceFinish,
  mrr: calculateMRR,
  speedFeed: calculateSpeedFeed,
  getDefaultKienzle,
  getDefaultTaylor,
  SAFETY_LIMITS
};
