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
import { CANONICAL_MILLING_SPEEDS, CANONICAL_MILLING_FEEDS, type ISOGroup } from "../physics/constants.js";

// ============================================================================
// SOURCE FILE CROSS-REFERENCE (P-MS2: Links to FormulaRegistry source catalog)
// ============================================================================
// This engine implements calculations from these extracted formula modules:
// - PRISM_FORCE_LOOKUP.js (51 lines) → Kienzle coefficients by material
// - PRISM_MATERIAL_PHYSICS.js (54 lines) → Material deformation models
// - PRISM_MFG_PHYSICS.js (197 lines) → Force, power, deflection, chatter
// - PRISM_STANDALONE_CALCULATOR_API.js (304 lines) → RPM, feed, speed, torque
// - PRISM_STRESS.js (138 lines) → Von Mises, safety factors
// - PRISM_STRESS_ANALYSIS.js (254 lines) → FEA, fatigue, creep
// - PRISM_THERMAL_COMPENSATION.js (205 lines) → Machine/tool/workpiece thermal
// - PRISM_THERMAL_LOOKUP.js (41 lines) → Thermal property tables
// - PRISM_THERMAL_PROPERTIES.js (112 lines) → Conductivity, expansion
// - PRISM_TOOL_LIFE_ESTIMATOR.js (133 lines) → Taylor model implementations
// - PRISM_TOOL_WEAR_MODELS.js (552 lines) → Usui, diffusion, adhesive wear
// - PRISM_WEAR_LOOKUP.js (71 lines) → Wear rate lookup tables
//
// Full catalog available via: FormulaRegistry.getSourceFileCatalog()
// Formula definitions available via: FormulaRegistry.getFormula(id)

// ============================================================================
// UNITS SOURCE FILE CATALOG — 3 LOW-priority unit/conversion modules
// Wired 2026-02-23 from MASTER_EXTRACTION_INDEX_V2 (P-MS5 Wave 4)
// Total: 3 files, 1,350 lines of unit conversion source code
// ============================================================================

/** U N I T S_ S O U R C E_ F I L E_ C A T A L O G constant.
 */
export const UNITS_SOURCE_FILE_CATALOG: Record<string, {
  filename: string;
  source_dir: string;
  category: string;
  lines: number;
  safety_class: "LOW";
  description: string;
}> = {
  'EXT-531': {
    filename: "PRISM_UNITS.js",
    source_dir: "extracted/units",
    category: "units",
    lines: 153,
    safety_class: "LOW",
    description: "Core unit definitions — SI/Imperial conversion factors for length, speed, force, temperature, and pressure.",
  },
  'EXT-532': {
    filename: "PRISM_UNITS_ENHANCED.js",
    source_dir: "extracted/units",
    category: "units",
    lines: 1189,
    safety_class: "LOW",
    description: "Enhanced unit system — compound unit algebra, dimensional analysis, and manufacturing-specific conversions (SFM↔m/min, IPT↔mm/tooth).",
  },
  'EXT-533': {
    filename: "PRISM_UNIT_SYSTEM.js",
    source_dir: "extracted/units",
    category: "units",
    lines: 8,
    safety_class: "LOW",
    description: "Unit system bootstrap — metric/imperial preference flag and system-wide default unit configuration.",
  },
};

/**
 * Returns the units source file catalog for this engine.
  * @returns {
  total_files: number;
  total_lines: number;
  entries: typeof  u n i t s_ s o u r c e_ f i l e_ c a t a l o g;
}
 */
export function getUnitSourceFileCatalog(): {
  total_files: number;
  total_lines: number;
  entries: typeof UNITS_SOURCE_FILE_CATALOG;
} {
  const keys = Object.keys(UNITS_SOURCE_FILE_CATALOG) as (keyof typeof UNITS_SOURCE_FILE_CATALOG)[];
  const totalLines = keys.reduce((sum, k) => sum + UNITS_SOURCE_FILE_CATALOG[k].lines, 0);
  return {
    total_files: keys.length,
    total_lines: totalLines,
    entries: UNITS_SOURCE_FILE_CATALOG,
  };
}

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

/** Kienzle Coefficients configuration/data structure.
 */
export interface KienzleCoefficients {
  kc1_1: number;      // Specific cutting force at h=1mm, b=1mm [N/mm²]
  mc: number;         // Kienzle exponent (typically 0.15-0.35)
  material_id?: string;
  source?: string;
}

/** Taylor Coefficients configuration/data structure.
 */
export interface TaylorCoefficients {
  C: number;          // Taylor constant (cutting speed at T=1 min)
  n: number;          // Taylor exponent (typically 0.1-0.5)
  material_id?: string;
  tool_material?: string;
  source?: string;
}

/** Johnson Cook Params configuration/data structure.
 */
export interface JohnsonCookParams {
  A: number;          // Yield stress [MPa]
  B: number;          // Strain hardening coefficient [MPa]
  n: number;          // Strain hardening exponent
  C: number;          // Strain rate coefficient
  m: number;          // Thermal softening exponent
  T_melt: number;     // Melting temperature [°C]
  T_ref: number;      // Reference temperature [°C]
  strain_rate_ref?: number;  // M-008: Reference strain rate [1/s] (default 1.0)
  material_id?: string;
}

/** Cutting Conditions configuration/data structure.
 */
export interface CuttingConditions {
  cutting_speed: number;      // Vc [m/min]
  feed_per_tooth: number;     // fz [mm/tooth]
  axial_depth: number;        // ap [mm]
  radial_depth: number;       // ae [mm]
  tool_diameter: number;      // D [mm]
  number_of_teeth: number;    // z
  rake_angle?: number;        // γ [degrees]
  tool_nose_radius?: number;  // r [mm]
  /** CWE-computed actual chip thickness [mm] — bypasses Martellotti approximation when provided */
  actual_chip_thickness_mm?: number;
}

/** Cutting Force Result configuration/data structure.
 */
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
  uncertainty?: {
    Fc_range: [number, number];
    power_range: [number, number];
    confidence: number;
    source: string;
  };
  force_ratios?: {
    Ff_over_Fc: number;
    Fp_over_Fc: number;
    iso_group: string;
  };
  calculation_method: string;
  provenance?: FormulaProvenance;
}

/** Tool Life Result configuration/data structure.
 */
export interface ToolLifeResult {
  tool_life_minutes: number;
  tool_life_parts?: number;
  cost_per_part?: number;
  optimal_speed?: number;
  warnings: string[];
  calculation_method: string;
  provenance?: FormulaProvenance;
}

/** Surface Finish Result configuration/data structure.
 */
export interface SurfaceFinishResult {
  Ra: number;           // Arithmetic mean roughness [μm]
  Rz: number;           // Ten-point mean roughness [μm]
  Rt: number;           // Maximum roughness height [μm]
  theoretical_Ra: number;
  actual_Ra: number;
  finish_factor: number;
  warnings: string[];
  provenance?: FormulaProvenance;
}

/** M R R Result configuration/data structure.
 */
export interface MRRResult {
  mrr: number;          // Material Removal Rate [cm³/min]
  mrr_mm3: number;      // MRR [mm³/min]
  feed_rate: number;    // Vf [mm/min]
  spindle_speed: number; // n [rpm]
  machining_time?: number; // [min] if volume provided
  warnings: string[];
}

// ============================================================================
// FORMULA PROVENANCE (U-REG3: FormulaRegistry wiring)
// ============================================================================

/** Formula provenance for verifiable physics output.
 * When PRISM says "Ra = 0.32μm", the machinist sees "calculated using fz²/(32r) per ISO 4287".
 */
export interface FormulaProvenance {
  formula_id: string;
  equation: string;
  references: string[];
  assumptions?: string[];
}

/** Lazy-load FormulaRegistry and look up provenance by formula name/category.
 * Returns undefined if registry not available (graceful degradation).
 */
function getProvenance(category: string, name?: string): FormulaProvenance | undefined {
  try {
    const { formulaRegistry } = require("../registries/FormulaRegistry.js");
    if (!formulaRegistry?.count || formulaRegistry.count() === 0) return undefined;
    const all = formulaRegistry.all();
    const match = all.find((f: { category: string; name: string }) =>
      f.category === category || (name && f.name.toLowerCase().includes(name.toLowerCase()))
    );
    if (!match) return undefined;
    return {
      formula_id: match.formula_id,
      equation: match.equation_plain || match.equation,
      references: match.references || [],
      assumptions: match.assumptions,
    };
  } catch {
    return undefined; // Registry not loaded — no provenance
  }
}

// ============================================================================
// CONSTANTS & LIMITS
// ============================================================================

/** S A F E T Y_ L I M I T S constant.
 */
export const SAFETY_LIMITS = {
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
  * @param conditions - conditions
  * @param coefficients - coefficients
  * @returns cutting force result
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
  const engagement_ratio = Math.min(radial_depth / tool_diameter, 1.0);
  let h_mean: number;
  if (conditions.actual_chip_thickness_mm && conditions.actual_chip_thickness_mm > 0) {
    // CWE Z-buffer provided actual chip thickness — use it directly
    // This is more accurate than Martellotti for complex geometry (curved walls, rest stock)
    h_mean = conditions.actual_chip_thickness_mm;
  } else if (number_of_teeth === 1) {
    // Single-point tool (turning/boring): h = feed per rev directly
    h_mean = feed_per_tooth;
  } else {
    // Multi-tooth (milling/drilling): Martellotti mean chip thickness
    // h_mean = fz × (1 - cos(φ_e)) / φ_e where φ_e = arccos(1 - 2·ae/D)
    // At full engagement (ae=D): φ_e=π, h_mean = fz×2/π ≈ 0.637×fz
    // Ref: Altintas "Manufacturing Automation" (2012), Ch.2; Martellotti (1941)
    const phi_e = Math.acos(Math.max(-1, 1 - 2 * engagement_ratio));
    h_mean = phi_e > 0.001 ? feed_per_tooth * (1 - Math.cos(phi_e)) / phi_e : feed_per_tooth;
  }
  const b = axial_depth;
  const h = Math.max(h_mean, 0.001);
  
  // Specific cutting force with Kienzle equation
  const kc = kc1_1 * Math.pow(h, -mc);
  
  // Rake angle correction: K_gamma = 1 - 0.01 × (gamma - gamma_ref)
  // gamma_ref = 6° — the reference rake angle at which canonical kc1.1 values are measured
  // At gamma=6° (Sandvik standard insert geometry), K_gamma = 1.0 (no correction)
  // Positive rake (gamma > 6°) → lower force. Negative rake (gamma < 6°) → higher force.
  // Ref: Altintas "Manufacturing Automation" Eq. 2.24; Sandvik Technical Guide
  const GAMMA_REF = 6; // Reference rake angle [°] for canonical kc1.1 values
  const rake_correction = 1 - 0.01 * (rake_angle - GAMMA_REF);
  
  // For milling (multi-tooth), compute simultaneously engaged teeth
  // z_e = z × φ_e / (2π) — average teeth in cut at any instant
  // Total average force = single-tooth force × z_e
  // Ref: Altintas "Manufacturing Automation" (2012), Eq 2.27
  let z_e = 1;
  if (number_of_teeth > 1) {
    const phi_e = Math.acos(Math.max(-1, 1 - 2 * engagement_ratio));
    z_e = number_of_teeth * phi_e / (2 * Math.PI);
    z_e = Math.max(z_e, 0.1); // At least some engagement
  }
  
  // Forces — ratios vary by material group (Ref: Altintas "Manufacturing Automation" Table 2.2)
  // M-009 fix: Merchant's circle trigonometric force decomposition
  // Replaces fixed ISO-group ratios with physics-based calculation
  // Friction coefficient μ varies by ISO group (empirical, Shaw 2005)
  const isoGroup = (coefficients as unknown as Record<string, unknown>).iso_group as string || "P";
  const frictionCoeffs: Record<string, number> = {
    "N": 0.35, "P": 0.50, "M": 0.55, "K": 0.45, "S": 0.60, "H": 0.45, "X": 0.50
  };
  const mu = frictionCoeffs[isoGroup] || 0.50;
  const beta = Math.atan(mu);                                    // friction angle
  const gamma = rake_angle * Math.PI / 180;                      // rake angle in radians
  const phi = Math.PI / 4 - beta / 2 + gamma / 2;               // Ernst-Merchant shear angle
  // Feed force ratio: Ff/Fc = tan(β - γ)  [Merchant's circle geometry]
  const ffRatio = Math.abs(Math.tan(beta - gamma));
  // Passive force ratio: Fp/Fc ≈ sin(β) / cos(φ + β - γ) × cos(γ) — simplified
  const fpRatio = Math.max(0.1, Math.abs(Math.sin(beta) * Math.cos(gamma) / Math.cos(phi + beta - gamma)));
  const Fc_single = kc * b * h * rake_correction;
  const Fc_raw = Fc_single * z_e;  // Total avg force = single-tooth × engaged teeth

  // Cap Fc BEFORE deriving Ff, Fp, F_resultant for consistency
  const Fc = Math.min(Fc_raw, SAFETY_LIMITS.MAX_FORCE);
  if (Fc_raw > SAFETY_LIMITS.MAX_FORCE) {
    warnings.push(`Force ${Fc_raw.toFixed(0)}N exceeds limit, capped at ${SAFETY_LIMITS.MAX_FORCE}N`);
  }
  const Ff = Fc * ffRatio;
  const Fp = Fc * fpRatio;
  const F_resultant = Math.sqrt(Fc * Fc + Ff * Ff + Fp * Fp);
  
  // Power and torque
  const power_raw = (Fc * cutting_speed) / 60000;
  const power = Math.min(power_raw, SAFETY_LIMITS.MAX_POWER);
  const torque = (Fc * tool_diameter) / 2000;
  
  log.debug(`[Kienzle] h=${h.toFixed(4)}, kc=${kc.toFixed(0)}, Fc=${Fc.toFixed(0)}N`);
  
  // R2-MS1.5: AI-generated safety warnings (threshold tuned R3: 2.5× for high-mc materials)
  const kcInflationRatio = kc / kc1_1;
  if (kcInflationRatio > 3.0) {
    warnings.push(`⚠️ KC_INFLATED: Specific cutting force kc=${kc.toFixed(0)} is ${kcInflationRatio.toFixed(1)}× reference kc1_1=${kc1_1}. Model outside valid regime — increase chip thickness.`);
  } else if (kcInflationRatio > 2.5) {
    warnings.push(`ℹ️ KC_ELEVATED: kc=${kc.toFixed(0)} is ${kcInflationRatio.toFixed(1)}× kc1_1=${kc1_1}. Thin chip effect — consider increasing feed or engagement.`);
  }
  if (radial_depth >= tool_diameter * 0.99) {
    warnings.push(`⚠️ FULL_SLOT: Full slotting detected (ae≈D). High tool load, chip evacuation risk, increased deflection.`);
  }
  
  // W5: Uncertainty bounds — Kienzle model ±15% for verified data, ±25% for estimated
  const dataQuality = (coefficients as unknown as Record<string, unknown>).data_quality as string || "estimated";
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
    calculation_method: "Kienzle (Fc = kc1.1 × h^(-mc) × b)",
    provenance: getProvenance("cutting_force", "kienzle"),
  };
}

// ============================================================================
// DRILLING FORCE MODEL (Sandvik/Shaw)
// Distinct from Kienzle milling: uses drill-specific chip geometry,
// mean cutting radius D/4, and chisel edge correction factor.
// Ref: Sandvik Coromant Technical Guide, Shaw "Metal Cutting Principles"
// ============================================================================
/** Drilling Conditions configuration/data structure.
 */
export interface DrillingConditions {
  drill_diameter: number;      // mm
  feed_per_rev: number;        // mm/rev
  cutting_speed: number;       // m/min
  point_angle_deg?: number;    // degrees (default 140)
  chisel_edge_factor?: number; // thrust multiplier for chisel edge (default 1.07)
}

/** Calculates drilling force.
 * @param conditions - conditions
 * @param coefficients - coefficients
 * @returns cutting force result
 */
export function calculateDrillingForce(
  conditions: DrillingConditions,
  coefficients: KienzleCoefficients = DEFAULT_KIENZLE
): CuttingForceResult {
  const warnings: string[] = [];
  const {
    drill_diameter: D,
    feed_per_rev: fn,
    cutting_speed: Vc,
    point_angle_deg = 140,
    chisel_edge_factor = 1.07
  } = conditions;
  const { kc1_1, mc } = coefficients;

  // Half-point angle (lip angle)
  const kr = (point_angle_deg / 2) * Math.PI / 180;

  // Mean chip thickness per lip (Sandvik formula)
  const hex = (fn / 2) * Math.sin(kr);
  const h = Number.isFinite(hex) && hex > 0 ? hex : 0.001;

  // Specific cutting force via Kienzle
  const kc = kc1_1 * Math.pow(h, -mc);

  // Torque: M = kc × D² × fn / 8000 [Nm]
  // Derivation: 2 lips × (kc × D/2 × fn/2) force per lip × D/4 mean radius / 1000
  const torque = kc * D * D * fn / 8000;

  // Thrust force (axial feed force): Ff = 0.5 × kc × D × fn × sin(κr) × chisel_factor
  // Chisel edge adds ~5-10% to thrust (not to torque)
  const Ff_thrust = 0.5 * kc * D * fn * Math.sin(kr) * chisel_edge_factor;

  // Tangential cutting force (what produces torque): Fc = M × 2000/D × 2
  // Or equivalently: Fc_tangential = kc × D × fn / 2
  const Fc_tangential = kc * D * fn / 2;

  // Power: Pc = M × 2π × n / 60000 [kW]
  const n = (Vc * 1000) / (Math.PI * D);
  const power = torque * 2 * Math.PI * n / 60000;

  // Validation
  if (D < 1 || D > 100) warnings.push(`Drill diameter ${D}mm outside typical range 1-100mm`);
  if (fn < 0.01 || fn > 1.0) warnings.push(`Feed ${fn}mm/rev outside typical drilling range`);
  if (fn / D > 0.04) warnings.push(`Feed/diameter ratio ${(fn/D).toFixed(3)} is high — risk of drill breakage`);

  // ISO 3002: Fc = main cutting force (tangential), Ff = feed force (axial thrust)
  return {
    Fc: Fc_tangential,       // Main cutting force (tangential, produces torque)
    Ff: Ff_thrust,           // Feed/thrust force (axial)
    Fp: 0,                   // no passive force in drilling
    F_resultant: Math.sqrt(Fc_tangential * Fc_tangential + Ff_thrust * Ff_thrust),
    specific_force: kc,
    chip_thickness: h,
    chip_width: D / 2,
    power,
    torque,
    warnings,
    uncertainty: {
      Fc_range: [Fc_tangential * 0.80, Fc_tangential * 1.20],
      power_range: [power * 0.85, power * 1.15],
      confidence: 0.75,
      source: "drilling_model"
    },
    force_ratios: { Ff_over_Fc: Fc_tangential > 0 ? Ff_thrust / Fc_tangential : 0, Fp_over_Fc: 0, iso_group: "drilling" },
    calculation_method: "Drilling (Sandvik/Shaw: M=kc×D²×fn/8000, Ff=0.5×kc×D×fn×sin(κr)×chisel)",
    provenance: getProvenance("cutting_force", "drilling"),
  };
}

// ============================================================================
// TAYLOR TOOL LIFE EQUATION
// ============================================================================

/**
 * Calculate tool life using Taylor's equation: V × T^n = C
  * @param cutting_speed - cutting_speed value
  * @param coefficients - coefficients
  * @param feed - feed value
  * @param depth - depth value
  * @returns tool life result
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
  if (n <= 0) throw new Error(`Taylor exponent n must be > 0 (got ${n})`);
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
  
  // R2-MS1.5: Taylor cliff edge warnings (AI-generated safety finding)
  if (tool_life < 5) {
    warnings.push(`⚠️ TAYLOR_CLIFF: Tool life ${tool_life.toFixed(1)} min is dangerously short. Small speed increase will cause rapid tool failure.`);
  }
  if (cutting_speed > C * 0.9) {
    warnings.push(`⚠️ TAYLOR_CLIFF: Cutting speed ${cutting_speed} m/min is within 10% of Taylor C=${C}. Operating on exponential curve — small increases drastically reduce tool life.`);
  }
  
  const optimal_speed = cutting_speed * 0.85;
  
  log.debug(`[Taylor] Vc=${cutting_speed}, T=${tool_life.toFixed(1)} min`);
  
  return {
    tool_life_minutes: Math.round(tool_life * 10) / 10,
    optimal_speed: Math.round(optimal_speed),
    warnings,
    calculation_method: "Taylor (V×T^n = C)",
    provenance: getProvenance("tool_life", "taylor"),
  };
}

// ============================================================================
// JOHNSON-COOK CONSTITUTIVE MODEL
// ============================================================================

/**
 * Calculate flow stress using Johnson-Cook model
  * @param strain - strain value
  * @param strain_rate - strain_rate value
  * @param temperature - temperature value
  * @param params - configuration options
  * @returns { stress: number; components: { strain_term: number; rate_term: number; thermal_term: number }; warnings: string[] }
 */
export function calculateJohnsonCookStress(
  strain: number,
  strain_rate: number,
  temperature: number,
  params: JohnsonCookParams
): { stress: number; components: { strain_term: number; rate_term: number; thermal_term: number }; warnings: string[] } {
  const warnings: string[] = [];
  const { A, B, n, C, m, T_melt, T_ref } = params;

  // M-008 fix: use params.strain_rate_ref if provided, not hardcoded 1.0
  const strain_rate_ref = params.strain_rate_ref ?? 1.0;
  const strain_term = A + B * Math.pow(Math.max(strain, 0.001), n);
  const rate_ratio = Math.max(strain_rate / strain_rate_ref, 1);
  const rate_term = 1 + C * Math.log(rate_ratio);
  
  let thermal_term = 1.0;
  if (temperature > T_ref) {
    if (T_melt <= T_ref) throw new Error(`T_melt (${T_melt}) must be > T_ref (${T_ref})`);
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
  * @param feed - feed value
  * @param nose_radius - nose_radius value
  * @param is_milling - whether is_milling
  * @param radial_depth - radial_depth value
  * @param tool_diameter - tool_diameter value
  * @param operation - operation string
  * @returns surface finish result
 */
export function calculateSurfaceFinish(
  feed: number,
  nose_radius: number,
  is_milling: boolean = false,
  radial_depth?: number,
  tool_diameter?: number,
  operation?: string
): SurfaceFinishResult {
  const warnings: string[] = [];
  
  if (feed <= 0 || feed > 2) warnings.push(`Feed ${feed}mm outside range`);
  if (nose_radius <= 0 || nose_radius > 10) warnings.push(`Nose radius ${nose_radius}mm outside range`);
  
  let Ra_theoretical: number;
  // QA-MS3 FIX (F36): Feed-direction Ra is governed by nose radius kinematics
  // regardless of radial engagement. Standard Brammertz formula: Ra = f^2/(32*r)
  // applies to both turning and milling. The ae/D ratio affects scallop height
  // (stepover-direction roughness), not feed-direction Ra.
  Ra_theoretical = nose_radius > 0 ? (feed * feed) / (32 * nose_radius) : 0;
  Ra_theoretical *= 1000; // to μm
  
  const process_factor = 2.0;
  const Ra_actual = Ra_theoretical * process_factor;

  // Rz/Ra ratio per ISO 4287:1997 & Machining Data Handbook 3rd Ed.
  // Turning: 4.0-4.5× (regular chip formation, single-point tool)
  // Milling: 5.0-6.0× (interrupted cut, multiple edges → higher peak scatter)
  // Grinding: 6.0-7.0× (abrasive, stochastic surface)
  const RZ_RA_RATIOS: Record<string, number> = {
    turning: 4.0,
    milling: 5.5,
    grinding: 6.5,
    boring: 4.2,
    reaming: 3.8,
  };
  const VALID_OPERATIONS = new Set(Object.keys(RZ_RA_RATIOS));
  const normalizedOp = operation?.toLowerCase();
  if (normalizedOp && !VALID_OPERATIONS.has(normalizedOp)) {
    warnings.push(`Unknown operation "${operation}" for Rz/Ra ratio — falling back to ${is_milling ? 'milling' : 'turning'}`);
  }
  const rz_ratio = (normalizedOp && VALID_OPERATIONS.has(normalizedOp))
    ? RZ_RA_RATIOS[normalizedOp]
    : (is_milling ? RZ_RA_RATIOS.milling : RZ_RA_RATIOS.turning);
  const Rz = Ra_actual * rz_ratio;
  const Rt = Rz * 1.3;
  
  if (Ra_actual > 12.5) warnings.push("Surface may be rough");
  
  return {
    Ra: Math.round(Ra_actual * 100) / 100,
    Rz: Math.round(Rz * 100) / 100,
    Rt: Math.round(Rt * 100) / 100,
    theoretical_Ra: Math.round(Ra_theoretical * 100) / 100,
    actual_Ra: Math.round(Ra_actual * 100) / 100,
    finish_factor: process_factor,
    warnings,
    provenance: getProvenance("surface_finish", "roughness"),
  };
}

// ============================================================================
// MATERIAL REMOVAL RATE (MRR)
// ============================================================================

/**
 * Calculate Material Removal Rate
  * @param conditions - conditions
  * @param volume - volume value
  * @returns m r r result
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

/** Speed Feed Input configuration/data structure.
 */
export interface SpeedFeedInput {
  material_hardness?: number;
  tool_material: "HSS" | "Carbide" | "Ceramic" | "CBN" | "Diamond";
  operation: "roughing" | "finishing" | "semi-finishing";
  tool_diameter: number;
  number_of_teeth: number;
  /**
   * ISO 513 workpiece group (P/M/K/N/S/H). When supplied, Vc + chip load are
   * anchored on the canonical per-group milling tables (material-aware). When
   * omitted, the legacy tool-material flat-speed + diameter-linear chip-load
   * fallback is used (backward compatible).
   */
  iso_group?: ISOGroup;
  kienzle?: KienzleCoefficients;
  taylor?: TaylorCoefficients;
}

/** Speed Feed Result configuration/data structure.
 */
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
  * @param input - input data
  * @returns speed feed result
 */
export function calculateSpeedFeed(input: SpeedFeedInput): SpeedFeedResult {
  const warnings: string[] = [];
  const recommendations: string[] = [];
  
  const { material_hardness = 200, tool_material, operation, tool_diameter, number_of_teeth, iso_group } = input;

  const base_speeds: Record<string, number> = {
    "HSS": 30, "Carbide": 150, "Ceramic": 300, "CBN": 200, "Diamond": 500
  };

  // QA-MS3 FIX: Case-insensitive lookup using lowercased map (Title Case broke HSS->Hss, CBN->Cbn)
  const lowerSpeeds: Record<string, number> = {};
  for (const [k, v] of Object.entries(base_speeds)) lowerSpeeds[k.toLowerCase()] = v;
  const normalizedTool = tool_material?.trim()?.toLowerCase() || "carbide";
  const toolBaseSpeed = lowerSpeeds[normalizedTool] || 100;
  // Sanitize hardness so a non-positive (negative/zero) Brinell input cannot make
  // Math.pow(200/hardness, ...) NaN/Infinity and poison Vc. Valid positive HB
  // values are unchanged; default 200 (medium-carbon steel) for bad input.
  const safeHardness = material_hardness > 0 ? material_hardness : 200;

  let cutting_speed: number;
  let feed_per_tooth: number;

  if (iso_group) {
    // MATERIAL-AWARE path (ISO 513 group known). Anchor Vc + chip load on the
    // canonical per-group MILLING tables instead of a material-blind flat speed
    // and a constant chip load. This corrects two SFC accuracy defects:
    //   (a) the stainless-faster-than-steel Vc inversion -- the old Brinell-only
    //       Math.pow(200/hardness, 0.3) let 316 (HB180) out-run 1045 (HB200);
    //       the canonical group base orders P>M correctly.
    //   (b) the material-blind chip load (fz = D*0.02 for every group, ~3x too
    //       high for steel/stainless -> excess force/power + built-up-edge risk).
    const speed = CANONICAL_MILLING_SPEEDS[iso_group];
    const feed = CANONICAL_MILLING_FEEDS[iso_group];
    const baseVc = operation === "finishing" ? speed.finish
      : operation === "semi-finishing" ? (speed.rough + speed.finish) / 2 : speed.rough;
    const baseFz = operation === "finishing" ? feed.finish
      : operation === "semi-finishing" ? (feed.rough + feed.finish) / 2 : feed.rough;
    // Scale the carbide base by the tool-material ratio vs carbide (carbide=1.0,
    // HSS~0.2, ceramic~2.0) so non-carbide tooling stays physical.
    const toolFactor = toolBaseSpeed / base_speeds["Carbide"];
    // Bounded within-group hardness fine-tune; clamped [0.8,1.2] so the ISO-group
    // base ALWAYS dominates and the cross-group ordering can never invert.
    const hardnessAdj = Math.min(1.2, Math.max(0.8, Math.pow(200 / safeHardness, 0.2)));
    cutting_speed = baseVc * toolFactor * hardnessAdj;
    // Chip load scales sub-linearly with tool diameter; the canonical table is the
    // anchor at REF_D, bounded so tiny/huge tools stay physical.
    const REF_D = 12;
    feed_per_tooth = baseFz * Math.min(1.6, Math.max(0.4, Math.sqrt(tool_diameter / REF_D)));
    feed_per_tooth = Math.max(0.02, Math.min(0.5, feed_per_tooth));
  } else {
    // LEGACY fallback (no ISO group available): tool-material flat base x Brinell
    // scaling + diameter-linear chip load. Preserved byte-for-byte for back-compat.
    cutting_speed = toolBaseSpeed;
    cutting_speed *= Math.pow(200 / safeHardness, 0.3);
    const operation_factors: Record<string, number> = { "roughing": 0.8, "semi-finishing": 1.0, "finishing": 1.2 };
    cutting_speed *= operation_factors[operation] || 1.0;
    feed_per_tooth = tool_diameter * 0.02;
    feed_per_tooth = Math.max(0.02, Math.min(0.5, feed_per_tooth));
    if (operation === "finishing") feed_per_tooth *= 0.5;
    else if (operation === "roughing") feed_per_tooth *= 1.2;
  }

  const spindle_speed = (1000 * cutting_speed) / (Math.PI * tool_diameter);
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
  
  // R2: Safety-critical bounds checks — reject physically impossible values
  if (!Number.isFinite(axial_depth) || axial_depth <= 0) throw new Error(`SAFETY BLOCK: axial_depth (${axial_depth}) must be a positive finite number`);
  if (!Number.isFinite(radial_depth) || radial_depth <= 0) throw new Error(`SAFETY BLOCK: radial_depth (${radial_depth}) must be a positive finite number`);
  if (!Number.isFinite(tool_diameter) || tool_diameter <= 0) throw new Error(`SAFETY BLOCK: tool_diameter (${tool_diameter}) must be a positive finite number`);
  if (!Number.isFinite(feed_per_tooth) || feed_per_tooth <= 0) throw new Error(`SAFETY BLOCK: feed_per_tooth (${feed_per_tooth}) must be a positive finite number`);
  if (!Number.isFinite(cutting_speed) || cutting_speed <= 0) throw new Error(`SAFETY BLOCK: cutting_speed (${cutting_speed}) must be a positive finite number`);
  
  if (cutting_speed < SAFETY_LIMITS.MIN_CUTTING_SPEED || cutting_speed > SAFETY_LIMITS.MAX_CUTTING_SPEED)
    warnings.push(`Cutting speed ${cutting_speed} outside range`);
  if (feed_per_tooth < SAFETY_LIMITS.MIN_FEED_PER_TOOTH || feed_per_tooth > SAFETY_LIMITS.MAX_FEED_PER_TOOTH)
    warnings.push(`Feed ${feed_per_tooth} outside range`);
  if (radial_depth > tool_diameter)
    warnings.push(`Radial depth ${radial_depth} > tool diameter ${tool_diameter}`);
}

/**
 * Get default Kienzle coefficients
  * @param material_group - material_group string
  * @returns kienzle coefficients
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
    "titanium": { kc1_1: 2800, mc: 0.28, material_id: "Titanium Alloy" },
    "inconel": { kc1_1: 2800, mc: 0.28, material_id: "Inconel/Nickel Alloy" },
    "copper": { kc1_1: 800, mc: 0.30, material_id: "Copper Alloy" },
    "brass": { kc1_1: 600, mc: 0.28, material_id: "Brass" }
  };
  return defaults[material_group.toLowerCase()] || DEFAULT_KIENZLE;
}

/**
 * Get default Taylor coefficients
  * @param material_group - material_group string
  * @param tool_material - tool_material string
  * @returns taylor coefficients
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

// ============================================================================
// SPINDLE POWER CALCULATION
// P = Fc × Vc / (60000 × η)
// ============================================================================
/** Calculates spindle power.
 * @param cutting_force - cutting_force value
 * @param cutting_speed - cutting_speed value
 * @param tool_diameter - tool_diameter value
 * @param efficiency - efficiency value
 * @returns any
 */
export function calculateSpindlePower(
  cutting_force: number,    // N - tangential cutting force
  cutting_speed: number,    // m/min
  tool_diameter: number,    // mm (for RPM derivation)
  efficiency: number = 0.80 // machine spindle efficiency (0.7-0.9 typical)
): any {
  if (cutting_force == null || cutting_speed == null || isNaN(cutting_force) || isNaN(cutting_speed)) {
    throw new Error("cutting_force and cutting_speed are required");
  }
  if (cutting_force < 0) throw new Error(`cutting_force must be >= 0 (got ${cutting_force})`);
  if (cutting_speed < 0) throw new Error(`cutting_speed must be >= 0 (got ${cutting_speed})`);
  if (efficiency < 0.1 || efficiency > 1.0) {
    throw new Error(`Invalid efficiency ${efficiency}: must be 0.1-1.0`);
  }

  const power_cutting_kw = (cutting_force * cutting_speed) / 60000;
  const power_spindle_kw = power_cutting_kw / efficiency;
  const rpm = tool_diameter > 0 ? (cutting_speed * 1000) / (Math.PI * tool_diameter) : 0;
  const torque_nm = rpm > 0 ? (power_spindle_kw * 9549) / rpm : 0;

  return {
    power_cutting_kw: Math.round(power_cutting_kw * 1000) / 1000,
    power_spindle_kw: Math.round(power_spindle_kw * 1000) / 1000,
    power_spindle_hp: Math.round(power_spindle_kw * 1.341 * 1000) / 1000,
    torque_nm: Math.round(torque_nm * 100) / 100,
    rpm: Math.round(rpm),
    efficiency,
    formula: "P_cut = Fc × Vc / 60000; P_spindle = P_cut / η",
    safety_note: "Verify spindle power does not exceed machine rating"
  };
}

// ============================================================================
// CHIP LOAD CALCULATION
// fz_actual = Vf / (n × z) adjusted for radial engagement
// ============================================================================
/** Calculates chip load.
 * @param feed_rate - feed_rate value
 * @param spindle_speed - spindle_speed value
 * @param number_of_teeth - number_of_teeth value
 * @param radial_depth - radial_depth value
 * @param tool_diameter - tool_diameter value
 * @returns any
 */
export function calculateChipLoad(
  feed_rate: number,        // mm/min - table feed rate
  spindle_speed: number,    // RPM
  number_of_teeth: number,  // z
  radial_depth?: number,    // mm - ae (optional, for thin-chip adjustment)
  tool_diameter?: number    // mm - D (optional, for thin-chip adjustment)
): any {
  if (!feed_rate || !spindle_speed || !number_of_teeth) {
    throw new Error("feed_rate, spindle_speed, and number_of_teeth are required");
  }
  if (spindle_speed <= 0) throw new Error("spindle_speed must be > 0");
  if (number_of_teeth <= 0) throw new Error("number_of_teeth must be > 0");

  const fz = feed_rate / (spindle_speed * number_of_teeth);

  // Thin-chip adjustment: when ae < D, actual chip thickness is thinner
  let fz_effective = fz;
  let chip_thinning_factor = 1.0;
  let hex = fz; // effective chip thickness

  if (radial_depth && tool_diameter && radial_depth < tool_diameter) {
    // Martellotti mean chip thickness (consistent with Kienzle force model)
    // hex = fz × (1 - cos(φ_e)) / φ_e where φ_e = arccos(1 - 2·ae/D)
    // Ref: Altintas "Manufacturing Automation" (2012), Ch.2
    const engagement_ratio = radial_depth / tool_diameter;
    const phi_e = Math.acos(Math.max(-1, 1 - 2 * engagement_ratio));
    hex = phi_e > 0.001 ? fz * (1 - Math.cos(phi_e)) / phi_e : fz;
    chip_thinning_factor = hex > 0 ? fz / hex : 1.0;
    // If hex < fz, recommend compensated feed
    fz_effective = fz * chip_thinning_factor;
  }

  return {
    chip_load_fz_mm: Math.round(fz * 10000) / 10000,
    hex_mm: Math.round(hex * 10000) / 10000,
    chip_thinning_factor: Math.round(chip_thinning_factor * 1000) / 1000,
    recommended_fz_compensated_mm: Math.round(fz_effective * 10000) / 10000,
    feed_rate_mm_min: feed_rate,
    spindle_speed_rpm: spindle_speed,
    number_of_teeth: number_of_teeth,
    formula: "fz = Vf / (n × z); hex adjusted for ae/D ratio",
    note: chip_thinning_factor > 1.2
      ? `Chip thinning detected (factor ${chip_thinning_factor.toFixed(2)}). Consider increasing programmed feed to achieve target chip load.`
      : "Chip thickness is within normal range."
  };
}

// ============================================================================
// TORQUE CALCULATION
// M = Fc × D / (2 × 1000) for milling
// M = Fc × r for turning
// ============================================================================
/** Calculates torque.
 * @param cutting_force - cutting_force value
 * @param tool_diameter - tool_diameter value
 * @param operation - operation string
 * @returns any
 */
export function calculateTorque(
  cutting_force: number,    // N - tangential cutting force
  tool_diameter: number,    // mm
  operation: string = "milling" // milling or turning
): any {
  if (!cutting_force || !tool_diameter) {
    throw new Error("cutting_force and tool_diameter are required");
  }

  // M = Fc × (D/2) / 1000 — for turning, caller passes workpiece diameter as tool_diameter
  const torque_nm = (cutting_force * (tool_diameter / 2)) / 1000;

  const torque_ft_lbs = torque_nm * 0.7376;

  return {
    torque_nm: Math.round(torque_nm * 100) / 100,
    torque_ft_lbs: Math.round(torque_ft_lbs * 100) / 100,
    cutting_force_n: cutting_force,
    diameter_mm: tool_diameter,
    operation,
    formula: operation === "turning"
      ? "M = Fc × (D_work/2) / 1000"
      : "M = Fc × (D_tool/2) / 1000",
    safety_note: "Verify torque does not exceed spindle or turret rating"
  };
}

// ============================================================================
// PRODUCTIVITY METRICS
// Comprehensive: MRR, cost/part, tool changes/part, machine utilization
// ============================================================================
/** Calculates productivity metrics.
 * @param cutting_speed - cutting_speed value
 * @param feed_per_tooth - feed_per_tooth value
 * @param axial_depth - axial_depth value
 * @param radial_depth - radial_depth value
 * @param tool_diameter - tool_diameter value
 * @param number_of_teeth - number_of_teeth value
 * @param taylor_C - taylor_ c value
 * @param taylor_n - taylor_n value
 * @param tool_cost - tool_cost value
 * @param machine_rate - machine_rate value
 * @returns any
 */
export function calculateProductivityMetrics(
  cutting_speed: number,    // m/min
  feed_per_tooth: number,   // mm/tooth
  axial_depth: number,      // mm
  radial_depth: number,     // mm
  tool_diameter: number,    // mm
  number_of_teeth: number,
  taylor_C: number,         // Taylor constant
  taylor_n: number,         // Taylor exponent
  tool_cost: number,        // $ per insert/tool
  machine_rate: number      // $/min (machine + operator)
): any {
  if (!cutting_speed || !feed_per_tooth || !tool_diameter) {
    throw new Error("cutting_speed, feed_per_tooth, and tool_diameter are required");
  }

  // RPM
  const rpm = (cutting_speed * 1000) / (Math.PI * tool_diameter);
  // Table feed
  const feed_rate = rpm * number_of_teeth * feed_per_tooth;
  // MRR
  const mrr = axial_depth * radial_depth * feed_rate; // mm³/min
  const mrr_cm3 = mrr / 1000;

  // Tool life (Taylor)
  let tool_life_min = 15; // default
  if (taylor_C && taylor_n && taylor_n > 0) {
    tool_life_min = Math.pow(taylor_C / cutting_speed, 1 / taylor_n);
  }

  // Volume per tool life
  const volume_per_tool = mrr * tool_life_min; // mm³

  // Cost analysis
  const cost_per_min_cutting = machine_rate;
  const cost_per_tool_change = machine_rate * 1.0 + tool_cost; // 1 min tool change assumed
  const cost_per_mm3 = mrr > 0 ? (cost_per_min_cutting + cost_per_tool_change / tool_life_min) / mrr : 0;
  const cost_per_cm3 = cost_per_mm3 * 1000;

  return {
    rpm: Math.round(rpm),
    feed_rate_mm_min: Math.round(feed_rate),
    mrr_mm3_min: Math.round(mrr),
    mrr_cm3_min: Math.round(mrr_cm3 * 100) / 100,
    tool_life_min: Math.round(tool_life_min * 10) / 10,
    volume_per_tool_cm3: Math.round(volume_per_tool / 1000 * 100) / 100,
    cost_per_cm3: Math.round(cost_per_cm3 * 100) / 100,
    cost_per_minute: machine_rate,
    tool_cost,
    productivity_index: Math.round((mrr_cm3 / cost_per_cm3) * 100) / 100,
    formula: "MRR = ae × ap × Vf; Cost = (machine_rate + tool_cost/T) / MRR",
    recommendations: mrr_cm3 < 1
      ? "Low MRR — consider increasing depth of cut or feed rate"
      : mrr_cm3 > 100
        ? "High MRR — verify spindle power is sufficient"
        : "MRR within typical range"
  };
}

// ============================================================================
// ROUGHING PASS PLANNER (DPMultiPass Algorithm)
// ============================================================================

export interface RoughingPlanInput {
  /** Total radial stock to remove [mm]. */
  total_stock_mm: number;
  /** Workpiece diameter [mm]. */
  workpiece_diameter_mm: number;
  /** Cut length [mm]. */
  cut_length_mm: number;
  /** Max depth of cut per pass [mm]. Default 5. */
  max_depth_mm?: number;
  /** Min depth of cut per pass [mm]. Default 0.5. */
  min_depth_mm?: number;
  /** Cutting speed [m/min]. Default 200. */
  cutting_speed_mpm?: number;
  /** Feed rate [mm/rev]. Default 0.3. */
  feed_mm_rev?: number;
  /** Max spindle power [kW]. Default 15. */
  max_power_kw?: number;
  /** Tool change time [s]. Default 30. */
  tool_change_time_s?: number;
  /** Material ISO group for force calculation. */
  iso_group?: "P" | "M" | "K" | "N" | "S" | "H";
  /** Kienzle kc1.1 [N/mm²]. */
  kc1_1?: number;
  /** Kienzle mc exponent. */
  mc?: number;
}

export interface RoughingPassDetail {
  pass_number: number;
  depth_of_cut_mm: number;
  diameter_before_mm: number;
  diameter_after_mm: number;
  machining_time_min: number;
  cutting_force_N: number;
  power_kw: number;
  power_utilization_pct: number;
}

export interface RoughingPlanResult {
  passes: RoughingPassDetail[];
  n_passes: number;
  total_time_min: number;
  total_time_with_changes_min: number;
  equal_depth_time_min: number;
  savings_pct: number;
  feasible: boolean;
  dp_used: boolean;
  method: string;
  warnings: string[];
}

/**
 * Plan optimal roughing pass allocation using DPMultiPass algorithm.
 * Minimizes total cycle time by choosing optimal number and depth of passes,
 * respecting power constraints. Falls back to equal-depth allocation if DP unavailable.
 *
 * Ref: Shin & Joo (1992); Wang et al. (2002)
 */
export function planRoughingPasses(input: RoughingPlanInput): RoughingPlanResult {
  const warnings: string[] = [];
  const {
    total_stock_mm, workpiece_diameter_mm, cut_length_mm,
    max_depth_mm = 5, min_depth_mm = 0.5,
    cutting_speed_mpm = 200, feed_mm_rev = 0.3,
    max_power_kw = 15, tool_change_time_s = 30,
    kc1_1 = 1800, mc = 0.25,
  } = input;

  // Validate inputs
  if (total_stock_mm <= 0 || total_stock_mm > workpiece_diameter_mm / 2) {
    warnings.push("Invalid stock: must be > 0 and <= half the diameter");
    return {
      passes: [], n_passes: 0, total_time_min: 0,
      total_time_with_changes_min: 0, equal_depth_time_min: 0,
      savings_pct: 0, feasible: false, dp_used: false,
      method: "error", warnings,
    };
  }

  // Specific cutting force for power estimation [N/mm²]
  const Kc = kc1_1 * Math.pow(feed_mm_rev, -mc);

  // Try DPMultiPass algorithm
  let dpResult: {
    passes: Array<{ pass_number: number; depth_of_cut: number; diameter_after: number; machining_time: number; power_required: number }>;
    n_passes: number; total_time: number; total_time_with_changes: number;
    equal_depth_time: number; savings_pct: number; feasible: boolean; calculation_method: string;
  } | null = null;

  try {
    const { DPMultiPass } = require("../algorithms/DPMultiPass.js");
    const dp = new DPMultiPass();
    dpResult = dp.calculate({
      total_stock: total_stock_mm,
      workpiece_diameter: workpiece_diameter_mm,
      cut_length: cut_length_mm,
      min_depth: min_depth_mm,
      max_depth: max_depth_mm,
      Kc,
      max_power: max_power_kw,
      feed_rate: feed_mm_rev,
      cutting_speed: cutting_speed_mpm,
      tool_change_time: tool_change_time_s,
    });
  } catch {
    warnings.push("DPMultiPass algorithm not available — using equal-depth allocation");
  }

  if (dpResult && dpResult.passes.length > 0) {
    // Enrich DP passes with Kienzle force data
    const enrichedPasses: RoughingPassDetail[] = [];
    let cumStock = 0;

    for (const pass of dpResult.passes) {
      const dBefore = workpiece_diameter_mm - 2 * cumStock;
      cumStock += pass.depth_of_cut;
      const dAfter = workpiece_diameter_mm - 2 * cumStock;

      // Kienzle turning force: Fc = kc × ap × f
      // kc = kc1.1 × h^(-mc), h = feed for turning
      const kc = kc1_1 * Math.pow(feed_mm_rev, -mc);
      const Fc = kc * pass.depth_of_cut * feed_mm_rev;
      const power = Fc * cutting_speed_mpm / (60 * 1000); // kW

      enrichedPasses.push({
        pass_number: pass.pass_number,
        depth_of_cut_mm: Math.round(pass.depth_of_cut * 1000) / 1000,
        diameter_before_mm: Math.round(dBefore * 100) / 100,
        diameter_after_mm: Math.round(dAfter * 100) / 100,
        machining_time_min: Math.round(pass.machining_time * 1000) / 1000,
        cutting_force_N: Math.round(Fc),
        power_kw: Math.round(power * 100) / 100,
        power_utilization_pct: Math.round((power / max_power_kw) * 1000) / 10,
      });
    }

    return {
      passes: enrichedPasses,
      n_passes: dpResult.n_passes,
      total_time_min: Math.round(dpResult.total_time * 1000) / 1000,
      total_time_with_changes_min: Math.round(dpResult.total_time_with_changes * 1000) / 1000,
      equal_depth_time_min: Math.round(dpResult.equal_depth_time * 1000) / 1000,
      savings_pct: Math.round(dpResult.savings_pct * 10) / 10,
      feasible: dpResult.feasible,
      dp_used: true,
      method: dpResult.calculation_method,
      warnings,
    };
  }

  // Fallback: equal-depth allocation
  const nPasses = Math.max(1, Math.ceil(total_stock_mm / max_depth_mm));
  const equalDepth = total_stock_mm / nPasses;
  const passes: RoughingPassDetail[] = [];
  let totalTime = 0;
  let cumStock = 0;

  for (let i = 0; i < nPasses; i++) {
    const dBefore = workpiece_diameter_mm - 2 * cumStock;
    cumStock += equalDepth;
    const dAfter = workpiece_diameter_mm - 2 * cumStock;
    const rpm = (cutting_speed_mpm * 1000) / (Math.PI * dBefore);
    const time = cut_length_mm / (feed_mm_rev * rpm);
    const kc = kc1_1 * Math.pow(feed_mm_rev, -mc);
    const Fc = kc * equalDepth * feed_mm_rev;
    const power = Fc * cutting_speed_mpm / (60 * 1000);

    passes.push({
      pass_number: i + 1,
      depth_of_cut_mm: Math.round(equalDepth * 1000) / 1000,
      diameter_before_mm: Math.round(dBefore * 100) / 100,
      diameter_after_mm: Math.round(dAfter * 100) / 100,
      machining_time_min: Math.round(time * 1000) / 1000,
      cutting_force_N: Math.round(Fc),
      power_kw: Math.round(power * 100) / 100,
      power_utilization_pct: Math.round((power / max_power_kw) * 1000) / 10,
    });
    totalTime += time;
  }

  const tChange = tool_change_time_s / 60;
  const totalWithChanges = totalTime + (nPasses - 1) * tChange;

  return {
    passes,
    n_passes: nPasses,
    total_time_min: Math.round(totalTime * 1000) / 1000,
    total_time_with_changes_min: Math.round(totalWithChanges * 1000) / 1000,
    equal_depth_time_min: Math.round(totalWithChanges * 1000) / 1000,
    savings_pct: 0,
    feasible: passes.every(p => p.power_kw <= max_power_kw),
    dp_used: false,
    method: `equal-depth fallback (${nPasses} passes × ${equalDepth.toFixed(2)}mm)`,
    warnings,
  };
}

// Export singleton
/** Manufacturing Calculations constant.
 */
export const manufacturingCalculations = {
  kienzle: calculateKienzleCuttingForce,
  taylor: calculateTaylorToolLife,
  johnsonCook: calculateJohnsonCookStress,
  surfaceFinish: calculateSurfaceFinish,
  mrr: calculateMRR,
  speedFeed: calculateSpeedFeed,
  power: calculateSpindlePower,
  chipLoad: calculateChipLoad,
  torque: calculateTorque,
  productivity: calculateProductivityMetrics,
  roughingPlan: planRoughingPasses,
  getDefaultKienzle,
  getDefaultTaylor,
  SAFETY_LIMITS
};
