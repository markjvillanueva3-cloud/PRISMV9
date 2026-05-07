/**
 * LatheLoRAPhysicsEvaluatorEngine — LATHE-LORA-MS0 U-LLR13
 * ========================================================
 *
 * Evaluates LatheLoRA model outputs for physics accuracy.
 * Validates cutting parameters against Kienzle, Taylor, and
 * dimensional consistency rules.
 *
 * Evaluation dimensions:
 *   - Kienzle force calculations (kc1.1, mc coefficients)
 *   - Taylor tool life predictions
 *   - Speed/feed bounds for material/tool combinations
 *   - Dimensional consistency (units, ranges)
 *   - Physics formula correctness
 *
 * @module engines/LatheLoRAPhysicsEvaluatorEngine
 * @version 1.0.0
 */

import { log } from "../utils/Logger.js";
import { CANONICAL_KIENZLE, CANONICAL_TAYLOR, type ISOGroup } from "../physics/constants.js";

// ============================================================================
// TYPES
// ============================================================================

/** Physics evaluation result */
export interface PhysicsEvaluation {
  overall_score: number;       // 0-100
  kienzle_score: number;       // 0-100
  taylor_score: number;        // 0-100
  bounds_score: number;        // 0-100
  dimensional_score: number;   // 0-100
  issues: PhysicsIssue[];
  passed: boolean;
}

/** Physics issue detail */
export interface PhysicsIssue {
  type: "kienzle" | "taylor" | "bounds" | "dimensional" | "formula";
  severity: "error" | "warning" | "info";
  parameter: string;
  expected: string;
  actual: string;
  message: string;
}

/** Extracted physics values from output */
export interface ExtractedPhysics {
  spindle_rpm?: number;
  surface_speed_sfm?: number;
  surface_speed_mpm?: number;
  feed_ipr?: number;
  feed_mmrev?: number;
  depth_mm?: number;
  depth_inch?: number;
  cutting_force_n?: number;
  cutting_force_lbf?: number;
  tool_life_min?: number;
  power_kw?: number;
  power_hp?: number;
  material?: string;
  iso_group?: ISOGroup;
}

/** Evaluation configuration */
export interface EvalConfig {
  kienzle_tolerance: number;   // % tolerance for force calculations
  taylor_tolerance: number;    // % tolerance for tool life
  bounds_strictness: "strict" | "moderate" | "lenient";
  require_units: boolean;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const DEFAULT_CONFIG: EvalConfig = {
  kienzle_tolerance: 15,    // 15% tolerance
  taylor_tolerance: 25,     // 25% tolerance (tool life is variable)
  bounds_strictness: "moderate",
  require_units: true,
};

/** Physics bounds by material ISO group */
const PHYSICS_BOUNDS: Record<ISOGroup, {
  sfm_min: number;
  sfm_max: number;
  ipr_min: number;
  ipr_max: number;
  doc_max_mm: number;
}> = {
  P: { sfm_min: 200, sfm_max: 800, ipr_min: 0.004, ipr_max: 0.020, doc_max_mm: 8 },
  M: { sfm_min: 100, sfm_max: 400, ipr_min: 0.004, ipr_max: 0.015, doc_max_mm: 6 },
  K: { sfm_min: 300, sfm_max: 1200, ipr_min: 0.004, ipr_max: 0.025, doc_max_mm: 10 },
  N: { sfm_min: 500, sfm_max: 3000, ipr_min: 0.004, ipr_max: 0.030, doc_max_mm: 12 },
  S: { sfm_min: 50, sfm_max: 200, ipr_min: 0.002, ipr_max: 0.010, doc_max_mm: 4 },
  H: { sfm_min: 50, sfm_max: 300, ipr_min: 0.002, ipr_max: 0.012, doc_max_mm: 3 },
};

// ============================================================================
// ENGINE CLASS
// ============================================================================

class LatheLoRAPhysicsEvaluatorEngine {
  private config: EvalConfig = DEFAULT_CONFIG;

  /**
   * Set evaluation configuration
   */
  setConfig(config: Partial<EvalConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current configuration
   */
  getConfig(): EvalConfig {
    return { ...this.config };
  }

  /**
   * Evaluate model output for physics accuracy
   */
  evaluate(output: string, context?: { material?: string; iso_group?: ISOGroup }): PhysicsEvaluation {
    const issues: PhysicsIssue[] = [];
    const extracted = this.extractPhysicsValues(output);

    // Determine ISO group
    const isoGroup = context?.iso_group || extracted.iso_group || this.inferISOGroup(output);

    // 1. Evaluate Kienzle compliance
    const kienzleScore = this.evaluateKienzle(output, extracted, isoGroup, issues);

    // 2. Evaluate Taylor compliance
    const taylorScore = this.evaluateTaylor(output, extracted, issues);

    // 3. Evaluate bounds compliance
    const boundsScore = this.evaluateBounds(extracted, isoGroup, issues);

    // 4. Evaluate dimensional consistency
    const dimensionalScore = this.evaluateDimensional(output, extracted, issues);

    // Calculate overall score
    const overallScore = (kienzleScore * 0.3 + taylorScore * 0.2 + boundsScore * 0.3 + dimensionalScore * 0.2);
    const passed = overallScore >= 70 && !issues.some(i => i.severity === "error");

    return {
      overall_score: Math.round(overallScore),
      kienzle_score: Math.round(kienzleScore),
      taylor_score: Math.round(taylorScore),
      bounds_score: Math.round(boundsScore),
      dimensional_score: Math.round(dimensionalScore),
      issues,
      passed,
    };
  }

  /**
   * Extract physics values from output text
   */
  extractPhysicsValues(output: string): ExtractedPhysics {
    const extracted: ExtractedPhysics = {};

    // Extract RPM
    const rpmMatch = output.match(/(\d+)\s*(?:rpm|RPM)/i);
    if (rpmMatch) extracted.spindle_rpm = parseInt(rpmMatch[1], 10);

    // Extract SFM
    const sfmMatch = output.match(/(\d+)\s*(?:sfm|SFM)/i);
    if (sfmMatch) extracted.surface_speed_sfm = parseInt(sfmMatch[1], 10);

    // Extract m/min
    const mpmMatch = output.match(/(\d+(?:\.\d+)?)\s*m\/min/i);
    if (mpmMatch) extracted.surface_speed_mpm = parseFloat(mpmMatch[1]);

    // Extract IPR
    const iprMatch = output.match(/(\d*\.?\d+)\s*(?:ipr|IPR)/i);
    if (iprMatch) extracted.feed_ipr = parseFloat(iprMatch[1]);

    // Extract mm/rev
    const mmrevMatch = output.match(/(\d*\.?\d+)\s*mm\/rev/i);
    if (mmrevMatch) extracted.feed_mmrev = parseFloat(mmrevMatch[1]);

    // Extract depth of cut
    const docMmMatch = output.match(/(\d*\.?\d+)\s*mm\s*(?:depth|doc|ap)/i);
    if (docMmMatch) extracted.depth_mm = parseFloat(docMmMatch[1]);

    const docInchMatch = output.match(/(\d*\.?\d+)(?:\"|inch|in)\s*(?:depth|doc)/i);
    if (docInchMatch) extracted.depth_inch = parseFloat(docInchMatch[1]);

    // Extract cutting force
    const forceNMatch = output.match(/(\d+(?:\.\d+)?)\s*(?:N|newtons?)\s*(?:force|cutting)/i);
    if (forceNMatch) extracted.cutting_force_n = parseFloat(forceNMatch[1]);

    // Extract tool life
    const toolLifeMatch = output.match(/(?:tool\s*life|life)\s*(?:of\s*)?(\d+)\s*(?:min|minutes)/i);
    if (toolLifeMatch) extracted.tool_life_min = parseInt(toolLifeMatch[1], 10);

    // Extract power
    const powerKwMatch = output.match(/(\d*\.?\d+)\s*(?:kW|kilowatts?)/i);
    if (powerKwMatch) extracted.power_kw = parseFloat(powerKwMatch[1]);

    const powerHpMatch = output.match(/(\d*\.?\d+)\s*(?:hp|HP|horsepower)/i);
    if (powerHpMatch) extracted.power_hp = parseFloat(powerHpMatch[1]);

    // Infer ISO group from material mentions
    extracted.iso_group = this.inferISOGroup(output);

    return extracted;
  }

  /**
   * Infer ISO group from output text
   */
  private inferISOGroup(output: string): ISOGroup | undefined {
    const lower = output.toLowerCase();

    if (/steel|4140|4340|1045|1018|p\s*group/i.test(lower)) return "P";
    if (/stainless|304|316|inconel|hastelloy|m\s*group/i.test(lower)) return "M";
    if (/cast\s*iron|gray\s*iron|ductile|k\s*group/i.test(lower)) return "K";
    if (/aluminum|aluminium|brass|copper|n\s*group/i.test(lower)) return "N";
    if (/titanium|ti-6al|s\s*group/i.test(lower)) return "S";
    if (/hardened|h\s*group|hrc\s*[456]/i.test(lower)) return "H";

    return undefined;
  }

  /**
   * Evaluate Kienzle force model compliance
   */
  private evaluateKienzle(
    output: string,
    extracted: ExtractedPhysics,
    isoGroup: ISOGroup | undefined,
    issues: PhysicsIssue[]
  ): number {
    let score = 100;

    // Check for Kienzle reference
    const hasKienzleRef = /kienzle|kc1\.?1|kc1_1|specific\s*cutting\s*force/i.test(output);

    if (!hasKienzleRef && extracted.cutting_force_n) {
      issues.push({
        type: "kienzle",
        severity: "warning",
        parameter: "force_model",
        expected: "Kienzle model reference",
        actual: "Force without model citation",
        message: "Cutting force mentioned without Kienzle model reference",
      });
      score -= 15;
    }

    // Validate kc1.1 values if mentioned
    if (isoGroup && hasKienzleRef) {
      const kc1Pattern = /kc1\.?1\s*[=:]\s*(\d+)/i;
      const kc1Match = output.match(kc1Pattern);

      if (kc1Match) {
        const mentionedKc1 = parseInt(kc1Match[1], 10);
        const canonicalKc1 = CANONICAL_KIENZLE[isoGroup].kc1_1;
        const deviation = Math.abs(mentionedKc1 - canonicalKc1) / canonicalKc1 * 100;

        if (deviation > this.config.kienzle_tolerance) {
          issues.push({
            type: "kienzle",
            severity: "error",
            parameter: "kc1.1",
            expected: `${canonicalKc1} MPa for ${isoGroup} group`,
            actual: `${mentionedKc1} MPa`,
            message: `kc1.1 deviation ${deviation.toFixed(1)}% exceeds ${this.config.kienzle_tolerance}% tolerance`,
          });
          score -= 30;
        }
      }

      // Check mc exponent if mentioned
      const mcPattern = /mc\s*[=:]\s*(\d*\.?\d+)/i;
      const mcMatch = output.match(mcPattern);

      if (mcMatch) {
        const mentionedMc = parseFloat(mcMatch[1]);
        const canonicalMc = CANONICAL_KIENZLE[isoGroup].mc;
        const mcDeviation = Math.abs(mentionedMc - canonicalMc) / canonicalMc * 100;

        if (mcDeviation > 20) {
          issues.push({
            type: "kienzle",
            severity: "warning",
            parameter: "mc",
            expected: `${canonicalMc} for ${isoGroup} group`,
            actual: `${mentionedMc}`,
            message: `mc exponent deviation ${mcDeviation.toFixed(1)}%`,
          });
          score -= 10;
        }
      }
    }

    return Math.max(0, score);
  }

  /**
   * Evaluate Taylor tool life model compliance
   */
  private evaluateTaylor(
    output: string,
    extracted: ExtractedPhysics,
    issues: PhysicsIssue[]
  ): number {
    let score = 100;

    const hasTaylorRef = /taylor|tool\s*life\s*equation|vt\^?n|v\s*\*\s*t/i.test(output);

    if (!hasTaylorRef && extracted.tool_life_min) {
      issues.push({
        type: "taylor",
        severity: "info",
        parameter: "tool_life_model",
        expected: "Taylor equation reference",
        actual: "Tool life without model citation",
        message: "Tool life predicted without Taylor equation reference",
      });
      score -= 10;
    }

    // Validate tool life is reasonable
    if (extracted.tool_life_min !== undefined) {
      if (extracted.tool_life_min < 5) {
        issues.push({
          type: "taylor",
          severity: "warning",
          parameter: "tool_life",
          expected: ">= 5 minutes",
          actual: `${extracted.tool_life_min} minutes`,
          message: "Tool life seems too short",
        });
        score -= 15;
      } else if (extracted.tool_life_min > 480) {
        issues.push({
          type: "taylor",
          severity: "warning",
          parameter: "tool_life",
          expected: "<= 480 minutes (8 hours)",
          actual: `${extracted.tool_life_min} minutes`,
          message: "Tool life seems unrealistically long",
        });
        score -= 15;
      }
    }

    return Math.max(0, score);
  }

  /**
   * Evaluate parameter bounds compliance
   */
  private evaluateBounds(
    extracted: ExtractedPhysics,
    isoGroup: ISOGroup | undefined,
    issues: PhysicsIssue[]
  ): number {
    let score = 100;
    const bounds = isoGroup ? PHYSICS_BOUNDS[isoGroup] : PHYSICS_BOUNDS["P"];

    // Check SFM bounds
    if (extracted.surface_speed_sfm !== undefined) {
      const strictness = this.config.bounds_strictness;
      const margin = strictness === "strict" ? 1.0 : strictness === "moderate" ? 1.2 : 1.5;

      if (extracted.surface_speed_sfm < bounds.sfm_min / margin) {
        issues.push({
          type: "bounds",
          severity: strictness === "strict" ? "error" : "warning",
          parameter: "surface_speed",
          expected: `>= ${bounds.sfm_min} SFM`,
          actual: `${extracted.surface_speed_sfm} SFM`,
          message: "Surface speed below minimum",
        });
        score -= 20;
      } else if (extracted.surface_speed_sfm > bounds.sfm_max * margin) {
        issues.push({
          type: "bounds",
          severity: strictness === "strict" ? "error" : "warning",
          parameter: "surface_speed",
          expected: `<= ${bounds.sfm_max} SFM`,
          actual: `${extracted.surface_speed_sfm} SFM`,
          message: "Surface speed above maximum",
        });
        score -= 20;
      }
    }

    // Check feed rate bounds
    if (extracted.feed_ipr !== undefined) {
      if (extracted.feed_ipr < bounds.ipr_min) {
        issues.push({
          type: "bounds",
          severity: "warning",
          parameter: "feed_rate",
          expected: `>= ${bounds.ipr_min} IPR`,
          actual: `${extracted.feed_ipr} IPR`,
          message: "Feed rate below minimum",
        });
        score -= 15;
      } else if (extracted.feed_ipr > bounds.ipr_max) {
        issues.push({
          type: "bounds",
          severity: "warning",
          parameter: "feed_rate",
          expected: `<= ${bounds.ipr_max} IPR`,
          actual: `${extracted.feed_ipr} IPR`,
          message: "Feed rate above maximum",
        });
        score -= 15;
      }
    }

    // Check depth of cut bounds
    if (extracted.depth_mm !== undefined && extracted.depth_mm > bounds.doc_max_mm) {
      issues.push({
        type: "bounds",
        severity: "warning",
        parameter: "depth_of_cut",
        expected: `<= ${bounds.doc_max_mm} mm`,
        actual: `${extracted.depth_mm} mm`,
        message: "Depth of cut exceeds typical maximum",
      });
      score -= 15;
    }

    return Math.max(0, score);
  }

  /**
   * Evaluate dimensional consistency
   */
  private evaluateDimensional(
    output: string,
    extracted: ExtractedPhysics,
    issues: PhysicsIssue[]
  ): number {
    let score = 100;

    // Check unit consistency
    const hasMetric = /mm|m\/min|kW/i.test(output);
    const hasImperial = /inch|ipr|sfm|hp/i.test(output);

    if (hasMetric && hasImperial) {
      // Mixed units — check for conversion
      const hasConversion = /convert|equivalent|=|≈/i.test(output);
      if (!hasConversion) {
        issues.push({
          type: "dimensional",
          severity: "info",
          parameter: "units",
          expected: "Consistent units or conversions shown",
          actual: "Mixed metric/imperial without conversion",
          message: "Mixed unit systems without explicit conversion",
        });
        score -= 10;
      }
    }

    // Validate SFM to RPM relationship if both present
    if (extracted.surface_speed_sfm && extracted.spindle_rpm) {
      // SFM = (π × D × N) / 12, so need diameter
      // If diameter is implied, check rough consistency
      const impliedDiameter = (extracted.surface_speed_sfm * 12) / (Math.PI * extracted.spindle_rpm);
      if (impliedDiameter < 0.1 || impliedDiameter > 24) {
        issues.push({
          type: "dimensional",
          severity: "warning",
          parameter: "sfm_rpm_relationship",
          expected: "Implied diameter 0.1-24 inches",
          actual: `Implied diameter ${impliedDiameter.toFixed(2)} inches`,
          message: "SFM/RPM relationship implies unusual diameter",
        });
        score -= 15;
      }
    }

    // Check if units are specified when required
    if (this.config.require_units) {
      if (extracted.cutting_force_n === undefined && /\d+\s*(?:force|cutting)/i.test(output)) {
        issues.push({
          type: "dimensional",
          severity: "warning",
          parameter: "force_units",
          expected: "Force with units (N or lbf)",
          actual: "Force without units",
          message: "Force value without units specified",
        });
        score -= 10;
      }
    }

    return Math.max(0, score);
  }

  /**
   * Get summary string for evaluation
   */
  getSummary(eval_result: PhysicsEvaluation): string {
    const status = eval_result.passed ? "PASS" : "FAIL";
    const errors = eval_result.issues.filter(i => i.severity === "error").length;
    const warnings = eval_result.issues.filter(i => i.severity === "warning").length;

    return [
      `[${status}] Score: ${eval_result.overall_score}/100`,
      `Kienzle: ${eval_result.kienzle_score}`,
      `Taylor: ${eval_result.taylor_score}`,
      `Bounds: ${eval_result.bounds_score}`,
      `Dimensional: ${eval_result.dimensional_score}`,
      errors > 0 ? `Errors: ${errors}` : null,
      warnings > 0 ? `Warnings: ${warnings}` : null,
    ].filter(Boolean).join(" | ");
  }

  /**
   * Get canonical Kienzle coefficients for reference
   */
  getCanonicalKienzle(isoGroup: ISOGroup): { kc1_1: number; mc: number } {
    return CANONICAL_KIENZLE[isoGroup];
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const latheLoRAPhysicsEvaluatorEngine = new LatheLoRAPhysicsEvaluatorEngine();
