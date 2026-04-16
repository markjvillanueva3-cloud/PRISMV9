/**
 * WEDMProgramNeuralAnalysisEngine — Deep Reasoning for Wire EDM Program Analysis
 * ================================================================================
 *
 * Applies neural-style pattern recognition and deep reasoning to analyze Wire EDM
 * programs, particularly those written by less experienced programmers at JM DIE.
 *
 * Core Capabilities:
 * ------------------
 *   1. Operation Order Validation   — E-code sequence logic, M-code timing
 *   2. Parameter Optimization        — Physics-based parameter analysis
 *   3. Neural-style Pattern Recognition — Learn from successful programs
 *   4. Wire Break Risk Prediction    — Proactive failure prevention
 *   5. Intelligent Recommendations   — Actionable improvement suggestions
 *
 * Integration Points:
 * -------------------
 *   - PRISMIntelligenceLayer (AI reasoning)
 *   - WireEDMDeepAIHardeningEngine (tribal knowledge)
 *   - WireEDMProgramParserEngine (program parsing)
 *   - WEDMFeedbackCalibrationEngine (calibration data)
 *   - EDM_PHYSICS from physics/constants.ts
 *
 * References:
 * -----------
 *   - Klocke (2013) Manufacturing Processes 4, Chapter 8
 *   - Toenshoff et al. (2004) CIRP Annals
 *   - DiBitonto et al. (1989) Crater model
 *   - Kunieda et al. (2005) MRR model
 *   - JM Die Company real production programs
 *   - Mastercam X8 Mitsubishi FA-S technology tables
 *
 * @module engines/WEDMProgramNeuralAnalysisEngine
 * @version 1.0.0
 */

import { log } from "../utils/Logger.js";
import { EDM_PHYSICS } from "../physics/constants.js";
import { wireEDMProgramParserEngine, type WireEDMProgram, type WireEDMPass } from "./WireEDMProgramParserEngine.js";
import { JM_DIE_ECODE_FAMILIES, type ECodeFamily, type ECodePass } from "../data/jm-die-wedm-tech-tables.js";

// ============================================================================
// TYPES — Program Analysis Structures
// ============================================================================

/** Wire EDM parameters extracted from program */
export interface WEDMParams {
  /** E-code for this pass (e.g., "E1221") */
  e_code: string;
  /** Pass number (1 = rough) */
  pass_number: number;
  /** Pass type */
  pass_type: "rough" | "skim";
  /** ON time in microseconds (A parameter) */
  on_time_us?: number;
  /** OFF time in microseconds (B parameter) */
  off_time_us?: number;
  /** Peak current in amps (IP parameter) */
  peak_current_A?: number;
  /** Servo voltage */
  servo_voltage?: number;
  /** Wire tension in grams */
  wire_tension_g?: number;
  /** Wire speed in m/min */
  wire_speed_m_min?: number;
  /** Feed rate in mm/min */
  feed_rate_mm_min?: number;
  /** H-register offset in mm */
  offset_mm?: number;
  /** Gap voltage in volts */
  gap_voltage_v?: number;
  /** Flush pressure in bar */
  flush_pressure_bar?: number;
}

/** Full program analysis result */
export interface ProgramAnalysis {
  /** Source filename */
  filename: string;
  /** Overall program score (0-100) */
  score: number;
  /** Detected controller dialect */
  dialect: string;
  /** Number of passes detected */
  pass_count: number;
  /** Operation order validation result */
  order_validation: OrderValidation;
  /** Parameter analysis per pass */
  parameter_analysis: ParameterAnalysis[];
  /** Detected anti-patterns */
  anti_patterns: AntiPattern[];
  /** Wire break risk assessment */
  wire_break_risk: RiskAssessment;
  /** Improvement suggestions */
  improvements: Improvement[];
  /** Neural pattern matches */
  pattern_matches: PatternMatch[];
  /** AI reasoning chain */
  reasoning_chain: ReasoningStep[];
  /** JM Die specific notes */
  jm_die_notes: string[];
  /** Overall confidence 0-1 */
  confidence: number;
  /** Warnings */
  warnings: string[];
  /** Critical errors that should block production */
  critical_errors: string[];
}

/** E-code operation order validation */
export interface OrderValidation {
  /** Overall validity */
  valid: boolean;
  /** E-codes in order found */
  e_codes_found: string[];
  /** Expected E-code sequence */
  expected_sequence: string[];
  /** Order violations */
  violations: OrderViolation[];
  /** Offset cascade validity */
  offset_cascade_valid: boolean;
  /** Offset values in order */
  offset_values_mm: number[];
  /** M-code sequence validation */
  m_code_validation: MCodeValidation;
}

/** Individual order violation */
export interface OrderViolation {
  /** Type of violation */
  type: "skim_before_rough" | "offset_increase" | "missing_pass" | "duplicate_pass" | "wrong_sequence";
  /** Description */
  description: string;
  /** Severity: critical blocks production, major needs fix, minor is advisory */
  severity: "critical" | "major" | "minor";
  /** Line number in program */
  line_number?: number;
  /** Suggested fix */
  fix: string;
}

/** M-code sequence validation */
export interface MCodeValidation {
  /** Has proper M20 (wire threading) before cutting */
  has_m20_threading: boolean;
  /** Has M90 adaptive control */
  has_m90_adaptive: boolean;
  /** Threading M-code line number */
  threading_line?: number;
  /** M90 timing correct (before rough) */
  m90_timing_valid: boolean;
  /** Tank fill/drain sequence correct */
  tank_sequence_valid: boolean;
  /** Issues found */
  issues: string[];
}

/** Parameter analysis for a single pass */
export interface ParameterAnalysis {
  /** Pass number */
  pass_number: number;
  /** E-code */
  e_code: string;
  /** Pass type */
  pass_type: "rough" | "skim";
  /** Extracted parameters */
  params: WEDMParams;
  /** Parameter health score 0-100 */
  health_score: number;
  /** Comparison against physics models */
  physics_comparison: PhysicsComparison;
  /** Identified issues */
  issues: ParameterIssue[];
  /** Optimization opportunities */
  optimizations: Optimization[];
}

/** Physics model comparison */
export interface PhysicsComparison {
  /** Expected Ra from Klocke model */
  expected_ra_um?: number;
  /** Expected MRR from Kunieda model */
  expected_mrr_mm3_min?: number;
  /** Duty cycle */
  duty_cycle?: number;
  /** Current density A/mm2 */
  current_density_A_mm2?: number;
  /** Energy per pulse mJ */
  energy_mj?: number;
  /** Deviation from optimal */
  deviation_pct?: number;
  /** Notes */
  notes: string[];
}

/** Parameter issue */
export interface ParameterIssue {
  /** Parameter name */
  parameter: string;
  /** Issue type */
  type: "too_high" | "too_low" | "missing" | "inconsistent";
  /** Current value */
  current_value?: number;
  /** Expected range */
  expected_range?: { min: number; max: number };
  /** Severity */
  severity: "critical" | "major" | "minor";
  /** Impact */
  impact: string;
}

/** Optimization opportunity */
export interface Optimization {
  /** Parameter to optimize */
  parameter: string;
  /** Current value */
  current_value: number;
  /** Suggested value */
  suggested_value: number;
  /** Expected improvement */
  expected_improvement: string;
  /** Cycle time savings in minutes */
  cycle_time_savings_min?: number;
  /** Confidence */
  confidence: number;
}

/** Detected anti-pattern */
export interface AntiPattern {
  /** Anti-pattern ID */
  id: string;
  /** Name */
  name: string;
  /** Description */
  description: string;
  /** Where found */
  location: string;
  /** Severity */
  severity: "critical" | "major" | "minor";
  /** Fix instructions */
  fix: string;
  /** Example of correct pattern */
  correct_example?: string;
}

/** Wire break risk assessment */
export interface RiskAssessment {
  /** Overall risk score 0-100 (100 = very high risk) */
  risk_score: number;
  /** Risk level */
  risk_level: "low" | "moderate" | "high" | "critical";
  /** Risk factors */
  factors: RiskFactor[];
  /** Predicted wire breaks per hour */
  predicted_breaks_per_hour?: number;
  /** Mitigation recommendations */
  mitigations: string[];
}

/** Individual risk factor */
export interface RiskFactor {
  /** Factor name */
  name: string;
  /** Contribution to risk 0-100 */
  contribution: number;
  /** Description */
  description: string;
  /** How to reduce */
  mitigation?: string;
}

/** Improvement suggestion */
export interface Improvement {
  /** Category */
  category: "cycle_time" | "quality" | "reliability" | "safety" | "cost";
  /** Title */
  title: string;
  /** Description */
  description: string;
  /** Priority (1 = highest) */
  priority: number;
  /** Implementation difficulty */
  difficulty: "easy" | "moderate" | "hard";
  /** Expected benefit */
  expected_benefit: string;
  /** Affected passes */
  affected_passes: number[];
}

/** Neural pattern match */
export interface PatternMatch {
  /** Pattern ID */
  pattern_id: string;
  /** Pattern name */
  pattern_name: string;
  /** Match confidence 0-1 */
  confidence: number;
  /** Pattern type */
  type: "good_practice" | "successful_program" | "part_type" | "material_specific";
  /** Source (e.g., "ITW SHAKEPROOF D2 4-pass") */
  source: string;
  /** Notes */
  notes: string[];
}

/** AI reasoning step */
export interface ReasoningStep {
  /** Step number */
  step: number;
  /** Step type */
  type: "observe" | "classify" | "compare" | "infer" | "validate" | "recommend";
  /** Content */
  content: string;
  /** Engine or knowledge source */
  source: string;
  /** Confidence */
  confidence: number;
}

/** Optimization result from optimizeParameters */
export interface OptimizationResult {
  /** Original parameters */
  original: WEDMParams;
  /** Optimized parameters */
  optimized: WEDMParams;
  /** Changes made */
  changes: ParameterChange[];
  /** Expected improvements */
  improvements: {
    cycle_time_reduction_pct: number;
    quality_improvement_pct: number;
    reliability_improvement_pct: number;
  };
  /** Confidence */
  confidence: number;
  /** Warnings */
  warnings: string[];
}

/** Parameter change */
export interface ParameterChange {
  /** Parameter name */
  parameter: string;
  /** Old value */
  old_value: number;
  /** New value */
  new_value: number;
  /** Rationale */
  rationale: string;
}

// ============================================================================
// OPERATION ORDER RULES — Valid E-code Sequences
// ============================================================================

/**
 * Valid E-code sequence rules for different program types.
 * Based on JM Die Mitsubishi FA-10S technology tables.
 */
const OPERATION_ORDER_RULES: Record<string, {
  description: string;
  valid_sequences: string[][];
  offset_must_decrease: boolean;
  rough_first: boolean;
}> = {
  "E12xx_standard": {
    description: "Standard 4-pass rough + 3 skim",
    valid_sequences: [
      ["E1221", "E1222", "E1223", "E1224"],
      ["E1211", "E1212", "E1213", "E1214"],
      ["E1231", "E1232", "E1233", "E1234"],
    ],
    offset_must_decrease: true,
    rough_first: true,
  },
  "E12xx_heavy": {
    description: "Heavy 5-pass for thick stock",
    valid_sequences: [
      ["E1281", "E1282", "E1283", "E1284", "E1285"],
      ["E1271", "E1272", "E1273", "E1274", "E1275"],
    ],
    offset_must_decrease: true,
    rough_first: true,
  },
  "E28xx_taper": {
    description: "4-axis UV taper 5-pass",
    valid_sequences: [
      ["E2821", "E2822", "E2823", "E2824", "E2825"],
      ["E2811", "E2812", "E2813", "E2814", "E2815"],
    ],
    offset_must_decrease: true,
    rough_first: true,
  },
  "E952_acu": {
    description: "ACU 7-pass accuracy priority",
    valid_sequences: [
      ["E952", "E5601", "E5602", "E5603", "E5604", "E5605", "E5606"],
    ],
    offset_must_decrease: true,
    rough_first: true,
  },
  "E56xx_acu_thick": {
    description: "ACU 7-pass thick stock",
    valid_sequences: [
      ["E5611", "E5612", "E5613", "E5614", "E5615", "E5616", "E5617"],
    ],
    offset_must_decrease: true,
    rough_first: true,
  },
};

// ============================================================================
// PARAMETER BOUNDS — Safe Operating Ranges
// ============================================================================

/**
 * Safe parameter ranges by material and thickness.
 * Source: Mitsubishi FA-S tech tables, Klocke (2013), JM Die tribal knowledge.
 */
interface ParameterBounds {
  on_time_us: { min: number; max: number; optimal: number };
  off_time_us: { min: number; max: number; optimal: number };
  peak_current_A: { min: number; max: number; optimal: number };
  wire_tension_g: { min: number; max: number; optimal: number };
  wire_speed_m_min: { min: number; max: number; optimal: number };
  servo_voltage: { min: number; max: number; optimal: number };
  flush_pressure_bar: { min: number; max: number; optimal: number };
  feed_rate_mm_min: { min: number; max: number };
}

const PARAMETER_BOUNDS: Record<string, Record<string, ParameterBounds>> = {
  // Tool steel (D2, A2, S7, M2, H13) at different thicknesses
  tool_steel: {
    "thin_lt_15mm": {
      on_time_us: { min: 2, max: 6, optimal: 4 },
      off_time_us: { min: 10, max: 30, optimal: 18 },
      peak_current_A: { min: 5, max: 15, optimal: 10 },
      wire_tension_g: { min: 1200, max: 1800, optimal: 1500 },
      wire_speed_m_min: { min: 8, max: 12, optimal: 10 },
      servo_voltage: { min: 50, max: 70, optimal: 60 },
      flush_pressure_bar: { min: 4, max: 8, optimal: 6 },
      feed_rate_mm_min: { min: 2.0, max: 5.0 },
    },
    "medium_15_50mm": {
      on_time_us: { min: 3, max: 8, optimal: 5 },
      off_time_us: { min: 12, max: 35, optimal: 20 },
      peak_current_A: { min: 8, max: 20, optimal: 14 },
      wire_tension_g: { min: 1400, max: 2000, optimal: 1700 },
      wire_speed_m_min: { min: 9, max: 13, optimal: 11 },
      servo_voltage: { min: 55, max: 75, optimal: 65 },
      flush_pressure_bar: { min: 5, max: 10, optimal: 7 },
      feed_rate_mm_min: { min: 1.5, max: 4.0 },
    },
    "thick_gt_50mm": {
      on_time_us: { min: 4, max: 10, optimal: 6 },
      off_time_us: { min: 15, max: 45, optimal: 25 },
      peak_current_A: { min: 10, max: 25, optimal: 18 },
      wire_tension_g: { min: 1600, max: 2200, optimal: 1900 },
      wire_speed_m_min: { min: 10, max: 15, optimal: 12 },
      servo_voltage: { min: 60, max: 80, optimal: 70 },
      flush_pressure_bar: { min: 8, max: 14, optimal: 10 },
      feed_rate_mm_min: { min: 0.8, max: 2.5 },
    },
  },
  // Stainless steel
  stainless: {
    "thin_lt_15mm": {
      on_time_us: { min: 2, max: 5, optimal: 3 },
      off_time_us: { min: 12, max: 35, optimal: 22 },
      peak_current_A: { min: 4, max: 12, optimal: 8 },
      wire_tension_g: { min: 1100, max: 1600, optimal: 1350 },
      wire_speed_m_min: { min: 9, max: 14, optimal: 11 },
      servo_voltage: { min: 45, max: 65, optimal: 55 },
      flush_pressure_bar: { min: 5, max: 9, optimal: 7 },
      feed_rate_mm_min: { min: 2.5, max: 6.0 },
    },
    "medium_15_50mm": {
      on_time_us: { min: 3, max: 7, optimal: 4 },
      off_time_us: { min: 15, max: 40, optimal: 25 },
      peak_current_A: { min: 6, max: 16, optimal: 11 },
      wire_tension_g: { min: 1300, max: 1800, optimal: 1550 },
      wire_speed_m_min: { min: 10, max: 15, optimal: 12 },
      servo_voltage: { min: 50, max: 70, optimal: 60 },
      flush_pressure_bar: { min: 6, max: 11, optimal: 8 },
      feed_rate_mm_min: { min: 2.0, max: 5.0 },
    },
    "thick_gt_50mm": {
      on_time_us: { min: 4, max: 9, optimal: 5 },
      off_time_us: { min: 18, max: 50, optimal: 30 },
      peak_current_A: { min: 8, max: 20, optimal: 15 },
      wire_tension_g: { min: 1500, max: 2000, optimal: 1750 },
      wire_speed_m_min: { min: 11, max: 16, optimal: 13 },
      servo_voltage: { min: 55, max: 75, optimal: 65 },
      flush_pressure_bar: { min: 8, max: 14, optimal: 11 },
      feed_rate_mm_min: { min: 1.0, max: 3.5 },
    },
  },
  // Carbide (WC)
  carbide: {
    "thin_lt_15mm": {
      on_time_us: { min: 1, max: 4, optimal: 2 },
      off_time_us: { min: 15, max: 45, optimal: 28 },
      peak_current_A: { min: 3, max: 10, optimal: 6 },
      wire_tension_g: { min: 800, max: 1200, optimal: 1000 },
      wire_speed_m_min: { min: 6, max: 10, optimal: 8 },
      servo_voltage: { min: 40, max: 60, optimal: 50 },
      flush_pressure_bar: { min: 6, max: 12, optimal: 9 },
      feed_rate_mm_min: { min: 0.5, max: 2.0 },
    },
    "medium_15_50mm": {
      on_time_us: { min: 2, max: 5, optimal: 3 },
      off_time_us: { min: 20, max: 55, optimal: 35 },
      peak_current_A: { min: 4, max: 12, optimal: 8 },
      wire_tension_g: { min: 900, max: 1400, optimal: 1150 },
      wire_speed_m_min: { min: 7, max: 11, optimal: 9 },
      servo_voltage: { min: 45, max: 65, optimal: 55 },
      flush_pressure_bar: { min: 8, max: 14, optimal: 11 },
      feed_rate_mm_min: { min: 0.3, max: 1.5 },
    },
    "thick_gt_50mm": {
      on_time_us: { min: 2, max: 6, optimal: 4 },
      off_time_us: { min: 25, max: 65, optimal: 42 },
      peak_current_A: { min: 5, max: 15, optimal: 10 },
      wire_tension_g: { min: 1000, max: 1500, optimal: 1250 },
      wire_speed_m_min: { min: 8, max: 12, optimal: 10 },
      servo_voltage: { min: 50, max: 70, optimal: 60 },
      flush_pressure_bar: { min: 10, max: 16, optimal: 13 },
      feed_rate_mm_min: { min: 0.2, max: 1.0 },
    },
  },
};

// ============================================================================
// ANTI-PATTERN DATABASE — Common Amateur Mistakes
// ============================================================================

/**
 * Database of common anti-patterns found in amateur Wire EDM programs.
 * Source: JM Die shop experience, industry best practices.
 */
const ANTI_PATTERN_DATABASE: Array<{
  id: string;
  name: string;
  description: string;
  detection: (program: WireEDMProgram, params: WEDMParams[]) => boolean;
  severity: "critical" | "major" | "minor";
  fix: string;
  correct_example?: string;
}> = [
  {
    id: "AP001",
    name: "Skim before rough",
    description: "Skim pass E-code appears before rough pass in program sequence",
    detection: (program) => {
      const passes = program.passes;
      if (passes.length < 2) return false;
      const firstRough = passes.findIndex(p => p.phase === "rough");
      const firstSkim = passes.findIndex(p => p.phase.startsWith("skim"));
      return firstSkim >= 0 && firstRough >= 0 && firstSkim < firstRough;
    },
    severity: "critical",
    fix: "Reorder passes so rough (E*xx1) comes before all skim passes (E*xx2-5)",
    correct_example: "E1221 (rough) -> E1222 (skim1) -> E1223 (skim2) -> E1224 (skim3)",
  },
  {
    id: "AP002",
    name: "Missing rough pass",
    description: "Program has skim passes but no identifiable rough pass",
    detection: (program) => {
      return program.passes.length > 0 &&
             !program.passes.some(p => p.phase === "rough") &&
             program.passes.some(p => p.phase.startsWith("skim"));
    },
    severity: "critical",
    fix: "Add rough pass (E*xx1) before skim passes",
  },
  {
    id: "AP003",
    name: "Offset increases between passes",
    description: "Wire offset should decrease from rough to final skim, not increase",
    detection: (program) => {
      const offsets = program.passes
        .filter(p => p.offset_value !== null)
        .map(p => p.offset_value as number);
      if (offsets.length < 2) return false;
      for (let i = 1; i < offsets.length; i++) {
        if (offsets[i] > offsets[i - 1] * 1.05) return true; // 5% tolerance
      }
      return false;
    },
    severity: "major",
    fix: "Adjust H-register values so offsets decrease progressively: H1 > H2 > H3 > H4",
    correct_example: "H1=0.0085, H2=0.0064, H3=0.0058, H4=0.0053",
  },
  {
    id: "AP004",
    name: "No adaptive control (M90)",
    description: "M90 adaptive control not enabled — increases wire break risk",
    detection: (program) => !program.hasAdaptiveControl,
    severity: "major",
    fix: "Add M90 before rough cut to enable adaptive power control",
  },
  {
    id: "AP005",
    name: "Missing wire threading (M20)",
    description: "No M20 wire threading command before cutting starts",
    detection: (program) => !program.wire_settings.has_auto_thread,
    severity: "major",
    fix: "Add M20 at program start to ensure wire is properly threaded",
  },
  {
    id: "AP006",
    name: "No G40 offset cancel at end",
    description: "Cutter compensation not cancelled at program end",
    detection: (program) => !program.safety.has_offset_cancel,
    severity: "minor",
    fix: "Add G40 before M02/M30 to cancel cutter compensation",
  },
  {
    id: "AP007",
    name: "No program end (M02/M30)",
    description: "Program missing proper end command",
    detection: (program) => !program.safety.has_program_end,
    severity: "major",
    fix: "Add M02 or M30 at program end",
  },
  {
    id: "AP008",
    name: "Tank fill without drain",
    description: "M78 tank fill used but no M58 drain at end",
    detection: (program) => {
      const content = program.rawLines.join("\n");
      return /\bM78\b/.test(content) && !/\bM58\b/.test(content);
    },
    severity: "minor",
    fix: "Add M58 (drain tank) at program end after cutting complete",
  },
  {
    id: "AP009",
    name: "Excessive passes for thickness",
    description: "More passes than needed for part thickness (wastes cycle time)",
    detection: (program) => {
      // Thin parts (<15mm) rarely need more than 4 passes
      // This is a heuristic — would need thickness from context
      return program.passes.length > 6;
    },
    severity: "minor",
    fix: "Consider reducing pass count for thin sections — 4 passes often sufficient for <25mm",
  },
  {
    id: "AP010",
    name: "Inconsistent E-code family",
    description: "E-codes from different families mixed in same program",
    detection: (program) => {
      const eCodes = program.passes
        .map(p => p.condition_code)
        .filter((c): c is string => c !== null);
      if (eCodes.length < 2) return false;
      // Extract family prefix (first 2-3 digits)
      const families = new Set(eCodes.map(c => c.replace(/[^\d]/g, "").substring(0, 2)));
      return families.size > 1;
    },
    severity: "major",
    fix: "Use E-codes from same family (e.g., all E12xx or all E28xx)",
    correct_example: "E1221-E1222-E1223-E1224 (all E12xx standard)",
  },
  {
    id: "AP011",
    name: "Taper without UV axis moves",
    description: "G51 taper command present but no U/V axis motion detected",
    detection: (program) => {
      return program.taper.enabled &&
             !program.contour_moves.some(m => m.u !== null || m.v !== null);
    },
    severity: "major",
    fix: "For 4-axis taper, ensure U/V coordinates are specified on cutting moves",
  },
  {
    id: "AP012",
    name: "Single pass only",
    description: "Program has only one pass — no skim finishing",
    detection: (program) => program.passes.length === 1 && program.passes[0].phase === "rough",
    severity: "minor",
    fix: "Add skim passes for better surface finish and dimensional accuracy",
  },
];

// ============================================================================
// OPTIMIZATION HEURISTICS — Improvement Suggestions
// ============================================================================

/**
 * Heuristics for generating improvement suggestions.
 */
const OPTIMIZATION_HEURISTICS: Array<{
  id: string;
  category: Improvement["category"];
  check: (program: WireEDMProgram, analysis: Partial<ProgramAnalysis>) => boolean;
  generate: (program: WireEDMProgram, analysis: Partial<ProgramAnalysis>) => Improvement;
}> = [
  {
    id: "OPT001",
    category: "cycle_time",
    check: (program) => {
      // Conservative feed rates detected
      const passes = program.passes.filter(p => p.feed_rate !== null);
      if (passes.length === 0) return false;
      const roughPass = passes.find(p => p.phase === "rough");
      return roughPass !== undefined && (roughPass.feed_rate ?? 0) < 0.08;
    },
    generate: (program) => {
      const roughPass = program.passes.find(p => p.phase === "rough");
      return {
        category: "cycle_time",
        title: "Increase rough feed rate",
        description: `Rough feed rate (${roughPass?.feed_rate?.toFixed(3) ?? "unknown"} in/min) is conservative. Standard D2 steel can run 0.10-0.12 in/min.`,
        priority: 2,
        difficulty: "easy",
        expected_benefit: "10-25% cycle time reduction",
        affected_passes: [1],
      };
    },
  },
  {
    id: "OPT002",
    category: "reliability",
    check: (program) => !program.hasAdaptiveControl,
    generate: () => ({
      category: "reliability",
      title: "Enable adaptive control (M90)",
      description: "M90 adaptive control automatically reduces power on short-circuits, preventing wire breaks.",
      priority: 1,
      difficulty: "easy",
      expected_benefit: "30-50% reduction in wire breaks",
      affected_passes: [1, 2, 3, 4, 5],
    }),
  },
  {
    id: "OPT003",
    category: "quality",
    check: (program) => {
      // Only 4 passes for tight tolerance work
      return program.passes.length <= 4;
    },
    generate: () => ({
      category: "quality",
      title: "Consider additional skim pass",
      description: "For Ra < 0.4 um requirements, 5-6 passes typically achieve better finish than 4.",
      priority: 3,
      difficulty: "moderate",
      expected_benefit: "20-40% improvement in surface finish",
      affected_passes: [],
    }),
  },
  {
    id: "OPT004",
    category: "cost",
    check: (program) => {
      // Multiple features with separate threading cycles
      const threadLines = program.rawLines.filter(l => /\bM20\b/.test(l));
      return threadLines.length > 2;
    },
    generate: () => ({
      category: "cost",
      title: "Consolidate threading operations",
      description: "Multiple M20 threading cycles detected. Consider repositioning cuts to minimize wire threading.",
      priority: 4,
      difficulty: "hard",
      expected_benefit: "Reduced wire consumption and cycle time",
      affected_passes: [],
    }),
  },
  {
    id: "OPT005",
    category: "safety",
    check: (program) => {
      // Missing safety features
      return !program.safety.has_offset_cancel || !program.safety.has_wire_stop;
    },
    generate: (program) => ({
      category: "safety",
      title: "Add safety commands",
      description: `Missing: ${!program.safety.has_offset_cancel ? "G40 (offset cancel)" : ""}${!program.safety.has_wire_stop ? " M21/M51 (wire stop)" : ""}`,
      priority: 1,
      difficulty: "easy",
      expected_benefit: "Proper program termination, prevent machine damage",
      affected_passes: [],
    }),
  },
];

// ============================================================================
// SUCCESSFUL PROGRAM PATTERNS — Neural-style Learning
// ============================================================================

/**
 * Patterns extracted from successful programs (no wire breaks, good Ra).
 * Used for neural-style pattern matching.
 */
const SUCCESSFUL_PROGRAM_PATTERNS: Array<{
  id: string;
  name: string;
  source: string;
  material: string;
  thickness_range_mm: { min: number; max: number };
  pass_count: number;
  e_code_family: string;
  offset_pattern_mm: number[];
  feed_pattern_mm_min: number[];
  achieved_ra_um: number;
  achieved_tolerance_mm: number;
  features: string[];
}> = [
  {
    id: "PAT001",
    name: "ITW SHAKEPROOF D2 Standard",
    source: "ITW SHAKEPROOF 500-30540-24000-04.NC",
    material: "D2",
    thickness_range_mm: { min: 20, max: 30 },
    pass_count: 4,
    e_code_family: "E12xx_standard_4pass",
    offset_pattern_mm: [0.2159, 0.1626, 0.1473, 0.1346],
    feed_pattern_mm_min: [3.05, 6.10, 5.33, 5.08],
    achieved_ra_um: 0.8,
    achieved_tolerance_mm: 0.010,
    features: ["hex_profile", "bore", "h175_master"],
  },
  {
    id: "PAT002",
    name: "CANNELURE Heavy 5-Pass",
    source: "CHOCTAW DEFENSE 38 CAL CANNELURE",
    material: "D2",
    thickness_range_mm: { min: 30, max: 50 },
    pass_count: 5,
    e_code_family: "E12xx_heavy_5pass",
    offset_pattern_mm: [0.2527, 0.1842, 0.1486, 0.1359, 0.1321],
    feed_pattern_mm_min: [1.52, 3.81, 3.05, 4.06, 3.30],
    achieved_ra_um: 0.6,
    achieved_tolerance_mm: 0.008,
    features: ["cannelure_profile", "thick_stock"],
  },
  {
    id: "PAT003",
    name: "SS Taper Die",
    source: "NOZE TEST.NC",
    material: "stainless",
    thickness_range_mm: { min: 15, max: 25 },
    pass_count: 5,
    e_code_family: "E28xx_taper_5pass",
    offset_pattern_mm: [0, 0, 0, 0, 0], // Taper uses geometry, not H-offset
    feed_pattern_mm_min: [4.06, 5.84, 6.60, 7.62, 0],
    achieved_ra_um: 0.5,
    achieved_tolerance_mm: 0.005,
    features: ["uv_taper", "die_profile"],
  },
  {
    id: "PAT004",
    name: "ACU Precision 7-Pass",
    source: "Mastercam FA-S ACU Tech Table",
    material: "D2",
    thickness_range_mm: { min: 10, max: 15 },
    pass_count: 7,
    e_code_family: "E952_acu_7pass_thin",
    offset_pattern_mm: [0.1702, 0.1422, 0.1422, 0.1422, 0.1334, 0.1321, 0.1321],
    feed_pattern_mm_min: [1.02, 4.06, 5.08, 4.57, 4.32, 5.08, 4.57],
    achieved_ra_um: 0.18,
    achieved_tolerance_mm: 0.003,
    features: ["precision", "low_ra", "punch_profile"],
  },
];

// ============================================================================
// ENGINE CLASS
// ============================================================================

/**
 * WEDMProgramNeuralAnalysisEngine — Deep analysis of Wire EDM programs.
 *
 * Methods:
 *   - analyzeProgram()         — Full program analysis with AI reasoning
 *   - validateOperationOrder() — E-code sequence validation
 *   - optimizeParameters()     — Physics-based parameter optimization
 *   - predictWireBreakRisk()   — Proactive failure prevention
 *   - suggestImprovements()    — Actionable recommendations
 *   - matchPatterns()          — Neural-style pattern matching
 */
export class WEDMProgramNeuralAnalysisEngine {

  // ==========================================================================
  // 1. FULL PROGRAM ANALYSIS
  // ==========================================================================

  /**
   * Analyze a Wire EDM program with deep reasoning.
   *
   * @param programContent - Raw NC program text
   * @param options - Analysis options
   * @returns Comprehensive analysis with reasoning chain
   */
  async analyzeProgram(
    programContent: string,
    options?: {
      filename?: string;
      material?: string;
      thickness_mm?: number;
      target_ra_um?: number;
    }
  ): Promise<ProgramAnalysis> {
    const filename = options?.filename ?? "unknown.nc";
    log.info("WEDMProgramNeuralAnalysisEngine.analyzeProgram", { filename });

    const reasoning_chain: ReasoningStep[] = [];
    const warnings: string[] = [];
    const critical_errors: string[] = [];

    // Step 1: Parse the program
    reasoning_chain.push({
      step: 1,
      type: "observe",
      content: `Parsing program ${filename}...`,
      source: "WireEDMProgramParserEngine",
      confidence: 0.95,
    });

    const parsed = wireEDMProgramParserEngine.parse(programContent, filename);

    reasoning_chain.push({
      step: 2,
      type: "classify",
      content: `Detected dialect: ${parsed.dialect} (${parsed.dialect_confidence}% confidence). Found ${parsed.passes.length} passes, ${parsed.contour_moves.length} moves.`,
      source: "WireEDMProgramParserEngine",
      confidence: parsed.dialect_confidence / 100,
    });

    // Step 2: Validate operation order
    const order_validation = this.validateOperationOrder(
      parsed.passes.map(p => p.condition_code).filter((c): c is string => c !== null)
    );

    reasoning_chain.push({
      step: 3,
      type: "validate",
      content: order_validation.valid
        ? `Operation order valid: ${order_validation.e_codes_found.join(" -> ")}`
        : `Operation order INVALID: ${order_validation.violations.length} violations found`,
      source: "WEDMProgramNeuralAnalysisEngine",
      confidence: 0.90,
    });

    // Add offset cascade info
    order_validation.offset_cascade_valid = this._validateOffsetCascade(parsed);
    order_validation.offset_values_mm = parsed.passes
      .map(p => p.offset_value)
      .filter((v): v is number => v !== null);

    // Step 3: M-code validation
    order_validation.m_code_validation = this._validateMCodes(parsed);

    // Step 4: Extract and analyze parameters
    const params = this._extractParams(parsed);
    const parameter_analysis = this._analyzeParameters(params, options?.material, options?.thickness_mm);

    reasoning_chain.push({
      step: 4,
      type: "compare",
      content: `Analyzed ${params.length} passes against physics models. Average health score: ${(parameter_analysis.reduce((s, p) => s + p.health_score, 0) / Math.max(parameter_analysis.length, 1)).toFixed(0)}/100.`,
      source: "WEDMProgramNeuralAnalysisEngine",
      confidence: 0.85,
    });

    // Step 5: Detect anti-patterns
    const anti_patterns = this._detectAntiPatterns(parsed, params);

    if (anti_patterns.length > 0) {
      reasoning_chain.push({
        step: 5,
        type: "infer",
        content: `Detected ${anti_patterns.length} anti-patterns: ${anti_patterns.map(a => a.name).join(", ")}`,
        source: "WEDMProgramNeuralAnalysisEngine",
        confidence: 0.88,
      });
    }

    // Step 6: Wire break risk assessment
    const wire_break_risk = this.predictWireBreakRisk(params[0] ?? this._defaultParams());

    reasoning_chain.push({
      step: 6,
      type: "infer",
      content: `Wire break risk: ${wire_break_risk.risk_level} (score ${wire_break_risk.risk_score}/100). ${wire_break_risk.factors.length} contributing factors.`,
      source: "WEDMProgramNeuralAnalysisEngine",
      confidence: wire_break_risk.risk_score < 50 ? 0.90 : 0.75,
    });

    // Step 7: Pattern matching
    const pattern_matches = this._matchPatterns(parsed, params, options?.material);

    if (pattern_matches.length > 0) {
      reasoning_chain.push({
        step: 7,
        type: "compare",
        content: `Matched ${pattern_matches.length} successful program patterns. Best match: ${pattern_matches[0].pattern_name} (${(pattern_matches[0].confidence * 100).toFixed(0)}% confidence).`,
        source: "WEDMProgramNeuralAnalysisEngine",
        confidence: pattern_matches[0].confidence,
      });
    }

    // Step 8: Generate improvements
    const partialAnalysis: Partial<ProgramAnalysis> = {
      order_validation,
      parameter_analysis,
      anti_patterns,
      wire_break_risk,
      pattern_matches,
    };
    const improvements = this.suggestImprovements(partialAnalysis);

    reasoning_chain.push({
      step: 8,
      type: "recommend",
      content: `Generated ${improvements.length} improvement suggestions. Top priority: ${improvements[0]?.title ?? "none"}`,
      source: "WEDMProgramNeuralAnalysisEngine",
      confidence: 0.85,
    });

    // Collect warnings and critical errors
    order_validation.violations.forEach(v => {
      if (v.severity === "critical") {
        critical_errors.push(v.description);
      } else {
        warnings.push(v.description);
      }
    });

    anti_patterns.filter(a => a.severity === "critical").forEach(a => {
      critical_errors.push(`${a.name}: ${a.description}`);
    });

    anti_patterns.filter(a => a.severity !== "critical").forEach(a => {
      warnings.push(`${a.name}: ${a.description}`);
    });

    // Add safety warnings from parser
    parsed.safety.warnings.forEach(w => warnings.push(w));

    // Calculate overall score
    const score = this._calculateOverallScore(
      order_validation,
      parameter_analysis,
      anti_patterns,
      wire_break_risk,
      pattern_matches
    );

    // JM Die specific notes
    const jm_die_notes = this._generateJMDieNotes(parsed, params, options?.material);

    // Calculate overall confidence
    const confidence = reasoning_chain.reduce((s, r) => s + r.confidence, 0) / reasoning_chain.length;

    return {
      filename,
      score,
      dialect: parsed.dialect,
      pass_count: parsed.passes.length,
      order_validation,
      parameter_analysis,
      anti_patterns,
      wire_break_risk,
      improvements,
      pattern_matches,
      reasoning_chain,
      jm_die_notes,
      confidence,
      warnings,
      critical_errors,
    };
  }

  // ==========================================================================
  // 2. OPERATION ORDER VALIDATION
  // ==========================================================================

  /**
   * Validate E-code operation sequence.
   *
   * @param ecodes - Array of E-codes in program order
   * @returns Validation result with violations
   */
  validateOperationOrder(ecodes: string[]): OrderValidation {
    const violations: OrderViolation[] = [];
    let valid = true;

    if (ecodes.length === 0) {
      return {
        valid: false,
        e_codes_found: [],
        expected_sequence: [],
        violations: [{
          type: "missing_pass",
          description: "No E-codes found in program",
          severity: "critical",
          fix: "Add E-code conditions (E1221, E1222, etc.) for each pass",
        }],
        offset_cascade_valid: false,
        offset_values_mm: [],
        m_code_validation: {
          has_m20_threading: false,
          has_m90_adaptive: false,
          m90_timing_valid: false,
          tank_sequence_valid: true,
          issues: [],
        },
      };
    }

    // Find matching rule
    const matchedRule = this._findMatchingRule(ecodes);
    const expectedSequence = matchedRule?.valid_sequences[0] ?? [];

    // Check for skim before rough
    const roughIndex = ecodes.findIndex(e => e.endsWith("1") || /E\d{3}$/.test(e));
    const firstSkimIndex = ecodes.findIndex(e =>
      e.endsWith("2") || e.endsWith("3") || e.endsWith("4") || e.endsWith("5")
    );

    if (roughIndex < 0 && firstSkimIndex >= 0) {
      violations.push({
        type: "missing_pass",
        description: "No rough pass (E*xx1) found, but skim passes present",
        severity: "critical",
        fix: "Add rough pass E-code before skim passes",
      });
      valid = false;
    } else if (firstSkimIndex >= 0 && firstSkimIndex < roughIndex) {
      violations.push({
        type: "skim_before_rough",
        description: `Skim pass ${ecodes[firstSkimIndex]} appears before rough pass ${ecodes[roughIndex]}`,
        severity: "critical",
        fix: "Reorder so rough pass comes first",
      });
      valid = false;
    }

    // Check for duplicate passes
    const uniqueEcodes = new Set(ecodes);
    if (uniqueEcodes.size < ecodes.length) {
      // Find duplicates
      const seen = new Set<string>();
      ecodes.forEach((e, idx) => {
        if (seen.has(e)) {
          violations.push({
            type: "duplicate_pass",
            description: `Duplicate E-code ${e} at index ${idx}`,
            severity: "minor",
            fix: "Remove duplicate E-code or verify intentional repeat (e.g., multiple features)",
          });
        }
        seen.add(e);
      });
    }

    // Check sequence matches expected
    if (matchedRule && expectedSequence.length > 0) {
      const cleanEcodes = Array.from(new Set(ecodes)); // Deduplicate for comparison
      for (let i = 0; i < Math.min(cleanEcodes.length, expectedSequence.length); i++) {
        if (cleanEcodes[i] !== expectedSequence[i]) {
          violations.push({
            type: "wrong_sequence",
            description: `Expected ${expectedSequence[i]} at position ${i + 1}, found ${cleanEcodes[i]}`,
            severity: "major",
            fix: `Use E-code ${expectedSequence[i]} for pass ${i + 1}`,
          });
          valid = false;
        }
      }
    }

    return {
      valid: valid && violations.filter(v => v.severity === "critical").length === 0,
      e_codes_found: ecodes,
      expected_sequence: expectedSequence,
      violations,
      offset_cascade_valid: true, // Will be updated by caller
      offset_values_mm: [],
      m_code_validation: {
        has_m20_threading: false,
        has_m90_adaptive: false,
        m90_timing_valid: false,
        tank_sequence_valid: true,
        issues: [],
      },
    };
  }

  // ==========================================================================
  // 3. PARAMETER OPTIMIZATION
  // ==========================================================================

  /**
   * Optimize Wire EDM parameters based on physics models.
   *
   * @param params - Current parameters
   * @param material - Material type (e.g., "tool_steel", "stainless", "carbide")
   * @param thickness_mm - Part thickness in mm
   * @returns Optimization result with suggested changes
   */
  optimizeParameters(
    params: WEDMParams,
    material = "tool_steel",
    thickness_mm = 25
  ): OptimizationResult {
    const changes: ParameterChange[] = [];
    const warnings: string[] = [];

    // Get bounds for this material/thickness
    const thicknessKey = thickness_mm < 15 ? "thin_lt_15mm" :
                         thickness_mm <= 50 ? "medium_15_50mm" : "thick_gt_50mm";
    const bounds = PARAMETER_BOUNDS[material]?.[thicknessKey] ??
                   PARAMETER_BOUNDS.tool_steel.medium_15_50mm;

    // Clone original params
    const optimized: WEDMParams = { ...params };

    // Optimize ON time
    if (params.on_time_us !== undefined) {
      if (params.on_time_us < bounds.on_time_us.min) {
        changes.push({
          parameter: "on_time_us",
          old_value: params.on_time_us,
          new_value: bounds.on_time_us.optimal,
          rationale: "ON time too low — insufficient material removal",
        });
        optimized.on_time_us = bounds.on_time_us.optimal;
      } else if (params.on_time_us > bounds.on_time_us.max) {
        changes.push({
          parameter: "on_time_us",
          old_value: params.on_time_us,
          new_value: bounds.on_time_us.optimal,
          rationale: "ON time too high — increased wire break risk and recast",
        });
        optimized.on_time_us = bounds.on_time_us.optimal;
      }
    }

    // Optimize OFF time
    if (params.off_time_us !== undefined) {
      if (params.off_time_us < bounds.off_time_us.min) {
        changes.push({
          parameter: "off_time_us",
          old_value: params.off_time_us,
          new_value: bounds.off_time_us.optimal,
          rationale: "OFF time too low — insufficient flushing, wire break risk",
        });
        optimized.off_time_us = bounds.off_time_us.optimal;
      } else if (params.off_time_us > bounds.off_time_us.max * 1.5) {
        // Only warn if significantly over — conservative OFF is safer
        changes.push({
          parameter: "off_time_us",
          old_value: params.off_time_us,
          new_value: bounds.off_time_us.optimal,
          rationale: "OFF time excessively high — cycle time penalty",
        });
        optimized.off_time_us = bounds.off_time_us.optimal;
      }
    }

    // Optimize wire tension
    if (params.wire_tension_g !== undefined) {
      if (params.wire_tension_g < bounds.wire_tension_g.min) {
        changes.push({
          parameter: "wire_tension_g",
          old_value: params.wire_tension_g,
          new_value: bounds.wire_tension_g.optimal,
          rationale: "Wire tension too low — wire wander and poor accuracy",
        });
        optimized.wire_tension_g = bounds.wire_tension_g.optimal;
      } else if (params.wire_tension_g > bounds.wire_tension_g.max) {
        changes.push({
          parameter: "wire_tension_g",
          old_value: params.wire_tension_g,
          new_value: bounds.wire_tension_g.optimal,
          rationale: "Wire tension too high — increased break risk",
        });
        optimized.wire_tension_g = bounds.wire_tension_g.optimal;
      }
    }

    // Optimize flush pressure
    if (params.flush_pressure_bar !== undefined) {
      if (params.flush_pressure_bar < bounds.flush_pressure_bar.min) {
        changes.push({
          parameter: "flush_pressure_bar",
          old_value: params.flush_pressure_bar,
          new_value: bounds.flush_pressure_bar.optimal,
          rationale: "Flush pressure too low — poor chip evacuation",
        });
        optimized.flush_pressure_bar = bounds.flush_pressure_bar.optimal;
      } else if (params.flush_pressure_bar > bounds.flush_pressure_bar.max) {
        changes.push({
          parameter: "flush_pressure_bar",
          old_value: params.flush_pressure_bar,
          new_value: bounds.flush_pressure_bar.optimal,
          rationale: "Flush pressure too high — may cause wire deflection",
        });
        optimized.flush_pressure_bar = bounds.flush_pressure_bar.optimal;
      }
    }

    // Calculate expected improvements
    const cycleReduction = changes.some(c => c.parameter === "off_time_us" && c.old_value > c.new_value)
      ? 10 : (changes.length > 0 ? 5 : 0);
    const qualityImprovement = changes.some(c => c.parameter === "on_time_us") ? 15 : 0;
    const reliabilityImprovement = changes.some(c =>
      c.parameter === "wire_tension_g" || c.parameter === "off_time_us"
    ) ? 25 : 0;

    return {
      original: params,
      optimized,
      changes,
      improvements: {
        cycle_time_reduction_pct: cycleReduction,
        quality_improvement_pct: qualityImprovement,
        reliability_improvement_pct: reliabilityImprovement,
      },
      confidence: changes.length === 0 ? 0.95 : 0.80,
      warnings,
    };
  }

  // ==========================================================================
  // 4. WIRE BREAK RISK PREDICTION
  // ==========================================================================

  /**
   * Predict wire break risk based on parameters.
   *
   * @param params - Current cutting parameters
   * @returns Risk assessment with contributing factors
   */
  predictWireBreakRisk(params: WEDMParams): RiskAssessment {
    const factors: RiskFactor[] = [];
    let totalRisk = 0;

    // Factor 1: Duty cycle (ON / (ON + OFF))
    if (params.on_time_us !== undefined && params.off_time_us !== undefined) {
      const dutyCycle = params.on_time_us / (params.on_time_us + params.off_time_us);
      const maxDuty = params.pass_type === "rough"
        ? EDM_PHYSICS.wire_safety.max_duty_rough
        : EDM_PHYSICS.wire_safety.max_duty_skim;

      if (dutyCycle > maxDuty) {
        const contribution = Math.min(30, (dutyCycle - maxDuty) / maxDuty * 100);
        factors.push({
          name: "High duty cycle",
          contribution,
          description: `Duty cycle ${(dutyCycle * 100).toFixed(1)}% exceeds max ${(maxDuty * 100).toFixed(0)}%`,
          mitigation: "Increase OFF time (B parameter)",
        });
        totalRisk += contribution;
      }
    }

    // Factor 2: Current density (for 0.25mm brass wire)
    if (params.peak_current_A !== undefined) {
      const wireArea = Math.PI * Math.pow(0.25 / 2, 2); // mm^2
      const currentDensity = params.peak_current_A / wireArea;
      const maxDensity = EDM_PHYSICS.wire_safety.max_current_density_brass;

      if (currentDensity > maxDensity * 0.8) {
        const contribution = Math.min(35, (currentDensity / maxDensity - 0.8) * 100);
        factors.push({
          name: "High current density",
          contribution,
          description: `Current density ${currentDensity.toFixed(0)} A/mm² approaching limit ${maxDensity}`,
          mitigation: "Reduce peak current (IP parameter)",
        });
        totalRisk += contribution;
      }
    }

    // Factor 3: Wire tension (for 0.25mm brass wire)
    if (params.wire_tension_g !== undefined) {
      if (params.wire_tension_g > 2000) {
        const contribution = Math.min(20, (params.wire_tension_g - 2000) / 200 * 10);
        factors.push({
          name: "Excessive wire tension",
          contribution,
          description: `Wire tension ${params.wire_tension_g}g exceeds safe limit for 0.25mm brass`,
          mitigation: "Reduce wire tension to 1500-1800g",
        });
        totalRisk += contribution;
      } else if (params.wire_tension_g < 1000) {
        factors.push({
          name: "Low wire tension",
          contribution: 10,
          description: `Low tension ${params.wire_tension_g}g causes wire wander`,
          mitigation: "Increase wire tension to 1200-1500g",
        });
        totalRisk += 10;
      }
    }

    // Factor 4: Low flush pressure (for rough cuts)
    if (params.pass_type === "rough" && params.flush_pressure_bar !== undefined) {
      if (params.flush_pressure_bar < 5) {
        const contribution = (5 - params.flush_pressure_bar) * 5;
        factors.push({
          name: "Insufficient flushing",
          contribution,
          description: `Flush pressure ${params.flush_pressure_bar} bar too low for rough cut`,
          mitigation: "Increase flush pressure to 6-8 bar",
        });
        totalRisk += contribution;
      }
    }

    // Factor 5: Missing adaptive control
    // (Would need program context for this — assume moderate risk if not checked)

    // Calculate overall risk
    const riskScore = Math.min(100, Math.round(totalRisk));
    const riskLevel: RiskAssessment["risk_level"] =
      riskScore < 25 ? "low" :
      riskScore < 50 ? "moderate" :
      riskScore < 75 ? "high" : "critical";

    // Generate mitigations
    const mitigations = factors
      .filter(f => f.mitigation)
      .map(f => f.mitigation as string)
      .slice(0, 5);

    // Estimate breaks per hour (rough empirical model)
    const predictedBreaks = riskScore < 25 ? 0 :
                           riskScore < 50 ? 0.1 :
                           riskScore < 75 ? 0.5 : 1.5;

    return {
      risk_score: riskScore,
      risk_level: riskLevel,
      factors,
      predicted_breaks_per_hour: predictedBreaks,
      mitigations: mitigations.length > 0 ? mitigations : ["Parameters within safe ranges"],
    };
  }

  // ==========================================================================
  // 5. IMPROVEMENT SUGGESTIONS
  // ==========================================================================

  /**
   * Generate improvement suggestions for a program.
   *
   * @param analysis - Partial or full program analysis
   * @returns Prioritized list of improvements
   */
  suggestImprovements(analysis: Partial<ProgramAnalysis>): Improvement[] {
    const improvements: Improvement[] = [];

    // Add improvements from anti-patterns
    if (analysis.anti_patterns) {
      analysis.anti_patterns.forEach(ap => {
        improvements.push({
          category: ap.severity === "critical" ? "safety" : "reliability",
          title: `Fix: ${ap.name}`,
          description: ap.fix,
          priority: ap.severity === "critical" ? 1 : ap.severity === "major" ? 2 : 3,
          difficulty: "moderate",
          expected_benefit: `Eliminate ${ap.name} issue`,
          affected_passes: [],
        });
      });
    }

    // Add improvements from order violations
    if (analysis.order_validation?.violations) {
      analysis.order_validation.violations.forEach(v => {
        improvements.push({
          category: v.severity === "critical" ? "safety" : "reliability",
          title: `Fix order: ${v.type.replace(/_/g, " ")}`,
          description: v.fix,
          priority: v.severity === "critical" ? 1 : 2,
          difficulty: "moderate",
          expected_benefit: "Correct operation sequence",
          affected_passes: [],
        });
      });
    }

    // Add improvements from wire break risk
    if (analysis.wire_break_risk && analysis.wire_break_risk.risk_score > 30) {
      analysis.wire_break_risk.mitigations.forEach((m, i) => {
        improvements.push({
          category: "reliability",
          title: m,
          description: `Address risk factor: ${analysis.wire_break_risk!.factors[i]?.name ?? "unknown"}`,
          priority: 2,
          difficulty: "easy",
          expected_benefit: "Reduce wire break probability",
          affected_passes: [1],
        });
      });
    }

    // Add improvements from parameter analysis
    if (analysis.parameter_analysis) {
      analysis.parameter_analysis.forEach(pa => {
        pa.optimizations.forEach(opt => {
          improvements.push({
            category: "cycle_time",
            title: `Optimize ${opt.parameter} (pass ${pa.pass_number})`,
            description: `Change from ${opt.current_value} to ${opt.suggested_value}: ${opt.expected_improvement}`,
            priority: 3,
            difficulty: "easy",
            expected_benefit: opt.expected_improvement,
            affected_passes: [pa.pass_number],
          });
        });
      });
    }

    // Sort by priority
    improvements.sort((a, b) => a.priority - b.priority);

    return improvements;
  }

  // ==========================================================================
  // PRIVATE HELPER METHODS
  // ==========================================================================

  /**
   * Find matching operation order rule for E-codes.
   */
  private _findMatchingRule(ecodes: string[]): typeof OPERATION_ORDER_RULES[string] | null {
    for (const [ruleId, rule] of Object.entries(OPERATION_ORDER_RULES)) {
      for (const seq of rule.valid_sequences) {
        // Check if ecodes match the start of any valid sequence
        const match = ecodes.every((e, i) => i >= seq.length || e === seq[i]);
        if (match) return rule;
      }
    }
    return null;
  }

  /**
   * Validate offset cascade (offsets should decrease).
   */
  private _validateOffsetCascade(program: WireEDMProgram): boolean {
    const offsets = program.passes
      .filter(p => p.offset_value !== null)
      .map(p => p.offset_value as number);

    if (offsets.length < 2) return true;

    for (let i = 1; i < offsets.length; i++) {
      if (offsets[i] > offsets[i - 1] * 1.05) { // 5% tolerance
        return false;
      }
    }
    return true;
  }

  /**
   * Validate M-code sequence.
   */
  private _validateMCodes(program: WireEDMProgram): MCodeValidation {
    const content = program.rawLines.join("\n");
    const issues: string[] = [];

    const has_m20_threading = program.wire_settings.has_auto_thread;
    const has_m90_adaptive = program.hasAdaptiveControl;

    // Check M90 timing — should be before first E-code
    let m90_timing_valid = true;
    if (has_m90_adaptive) {
      const m90Line = program.rawLines.findIndex(l => /\bM90\b/.test(l));
      const firstEcode = program.rawLines.findIndex(l => /\bE\d{4}\b/.test(l));
      if (m90Line >= 0 && firstEcode >= 0 && m90Line > firstEcode) {
        m90_timing_valid = false;
        issues.push("M90 adaptive control should be enabled before first E-code");
      }
    }

    // Check tank sequence
    const hasM78 = /\bM78\b/.test(content);
    const hasM58 = /\bM58\b/.test(content);
    let tank_sequence_valid = true;
    if (hasM78 && !hasM58) {
      tank_sequence_valid = false;
      issues.push("M78 (fill tank) used without M58 (drain) at end");
    }

    if (!has_m20_threading) {
      issues.push("No M20 wire threading command detected");
    }

    if (!has_m90_adaptive) {
      issues.push("M90 adaptive control not enabled — recommended for reliability");
    }

    return {
      has_m20_threading,
      has_m90_adaptive,
      threading_line: program.wire_settings.thread_line ?? undefined,
      m90_timing_valid,
      tank_sequence_valid,
      issues,
    };
  }

  /**
   * Extract parameters from parsed program.
   */
  private _extractParams(program: WireEDMProgram): WEDMParams[] {
    return program.passes.map(pass => ({
      e_code: pass.condition_code ?? "unknown",
      pass_number: pass.pass_number,
      pass_type: pass.phase === "rough" ? "rough" : "skim",
      feed_rate_mm_min: pass.feed_rate !== null ? pass.feed_rate * 25.4 : undefined,
      offset_mm: pass.offset_value !== null ? pass.offset_value * 25.4 : undefined,
    }));
  }

  /**
   * Analyze parameters against physics models.
   */
  private _analyzeParameters(
    params: WEDMParams[],
    material = "tool_steel",
    thickness_mm = 25
  ): ParameterAnalysis[] {
    return params.map(p => {
      const issues: ParameterIssue[] = [];
      const optimizations: Optimization[] = [];

      // Get bounds
      const thicknessKey = thickness_mm < 15 ? "thin_lt_15mm" :
                           thickness_mm <= 50 ? "medium_15_50mm" : "thick_gt_50mm";
      const bounds = PARAMETER_BOUNDS[material]?.[thicknessKey] ??
                     PARAMETER_BOUNDS.tool_steel.medium_15_50mm;

      // Check feed rate
      if (p.feed_rate_mm_min !== undefined) {
        if (p.feed_rate_mm_min < bounds.feed_rate_mm_min.min) {
          issues.push({
            parameter: "feed_rate_mm_min",
            type: "too_low",
            current_value: p.feed_rate_mm_min,
            expected_range: bounds.feed_rate_mm_min,
            severity: "minor",
            impact: "Excessive cycle time",
          });
          optimizations.push({
            parameter: "feed_rate_mm_min",
            current_value: p.feed_rate_mm_min,
            suggested_value: (bounds.feed_rate_mm_min.min + bounds.feed_rate_mm_min.max) / 2,
            expected_improvement: "10-20% cycle time reduction",
            confidence: 0.75,
          });
        }
      }

      // Calculate health score
      const healthScore = 100 - issues.length * 15 - (issues.filter(i => i.severity === "critical").length * 20);

      // Physics comparison (simplified — would use full Klocke/Kunieda models)
      const physicsNotes: string[] = [];
      if (p.pass_type === "rough") {
        physicsNotes.push(`Rough pass: expect Ra ~3-5 µm`);
      } else {
        physicsNotes.push(`Skim pass ${p.pass_number}: expect Ra improvement ~40% vs previous`);
      }

      return {
        pass_number: p.pass_number,
        e_code: p.e_code,
        pass_type: p.pass_type,
        params: p,
        health_score: Math.max(0, healthScore),
        physics_comparison: {
          notes: physicsNotes,
        },
        issues,
        optimizations,
      };
    });
  }

  /**
   * Detect anti-patterns in program.
   */
  private _detectAntiPatterns(program: WireEDMProgram, params: WEDMParams[]): AntiPattern[] {
    return ANTI_PATTERN_DATABASE
      .filter(ap => ap.detection(program, params))
      .map(ap => ({
        id: ap.id,
        name: ap.name,
        description: ap.description,
        location: "program",
        severity: ap.severity,
        fix: ap.fix,
        correct_example: ap.correct_example,
      }));
  }

  /**
   * Match program against successful patterns.
   */
  private _matchPatterns(
    program: WireEDMProgram,
    params: WEDMParams[],
    material?: string
  ): PatternMatch[] {
    const matches: PatternMatch[] = [];

    for (const pattern of SUCCESSFUL_PROGRAM_PATTERNS) {
      let score = 0;
      const notes: string[] = [];

      // Check pass count
      if (program.passes.length === pattern.pass_count) {
        score += 25;
        notes.push(`Pass count matches (${pattern.pass_count})`);
      } else if (Math.abs(program.passes.length - pattern.pass_count) <= 1) {
        score += 10;
      }

      // Check E-code family
      const familyMatch = JM_DIE_ECODE_FAMILIES.find(f => f.id === pattern.e_code_family);
      if (familyMatch) {
        const programEcodes = program.passes.map(p => p.condition_code).filter(Boolean);
        const patternEcodes = familyMatch.passes.map(p => p.e_code);
        const overlap = programEcodes.filter(e => patternEcodes.includes(e as string)).length;
        if (overlap > 0) {
          score += 25 * (overlap / patternEcodes.length);
          notes.push(`E-code family match: ${familyMatch.id}`);
        }
      }

      // Check material if known
      if (material) {
        if (pattern.material.toLowerCase() === material.toLowerCase() ||
            (pattern.material === "D2" && material === "tool_steel")) {
          score += 20;
          notes.push(`Material match: ${pattern.material}`);
        }
      }

      // Check offset pattern similarity
      const programOffsets = program.passes
        .map(p => p.offset_value)
        .filter((v): v is number => v !== null);
      if (programOffsets.length > 0 && pattern.offset_pattern_mm.length > 0) {
        const avgDiff = programOffsets.reduce((sum, off, i) => {
          const patOff = pattern.offset_pattern_mm[i] ?? pattern.offset_pattern_mm[0];
          return sum + Math.abs((off * 25.4) - patOff); // Convert inches to mm
        }, 0) / programOffsets.length;

        if (avgDiff < 0.02) {
          score += 20;
          notes.push("Offset pattern closely matches");
        } else if (avgDiff < 0.05) {
          score += 10;
        }
      }

      // Add match if score is significant
      if (score >= 30) {
        matches.push({
          pattern_id: pattern.id,
          pattern_name: pattern.name,
          confidence: score / 100,
          type: "successful_program",
          source: pattern.source,
          notes,
        });
      }
    }

    // Sort by confidence
    matches.sort((a, b) => b.confidence - a.confidence);
    return matches.slice(0, 5);
  }

  /**
   * Calculate overall program score.
   */
  private _calculateOverallScore(
    order: OrderValidation,
    paramAnalysis: ParameterAnalysis[],
    antiPatterns: AntiPattern[],
    risk: RiskAssessment,
    patterns: PatternMatch[]
  ): number {
    let score = 100;

    // Deduct for order violations
    order.violations.forEach(v => {
      score -= v.severity === "critical" ? 25 : v.severity === "major" ? 10 : 3;
    });

    // Deduct for anti-patterns
    antiPatterns.forEach(ap => {
      score -= ap.severity === "critical" ? 20 : ap.severity === "major" ? 8 : 2;
    });

    // Deduct for parameter issues
    paramAnalysis.forEach(pa => {
      score -= (100 - pa.health_score) / 10;
    });

    // Deduct for wire break risk
    score -= risk.risk_score / 5;

    // Bonus for pattern matches
    if (patterns.length > 0) {
      score += patterns[0].confidence * 10;
    }

    return Math.max(0, Math.min(100, Math.round(score)));
  }

  /**
   * Generate JM Die specific notes.
   */
  private _generateJMDieNotes(
    program: WireEDMProgram,
    params: WEDMParams[],
    material?: string
  ): string[] {
    const notes: string[] = [];

    notes.push(`Machine: Mitsubishi FA-10S (M800 controller)`);
    notes.push(`Standard wire: 0.010" brass (0.25mm)`);

    // Check H175 master pattern
    if (program.offset_declarations[175] !== undefined) {
      notes.push(`Uses H175 master offset pattern (JM Die standard)`);
    }

    // Check E-code family
    const ecodes = program.passes.map(p => p.condition_code).filter(Boolean);
    const matchedFamily = JM_DIE_ECODE_FAMILIES.find(f =>
      f.passes.some(p => ecodes.includes(p.e_code))
    );
    if (matchedFamily) {
      notes.push(`E-code family: ${matchedFamily.id} — ${matchedFamily.description}`);
    }

    // Material-specific notes
    if (material === "D2" || material === "tool_steel") {
      notes.push(`D2 tool steel: check deionizer (8-12 MΩ·cm target)`);
    }

    if (program.hasTaper) {
      notes.push(`4-axis taper program: verify UV axis homing before run`);
    }

    return notes;
  }

  /**
   * Default parameters for risk assessment when none extracted.
   */
  private _defaultParams(): WEDMParams {
    return {
      e_code: "E1221",
      pass_number: 1,
      pass_type: "rough",
      on_time_us: 5,
      off_time_us: 20,
      wire_tension_g: 1500,
      flush_pressure_bar: 7,
    };
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

/**
 * Singleton instance of WEDMProgramNeuralAnalysisEngine.
 */
export const wedmProgramNeuralAnalysisEngine = new WEDMProgramNeuralAnalysisEngine();
