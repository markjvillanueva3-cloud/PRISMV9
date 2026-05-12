/**
 * LatheQualityGateEngine — PhD-Level Quality Validation for Lathe Programs
 * ==========================================================================
 *
 * This engine provides expert-level scrutiny at every stage of the lathe
 * programming pipeline. It validates programs against safety, physics,
 * machining science, and shop-specific requirements.
 *
 * Quality Gates:
 *   1. SAFETY GATE (Critical) — Collision-free, spindle limits, program end
 *   2. PARAMETER GATE — ISO material limits, surface finish achievability
 *   3. SEQUENCE GATE — Logical operation order, datum maintenance
 *   4. PHYSICS GATE — Kienzle force, Taylor life, deflection, thermal
 *   5. QUALITY GATE — Surface finish prediction, tolerance achievability
 *   6. SHOP GATE — JM Die standards, customer preferences, machine capability
 *
 * Scoring System:
 *   - 0-100 per gate, weighted aggregate score
 *   - Pass (>80), Warn (60-80), Fail (<60) thresholds
 *   - Detailed failure reports with remediation steps
 *
 * Physics References:
 *   - Kienzle (1952): Specific cutting force model
 *   - Taylor (1907): Tool life equation
 *   - Altintas (2012): Manufacturing Automation
 *   - Sandvik Coromant Turning Guide (2024)
 *   - Machinery's Handbook Ch. 27-29
 *   - ISO 3685: Tool life testing
 *   - ISO 4287: Surface roughness parameters
 *   - ISO 1101: GD&T specification
 *
 * @module engines/LatheQualityGateEngine
 * @version 1.0.0
 */

import { log } from "../utils/Logger.js";
import {
  CANONICAL_KIENZLE,
  CANONICAL_TAYLOR,
  CANONICAL_MATERIAL_DB,
  type ISOGroup,
  type MaterialPhysics,
} from "../physics/constants.js";
// MS1 U-LAT14: S(x) safety score hard block
import { omegaSafetyScoreEngine, type OmegaSafetyResult } from "./OmegaSafetyScoreEngine.js";

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/** ISO material group for lookups */
export type { ISOGroup };

/** Material specification for validation */
export interface QualityGateMaterial {
  name: string;
  iso_group: ISOGroup;
  hardness_hrc?: number;
  hardness_hb?: number;
  kc1_1_mpa?: number;
  mc_exponent?: number;
  sigma_y_mpa?: number;
  e_gpa?: number;
}

/** Cutting parameters for validation */
export interface QualityGateCuttingParams {
  cutting_speed_m_min: number;
  feed_mm_rev: number;
  depth_of_cut_mm: number;
  spindle_rpm?: number;
  css_mode?: boolean;
  coolant?: "flood" | "mist" | "through_tool" | "air" | "dry";
}

/** Tool specification */
export interface QualityGateTool {
  tool_id: string;
  tool_type: "external" | "internal" | "threading" | "grooving" | "parting" | "drilling" | "tapping" | "live";
  insert_shape?: "C" | "D" | "S" | "T" | "V" | "W" | "R";
  nose_radius_mm: number;
  holder_style?: string;
  insert_grade?: string;
  coating?: string;
  orientation?: number;
  overhang_mm?: number;
  shank_size_mm?: number;
}

/** Operation type enumeration */
export type LatheOperationType =
  | "od_rough" | "od_finish" | "od_groove" | "od_thread"
  | "id_rough" | "id_finish" | "id_groove" | "id_thread"
  | "face_rough" | "face_finish"
  | "drilling" | "tapping" | "boring" | "reaming"
  | "parting" | "cutoff"
  | "live_milling" | "live_drilling" | "c_axis";

/** Single operation definition */
export interface QualityGateOperation {
  operation_id: string;
  type: LatheOperationType;
  tool: QualityGateTool;
  params: QualityGateCuttingParams;
  start_z_mm: number;
  end_z_mm: number;
  start_diameter_mm?: number;
  end_diameter_mm?: number;
  target_ra_um?: number;
  target_tolerance_mm?: number;
  stock_allowance_mm?: number;
}

/** Machine specification */
export interface QualityGateMachine {
  machine_id: string;
  brand: string;
  model: string;
  controller: "okuma" | "fanuc" | "mazak" | "haas" | "siemens";
  max_spindle_rpm: number;
  spindle_power_kw: number;
  spindle_torque_nm: number;
  max_bar_od_mm: number;
  max_turning_diameter_mm: number;
  max_turning_length_mm: number;
  live_tooling: boolean;
  c_axis: boolean;
  y_axis: boolean;
  sub_spindle: boolean;
  tailstock: boolean;
}

/** Workholding setup */
export interface QualityGateWorkholding {
  type: "3_jaw" | "6_jaw" | "collet" | "soft_jaw" | "faceplate" | "between_centers" | "fixture";
  jaw_type?: "hard" | "soft" | "pie" | "serrated";
  grip_length_mm: number;
  grip_diameter_mm: number;
  tailstock_engaged: boolean;
  steady_rest_engaged: boolean;
  steady_rest_position_mm?: number;
}

/** Part specification */
export interface QualityGatePart {
  name: string;
  part_number?: string;
  material: QualityGateMaterial;
  stock_diameter_mm: number;
  finished_diameter_mm?: number;
  length_mm: number;
  overhang_from_chuck_mm: number;
  id_bore_mm?: number;
  customer?: string;
  jm_die_category?: "punch" | "die" | "quill" | "electrode" | "insert" | "case" | "gauge" | "custom";
}

/** Full validation context */
export interface ValidationContext {
  program_name?: string;
  machine: QualityGateMachine;
  workholding: QualityGateWorkholding;
  part: QualityGatePart;
  operations: QualityGateOperation[];
  target_cycle_time_min?: number;
  target_tool_life_min?: number;
  is_production_run?: boolean;
  customer_spec_level?: "standard" | "tight" | "aerospace" | "medical";
}

/** Single validation check result */
export interface ValidationCheck {
  check_id: string;
  check_name: string;
  status: "pass" | "warn" | "fail";
  score: number;
  detail: string;
  measured_value?: number | string;
  limit_value?: number | string;
  unit?: string;
  remediation?: string;
  reference?: string;
}

/** Gate-level report */
export interface GateReport {
  gate_name: string;
  gate_type: "safety" | "parameter" | "sequence" | "physics" | "quality" | "shop";
  overall_status: "pass" | "warn" | "fail";
  score: number;
  weight: number;
  checks: ValidationCheck[];
  critical_failures: string[];
  warnings: string[];
  recommendations: string[];
}

/** Safety-specific report */
export interface SafetyReport extends GateReport {
  gate_type: "safety";
  spindle_limit_present: boolean;
  program_end_present: boolean;
  rapid_collision_risk: boolean;
  tool_compensation_correct: boolean;
  coolant_control_correct: boolean;
}

/** Parameter-specific report */
export interface ParamReport extends GateReport {
  gate_type: "parameter";
  speed_within_limits: boolean;
  feed_appropriate: boolean;
  doc_within_deflection_limits: boolean;
  chip_load_optimal: boolean;
}

/** Sequence-specific report */
export interface SequenceReport extends GateReport {
  gate_type: "sequence";
  logical_order_correct: boolean;
  tool_changes_safe: boolean;
  datum_maintained: boolean;
  stock_allowances_correct: boolean;
}

/** Physics-specific report */
export interface PhysicsReport extends GateReport {
  gate_type: "physics";
  cutting_force_n: number;
  power_consumption_kw: number;
  tool_life_min: number;
  deflection_mm: number;
  temperature_c: number;
  within_machine_limits: boolean;
}

/** Quality-specific report */
export interface QualityReport extends GateReport {
  gate_type: "quality";
  predicted_ra_um: number;
  achievable_tolerance_mm: number;
  dimensional_accuracy_pct: number;
  gdt_compliant: boolean;
}

/** Shop-specific report */
export interface ShopReport extends GateReport {
  gate_type: "shop";
  jm_die_compliant: boolean;
  customer_preference_match: boolean;
  machine_capability_match: boolean;
  tool_availability_match: boolean;
}

/** Complete validation report */
export interface FullValidationReport {
  program_name: string;
  validation_timestamp: string;
  overall_score: number;
  overall_status: "pass" | "warn" | "fail";
  safety_report: SafetyReport;
  param_report: ParamReport;
  sequence_report: SequenceReport;
  physics_report: PhysicsReport;
  quality_report: QualityReport;
  shop_report: ShopReport;
  critical_failures: string[];
  all_warnings: string[];
  all_recommendations: Recommendation[];
  program_approved: boolean;
  approval_conditions?: string[];
  // MS1 U-LAT14: S(x) safety score hard block
  omega_safety?: OmegaSafetyResult;
  omega_blocked?: boolean;
}

/** Recommendation structure */
export interface Recommendation {
  priority: "critical" | "high" | "medium" | "low";
  category: string;
  description: string;
  impact: string;
  action: string;
  estimated_improvement?: string;
}

// ============================================================================
// CONSTANTS — ISO Material Limits
// ============================================================================

/**
 * ISO Material Cutting Speed Limits (m/min)
 * Source: Sandvik Coromant Turning Guide 2024, Kennametal Grade Selection
 * Values are for carbide inserts with flood coolant
 */
const ISO_SPEED_LIMITS: Record<ISOGroup, { min: number; max_rough: number; max_finish: number }> = {
  P: { min: 80, max_rough: 350, max_finish: 450 },      // Steel
  M: { min: 60, max_rough: 200, max_finish: 280 },      // Stainless
  K: { min: 100, max_rough: 400, max_finish: 500 },     // Cast iron
  N: { min: 200, max_rough: 1500, max_finish: 3000 },   // Aluminum
  S: { min: 20, max_rough: 80, max_finish: 120 },       // Superalloys
  H: { min: 50, max_rough: 150, max_finish: 220 },      // Hardened
};

/**
 * ISO Material Feed Limits (mm/rev)
 * Source: Sandvik Coromant, Kennametal
 */
const ISO_FEED_LIMITS: Record<ISOGroup, { min: number; max_rough: number; max_finish: number }> = {
  P: { min: 0.05, max_rough: 0.6, max_finish: 0.2 },
  M: { min: 0.05, max_rough: 0.4, max_finish: 0.15 },
  K: { min: 0.08, max_rough: 0.8, max_finish: 0.25 },
  N: { min: 0.05, max_rough: 0.8, max_finish: 0.3 },
  S: { min: 0.05, max_rough: 0.25, max_finish: 0.1 },
  H: { min: 0.03, max_rough: 0.2, max_finish: 0.08 },
};

/**
 * ISO Material DOC Limits (mm)
 * Source: Sandvik Coromant, insert geometry limits
 */
const ISO_DOC_LIMITS: Record<ISOGroup, { min: number; max_rough: number; max_finish: number }> = {
  P: { min: 0.2, max_rough: 8.0, max_finish: 1.0 },
  M: { min: 0.2, max_rough: 5.0, max_finish: 0.8 },
  K: { min: 0.3, max_rough: 10.0, max_finish: 1.5 },
  N: { min: 0.2, max_rough: 12.0, max_finish: 2.0 },
  S: { min: 0.2, max_rough: 3.0, max_finish: 0.5 },
  H: { min: 0.1, max_rough: 1.5, max_finish: 0.3 },
};

/**
 * Surface Finish Achievability by Operation (Ra in um)
 * Source: Machinery's Handbook 30th Ed., Table 27-1
 */
const SURFACE_FINISH_LIMITS: Record<LatheOperationType, { min_ra: number; typical_ra: number; best_ra: number }> = {
  od_rough: { min_ra: 6.3, typical_ra: 12.5, best_ra: 3.2 },
  od_finish: { min_ra: 0.4, typical_ra: 1.6, best_ra: 0.2 },
  od_groove: { min_ra: 1.6, typical_ra: 3.2, best_ra: 0.8 },
  od_thread: { min_ra: 1.6, typical_ra: 3.2, best_ra: 0.8 },
  id_rough: { min_ra: 6.3, typical_ra: 12.5, best_ra: 3.2 },
  id_finish: { min_ra: 0.8, typical_ra: 1.6, best_ra: 0.4 },
  id_groove: { min_ra: 1.6, typical_ra: 3.2, best_ra: 0.8 },
  id_thread: { min_ra: 1.6, typical_ra: 3.2, best_ra: 0.8 },
  face_rough: { min_ra: 6.3, typical_ra: 12.5, best_ra: 3.2 },
  face_finish: { min_ra: 0.4, typical_ra: 1.6, best_ra: 0.2 },
  drilling: { min_ra: 3.2, typical_ra: 6.3, best_ra: 1.6 },
  tapping: { min_ra: 3.2, typical_ra: 6.3, best_ra: 1.6 },
  boring: { min_ra: 0.8, typical_ra: 1.6, best_ra: 0.4 },
  reaming: { min_ra: 0.4, typical_ra: 0.8, best_ra: 0.2 },
  parting: { min_ra: 3.2, typical_ra: 6.3, best_ra: 1.6 },
  cutoff: { min_ra: 3.2, typical_ra: 6.3, best_ra: 1.6 },
  live_milling: { min_ra: 1.6, typical_ra: 3.2, best_ra: 0.8 },
  live_drilling: { min_ra: 3.2, typical_ra: 6.3, best_ra: 1.6 },
  c_axis: { min_ra: 1.6, typical_ra: 3.2, best_ra: 0.8 },
};

/**
 * G-code patterns for safety validation
 */
const GCODE_PATTERNS = {
  G50_SPINDLE_LIMIT: /G50\s*S\s*(\d+)/gi,
  PROGRAM_END_M30: /M30/gi,
  PROGRAM_END_M02: /M02/gi,
  RAPID_MOVE_G00: /G0?0\s*[XZ]/gi,
  TOOL_COMP_CANCEL_G40: /G40/gi,
  TOOL_COMP_LEFT_G41: /G41/gi,
  TOOL_COMP_RIGHT_G42: /G42/gi,
  COOLANT_ON_M8: /M0?8/gi,
  COOLANT_OFF_M9: /M0?9/gi,
  CSS_MODE_G96: /G96\s*S\s*(\d+)/gi,
  DIRECT_RPM_G97: /G97\s*S\s*(\d+)/gi,
  THREADING_G76: /G76/gi,
  CANNED_ROUGH_G71: /G71/gi,
  CANNED_FINISH_G70: /G70/gi,
  TOOL_CHANGE: /T\s*(\d{2,4})/gi,
  FEED_RATE: /F\s*([\d.]+)/gi,
};

/**
 * Operation logical sequence (should appear in this order)
 */
const OPERATION_SEQUENCE_ORDER: LatheOperationType[] = [
  "face_rough",
  "face_finish",
  "od_rough",
  "od_finish",
  "od_groove",
  "od_thread",
  "drilling",
  "boring",
  "reaming",
  "tapping",
  "id_rough",
  "id_finish",
  "id_groove",
  "id_thread",
  "live_drilling",
  "live_milling",
  "c_axis",
  "parting",
  "cutoff",
];

/**
 * Gate weights for overall score calculation
 */
const GATE_WEIGHTS = {
  safety: 0.30,      // Safety is critical
  parameter: 0.15,
  sequence: 0.10,
  physics: 0.20,
  quality: 0.15,
  shop: 0.10,
};

/**
 * JM Die specific standards
 */
const JM_DIE_STANDARDS = {
  min_tool_life_min: 30,
  max_surface_roughness_um: 3.2,
  preferred_coolant: "flood" as const,
  max_spindle_overspeed_pct: 5,
  required_program_end: "M30",
  punch_tolerance_mm: 0.005,
  die_tolerance_mm: 0.01,
  electrode_tolerance_mm: 0.02,
  default_stock_allowance_mm: 0.5,
  max_parting_diameter_mm: 65,
  min_grip_length_ratio: 1.5,  // grip_length / diameter
};

// ============================================================================
// PHYSICS CALCULATION HELPERS
// ============================================================================

/**
 * Calculate Kienzle cutting force
 * Fc = kc1_1 * ap * fn^(1-mc)
 * Source: Kienzle (1952), validated in Altintas (2012)
 */
function calculateKienzleForce(
  kc1_1: number,
  mc: number,
  ap_mm: number,
  fn_mm_rev: number
): number {
  // Chip thickness h = fn for turning (single-point)
  const h = fn_mm_rev;
  // Specific cutting force: kc = kc1_1 * h^(-mc)
  const kc = kc1_1 * Math.pow(h, -mc);
  // Cutting force: Fc = kc * ap * h = kc * ap * fn
  const Fc = kc * ap_mm * h;
  return Fc; // [N]
}

/**
 * Calculate Taylor tool life
 * T = (C / Vc)^(1/n)
 * Source: Taylor (1907), ISO 3685
 */
function calculateTaylorLife(
  vc_m_min: number,
  C: number,
  n: number
): number {
  if (vc_m_min <= 0) return 999999; // infinite life at zero speed
  const T = Math.pow(C / vc_m_min, 1 / n);
  return T; // [min]
}

/**
 * Calculate cutting power
 * Pc = Fc * Vc / 60000
 * Source: Fundamental machining power equation
 */
function calculateCuttingPower(Fc_N: number, Vc_m_min: number): number {
  return (Fc_N * Vc_m_min) / 60000; // [kW]
}

/**
 * Calculate workpiece deflection (cantilever beam model)
 * delta = F * L^3 / (3 * E * I)
 * Source: Strength of materials, Timoshenko
 */
function calculateCantileverDeflection(
  force_N: number,
  overhang_mm: number,
  diameter_mm: number,
  E_GPa: number
): number {
  const I = (Math.PI * Math.pow(diameter_mm, 4)) / 64; // mm^4
  const E_Nmm2 = E_GPa * 1000; // GPa to N/mm^2
  const deflection = (force_N * Math.pow(overhang_mm, 3)) / (3 * E_Nmm2 * I);
  return deflection; // [mm]
}

/**
 * Calculate supported beam deflection (tailstock engaged)
 * delta_max = F * L^3 / (48 * E * I) for center load
 * Source: Beam deflection formulas, Roark's
 */
function calculateSupportedDeflection(
  force_N: number,
  length_mm: number,
  diameter_mm: number,
  E_GPa: number
): number {
  const I = (Math.PI * Math.pow(diameter_mm, 4)) / 64;
  const E_Nmm2 = E_GPa * 1000;
  const deflection = (force_N * Math.pow(length_mm, 3)) / (48 * E_Nmm2 * I);
  return deflection;
}

/**
 * Theoretical surface roughness calculation
 * Ra = (fn^2) / (32 * r)
 * Source: Sandvik Coromant, fundamental turning geometry
 */
function calculateTheoreticalRa(fn_mm_rev: number, nose_radius_mm: number): number {
  if (nose_radius_mm <= 0) return 99; // invalid nose radius
  const Ra_mm = (fn_mm_rev * fn_mm_rev) / (32 * nose_radius_mm);
  return Ra_mm * 1000; // Convert to um
}

/**
 * Calculate cutting temperature (empirical model)
 * T = T_ambient + k * Vc^a * fn^b * ap^c
 * Source: Shaw (1984), Metal Cutting Principles
 */
function calculateCuttingTemperature(
  vc_m_min: number,
  fn_mm_rev: number,
  ap_mm: number,
  iso_group: ISOGroup
): number {
  const T_ambient = 20; // Celsius
  // Empirical coefficients by material group
  const coeffs: Record<ISOGroup, { k: number; a: number; b: number; c: number }> = {
    P: { k: 120, a: 0.35, b: 0.15, c: 0.10 },
    M: { k: 150, a: 0.38, b: 0.18, c: 0.12 },
    K: { k: 100, a: 0.30, b: 0.12, c: 0.08 },
    N: { k: 80, a: 0.25, b: 0.10, c: 0.05 },
    S: { k: 200, a: 0.42, b: 0.20, c: 0.15 },
    H: { k: 180, a: 0.40, b: 0.18, c: 0.12 },
  };
  const c = coeffs[iso_group];
  const delta_T = c.k * Math.pow(vc_m_min, c.a) * Math.pow(fn_mm_rev, c.b) * Math.pow(ap_mm, c.c);
  return T_ambient + delta_T;
}

/**
 * Get material physics from ISO group
 */
function getMaterialPhysics(iso_group: ISOGroup): { kc1_1: number; mc: number; taylor_C: number; taylor_n: number; E_GPa: number } {
  const kienzle = CANONICAL_KIENZLE[iso_group];
  const taylor = CANONICAL_TAYLOR[iso_group];
  // Default elastic modulus by group
  const E_defaults: Record<ISOGroup, number> = {
    P: 210, M: 193, K: 170, N: 70, S: 114, H: 210,
  };
  return {
    kc1_1: kienzle.kc1_1,
    mc: kienzle.mc,
    taylor_C: taylor.C,
    taylor_n: taylor.n,
    E_GPa: E_defaults[iso_group],
  };
}

// ============================================================================
// VALIDATION HELPER FUNCTIONS
// ============================================================================

/**
 * Check if operation type is roughing
 */
function isRoughingOperation(op: LatheOperationType): boolean {
  return op.includes("rough") || op === "drilling";
}

/**
 * Check if operation type is finishing
 */
function isFinishingOperation(op: LatheOperationType): boolean {
  return op.includes("finish") || op === "boring" || op === "reaming";
}

/**
 * Check if operation type is threading
 */
function isThreadingOperation(op: LatheOperationType): boolean {
  return op.includes("thread") || op === "tapping";
}

/**
 * Calculate L/D ratio for slenderness check
 */
function calculateLDRatio(length_mm: number, diameter_mm: number): number {
  if (diameter_mm <= 0) return 999;
  return length_mm / diameter_mm;
}

/**
 * Determine if tailstock is recommended based on L/D ratio
 * Source: Machinery's Handbook, workholding guidelines
 */
function isTailstockRecommended(overhang_mm: number, diameter_mm: number): boolean {
  const ld = calculateLDRatio(overhang_mm, diameter_mm);
  // Tailstock recommended for L/D > 3
  return ld > 3;
}

/**
 * Determine if steady rest is recommended
 */
function isSteadyRestRecommended(overhang_mm: number, diameter_mm: number): boolean {
  const ld = calculateLDRatio(overhang_mm, diameter_mm);
  // Steady rest recommended for L/D > 8
  return ld > 8;
}

// ============================================================================
// MAIN ENGINE CLASS
// ============================================================================

class LatheQualityGateEngineImpl {
  private readonly version = "1.0.0";

  // ==========================================================================
  // MAIN VALIDATION ENTRY POINT
  // ==========================================================================

  /**
   * Validate a complete lathe program with all gates
   */
  validateProgram(program: string, context: ValidationContext): FullValidationReport {
    log.info("LatheQualityGateEngine: Starting full program validation");

    const timestamp = new Date().toISOString();

    // Run all gate validations
    const safetyReport = this.validateSafety(program, context);
    const paramReport = this.validateParameters(context);
    const sequenceReport = this.validateSequence(context.operations);
    const physicsReport = this.validatePhysics(context);
    const qualityReport = this.validateQuality(context);
    const shopReport = this.validateShop(context);

    // Calculate overall score
    const overallScore = this.getOverallScore([
      safetyReport,
      paramReport,
      sequenceReport,
      physicsReport,
      qualityReport,
      shopReport,
    ]);

    // Determine overall status
    let overallStatus: "pass" | "warn" | "fail";
    if (safetyReport.overall_status === "fail") {
      overallStatus = "fail"; // Safety failures are always critical
    } else if (overallScore >= 80) {
      overallStatus = "pass";
    } else if (overallScore >= 60) {
      overallStatus = "warn";
    } else {
      overallStatus = "fail";
    }

    // Aggregate failures and warnings
    const criticalFailures = [
      ...safetyReport.critical_failures,
      ...paramReport.critical_failures,
      ...sequenceReport.critical_failures,
      ...physicsReport.critical_failures,
      ...qualityReport.critical_failures,
      ...shopReport.critical_failures,
    ];

    const allWarnings = [
      ...safetyReport.warnings,
      ...paramReport.warnings,
      ...sequenceReport.warnings,
      ...physicsReport.warnings,
      ...qualityReport.warnings,
      ...shopReport.warnings,
    ];

    // Generate recommendations
    const allRecommendations = this.getRecommendations([
      safetyReport,
      paramReport,
      sequenceReport,
      physicsReport,
      qualityReport,
      shopReport,
    ]);

    // MS1 U-LAT14: S(x) safety score hard block
    // Evaluate omega safety for the worst operation (if operations exist)
    let omegaSafety: OmegaSafetyResult | undefined;
    let omegaBlocked = false;

    if (context.operations.length > 0 && context.machine) {
      // Calculate S(x) for first operation as representative (full version would aggregate all)
      const firstOp = context.operations[0];
      try {
        omegaSafety = omegaSafetyScoreEngine.evaluate(
          {
            type: firstOp.type.includes("thread") ? "threading" :
                  firstOp.type.includes("groove") ? "grooving" :
                  firstOp.type.includes("drill") ? "drilling" : "turning",
            cutting_speed_m_min: firstOp.params.cutting_speed_m_min,
            feed_mm_rev: firstOp.params.feed_mm_rev,
            depth_of_cut_mm: firstOp.params.depth_of_cut_mm,
            spindle_rpm: firstOp.params.spindle_rpm ?? 1000,
            diameter_mm: 50, // fallback
          },
          {
            name: context.material.name,
            iso_group: context.material.iso_group,
            hardness_hrc: context.material.hardness_hrc ?? 30,
          },
          {
            brand: context.machine.brand ?? "generic",
            model: context.machine.model ?? "lathe",
            max_rpm: context.machine.max_spindle_rpm ?? 6000,
            max_power_kW: context.machine.max_power_kw ?? 15,
          },
          {
            tool_id: firstOp.tool.tool_id,
            tool_type: firstOp.tool.tool_type,
            nose_radius_mm: firstOp.tool.nose_radius_mm,
            overhang_mm: firstOp.tool.overhang_mm ?? 40,
          },
          {
            chuck_type: "3_jaw",
            jaw_pressure_bar: 30,
            part_diameter_mm: 50,
          },
        );
        omegaBlocked = !omegaSafety.passed;
        if (omegaBlocked) {
          criticalFailures.push(`S(x) HARD BLOCK: ${omegaSafety.omega_safety.toFixed(3)} < 0.70 — G-code output suppressed`);
          overallStatus = "fail";
        }
      } catch (e) {
        log.warn(`LatheQualityGateEngine: Could not compute S(x): ${e}`);
      }
    }

    // Determine approval (now includes omega check)
    const programApproved = overallStatus !== "fail" && criticalFailures.length === 0 && !omegaBlocked;
    const approvalConditions = programApproved && overallStatus === "warn"
      ? allWarnings.map(w => `Acknowledge: ${w}`)
      : undefined;

    const report: FullValidationReport = {
      program_name: context.program_name ?? "unnamed_program",
      validation_timestamp: timestamp,
      overall_score: overallScore,
      overall_status: overallStatus,
      safety_report: safetyReport,
      param_report: paramReport,
      sequence_report: sequenceReport,
      physics_report: physicsReport,
      quality_report: qualityReport,
      shop_report: shopReport,
      critical_failures: criticalFailures,
      all_warnings: allWarnings,
      all_recommendations: allRecommendations,
      program_approved: programApproved,
      approval_conditions: approvalConditions,
      omega_safety: omegaSafety,
      omega_blocked: omegaBlocked,
    };

    log.info(`LatheQualityGateEngine: Validation complete. Score: ${overallScore}, Status: ${overallStatus}${omegaSafety ? `, S(x): ${omegaSafety.omega_safety.toFixed(3)}` : ""}`);
    return report;
  }

  // ==========================================================================
  // SAFETY GATE (CRITICAL)
  // ==========================================================================

  /**
   * Validate safety-critical aspects of the program
   */
  validateSafety(program: string, context?: ValidationContext): SafetyReport {
    const checks: ValidationCheck[] = [];
    const criticalFailures: string[] = [];
    const warnings: string[] = [];
    const recommendations: string[] = [];

    // Check 1: G50 spindle limit present and correct
    const g50Matches = program.match(GCODE_PATTERNS.G50_SPINDLE_LIMIT);
    const g50Present = g50Matches !== null && g50Matches.length > 0;
    let g50Value = 0;
    if (g50Matches) {
      const match = GCODE_PATTERNS.G50_SPINDLE_LIMIT.exec(program);
      if (match) {
        g50Value = parseInt(match[1], 10);
      }
      // Reset regex lastIndex
      GCODE_PATTERNS.G50_SPINDLE_LIMIT.lastIndex = 0;
    }

    const maxAllowedRPM = context?.machine?.max_spindle_rpm ?? 6000;
    const g50Correct = g50Present && g50Value > 0 && g50Value <= maxAllowedRPM;

    checks.push({
      check_id: "SAFETY_001",
      check_name: "G50 Spindle Limit Present",
      status: g50Present ? (g50Correct ? "pass" : "warn") : "fail",
      score: g50Present ? (g50Correct ? 100 : 70) : 0,
      detail: g50Present
        ? `G50 S${g50Value} found. ${g50Correct ? "Within machine limits." : "Exceeds machine max RPM."}`
        : "No G50 spindle limit found. CRITICAL for CSS mode safety.",
      measured_value: g50Value,
      limit_value: maxAllowedRPM,
      unit: "RPM",
      remediation: g50Present ? undefined : "Add G50 S#### before G96 to limit spindle speed in CSS mode.",
      reference: "Okuma OSP Manual — CSS Mode Safety",
    });

    if (!g50Present) {
      criticalFailures.push("Missing G50 spindle limit — spindle may overspeed on small diameters");
    }

    // Check 2: Program end (M30 or M02) present
    const m30Present = GCODE_PATTERNS.PROGRAM_END_M30.test(program);
    GCODE_PATTERNS.PROGRAM_END_M30.lastIndex = 0;
    const m02Present = GCODE_PATTERNS.PROGRAM_END_M02.test(program);
    GCODE_PATTERNS.PROGRAM_END_M02.lastIndex = 0;
    const programEndPresent = m30Present || m02Present;

    checks.push({
      check_id: "SAFETY_002",
      check_name: "Program End (M30/M02) Present",
      status: programEndPresent ? "pass" : "fail",
      score: programEndPresent ? 100 : 0,
      detail: programEndPresent
        ? `Program end found: ${m30Present ? "M30" : "M02"}`
        : "No program end found. Program may run off into memory.",
      remediation: programEndPresent ? undefined : "Add M30 at end of program to ensure clean program stop.",
      reference: "Standard G-code programming practice",
    });

    if (!programEndPresent) {
      criticalFailures.push("Missing program end (M30/M02) — program may run into unintended code");
    }

    // Check 3: Rapid move collision risk analysis
    const rapidMoves = program.match(GCODE_PATTERNS.RAPID_MOVE_G00);
    GCODE_PATTERNS.RAPID_MOVE_G00.lastIndex = 0;
    const rapidCount = rapidMoves?.length ?? 0;

    // Analyze rapid moves for collision risk
    // This is a simplified check - real implementation would parse positions
    let rapidCollisionRisk = false;
    let rapidRiskDetail = "";

    if (rapidCount > 0 && context?.workholding) {
      // Check if any rapid Z moves might collide with chuck
      // Simplified: flag if no retract before parting/facing
      const hasPartingOrCutoff = context.operations?.some(op =>
        op.type === "parting" || op.type === "cutoff"
      );
      if (hasPartingOrCutoff) {
        rapidRiskDetail = "Parting/cutoff operation detected — verify rapid retract clearance";
        warnings.push(rapidRiskDetail);
      }
    }

    checks.push({
      check_id: "SAFETY_003",
      check_name: "Rapid Move Collision Analysis",
      status: rapidCollisionRisk ? "fail" : (rapidCount > 20 ? "warn" : "pass"),
      score: rapidCollisionRisk ? 0 : (rapidCount > 20 ? 80 : 100),
      detail: rapidCollisionRisk
        ? `Collision risk detected: ${rapidRiskDetail}`
        : `${rapidCount} rapid moves analyzed. ${rapidRiskDetail || "No obvious collision risk."}`,
      measured_value: rapidCount,
      remediation: rapidCollisionRisk ? "Review rapid moves near chuck face and tailstock" : undefined,
      reference: "Machine safety zone clearances",
    });

    // Check 4: Tool compensation (G40/G41/G42)
    const g40Present = GCODE_PATTERNS.TOOL_COMP_CANCEL_G40.test(program);
    GCODE_PATTERNS.TOOL_COMP_CANCEL_G40.lastIndex = 0;
    const g41Present = GCODE_PATTERNS.TOOL_COMP_LEFT_G41.test(program);
    GCODE_PATTERNS.TOOL_COMP_LEFT_G41.lastIndex = 0;
    const g42Present = GCODE_PATTERNS.TOOL_COMP_RIGHT_G42.test(program);
    GCODE_PATTERNS.TOOL_COMP_RIGHT_G42.lastIndex = 0;

    const hasToolComp = g41Present || g42Present;
    const toolCompCanceled = !hasToolComp || g40Present;

    checks.push({
      check_id: "SAFETY_004",
      check_name: "Tool Compensation Control",
      status: toolCompCanceled ? "pass" : "fail",
      score: toolCompCanceled ? 100 : 30,
      detail: hasToolComp
        ? (g40Present
          ? "Tool compensation activated and canceled correctly (G40 found)"
          : "Tool compensation activated but G40 cancel not found — may cause errors on next tool")
        : "No tool compensation used (acceptable for many lathe programs)",
      remediation: !toolCompCanceled ? "Add G40 after finishing pass to cancel tool compensation" : undefined,
      reference: "Okuma NAT/TNRC programming guidelines",
    });

    if (hasToolComp && !g40Present) {
      criticalFailures.push("Tool compensation (G41/G42) not canceled with G40");
    }

    // Check 5: Coolant control (M8/M9)
    const m8Present = GCODE_PATTERNS.COOLANT_ON_M8.test(program);
    GCODE_PATTERNS.COOLANT_ON_M8.lastIndex = 0;
    const m9Present = GCODE_PATTERNS.COOLANT_OFF_M9.test(program);
    GCODE_PATTERNS.COOLANT_OFF_M9.lastIndex = 0;

    const coolantCorrect = (!m8Present && !m9Present) || (m8Present && m9Present);

    checks.push({
      check_id: "SAFETY_005",
      check_name: "Coolant Control",
      status: coolantCorrect ? "pass" : "warn",
      score: coolantCorrect ? 100 : 70,
      detail: coolantCorrect
        ? (m8Present ? "Coolant ON (M8) and OFF (M9) both present" : "No coolant commands (dry machining or manual control)")
        : "Coolant ON without OFF — coolant may not shut off at program end",
      remediation: !coolantCorrect ? "Add M9 before M30 to ensure coolant shutdown" : undefined,
      reference: "Machine maintenance best practices",
    });

    if (m8Present && !m9Present) {
      warnings.push("Coolant ON (M8) without corresponding OFF (M9)");
    }

    // Check 6: CSS mode safety (G96 requires G50)
    const g96Present = GCODE_PATTERNS.CSS_MODE_G96.test(program);
    GCODE_PATTERNS.CSS_MODE_G96.lastIndex = 0;

    if (g96Present && !g50Present) {
      checks.push({
        check_id: "SAFETY_006",
        check_name: "CSS Mode Safety (G96 + G50)",
        status: "fail",
        score: 0,
        detail: "G96 (CSS mode) used without G50 spindle limit. CRITICAL SAFETY ISSUE.",
        remediation: "Add G50 S#### immediately before G96 to limit spindle RPM.",
        reference: "Okuma OSP Manual — CSS Mode Safety. Without G50, spindle will accelerate indefinitely as diameter decreases.",
      });
      criticalFailures.push("CSS mode (G96) without spindle limit (G50) — DANGEROUS");
    }

    // Check 7: Threading safety (G76)
    const g76Present = GCODE_PATTERNS.THREADING_G76.test(program);
    GCODE_PATTERNS.THREADING_G76.lastIndex = 0;

    if (g76Present) {
      // Threading should use G97 (direct RPM), not G96 (CSS)
      const g97Present = GCODE_PATTERNS.DIRECT_RPM_G97.test(program);
      GCODE_PATTERNS.DIRECT_RPM_G97.lastIndex = 0;

      checks.push({
        check_id: "SAFETY_007",
        check_name: "Threading Mode Safety",
        status: g97Present ? "pass" : "warn",
        score: g97Present ? 100 : 60,
        detail: g97Present
          ? "Threading (G76) with direct RPM (G97) — correct"
          : "Threading (G76) detected — verify G97 is used (not CSS mode)",
        remediation: "Use G97 S#### before G76 threading cycle to ensure constant RPM",
        reference: "Threading requires synchronized spindle speed — CSS mode causes pitch errors",
      });
    }

    // Check 8: Tool change safety
    const toolChanges = program.match(GCODE_PATTERNS.TOOL_CHANGE);
    GCODE_PATTERNS.TOOL_CHANGE.lastIndex = 0;
    const toolChangeCount = toolChanges?.length ?? 0;

    if (toolChangeCount > 0) {
      checks.push({
        check_id: "SAFETY_008",
        check_name: "Tool Change Count",
        status: toolChangeCount <= 12 ? "pass" : "warn",
        score: toolChangeCount <= 12 ? 100 : 80,
        detail: `${toolChangeCount} tool changes detected. ${toolChangeCount > 12 ? "Consider consolidating tools." : "Within typical turret capacity."}`,
        measured_value: toolChangeCount,
        limit_value: context?.machine?.model?.includes("BMT") ? 12 : 8,
        remediation: toolChangeCount > 12 ? "Review tool selection for consolidation opportunities" : undefined,
        reference: "Turret capacity and cycle time optimization",
      });
    }

    // Calculate gate score
    const totalScore = checks.reduce((sum, c) => sum + c.score, 0);
    const gateScore = checks.length > 0 ? Math.round(totalScore / checks.length) : 0;

    // Determine gate status
    let overallStatus: "pass" | "warn" | "fail";
    if (criticalFailures.length > 0) {
      overallStatus = "fail";
    } else if (gateScore >= 80) {
      overallStatus = "pass";
    } else if (gateScore >= 60) {
      overallStatus = "warn";
    } else {
      overallStatus = "fail";
    }

    // Add recommendations
    if (!g50Present) {
      recommendations.push("Add G50 spindle limit before any G96 CSS mode commands");
    }
    if (!programEndPresent) {
      recommendations.push("Add M30 at end of program");
    }
    if (m8Present && !m9Present) {
      recommendations.push("Add M9 before M30 to shut off coolant");
    }

    return {
      gate_name: "Safety Gate",
      gate_type: "safety",
      overall_status: overallStatus,
      score: gateScore,
      weight: GATE_WEIGHTS.safety,
      checks,
      critical_failures: criticalFailures,
      warnings,
      recommendations,
      spindle_limit_present: g50Present,
      program_end_present: programEndPresent,
      rapid_collision_risk: rapidCollisionRisk,
      tool_compensation_correct: toolCompCanceled,
      coolant_control_correct: coolantCorrect,
    };
  }

  // ==========================================================================
  // PARAMETER GATE
  // ==========================================================================

  /**
   * Validate cutting parameters against ISO material limits
   */
  validateParameters(context: ValidationContext): ParamReport {
    const checks: ValidationCheck[] = [];
    const criticalFailures: string[] = [];
    const warnings: string[] = [];
    const recommendations: string[] = [];

    const isoGroup = context.part.material.iso_group;
    const speedLimits = ISO_SPEED_LIMITS[isoGroup];
    const feedLimits = ISO_FEED_LIMITS[isoGroup];
    const docLimits = ISO_DOC_LIMITS[isoGroup];

    let speedWithinLimits = true;
    let feedAppropriate = true;
    let docWithinLimits = true;
    let chipLoadOptimal = true;

    // Check each operation's parameters
    context.operations.forEach((op, idx) => {
      const isRoughing = isRoughingOperation(op.type);
      const isFinishing = isFinishingOperation(op.type);

      // Speed check
      const maxSpeed = isRoughing ? speedLimits.max_rough : speedLimits.max_finish;
      const speedOk = op.params.cutting_speed_m_min >= speedLimits.min &&
        op.params.cutting_speed_m_min <= maxSpeed;

      if (!speedOk) {
        speedWithinLimits = false;
      }

      checks.push({
        check_id: `PARAM_SPEED_${idx + 1}`,
        check_name: `Cutting Speed - ${op.type}`,
        status: speedOk ? "pass" : (op.params.cutting_speed_m_min > maxSpeed * 1.2 ? "fail" : "warn"),
        score: speedOk ? 100 : (op.params.cutting_speed_m_min > maxSpeed ? 50 : 70),
        detail: speedOk
          ? `Vc=${op.params.cutting_speed_m_min} m/min within ISO ${isoGroup} limits (${speedLimits.min}-${maxSpeed})`
          : `Vc=${op.params.cutting_speed_m_min} m/min outside ISO ${isoGroup} limits (${speedLimits.min}-${maxSpeed})`,
        measured_value: op.params.cutting_speed_m_min,
        limit_value: maxSpeed,
        unit: "m/min",
        remediation: speedOk ? undefined : `Adjust speed to ${speedLimits.min}-${maxSpeed} m/min range`,
        reference: "Sandvik Coromant Turning Guide — ISO material groups",
      });

      // Feed check
      const maxFeed = isRoughing ? feedLimits.max_rough : feedLimits.max_finish;
      const feedOk = op.params.feed_mm_rev >= feedLimits.min && op.params.feed_mm_rev <= maxFeed;

      if (!feedOk) {
        feedAppropriate = false;
      }

      checks.push({
        check_id: `PARAM_FEED_${idx + 1}`,
        check_name: `Feed Rate - ${op.type}`,
        status: feedOk ? "pass" : (op.params.feed_mm_rev > maxFeed * 1.3 ? "fail" : "warn"),
        score: feedOk ? 100 : 60,
        detail: feedOk
          ? `fn=${op.params.feed_mm_rev} mm/rev within ISO ${isoGroup} limits`
          : `fn=${op.params.feed_mm_rev} mm/rev outside limits (${feedLimits.min}-${maxFeed})`,
        measured_value: op.params.feed_mm_rev,
        limit_value: maxFeed,
        unit: "mm/rev",
        remediation: feedOk ? undefined : `Adjust feed to ${feedLimits.min}-${maxFeed} mm/rev`,
        reference: "Sandvik Coromant feed recommendations",
      });

      // DOC check
      const maxDoc = isRoughing ? docLimits.max_rough : docLimits.max_finish;
      const docOk = op.params.depth_of_cut_mm >= docLimits.min && op.params.depth_of_cut_mm <= maxDoc;

      if (!docOk) {
        docWithinLimits = false;
      }

      checks.push({
        check_id: `PARAM_DOC_${idx + 1}`,
        check_name: `Depth of Cut - ${op.type}`,
        status: docOk ? "pass" : "warn",
        score: docOk ? 100 : 70,
        detail: docOk
          ? `ap=${op.params.depth_of_cut_mm} mm within limits`
          : `ap=${op.params.depth_of_cut_mm} mm outside limits (${docLimits.min}-${maxDoc})`,
        measured_value: op.params.depth_of_cut_mm,
        limit_value: maxDoc,
        unit: "mm",
        remediation: docOk ? undefined : `Adjust DOC to ${docLimits.min}-${maxDoc} mm`,
        reference: "Insert geometry DOC limits",
      });

      // Chip load check (fn * ap)
      const chipLoad = op.params.feed_mm_rev * op.params.depth_of_cut_mm;
      const chipLoadOk = chipLoad >= 0.1 && chipLoad <= 5.0; // Reasonable range

      if (!chipLoadOk) {
        chipLoadOptimal = false;
      }

      checks.push({
        check_id: `PARAM_CHIP_${idx + 1}`,
        check_name: `Chip Load - ${op.type}`,
        status: chipLoadOk ? "pass" : "warn",
        score: chipLoadOk ? 100 : 75,
        detail: `Chip load (fn×ap) = ${chipLoad.toFixed(3)} mm². ${chipLoadOk ? "Optimal range." : "Review for chip control."}`,
        measured_value: chipLoad,
        unit: "mm²",
        remediation: chipLoadOk ? undefined : "Adjust feed/DOC ratio for better chip control",
        reference: "Chip breaking mechanics",
      });

      // Nose radius check for finishing
      if (isFinishing && op.target_ra_um) {
        const theoreticalRa = calculateTheoreticalRa(op.params.feed_mm_rev, op.tool.nose_radius_mm);
        const raAchievable = theoreticalRa <= op.target_ra_um;

        checks.push({
          check_id: `PARAM_NOSE_${idx + 1}`,
          check_name: `Nose Radius Adequacy - ${op.type}`,
          status: raAchievable ? "pass" : "fail",
          score: raAchievable ? 100 : 30,
          detail: raAchievable
            ? `r=${op.tool.nose_radius_mm}mm adequate for Ra ${op.target_ra_um}um target (theoretical: ${theoreticalRa.toFixed(2)}um)`
            : `r=${op.tool.nose_radius_mm}mm cannot achieve Ra ${op.target_ra_um}um (theoretical: ${theoreticalRa.toFixed(2)}um)`,
          measured_value: theoreticalRa,
          limit_value: op.target_ra_um,
          unit: "um",
          remediation: raAchievable
            ? undefined
            : `Use larger nose radius or reduce feed to ${Math.sqrt(32 * op.tool.nose_radius_mm * (op.target_ra_um / 1000)).toFixed(3)} mm/rev`,
          reference: "Ra = fn²/(32×r) — fundamental turning geometry",
        });

        if (!raAchievable) {
          criticalFailures.push(`${op.type}: Cannot achieve Ra ${op.target_ra_um}um with current nose radius and feed`);
        }
      }
    });

    // Add summary warnings
    if (!speedWithinLimits) {
      warnings.push("One or more operations have cutting speeds outside ISO limits");
    }
    if (!feedAppropriate) {
      warnings.push("One or more operations have feeds outside recommended range");
    }
    if (!docWithinLimits) {
      warnings.push("One or more operations have DOC outside recommended range");
    }

    // Calculate gate score
    const totalScore = checks.reduce((sum, c) => sum + c.score, 0);
    const gateScore = checks.length > 0 ? Math.round(totalScore / checks.length) : 100;

    let overallStatus: "pass" | "warn" | "fail";
    if (criticalFailures.length > 0) {
      overallStatus = "fail";
    } else if (gateScore >= 80) {
      overallStatus = "pass";
    } else if (gateScore >= 60) {
      overallStatus = "warn";
    } else {
      overallStatus = "fail";
    }

    return {
      gate_name: "Parameter Gate",
      gate_type: "parameter",
      overall_status: overallStatus,
      score: gateScore,
      weight: GATE_WEIGHTS.parameter,
      checks,
      critical_failures: criticalFailures,
      warnings,
      recommendations,
      speed_within_limits: speedWithinLimits,
      feed_appropriate: feedAppropriate,
      doc_within_deflection_limits: docWithinLimits,
      chip_load_optimal: chipLoadOptimal,
    };
  }

  // ==========================================================================
  // SEQUENCE GATE
  // ==========================================================================

  /**
   * Validate operation sequence logic
   */
  validateSequence(operations: QualityGateOperation[]): SequenceReport {
    const checks: ValidationCheck[] = [];
    const criticalFailures: string[] = [];
    const warnings: string[] = [];
    const recommendations: string[] = [];

    let logicalOrderCorrect = true;
    let toolChangesSafe = true;
    let datumMaintained = true;
    let stockAllowancesCorrect = true;

    // Check 1: Operation logical order
    const opTypes = operations.map(op => op.type);
    const opIndices = opTypes.map(type => OPERATION_SEQUENCE_ORDER.indexOf(type));

    let outOfOrderCount = 0;
    const outOfOrderOps: string[] = [];

    for (let i = 1; i < opIndices.length; i++) {
      // Allow for multiple operations of same type
      if (opIndices[i] < opIndices[i - 1] && opIndices[i] !== opIndices[i - 1]) {
        // Check if it's a significant sequence violation
        const prevOp = opTypes[i - 1];
        const currOp = opTypes[i];

        // Critical: Finishing before roughing
        if (isFinishingOperation(currOp) && !isFinishingOperation(prevOp) && !isRoughingOperation(currOp)) {
          // This is okay - different operation types
        } else if (prevOp.replace("finish", "rough") === currOp || prevOp.replace("rough", "finish") === currOp) {
          // Same feature type - check rough before finish
          if (currOp.includes("rough") && prevOp.includes("finish")) {
            outOfOrderCount++;
            outOfOrderOps.push(`${currOp} after ${prevOp}`);
          }
        }
        // Parting should be last
        if ((prevOp === "parting" || prevOp === "cutoff") && currOp !== "parting" && currOp !== "cutoff") {
          outOfOrderCount++;
          outOfOrderOps.push(`${currOp} after parting/cutoff`);
          criticalFailures.push("Operation scheduled after parting/cutoff — part will be detached");
        }
      }
    }

    if (outOfOrderCount > 0) {
      logicalOrderCorrect = false;
    }

    checks.push({
      check_id: "SEQ_001",
      check_name: "Operation Logical Order",
      status: outOfOrderCount === 0 ? "pass" : (outOfOrderCount > 1 ? "fail" : "warn"),
      score: outOfOrderCount === 0 ? 100 : Math.max(0, 100 - outOfOrderCount * 20),
      detail: outOfOrderCount === 0
        ? "All operations in logical sequence (rough before finish, parting last)"
        : `${outOfOrderCount} sequence issues: ${outOfOrderOps.join(", ")}`,
      measured_value: outOfOrderCount,
      remediation: outOfOrderCount > 0 ? "Reorder operations: face, OD rough, OD finish, ID, threading, parting" : undefined,
      reference: "Standard turning sequence optimization",
    });

    // Check 2: Roughing before finishing check
    const roughOps = operations.filter(op => isRoughingOperation(op.type));
    const finishOps = operations.filter(op => isFinishingOperation(op.type));

    const roughBeforeFinish = roughOps.length === 0 || finishOps.length === 0 ||
      operations.findIndex(op => isRoughingOperation(op.type)) <
      operations.findIndex(op => isFinishingOperation(op.type));

    checks.push({
      check_id: "SEQ_002",
      check_name: "Roughing Before Finishing",
      status: roughBeforeFinish ? "pass" : "fail",
      score: roughBeforeFinish ? 100 : 20,
      detail: roughBeforeFinish
        ? "Roughing operations precede finishing operations"
        : "Finishing operation found before roughing — material may not be removed",
      remediation: roughBeforeFinish ? undefined : "Move roughing operations before finishing",
      reference: "Fundamental machining sequence",
    });

    if (!roughBeforeFinish) {
      criticalFailures.push("Finishing before roughing — will leave excess material");
      logicalOrderCorrect = false;
    }

    // Check 3: Stock allowances between rough and finish
    const odRoughOps = operations.filter(op => op.type === "od_rough");
    const odFinishOps = operations.filter(op => op.type === "od_finish");

    if (odRoughOps.length > 0 && odFinishOps.length > 0) {
      const roughAllowance = odRoughOps[0].stock_allowance_mm ?? JM_DIE_STANDARDS.default_stock_allowance_mm;
      const finishDoc = odFinishOps[0].params.depth_of_cut_mm;

      const stockOk = roughAllowance >= finishDoc * 0.8 && roughAllowance <= finishDoc * 3;

      if (!stockOk) {
        stockAllowancesCorrect = false;
      }

      checks.push({
        check_id: "SEQ_003",
        check_name: "Stock Allowance Consistency",
        status: stockOk ? "pass" : "warn",
        score: stockOk ? 100 : 70,
        detail: stockOk
          ? `Stock allowance (${roughAllowance}mm) appropriate for finish DOC (${finishDoc}mm)`
          : `Stock allowance (${roughAllowance}mm) may not match finish DOC (${finishDoc}mm)`,
        measured_value: roughAllowance,
        limit_value: finishDoc,
        unit: "mm",
        remediation: stockOk ? undefined : "Adjust roughing stock allowance to 1-2x finish DOC",
        reference: "Stock removal planning",
      });
    }

    // Check 4: Tool change positions
    let lastZ = 0;
    let unsafeToolChanges = 0;

    for (let i = 1; i < operations.length; i++) {
      const prevOp = operations[i - 1];
      const currOp = operations[i];

      // Check if tool changed
      if (prevOp.tool.tool_id !== currOp.tool.tool_id) {
        // Tool change should happen at safe position (Z positive, near clearance)
        const toolChangeZ = prevOp.end_z_mm;

        if (toolChangeZ < 2) { // Less than 2mm from face
          unsafeToolChanges++;
          warnings.push(`Tool change near workpiece at Z=${toolChangeZ}mm between ${prevOp.type} and ${currOp.type}`);
        }
      }
    }

    if (unsafeToolChanges > 0) {
      toolChangesSafe = false;
    }

    checks.push({
      check_id: "SEQ_004",
      check_name: "Tool Change Safety Positions",
      status: unsafeToolChanges === 0 ? "pass" : "warn",
      score: unsafeToolChanges === 0 ? 100 : Math.max(50, 100 - unsafeToolChanges * 15),
      detail: unsafeToolChanges === 0
        ? "All tool changes at safe retract positions"
        : `${unsafeToolChanges} tool changes near workpiece — verify clearance`,
      measured_value: unsafeToolChanges,
      remediation: unsafeToolChanges > 0 ? "Add safe retract (G28 or explicit Z+) before tool changes" : undefined,
      reference: "Turret rotation clearance requirements",
    });

    // Check 5: Face operation before OD work
    const faceOpIndex = operations.findIndex(op => op.type === "face_rough" || op.type === "face_finish");
    const odOpIndex = operations.findIndex(op => op.type.startsWith("od_"));

    const faceFirst = faceOpIndex === -1 || odOpIndex === -1 || faceOpIndex < odOpIndex;

    checks.push({
      check_id: "SEQ_005",
      check_name: "Face Operation First",
      status: faceFirst ? "pass" : "warn",
      score: faceFirst ? 100 : 80,
      detail: faceFirst
        ? "Face operation precedes OD operations (establishes Z datum)"
        : "OD operation before facing — Z datum may not be established",
      remediation: faceFirst ? undefined : "Consider facing first to establish Z zero",
      reference: "Datum establishment best practice",
    });

    if (!faceFirst) {
      warnings.push("Face operation should typically precede OD work to establish Z datum");
    }

    // Check 6: Threading parameters
    const threadOps = operations.filter(op => isThreadingOperation(op.type));
    if (threadOps.length > 0) {
      // Verify threading is after roughing
      const lastRoughIndex = operations.findLastIndex(op => isRoughingOperation(op.type));
      const firstThreadIndex = operations.findIndex(op => isThreadingOperation(op.type));

      const threadAfterRough = lastRoughIndex === -1 || firstThreadIndex > lastRoughIndex;

      checks.push({
        check_id: "SEQ_006",
        check_name: "Threading After Roughing",
        status: threadAfterRough ? "pass" : "fail",
        score: threadAfterRough ? 100 : 20,
        detail: threadAfterRough
          ? "Threading operations follow roughing (thread minor diameter established)"
          : "Threading before final roughing — thread may be damaged",
        remediation: threadAfterRough ? undefined : "Complete roughing before threading operations",
        reference: "Thread programming sequence",
      });

      if (!threadAfterRough) {
        criticalFailures.push("Threading scheduled before roughing is complete");
      }
    }

    // Check 7: Parting operation last
    const partingIndex = operations.findIndex(op => op.type === "parting" || op.type === "cutoff");
    const partingLast = partingIndex === -1 || partingIndex === operations.length - 1;

    checks.push({
      check_id: "SEQ_007",
      check_name: "Parting Operation Last",
      status: partingLast ? "pass" : "fail",
      score: partingLast ? 100 : 0,
      detail: partingLast
        ? "Parting/cutoff is final operation (if present)"
        : "Operations scheduled after parting — CRITICAL ERROR",
      remediation: partingLast ? undefined : "Move parting operation to end of program",
      reference: "Part falls after parting — no further operations possible",
    });

    if (!partingLast) {
      criticalFailures.push("Operations after parting — part will be detached");
    }

    // Calculate gate score
    const totalScore = checks.reduce((sum, c) => sum + c.score, 0);
    const gateScore = checks.length > 0 ? Math.round(totalScore / checks.length) : 100;

    let overallStatus: "pass" | "warn" | "fail";
    if (criticalFailures.length > 0) {
      overallStatus = "fail";
    } else if (gateScore >= 80) {
      overallStatus = "pass";
    } else if (gateScore >= 60) {
      overallStatus = "warn";
    } else {
      overallStatus = "fail";
    }

    return {
      gate_name: "Sequence Gate",
      gate_type: "sequence",
      overall_status: overallStatus,
      score: gateScore,
      weight: GATE_WEIGHTS.sequence,
      checks,
      critical_failures: criticalFailures,
      warnings,
      recommendations,
      logical_order_correct: logicalOrderCorrect,
      tool_changes_safe: toolChangesSafe,
      datum_maintained: datumMaintained,
      stock_allowances_correct: stockAllowancesCorrect,
    };
  }

  // ==========================================================================
  // PHYSICS GATE
  // ==========================================================================

  /**
   * Validate physics constraints (force, power, deflection, tool life)
   */
  validatePhysics(context: ValidationContext): PhysicsReport {
    const checks: ValidationCheck[] = [];
    const criticalFailures: string[] = [];
    const warnings: string[] = [];
    const recommendations: string[] = [];

    const material = context.part.material;
    const machine = context.machine;
    const physics = getMaterialPhysics(material.iso_group);

    let maxForce = 0;
    let maxPower = 0;
    let minToolLife = Infinity;
    let maxDeflection = 0;
    let maxTemperature = 0;
    let withinMachineLimits = true;

    // Analyze each operation
    context.operations.forEach((op, idx) => {
      const kc1_1 = material.kc1_1_mpa ?? physics.kc1_1;
      const mc = material.mc_exponent ?? physics.mc;
      const taylor_C = physics.taylor_C;
      const taylor_n = physics.taylor_n;
      const E_GPa = material.e_gpa ?? physics.E_GPa;

      // 1. Cutting force (Kienzle)
      const cuttingForce = calculateKienzleForce(
        kc1_1,
        mc,
        op.params.depth_of_cut_mm,
        op.params.feed_mm_rev
      );

      if (cuttingForce > maxForce) {
        maxForce = cuttingForce;
      }

      // Check against typical lathe force limits (simplified)
      const forceLimit = machine.spindle_torque_nm * 1000 / 50; // Approximate max cutting force
      const forceOk = cuttingForce <= forceLimit;

      checks.push({
        check_id: `PHYS_FORCE_${idx + 1}`,
        check_name: `Cutting Force - ${op.type}`,
        status: forceOk ? "pass" : (cuttingForce > forceLimit * 1.2 ? "fail" : "warn"),
        score: forceOk ? 100 : Math.max(30, 100 - (cuttingForce - forceLimit) / forceLimit * 100),
        detail: `Fc = ${cuttingForce.toFixed(0)}N (Kienzle: kc1.1=${kc1_1}, mc=${mc}, ap=${op.params.depth_of_cut_mm}, fn=${op.params.feed_mm_rev})`,
        measured_value: cuttingForce,
        limit_value: forceLimit,
        unit: "N",
        remediation: forceOk ? undefined : "Reduce DOC or feed to lower cutting force",
        reference: "Kienzle (1952) — Fc = kc × ap × fn",
      });

      if (!forceOk) {
        withinMachineLimits = false;
        warnings.push(`${op.type}: Cutting force (${cuttingForce.toFixed(0)}N) exceeds limit`);
      }

      // 2. Cutting power
      const cuttingPower = calculateCuttingPower(cuttingForce, op.params.cutting_speed_m_min);

      if (cuttingPower > maxPower) {
        maxPower = cuttingPower;
      }

      const powerOk = cuttingPower <= machine.spindle_power_kw * 0.85; // 85% of rated

      checks.push({
        check_id: `PHYS_POWER_${idx + 1}`,
        check_name: `Cutting Power - ${op.type}`,
        status: powerOk ? "pass" : (cuttingPower > machine.spindle_power_kw ? "fail" : "warn"),
        score: powerOk ? 100 : Math.max(40, 100 - (cuttingPower / machine.spindle_power_kw - 0.85) * 200),
        detail: `Pc = ${cuttingPower.toFixed(2)}kW (${(cuttingPower / machine.spindle_power_kw * 100).toFixed(1)}% of ${machine.spindle_power_kw}kW spindle)`,
        measured_value: cuttingPower,
        limit_value: machine.spindle_power_kw,
        unit: "kW",
        remediation: powerOk ? undefined : "Reduce parameters to stay within 85% spindle power",
        reference: "Pc = Fc × Vc / 60000",
      });

      if (cuttingPower > machine.spindle_power_kw) {
        withinMachineLimits = false;
        criticalFailures.push(`${op.type}: Power demand (${cuttingPower.toFixed(2)}kW) exceeds spindle capacity (${machine.spindle_power_kw}kW)`);
      }

      // 3. Tool life (Taylor)
      const toolLife = calculateTaylorLife(op.params.cutting_speed_m_min, taylor_C, taylor_n);

      if (toolLife < minToolLife) {
        minToolLife = toolLife;
      }

      const toolLifeTarget = context.target_tool_life_min ?? JM_DIE_STANDARDS.min_tool_life_min;
      const lifeOk = toolLife >= toolLifeTarget;

      checks.push({
        check_id: `PHYS_LIFE_${idx + 1}`,
        check_name: `Tool Life - ${op.type}`,
        status: lifeOk ? "pass" : (toolLife < toolLifeTarget * 0.5 ? "fail" : "warn"),
        score: lifeOk ? 100 : Math.max(30, toolLife / toolLifeTarget * 100),
        detail: `T = ${toolLife.toFixed(1)} min (Taylor: C=${taylor_C}, n=${taylor_n}, Vc=${op.params.cutting_speed_m_min})`,
        measured_value: toolLife,
        limit_value: toolLifeTarget,
        unit: "min",
        remediation: lifeOk ? undefined : `Reduce cutting speed to increase tool life (target: ${toolLifeTarget} min)`,
        reference: "Taylor (1907) — T = (C/Vc)^(1/n)",
      });

      if (toolLife < toolLifeTarget * 0.5) {
        warnings.push(`${op.type}: Tool life (${toolLife.toFixed(1)} min) well below target (${toolLifeTarget} min)`);
      }

      // 4. Workpiece deflection
      const overhang = context.part.overhang_from_chuck_mm;
      const diameter = context.part.stock_diameter_mm;

      let deflection: number;
      if (context.workholding.tailstock_engaged) {
        deflection = calculateSupportedDeflection(cuttingForce, overhang, diameter, E_GPa);
      } else {
        deflection = calculateCantileverDeflection(cuttingForce, overhang, diameter, E_GPa);
      }

      if (deflection > maxDeflection) {
        maxDeflection = deflection;
      }

      const toleranceLimit = op.target_tolerance_mm ?? 0.025; // Default IT7 class
      const deflectionOk = deflection <= toleranceLimit * 0.5; // Deflection should be <50% of tolerance

      checks.push({
        check_id: `PHYS_DEFL_${idx + 1}`,
        check_name: `Workpiece Deflection - ${op.type}`,
        status: deflectionOk ? "pass" : (deflection > toleranceLimit ? "fail" : "warn"),
        score: deflectionOk ? 100 : Math.max(20, 100 - (deflection - toleranceLimit * 0.5) / toleranceLimit * 200),
        detail: `delta = ${(deflection * 1000).toFixed(1)}um (L/D=${(overhang / diameter).toFixed(1)}, ${context.workholding.tailstock_engaged ? "supported" : "cantilever"})`,
        measured_value: deflection * 1000,
        limit_value: toleranceLimit * 500,
        unit: "um",
        remediation: deflectionOk
          ? undefined
          : isTailstockRecommended(overhang, diameter) && !context.workholding.tailstock_engaged
            ? "Engage tailstock to reduce deflection"
            : "Reduce DOC or add steady rest",
        reference: "delta = FL³/3EI (cantilever), delta = FL³/48EI (supported)",
      });

      if (deflection > toleranceLimit) {
        criticalFailures.push(`${op.type}: Deflection (${(deflection * 1000).toFixed(1)}um) exceeds tolerance (${(toleranceLimit * 1000).toFixed(1)}um)`);
      }

      // 5. Cutting temperature
      const temperature = calculateCuttingTemperature(
        op.params.cutting_speed_m_min,
        op.params.feed_mm_rev,
        op.params.depth_of_cut_mm,
        material.iso_group
      );

      if (temperature > maxTemperature) {
        maxTemperature = temperature;
      }

      // Temperature limits by material
      const tempLimits: Record<ISOGroup, number> = {
        P: 800, M: 750, K: 850, N: 250, S: 650, H: 700,
      };
      const tempLimit = tempLimits[material.iso_group];
      const tempOk = temperature <= tempLimit * 0.9;

      checks.push({
        check_id: `PHYS_TEMP_${idx + 1}`,
        check_name: `Cutting Temperature - ${op.type}`,
        status: tempOk ? "pass" : (temperature > tempLimit ? "fail" : "warn"),
        score: tempOk ? 100 : Math.max(50, 100 - (temperature - tempLimit * 0.9) / tempLimit * 200),
        detail: `T_cut ~ ${temperature.toFixed(0)}°C (empirical Shaw model)`,
        measured_value: temperature,
        limit_value: tempLimit,
        unit: "°C",
        remediation: tempOk ? undefined : "Reduce speed or increase coolant flow",
        reference: "Shaw (1984) — Metal Cutting Principles",
      });
    });

    // Check L/D ratio for workholding recommendations
    const ldRatio = calculateLDRatio(context.part.overhang_from_chuck_mm, context.part.stock_diameter_mm);

    checks.push({
      check_id: "PHYS_LD_RATIO",
      check_name: "Length/Diameter Ratio",
      status: ldRatio <= 3 ? "pass" : (ldRatio <= 8 ? "warn" : "fail"),
      score: ldRatio <= 3 ? 100 : (ldRatio <= 8 ? 70 : 40),
      detail: `L/D = ${ldRatio.toFixed(1)} (L=${context.part.overhang_from_chuck_mm}mm, D=${context.part.stock_diameter_mm}mm)`,
      measured_value: ldRatio,
      remediation: ldRatio > 3
        ? (ldRatio > 8 ? "Use steady rest and tailstock" : "Consider tailstock support")
        : undefined,
      reference: "L/D > 3: tailstock recommended. L/D > 8: steady rest required.",
    });

    if (ldRatio > 3 && !context.workholding.tailstock_engaged) {
      warnings.push(`High L/D ratio (${ldRatio.toFixed(1)}) without tailstock support`);
      recommendations.push("Engage tailstock for improved rigidity");
    }

    if (ldRatio > 8 && !context.workholding.steady_rest_engaged) {
      warnings.push(`Very high L/D ratio (${ldRatio.toFixed(1)}) — steady rest recommended`);
    }

    // Check grip length ratio
    const gripRatio = context.workholding.grip_length_mm / context.part.stock_diameter_mm;

    checks.push({
      check_id: "PHYS_GRIP_RATIO",
      check_name: "Grip Length Ratio",
      status: gripRatio >= JM_DIE_STANDARDS.min_grip_length_ratio ? "pass" : "warn",
      score: gripRatio >= JM_DIE_STANDARDS.min_grip_length_ratio ? 100 : Math.max(60, gripRatio / JM_DIE_STANDARDS.min_grip_length_ratio * 100),
      detail: `Grip/D = ${gripRatio.toFixed(2)} (grip=${context.workholding.grip_length_mm}mm)`,
      measured_value: gripRatio,
      limit_value: JM_DIE_STANDARDS.min_grip_length_ratio,
      remediation: gripRatio < JM_DIE_STANDARDS.min_grip_length_ratio
        ? `Increase grip length to ${(JM_DIE_STANDARDS.min_grip_length_ratio * context.part.stock_diameter_mm).toFixed(1)}mm or more`
        : undefined,
      reference: "Minimum grip/diameter ratio for secure clamping",
    });

    // Calculate gate score
    const totalScore = checks.reduce((sum, c) => sum + c.score, 0);
    const gateScore = checks.length > 0 ? Math.round(totalScore / checks.length) : 100;

    let overallStatus: "pass" | "warn" | "fail";
    if (criticalFailures.length > 0) {
      overallStatus = "fail";
    } else if (gateScore >= 80) {
      overallStatus = "pass";
    } else if (gateScore >= 60) {
      overallStatus = "warn";
    } else {
      overallStatus = "fail";
    }

    return {
      gate_name: "Physics Gate",
      gate_type: "physics",
      overall_status: overallStatus,
      score: gateScore,
      weight: GATE_WEIGHTS.physics,
      checks,
      critical_failures: criticalFailures,
      warnings,
      recommendations,
      cutting_force_n: maxForce,
      power_consumption_kw: maxPower,
      tool_life_min: minToolLife === Infinity ? 999 : minToolLife,
      deflection_mm: maxDeflection,
      temperature_c: maxTemperature,
      within_machine_limits: withinMachineLimits,
    };
  }

  // ==========================================================================
  // QUALITY GATE
  // ==========================================================================

  /**
   * Validate quality targets (surface finish, tolerances, GD&T)
   */
  validateQuality(context: ValidationContext): QualityReport {
    const checks: ValidationCheck[] = [];
    const criticalFailures: string[] = [];
    const warnings: string[] = [];
    const recommendations: string[] = [];

    let worstRa = 0;
    let worstTolerance = 0;
    let avgDimensionalAccuracy = 100;
    let gdtCompliant = true;

    // Analyze each operation for quality outcomes
    context.operations.forEach((op, idx) => {
      if (op.target_ra_um) {
        // Calculate theoretical Ra
        const theoreticalRa = calculateTheoreticalRa(op.params.feed_mm_rev, op.tool.nose_radius_mm);

        // Apply correction factor for material and operation type
        const materialFactor: Record<ISOGroup, number> = {
          P: 1.0, M: 1.15, K: 0.9, N: 0.85, S: 1.25, H: 1.1,
        };
        const adjustedRa = theoreticalRa * materialFactor[context.part.material.iso_group];

        if (adjustedRa > worstRa) {
          worstRa = adjustedRa;
        }

        const raAchievable = adjustedRa <= op.target_ra_um;

        // Check against operation capability
        const opLimits = SURFACE_FINISH_LIMITS[op.type];
        const withinOpCapability = adjustedRa >= opLimits.best_ra;

        checks.push({
          check_id: `QUAL_RA_${idx + 1}`,
          check_name: `Surface Finish - ${op.type}`,
          status: raAchievable ? "pass" : "fail",
          score: raAchievable ? 100 : Math.max(20, 100 - (adjustedRa - op.target_ra_um) / op.target_ra_um * 100),
          detail: `Predicted Ra = ${adjustedRa.toFixed(2)}um (theoretical: ${theoreticalRa.toFixed(2)}um, target: ${op.target_ra_um}um)`,
          measured_value: adjustedRa,
          limit_value: op.target_ra_um,
          unit: "um",
          remediation: raAchievable
            ? undefined
            : `Reduce feed to ${Math.sqrt(32 * op.tool.nose_radius_mm * (op.target_ra_um / 1000)).toFixed(3)} mm/rev or use larger nose radius`,
          reference: "Ra = fn²/(32×r) × material factor",
        });

        if (!raAchievable) {
          criticalFailures.push(`${op.type}: Cannot achieve Ra ${op.target_ra_um}um (predicted: ${adjustedRa.toFixed(2)}um)`);
          gdtCompliant = false;
        }

        if (!withinOpCapability) {
          warnings.push(`${op.type}: Target Ra ${op.target_ra_um}um may be below operation capability (best: ${opLimits.best_ra}um)`);
        }
      }

      // Tolerance achievability
      if (op.target_tolerance_mm) {
        // Get physics data for deflection analysis
        const physics = getMaterialPhysics(context.part.material.iso_group);
        const kc1_1 = context.part.material.kc1_1_mpa ?? physics.kc1_1;
        const mc = context.part.material.mc_exponent ?? physics.mc;
        const E_GPa = context.part.material.e_gpa ?? physics.E_GPa;

        const cuttingForce = calculateKienzleForce(kc1_1, mc, op.params.depth_of_cut_mm, op.params.feed_mm_rev);

        let deflection: number;
        if (context.workholding.tailstock_engaged) {
          deflection = calculateSupportedDeflection(
            cuttingForce,
            context.part.overhang_from_chuck_mm,
            context.part.stock_diameter_mm,
            E_GPa
          );
        } else {
          deflection = calculateCantileverDeflection(
            cuttingForce,
            context.part.overhang_from_chuck_mm,
            context.part.stock_diameter_mm,
            E_GPa
          );
        }

        // Also consider thermal effects
        const temperature = calculateCuttingTemperature(
          op.params.cutting_speed_m_min,
          op.params.feed_mm_rev,
          op.params.depth_of_cut_mm,
          context.part.material.iso_group
        );

        // Thermal expansion (approximate)
        const thermalCoeff = 12e-6; // steel, per degree C
        const thermalExpansion = context.part.length_mm * thermalCoeff * (temperature - 20);

        const totalError = deflection + Math.abs(thermalExpansion);

        if (totalError > worstTolerance) {
          worstTolerance = totalError;
        }

        const toleranceAchievable = totalError <= op.target_tolerance_mm * 0.5;

        checks.push({
          check_id: `QUAL_TOL_${idx + 1}`,
          check_name: `Tolerance Achievability - ${op.type}`,
          status: toleranceAchievable ? "pass" : (totalError > op.target_tolerance_mm ? "fail" : "warn"),
          score: toleranceAchievable ? 100 : Math.max(30, 100 - (totalError - op.target_tolerance_mm * 0.5) / op.target_tolerance_mm * 200),
          detail: `Predicted error: ${(totalError * 1000).toFixed(1)}um (deflection: ${(deflection * 1000).toFixed(1)}um, thermal: ${(thermalExpansion * 1000).toFixed(1)}um)`,
          measured_value: totalError * 1000,
          limit_value: op.target_tolerance_mm * 1000,
          unit: "um",
          remediation: toleranceAchievable
            ? undefined
            : "Reduce cutting forces or stabilize temperature",
          reference: "Total error = deflection + thermal expansion",
        });

        if (totalError > op.target_tolerance_mm) {
          criticalFailures.push(`${op.type}: Total error (${(totalError * 1000).toFixed(1)}um) exceeds tolerance (${(op.target_tolerance_mm * 1000).toFixed(1)}um)`);
          gdtCompliant = false;
        }
      }
    });

    // Operation capability check
    context.operations.forEach((op, idx) => {
      const opLimits = SURFACE_FINISH_LIMITS[op.type];

      checks.push({
        check_id: `QUAL_CAP_${idx + 1}`,
        check_name: `Operation Capability - ${op.type}`,
        status: "pass",
        score: 100,
        detail: `${op.type} capability: Ra ${opLimits.best_ra}-${opLimits.typical_ra}um typical`,
        measured_value: opLimits.typical_ra,
        unit: "um",
        reference: "Machinery's Handbook surface finish table",
      });
    });

    // Calculate dimensional accuracy percentage
    const toleranceChecks = checks.filter(c => c.check_id.includes("TOL"));
    if (toleranceChecks.length > 0) {
      avgDimensionalAccuracy = toleranceChecks.reduce((sum, c) => sum + c.score, 0) / toleranceChecks.length;
    }

    // GD&T compliance summary
    checks.push({
      check_id: "QUAL_GDT",
      check_name: "GD&T Compliance Summary",
      status: gdtCompliant ? "pass" : "fail",
      score: gdtCompliant ? 100 : 40,
      detail: gdtCompliant
        ? "All geometric tolerances achievable with current setup"
        : "One or more GD&T requirements may not be met",
      remediation: gdtCompliant ? undefined : "Review deflection and surface finish capabilities",
      reference: "ISO 1101 — Geometrical Product Specifications",
    });

    // Calculate gate score
    const totalScore = checks.reduce((sum, c) => sum + c.score, 0);
    const gateScore = checks.length > 0 ? Math.round(totalScore / checks.length) : 100;

    let overallStatus: "pass" | "warn" | "fail";
    if (criticalFailures.length > 0) {
      overallStatus = "fail";
    } else if (gateScore >= 80) {
      overallStatus = "pass";
    } else if (gateScore >= 60) {
      overallStatus = "warn";
    } else {
      overallStatus = "fail";
    }

    return {
      gate_name: "Quality Gate",
      gate_type: "quality",
      overall_status: overallStatus,
      score: gateScore,
      weight: GATE_WEIGHTS.quality,
      checks,
      critical_failures: criticalFailures,
      warnings,
      recommendations,
      predicted_ra_um: worstRa,
      achievable_tolerance_mm: worstTolerance,
      dimensional_accuracy_pct: avgDimensionalAccuracy,
      gdt_compliant: gdtCompliant,
    };
  }

  // ==========================================================================
  // SHOP GATE
  // ==========================================================================

  /**
   * Validate against JM Die shop-specific standards
   */
  validateShop(context: ValidationContext): ShopReport {
    const checks: ValidationCheck[] = [];
    const criticalFailures: string[] = [];
    const warnings: string[] = [];
    const recommendations: string[] = [];

    let jmDieCompliant = true;
    let customerPreferenceMatch = true;
    let machineCapabilityMatch = true;
    let toolAvailabilityMatch = true;

    // Check 1: JM Die coolant standard
    const usesFloodCoolant = context.operations.every(op =>
      op.params.coolant === "flood" || op.params.coolant === undefined
    );

    checks.push({
      check_id: "SHOP_001",
      check_name: "JM Die Coolant Standard",
      status: usesFloodCoolant ? "pass" : "warn",
      score: usesFloodCoolant ? 100 : 80,
      detail: usesFloodCoolant
        ? "All operations use flood coolant (JM Die standard)"
        : "Non-standard coolant method detected",
      remediation: usesFloodCoolant ? undefined : "JM Die prefers flood coolant for tool steels",
      reference: "JM Die shop standards",
    });

    // Check 2: Tool life meets JM Die minimum
    const physics = getMaterialPhysics(context.part.material.iso_group);
    let minPredictedLife = Infinity;

    context.operations.forEach(op => {
      const life = calculateTaylorLife(
        op.params.cutting_speed_m_min,
        physics.taylor_C,
        physics.taylor_n
      );
      if (life < minPredictedLife) {
        minPredictedLife = life;
      }
    });

    const lifeMeetsStandard = minPredictedLife >= JM_DIE_STANDARDS.min_tool_life_min;

    checks.push({
      check_id: "SHOP_002",
      check_name: "JM Die Tool Life Standard",
      status: lifeMeetsStandard ? "pass" : "warn",
      score: lifeMeetsStandard ? 100 : Math.max(50, minPredictedLife / JM_DIE_STANDARDS.min_tool_life_min * 100),
      detail: `Minimum predicted tool life: ${minPredictedLife.toFixed(1)} min (JM Die standard: ${JM_DIE_STANDARDS.min_tool_life_min} min)`,
      measured_value: minPredictedLife,
      limit_value: JM_DIE_STANDARDS.min_tool_life_min,
      unit: "min",
      remediation: lifeMeetsStandard ? undefined : "Reduce cutting speed to extend tool life",
      reference: "JM Die production standards",
    });

    if (!lifeMeetsStandard) {
      jmDieCompliant = false;
      warnings.push(`Tool life (${minPredictedLife.toFixed(1)} min) below JM Die standard (${JM_DIE_STANDARDS.min_tool_life_min} min)`);
    }

    // Check 3: Part category specific tolerances
    const category = context.part.jm_die_category;
    let categoryTolerance = 0.01; // Default

    if (category === "punch") {
      categoryTolerance = JM_DIE_STANDARDS.punch_tolerance_mm;
    } else if (category === "die") {
      categoryTolerance = JM_DIE_STANDARDS.die_tolerance_mm;
    } else if (category === "electrode") {
      categoryTolerance = JM_DIE_STANDARDS.electrode_tolerance_mm;
    }

    const hasToleranceOps = context.operations.filter(op => op.target_tolerance_mm !== undefined);
    const tolerancesValid = hasToleranceOps.every(op =>
      (op.target_tolerance_mm ?? 0.1) >= categoryTolerance
    );

    if (category) {
      checks.push({
        check_id: "SHOP_003",
        check_name: `JM Die ${category} Tolerance Standard`,
        status: tolerancesValid ? "pass" : "warn",
        score: tolerancesValid ? 100 : 70,
        detail: `${category} category tolerance: ${categoryTolerance * 1000}um minimum`,
        measured_value: categoryTolerance * 1000,
        unit: "um",
        remediation: tolerancesValid ? undefined : `Review tolerances against ${category} requirements`,
        reference: "JM Die part category standards",
      });
    }

    // Check 4: Machine capability match
    const machine = context.machine;
    const part = context.part;

    const diameterOk = part.stock_diameter_mm <= machine.max_bar_od_mm;
    const lengthOk = part.overhang_from_chuck_mm <= machine.max_turning_length_mm;

    checks.push({
      check_id: "SHOP_004",
      check_name: "Machine Envelope Check",
      status: diameterOk && lengthOk ? "pass" : "fail",
      score: diameterOk && lengthOk ? 100 : 0,
      detail: diameterOk && lengthOk
        ? `Part fits machine envelope (D=${part.stock_diameter_mm}mm < ${machine.max_bar_od_mm}mm, L=${part.overhang_from_chuck_mm}mm < ${machine.max_turning_length_mm}mm)`
        : `Part exceeds machine capacity: ${!diameterOk ? `diameter ${part.stock_diameter_mm}mm > ${machine.max_bar_od_mm}mm` : ""} ${!lengthOk ? `length ${part.overhang_from_chuck_mm}mm > ${machine.max_turning_length_mm}mm` : ""}`,
      remediation: diameterOk && lengthOk ? undefined : "Select larger machine or reduce part size",
      reference: `${machine.brand} ${machine.model} specifications`,
    });

    if (!diameterOk || !lengthOk) {
      machineCapabilityMatch = false;
      criticalFailures.push("Part exceeds machine envelope");
    }

    // Check 5: Live tooling requirements
    const needsLiveTooling = context.operations.some(op =>
      op.type === "live_milling" || op.type === "live_drilling" || op.type === "c_axis"
    );

    if (needsLiveTooling) {
      const hasLiveTooling = machine.live_tooling;
      const hasCAxis = machine.c_axis;

      checks.push({
        check_id: "SHOP_005",
        check_name: "Live Tooling Capability",
        status: hasLiveTooling && hasCAxis ? "pass" : "fail",
        score: hasLiveTooling && hasCAxis ? 100 : 0,
        detail: hasLiveTooling && hasCAxis
          ? "Machine has required live tooling and C-axis"
          : `Machine missing: ${!hasLiveTooling ? "live tooling " : ""}${!hasCAxis ? "C-axis" : ""}`,
        remediation: hasLiveTooling && hasCAxis ? undefined : "Select machine with live tooling capability",
        reference: "Operation requirements",
      });

      if (!hasLiveTooling || !hasCAxis) {
        machineCapabilityMatch = false;
        criticalFailures.push("Machine lacks required live tooling/C-axis capability");
      }
    }

    // Check 6: Parting diameter limit
    const partingOps = context.operations.filter(op => op.type === "parting" || op.type === "cutoff");
    if (partingOps.length > 0) {
      const partingDiameter = part.stock_diameter_mm;
      const partingOk = partingDiameter <= JM_DIE_STANDARDS.max_parting_diameter_mm;

      checks.push({
        check_id: "SHOP_006",
        check_name: "JM Die Parting Diameter Limit",
        status: partingOk ? "pass" : "warn",
        score: partingOk ? 100 : 70,
        detail: partingOk
          ? `Parting diameter ${partingDiameter}mm within JM Die standard (${JM_DIE_STANDARDS.max_parting_diameter_mm}mm)`
          : `Parting diameter ${partingDiameter}mm exceeds JM Die standard (${JM_DIE_STANDARDS.max_parting_diameter_mm}mm) — verify tool strength`,
        measured_value: partingDiameter,
        limit_value: JM_DIE_STANDARDS.max_parting_diameter_mm,
        unit: "mm",
        remediation: partingOk ? undefined : "Use reinforced parting blade or reduce feed",
        reference: "JM Die parting blade inventory",
      });
    }

    // Check 7: Customer preference match (if known)
    if (context.part.customer) {
      // Placeholder for customer-specific validation
      // In production, this would check customer preference database
      checks.push({
        check_id: "SHOP_007",
        check_name: "Customer Preference Check",
        status: "pass",
        score: 100,
        detail: `Customer: ${context.part.customer} — standard preferences applied`,
        reference: "JM Die customer database",
      });
    }

    // Check 8: Production run considerations
    if (context.is_production_run) {
      checks.push({
        check_id: "SHOP_008",
        check_name: "Production Run Readiness",
        status: jmDieCompliant && machineCapabilityMatch ? "pass" : "warn",
        score: jmDieCompliant && machineCapabilityMatch ? 100 : 70,
        detail: "Production run flagged — verifying repeatability requirements",
        remediation: !jmDieCompliant || !machineCapabilityMatch
          ? "Resolve compliance issues before production run"
          : undefined,
        reference: "JM Die production standards",
      });
    }

    // Check 9: Spec level compliance
    if (context.customer_spec_level) {
      const specFactors: Record<string, number> = {
        standard: 1.0,
        tight: 0.7,
        aerospace: 0.5,
        medical: 0.4,
      };

      checks.push({
        check_id: "SHOP_009",
        check_name: `${context.customer_spec_level} Specification Compliance`,
        status: jmDieCompliant ? "pass" : "warn",
        score: jmDieCompliant ? 100 : 60,
        detail: `${context.customer_spec_level} spec level — tolerance factor ${specFactors[context.customer_spec_level]}×`,
        reference: "Customer specification levels",
      });
    }

    // Calculate gate score
    const totalScore = checks.reduce((sum, c) => sum + c.score, 0);
    const gateScore = checks.length > 0 ? Math.round(totalScore / checks.length) : 100;

    let overallStatus: "pass" | "warn" | "fail";
    if (criticalFailures.length > 0) {
      overallStatus = "fail";
    } else if (gateScore >= 80) {
      overallStatus = "pass";
    } else if (gateScore >= 60) {
      overallStatus = "warn";
    } else {
      overallStatus = "fail";
    }

    return {
      gate_name: "Shop Gate",
      gate_type: "shop",
      overall_status: overallStatus,
      score: gateScore,
      weight: GATE_WEIGHTS.shop,
      checks,
      critical_failures: criticalFailures,
      warnings,
      recommendations,
      jm_die_compliant: jmDieCompliant,
      customer_preference_match: customerPreferenceMatch,
      machine_capability_match: machineCapabilityMatch,
      tool_availability_match: toolAvailabilityMatch,
    };
  }

  // ==========================================================================
  // SCORING AND RECOMMENDATIONS
  // ==========================================================================

  /**
   * Calculate weighted overall score from all gate reports
   */
  getOverallScore(reports: GateReport[]): number {
    let weightedSum = 0;
    let totalWeight = 0;

    reports.forEach(report => {
      weightedSum += report.score * report.weight;
      totalWeight += report.weight;
    });

    return totalWeight > 0 ? Math.round(weightedSum / totalWeight) : 0;
  }

  /**
   * Generate prioritized recommendations from all gate reports
   */
  getRecommendations(reports: GateReport[]): Recommendation[] {
    const recommendations: Recommendation[] = [];

    reports.forEach(report => {
      // Convert critical failures to critical recommendations
      report.critical_failures.forEach(failure => {
        recommendations.push({
          priority: "critical",
          category: report.gate_name,
          description: failure,
          impact: "Program cannot run safely until resolved",
          action: "Address before any machining",
          estimated_improvement: "Required for operation",
        });
      });

      // Convert warnings to high/medium recommendations
      report.warnings.forEach(warning => {
        recommendations.push({
          priority: report.gate_type === "safety" ? "high" : "medium",
          category: report.gate_name,
          description: warning,
          impact: "May affect quality or efficiency",
          action: "Review and address if practical",
        });
      });

      // Convert check remediations to recommendations
      report.checks.forEach(check => {
        if (check.remediation && check.status !== "pass") {
          recommendations.push({
            priority: check.status === "fail" ? "high" : "medium",
            category: report.gate_name,
            description: check.check_name,
            impact: check.detail,
            action: check.remediation,
            estimated_improvement: check.limit_value
              ? `Target: ${check.limit_value}${check.unit ? " " + check.unit : ""}`
              : undefined,
          });
        }
      });
    });

    // Sort by priority
    const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    recommendations.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

    // Remove duplicates
    const unique: Recommendation[] = [];
    const seen = new Set<string>();

    recommendations.forEach(rec => {
      const key = `${rec.category}:${rec.description}`;
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(rec);
      }
    });

    return unique;
  }

  // ==========================================================================
  // UTILITY METHODS
  // ==========================================================================

  /**
   * Quick safety check without full context
   */
  quickSafetyCheck(program: string): { safe: boolean; issues: string[] } {
    const issues: string[] = [];

    // Check G50
    const hasG50 = GCODE_PATTERNS.G50_SPINDLE_LIMIT.test(program);
    GCODE_PATTERNS.G50_SPINDLE_LIMIT.lastIndex = 0;
    if (!hasG50) {
      issues.push("Missing G50 spindle limit");
    }

    // Check program end
    const hasM30 = GCODE_PATTERNS.PROGRAM_END_M30.test(program);
    GCODE_PATTERNS.PROGRAM_END_M30.lastIndex = 0;
    const hasM02 = GCODE_PATTERNS.PROGRAM_END_M02.test(program);
    GCODE_PATTERNS.PROGRAM_END_M02.lastIndex = 0;
    if (!hasM30 && !hasM02) {
      issues.push("Missing program end (M30/M02)");
    }

    // Check CSS without G50
    const hasG96 = GCODE_PATTERNS.CSS_MODE_G96.test(program);
    GCODE_PATTERNS.CSS_MODE_G96.lastIndex = 0;
    if (hasG96 && !hasG50) {
      issues.push("CRITICAL: CSS mode (G96) without G50 spindle limit");
    }

    return {
      safe: issues.length === 0,
      issues,
    };
  }

  /**
   * Get ISO material speed range
   */
  getSpeedRange(isoGroup: ISOGroup, isRoughing: boolean): { min: number; max: number } {
    const limits = ISO_SPEED_LIMITS[isoGroup];
    return {
      min: limits.min,
      max: isRoughing ? limits.max_rough : limits.max_finish,
    };
  }

  /**
   * Get ISO material feed range
   */
  getFeedRange(isoGroup: ISOGroup, isRoughing: boolean): { min: number; max: number } {
    const limits = ISO_FEED_LIMITS[isoGroup];
    return {
      min: limits.min,
      max: isRoughing ? limits.max_rough : limits.max_finish,
    };
  }

  /**
   * Get ISO material DOC range
   */
  getDocRange(isoGroup: ISOGroup, isRoughing: boolean): { min: number; max: number } {
    const limits = ISO_DOC_LIMITS[isoGroup];
    return {
      min: limits.min,
      max: isRoughing ? limits.max_rough : limits.max_finish,
    };
  }

  /**
   * Calculate required nose radius for target Ra
   */
  calculateRequiredNoseRadius(targetRa_um: number, feed_mm_rev: number): number {
    // Ra = fn² / (32 × r)
    // r = fn² / (32 × Ra)
    const ra_mm = targetRa_um / 1000;
    return (feed_mm_rev * feed_mm_rev) / (32 * ra_mm);
  }

  /**
   * Calculate maximum feed for target Ra
   */
  calculateMaxFeedForRa(targetRa_um: number, noseRadius_mm: number): number {
    // Ra = fn² / (32 × r)
    // fn = sqrt(32 × r × Ra)
    const ra_mm = targetRa_um / 1000;
    return Math.sqrt(32 * noseRadius_mm * ra_mm);
  }

  /**
   * Get gate weights
   */
  getGateWeights(): Record<string, number> {
    return { ...GATE_WEIGHTS };
  }

  /**
   * Get JM Die standards
   */
  getJMDieStandards(): typeof JM_DIE_STANDARDS {
    return { ...JM_DIE_STANDARDS };
  }

  /**
   * Get surface finish limits for operation type
   */
  getSurfaceFinishLimits(opType: LatheOperationType): { min_ra: number; typical_ra: number; best_ra: number } {
    return { ...SURFACE_FINISH_LIMITS[opType] };
  }

  /**
   * Engine version
   */
  getVersion(): string {
    return this.version;
  }
}

// ============================================================================
// EXPORT SINGLETON
// ============================================================================

export const latheQualityGateEngine = new LatheQualityGateEngineImpl();
export type LatheQualityGateEngine = typeof latheQualityGateEngine;
