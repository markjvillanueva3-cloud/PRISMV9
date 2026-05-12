/**
 * LatheTroubleshootingIntelligenceEngine — Practical Problem-Solving for Machinists
 * ==================================================================================
 * Provides AI-powered diagnosis and solutions for common lathe machining problems:
 *   1. Tool Overhang Analysis — L/D ratio risks, safe limits, damped toolholder advice
 *   2. Workpiece Overhang Analysis — Unsupported length, tailstock, steady rest needs
 *   3. Chatter Diagnosis — Root cause identification and parameter adjustments
 *   4. Machining Error Diagnosis — Taper, roundness, finish, concentricity issues
 *   5. Tool Breakage Prevention — Warning signs, parameter limits, risk factors
 *   6. Setup Validation — Common mistakes, checklist verification, risk assessment
 *
 * Based on decades of shop-floor experience and machinist best practices.
 *
 * @module engines/LatheTroubleshootingIntelligenceEngine
 * @version 1.0.0
 * @milestone LLM-INTEL-10
 */

import { log } from "../utils/Logger.js";

// ============================================================================
// TYPES
// ============================================================================

/** Tool setup for overhang analysis */
export interface ToolSetup {
  tool_type: "turning" | "boring_bar" | "grooving" | "threading" | "drill" | "parting";
  shank_diameter_mm: number;
  overhang_mm: number;
  holder_type: "standard" | "reduced_shank" | "damped" | "carbide_shank";
  insert_size_mm?: number;
  tool_material: "carbide" | "hss" | "ceramic" | "cbn";
  is_internal: boolean;
}

/** Workpiece setup for overhang analysis */
export interface WorkpieceSetup {
  diameter_mm: number;
  length_mm: number;
  material: string;
  hardness_hrc?: number;
  wall_thickness_mm?: number;  // For tubes/sleeves
  holding_method: "3_jaw_chuck" | "collet" | "4_jaw_chuck" | "faceplate" | "between_centers";
  chuck_grip_length_mm: number;
  tailstock_support: boolean;
  steady_rest: boolean;
  steady_rest_position_mm?: number;
}

/** Cutting parameters for troubleshooting */
export interface CuttingParameters {
  cutting_speed_m_min: number;
  feed_mm_rev: number;
  depth_of_cut_mm: number;
  operation: "roughing" | "finishing" | "threading" | "grooving" | "parting" | "boring";
  coolant: "flood" | "mist" | "dry" | "high_pressure";
}

/** Tool overhang analysis result */
export interface ToolOverhangAnalysis {
  ld_ratio: number;
  risk_level: "safe" | "marginal" | "risky" | "dangerous";
  max_safe_overhang_mm: number;
  deflection_estimate_mm: number;
  recommendations: ToolOverhangRecommendation[];
  alternative_approaches: string[];
  parameter_adjustments: ParameterAdjustment[];
  warnings: string[];
}

export interface ToolOverhangRecommendation {
  priority: number;
  action: string;
  reason: string;
  expected_improvement: string;
}

export interface ParameterAdjustment {
  parameter: string;
  current_value: number;
  recommended_value: number;
  unit: string;
  reason: string;
}

/** Workpiece overhang analysis result */
export interface WorkpieceOverhangAnalysis {
  unsupported_length_mm: number;
  ld_ratio: number;
  risk_level: "safe" | "marginal" | "risky" | "dangerous";
  max_safe_unsupported_mm: number;
  deflection_at_tip_mm: number;
  support_requirements: SupportRequirement[];
  chuck_pressure_recommendation: string;
  parameter_adjustments: ParameterAdjustment[];
  warnings: string[];
}

export interface SupportRequirement {
  support_type: "tailstock" | "steady_rest" | "follower_rest" | "none";
  required: boolean;
  position_mm?: number;
  reason: string;
}

/** Chatter diagnosis result */
export interface ChatterDiagnosis {
  likely_type: "regenerative" | "forced" | "mode_coupling" | "stick_slip" | "unknown";
  confidence: number;
  root_causes: ChatterCause[];
  contributing_factors: string[];
  speed_recommendations: SpeedRecommendation[];
  parameter_fixes: ParameterAdjustment[];
  tooling_changes: string[];
  setup_changes: string[];
  severity: "minor" | "moderate" | "severe";
}

export interface ChatterCause {
  cause: string;
  probability: number;
  explanation: string;
  fix: string;
}

export interface SpeedRecommendation {
  rpm: number;
  reason: string;
  stability_score: number;
}

/** Machining error diagnosis */
export interface MachiningErrorDiagnosis {
  error_type: string;
  likely_causes: ErrorCause[];
  measurement_suggestions: string[];
  corrective_actions: CorrectiveAction[];
  prevention_measures: string[];
  related_errors: string[];
}

export interface ErrorCause {
  cause: string;
  probability: number;
  how_to_verify: string;
  fix: string;
}

export interface CorrectiveAction {
  priority: number;
  action: string;
  expected_result: string;
  difficulty: "easy" | "moderate" | "difficult";
}

/** Tool breakage risk assessment */
export interface ToolBreakageRisk {
  overall_risk: "low" | "medium" | "high" | "critical";
  risk_score: number;  // 0-100
  risk_factors: RiskFactor[];
  warning_signs: string[];
  preventive_actions: string[];
  parameter_limits: ParameterLimit[];
  monitoring_recommendations: string[];
}

export interface RiskFactor {
  factor: string;
  severity: number;  // 1-10
  contribution_pct: number;
  mitigation: string;
}

export interface ParameterLimit {
  parameter: string;
  current_value: number;
  safe_limit: number;
  unit: string;
  exceeded: boolean;
}

/** Setup validation result */
export interface SetupValidation {
  valid: boolean;
  score: number;  // 0-100
  issues_found: SetupIssue[];
  checklist_items: ChecklistItem[];
  risk_assessment: string;
  recommendations: string[];
}

export interface SetupIssue {
  category: string;
  issue: string;
  severity: "info" | "warning" | "critical";
  fix: string;
}

export interface ChecklistItem {
  item: string;
  checked: boolean;
  status: "ok" | "warning" | "fail" | "na";
  note?: string;
}

// ============================================================================
// CONSTANTS — Based on machinist best practices and engineering limits
// ============================================================================

/** Safe L/D ratios by tool type */
const TOOL_LD_LIMITS = {
  turning: { safe: 4, marginal: 5, risky: 6 },
  boring_bar: { safe: 3, marginal: 4, risky: 5 },
  grooving: { safe: 3, marginal: 4, risky: 5 },
  threading: { safe: 4, marginal: 5, risky: 6 },
  drill: { safe: 5, marginal: 7, risky: 10 },
  parting: { safe: 2, marginal: 3, risky: 4 },
};

/** Damped toolholder improvement factors */
const DAMPED_HOLDER_FACTOR = 1.5;  // Can extend L/D by 50%
const CARBIDE_SHANK_FACTOR = 1.3;  // Carbide shank extends L/D by 30%

/** Workpiece L/D limits by holding method */
const WORKPIECE_LD_LIMITS = {
  "3_jaw_chuck": { safe: 3, marginal: 4, risky: 5 },
  "collet": { safe: 4, marginal: 5, risky: 6 },
  "4_jaw_chuck": { safe: 3, marginal: 4, risky: 5 },
  "faceplate": { safe: 2, marginal: 3, risky: 4 },
  "between_centers": { safe: 10, marginal: 15, risky: 20 },
};

/** Chatter frequency ranges (Hz) */
const CHATTER_FREQUENCIES = {
  regenerative: { min: 100, max: 2000 },
  forced: { min: 50, max: 500 },
  mode_coupling: { min: 200, max: 1500 },
  stick_slip: { min: 10, max: 100 },
};

/** Common machining error causes with probabilities */
const TAPER_CAUSES = [
  { cause: "Tailstock misalignment", probability: 0.35, how_to_verify: "Measure with test bar or indicator", fix: "Realign tailstock to spindle centerline" },
  { cause: "Tool wear (uneven)", probability: 0.25, how_to_verify: "Inspect insert for wear pattern", fix: "Replace insert, check tool pressure" },
  { cause: "Workpiece deflection", probability: 0.20, how_to_verify: "Check L/D ratio, measure deflection", fix: "Add support, reduce DOC, use steady rest" },
  { cause: "Headstock bearing wear", probability: 0.10, how_to_verify: "Check spindle runout", fix: "Service spindle bearings" },
  { cause: "Bed wear/twist", probability: 0.10, how_to_verify: "Level machine, check ways", fix: "Resurface or replace ways" },
];

const CHATTER_CAUSES = [
  { cause: "Excessive tool overhang", probability: 0.30, explanation: "Long overhang reduces tool stiffness, allowing vibration", fix: "Reduce overhang, use larger shank, damped holder" },
  { cause: "Incorrect speed (hitting resonance)", probability: 0.25, explanation: "Cutting speed matches system natural frequency", fix: "Change RPM by 15-20% up or down" },
  { cause: "Too high depth of cut", probability: 0.20, explanation: "High cutting forces exceed system stability limit", fix: "Reduce DOC, increase feed to maintain MRR" },
  { cause: "Workpiece overhang/flexibility", probability: 0.15, explanation: "Long unsupported workpiece acts as vibrating beam", fix: "Add tailstock support or steady rest" },
  { cause: "Worn tool or wrong geometry", probability: 0.10, explanation: "Dull edge or wrong rake angle increases cutting forces", fix: "Replace insert, check nose radius and rake" },
];

// ============================================================================
// ENGINE IMPLEMENTATION
// ============================================================================

export class LatheTroubleshootingIntelligenceEngine {

  /**
   * Analyze tool overhang and provide recommendations.
   */
  analyzeToolOverhang(
    toolSetup: ToolSetup,
    cuttingParams: CuttingParameters
  ): ToolOverhangAnalysis {
    log.info(`[LatheTroubleshooting] Analyzing tool overhang: ${toolSetup.tool_type}, ${toolSetup.overhang_mm}mm`);

    const ldRatio = toolSetup.overhang_mm / toolSetup.shank_diameter_mm;
    const limits = TOOL_LD_LIMITS[toolSetup.tool_type];

    // Adjust limits for special holders
    let effectiveLimits = { ...limits };
    if (toolSetup.holder_type === "damped") {
      effectiveLimits = {
        safe: limits.safe * DAMPED_HOLDER_FACTOR,
        marginal: limits.marginal * DAMPED_HOLDER_FACTOR,
        risky: limits.risky * DAMPED_HOLDER_FACTOR,
      };
    } else if (toolSetup.holder_type === "carbide_shank") {
      effectiveLimits = {
        safe: limits.safe * CARBIDE_SHANK_FACTOR,
        marginal: limits.marginal * CARBIDE_SHANK_FACTOR,
        risky: limits.risky * CARBIDE_SHANK_FACTOR,
      };
    }

    // Determine risk level
    let riskLevel: ToolOverhangAnalysis["risk_level"];
    if (ldRatio <= effectiveLimits.safe) {
      riskLevel = "safe";
    } else if (ldRatio <= effectiveLimits.marginal) {
      riskLevel = "marginal";
    } else if (ldRatio <= effectiveLimits.risky) {
      riskLevel = "risky";
    } else {
      riskLevel = "dangerous";
    }

    // Calculate max safe overhang
    const maxSafeOverhang = toolSetup.shank_diameter_mm * effectiveLimits.safe;

    // Estimate deflection using cantilever beam formula: δ = FL³/(3EI)
    // Simplified for steel: E = 200 GPa, I = πd⁴/64
    const F_N = this.estimateCuttingForce(cuttingParams);
    const E = toolSetup.holder_type === "carbide_shank" ? 600e9 : 200e9; // Carbide vs steel
    const I = (Math.PI * Math.pow(toolSetup.shank_diameter_mm / 1000, 4)) / 64;
    const L = toolSetup.overhang_mm / 1000;
    const deflection_m = (F_N * Math.pow(L, 3)) / (3 * E * I);
    const deflection_mm = deflection_m * 1000;

    // Build recommendations
    const recommendations: ToolOverhangRecommendation[] = [];
    const warnings: string[] = [];
    const alternativeApproaches: string[] = [];

    if (riskLevel === "dangerous" || riskLevel === "risky") {
      recommendations.push({
        priority: 1,
        action: "Reduce tool overhang",
        reason: `Current L/D ratio (${ldRatio.toFixed(1)}) exceeds safe limit (${effectiveLimits.safe})`,
        expected_improvement: `Reduce deflection by ${((1 - Math.pow(maxSafeOverhang / toolSetup.overhang_mm, 3)) * 100).toFixed(0)}%`,
      });

      if (toolSetup.holder_type === "standard" && toolSetup.is_internal) {
        recommendations.push({
          priority: 2,
          action: "Switch to damped boring bar",
          reason: "Damped bars extend usable L/D by 50% through vibration absorption",
          expected_improvement: "Can safely reach L/D of 6-8 instead of 4",
        });
        alternativeApproaches.push("Anti-vibration boring bar (Sandvik Silent Tools, Kennametal KM, etc.)");
      }

      if (toolSetup.holder_type !== "carbide_shank") {
        recommendations.push({
          priority: 3,
          action: "Use carbide shank toolholder",
          reason: "Carbide has 3x the modulus of steel, reducing deflection",
          expected_improvement: "Extends safe L/D by ~30%",
        });
      }

      warnings.push(`Estimated deflection: ${deflection_mm.toFixed(3)}mm - may cause chatter and poor finish`);
    }

    if (riskLevel === "marginal") {
      recommendations.push({
        priority: 1,
        action: "Monitor for chatter and finish quality",
        reason: "Operating near stability limit",
        expected_improvement: "Early detection prevents scrap",
      });
    }

    // Parameter adjustments
    const parameterAdjustments: ParameterAdjustment[] = [];

    if (riskLevel !== "safe") {
      // Reduce DOC to lower cutting forces
      const reducedDOC = cuttingParams.depth_of_cut_mm * 0.6;
      parameterAdjustments.push({
        parameter: "depth_of_cut",
        current_value: cuttingParams.depth_of_cut_mm,
        recommended_value: reducedDOC,
        unit: "mm",
        reason: "Reduce cutting force to compensate for tool flexibility",
      });

      // Increase feed to maintain MRR (within limits)
      const increasedFeed = Math.min(cuttingParams.feed_mm_rev * 1.3, 0.4);
      parameterAdjustments.push({
        parameter: "feed",
        current_value: cuttingParams.feed_mm_rev,
        recommended_value: increasedFeed,
        unit: "mm/rev",
        reason: "Compensate MRR loss from reduced DOC",
      });
    }

    // Alternative approaches for internal operations
    if (toolSetup.is_internal && ldRatio > limits.risky) {
      alternativeApproaches.push("Consider multiple light passes instead of single heavy cut");
      alternativeApproaches.push("Evaluate if feature can be machined from opposite end");
      alternativeApproaches.push("Consider wire EDM for deep internal features");
    }

    return {
      ld_ratio: ldRatio,
      risk_level: riskLevel,
      max_safe_overhang_mm: maxSafeOverhang,
      deflection_estimate_mm: deflection_mm,
      recommendations,
      alternative_approaches: alternativeApproaches,
      parameter_adjustments: parameterAdjustments,
      warnings,
    };
  }

  /**
   * Analyze workpiece overhang and support requirements.
   */
  analyzeWorkpieceOverhang(
    workpieceSetup: WorkpieceSetup,
    cuttingParams: CuttingParameters
  ): WorkpieceOverhangAnalysis {
    log.info(`[LatheTroubleshooting] Analyzing workpiece overhang: ${workpieceSetup.diameter_mm}x${workpieceSetup.length_mm}mm`);

    // Calculate unsupported length
    let unsupportedLength = workpieceSetup.length_mm - workpieceSetup.chuck_grip_length_mm;
    if (workpieceSetup.tailstock_support) {
      unsupportedLength = 0;  // Supported at both ends
    } else if (workpieceSetup.steady_rest && workpieceSetup.steady_rest_position_mm) {
      unsupportedLength = Math.max(
        workpieceSetup.steady_rest_position_mm - workpieceSetup.chuck_grip_length_mm,
        workpieceSetup.length_mm - workpieceSetup.steady_rest_position_mm
      );
    }

    const ldRatio = unsupportedLength / workpieceSetup.diameter_mm;
    const limits = WORKPIECE_LD_LIMITS[workpieceSetup.holding_method];

    // Determine risk level
    let riskLevel: WorkpieceOverhangAnalysis["risk_level"];
    if (ldRatio <= limits.safe) {
      riskLevel = "safe";
    } else if (ldRatio <= limits.marginal) {
      riskLevel = "marginal";
    } else if (ldRatio <= limits.risky) {
      riskLevel = "risky";
    } else {
      riskLevel = "dangerous";
    }

    // Calculate max safe unsupported length
    const maxSafeUnsupported = workpieceSetup.diameter_mm * limits.safe;

    // Estimate deflection at workpiece tip (cantilever beam)
    const F_N = this.estimateCuttingForce(cuttingParams);
    const E = 200e9; // Steel
    let I: number;
    if (workpieceSetup.wall_thickness_mm) {
      // Hollow tube: I = π(D⁴ - d⁴)/64
      const outerR = workpieceSetup.diameter_mm / 2000;
      const innerR = (workpieceSetup.diameter_mm - 2 * workpieceSetup.wall_thickness_mm) / 2000;
      I = (Math.PI / 64) * (Math.pow(outerR * 2, 4) - Math.pow(innerR * 2, 4));
    } else {
      I = (Math.PI * Math.pow(workpieceSetup.diameter_mm / 1000, 4)) / 64;
    }
    const L = unsupportedLength / 1000;
    const deflection_m = (F_N * Math.pow(L, 3)) / (3 * E * I);
    const deflection_mm = deflection_m * 1000;

    // Build support requirements
    const supportRequirements: SupportRequirement[] = [];
    const warnings: string[] = [];

    if (riskLevel === "dangerous" || riskLevel === "risky") {
      if (!workpieceSetup.tailstock_support) {
        supportRequirements.push({
          support_type: "tailstock",
          required: true,
          reason: `L/D ratio (${ldRatio.toFixed(1)}) exceeds safe limit (${limits.safe}) - end support essential`,
        });
      }

      if (workpieceSetup.length_mm > 200 && !workpieceSetup.steady_rest) {
        const steadyPosition = workpieceSetup.chuck_grip_length_mm + (unsupportedLength * 0.6);
        supportRequirements.push({
          support_type: "steady_rest",
          required: ldRatio > limits.risky,
          position_mm: steadyPosition,
          reason: "Long workpiece needs intermediate support to prevent whipping",
        });
      }

      if (workpieceSetup.wall_thickness_mm && workpieceSetup.wall_thickness_mm < workpieceSetup.diameter_mm * 0.1) {
        warnings.push("Thin-wall part: risk of crushing under chuck pressure or cutting forces");
        supportRequirements.push({
          support_type: "follower_rest",
          required: true,
          reason: "Thin wall requires support directly behind cutting zone",
        });
      }

      warnings.push(`Estimated tip deflection: ${deflection_mm.toFixed(3)}mm - will cause taper`);
    } else if (riskLevel === "marginal") {
      supportRequirements.push({
        support_type: "tailstock",
        required: false,
        reason: "Recommended for finishing operations to ensure accuracy",
      });
    } else {
      supportRequirements.push({
        support_type: "none",
        required: false,
        reason: "Workpiece is adequately supported by chuck alone",
      });
    }

    // Check thin wall regardless of overhang risk
    if (workpieceSetup.wall_thickness_mm && workpieceSetup.wall_thickness_mm < workpieceSetup.diameter_mm * 0.1) {
      if (!warnings.some(w => w.includes("Thin-wall"))) {
        warnings.push("Thin-wall part: risk of deformation under chuck pressure or cutting forces");
      }
    }

    // Chuck pressure recommendation
    let chuckPressure: string;
    if (workpieceSetup.wall_thickness_mm && workpieceSetup.wall_thickness_mm < 5) {
      chuckPressure = "Reduce chuck pressure to minimum safe level - thin wall risk";
    } else if (workpieceSetup.holding_method === "3_jaw_chuck" && riskLevel !== "safe") {
      chuckPressure = "Ensure adequate chuck pressure - high cutting forces expected";
    } else {
      chuckPressure = "Standard chuck pressure appropriate";
    }

    // Parameter adjustments
    const parameterAdjustments: ParameterAdjustment[] = [];

    if (riskLevel !== "safe") {
      parameterAdjustments.push({
        parameter: "depth_of_cut",
        current_value: cuttingParams.depth_of_cut_mm,
        recommended_value: cuttingParams.depth_of_cut_mm * 0.5,
        unit: "mm",
        reason: "Reduce cutting force on flexible workpiece",
      });

      // For finishing, recommend lower feed for better finish despite deflection
      if (cuttingParams.operation === "finishing") {
        parameterAdjustments.push({
          parameter: "feed",
          current_value: cuttingParams.feed_mm_rev,
          recommended_value: cuttingParams.feed_mm_rev * 0.7,
          unit: "mm/rev",
          reason: "Lower feed improves finish on deflecting workpiece",
        });
      }
    }

    return {
      unsupported_length_mm: unsupportedLength,
      ld_ratio: ldRatio,
      risk_level: riskLevel,
      max_safe_unsupported_mm: maxSafeUnsupported,
      deflection_at_tip_mm: deflection_mm,
      support_requirements: supportRequirements,
      chuck_pressure_recommendation: chuckPressure,
      parameter_adjustments: parameterAdjustments,
      warnings,
    };
  }

  /**
   * Diagnose chatter root causes and provide solutions.
   */
  diagnoseChatter(
    symptoms: {
      frequency_hz?: number;
      surface_pattern: "fine_waves" | "coarse_marks" | "irregular" | "spiral_marks";
      noise_type: "squeal" | "growl" | "rattle" | "harmonic";
      when_occurs: "always" | "at_certain_speeds" | "at_high_doc" | "at_end_of_cut";
    },
    toolSetup: ToolSetup,
    workpieceSetup: WorkpieceSetup,
    cuttingParams: CuttingParameters
  ): ChatterDiagnosis {
    log.info(`[LatheTroubleshooting] Diagnosing chatter: ${symptoms.noise_type}, ${symptoms.surface_pattern}`);

    // Determine likely chatter type based on symptoms
    let likelyType: ChatterDiagnosis["likely_type"];
    let confidence = 0.7;

    if (symptoms.frequency_hz) {
      if (symptoms.frequency_hz >= CHATTER_FREQUENCIES.regenerative.min &&
          symptoms.frequency_hz <= CHATTER_FREQUENCIES.regenerative.max) {
        likelyType = "regenerative";
        confidence = 0.85;
      } else if (symptoms.frequency_hz <= CHATTER_FREQUENCIES.stick_slip.max) {
        likelyType = "stick_slip";
        confidence = 0.75;
      } else {
        likelyType = "forced";
        confidence = 0.6;
      }
    } else {
      // Infer from symptoms
      if (symptoms.noise_type === "squeal" && symptoms.surface_pattern === "fine_waves") {
        likelyType = "regenerative";
      } else if (symptoms.noise_type === "growl" && symptoms.when_occurs === "at_certain_speeds") {
        likelyType = "forced";
      } else if (symptoms.when_occurs === "at_high_doc") {
        likelyType = "mode_coupling";
      } else if (symptoms.noise_type === "rattle") {
        likelyType = "stick_slip";
      } else {
        likelyType = "unknown";
        confidence = 0.4;
      }
    }

    // Analyze root causes based on setup
    const rootCauses: ChatterCause[] = [];
    const contributingFactors: string[] = [];

    // Check tool overhang
    const toolLD = toolSetup.overhang_mm / toolSetup.shank_diameter_mm;
    const toolLimits = TOOL_LD_LIMITS[toolSetup.tool_type];
    if (toolLD > toolLimits.marginal) {
      rootCauses.push({
        cause: "Excessive tool overhang",
        probability: 0.4,
        explanation: `L/D ratio of ${toolLD.toFixed(1)} exceeds recommended ${toolLimits.safe}`,
        fix: "Reduce overhang, use larger shank, or switch to damped holder",
      });
      contributingFactors.push(`Tool L/D ratio: ${toolLD.toFixed(1)} (limit: ${toolLimits.safe})`);
    }

    // Check workpiece overhang
    const unsupportedLength = workpieceSetup.length_mm - workpieceSetup.chuck_grip_length_mm;
    const workpieceLD = unsupportedLength / workpieceSetup.diameter_mm;
    const workpieceLimits = WORKPIECE_LD_LIMITS[workpieceSetup.holding_method];
    if (workpieceLD > workpieceLimits.marginal) {
      rootCauses.push({
        cause: "Workpiece overhang/flexibility",
        probability: 0.35,
        explanation: `Unsupported L/D of ${workpieceLD.toFixed(1)} causes workpiece to vibrate`,
        fix: "Add tailstock support or steady rest",
      });
      contributingFactors.push(`Workpiece unsupported L/D: ${workpieceLD.toFixed(1)}`);
    }

    // Check if hitting resonance (common at certain speeds)
    if (symptoms.when_occurs === "at_certain_speeds") {
      rootCauses.push({
        cause: "Operating at resonant speed",
        probability: 0.45,
        explanation: "Spindle RPM matches system natural frequency",
        fix: "Change speed by 15-20% up or down to move away from resonance",
      });
    }

    // Check depth of cut
    if (cuttingParams.depth_of_cut_mm > 3) {
      rootCauses.push({
        cause: "Excessive depth of cut",
        probability: 0.25,
        explanation: "High DOC increases cutting forces beyond stability limit",
        fix: "Reduce DOC, compensate with higher feed if MRR needed",
      });
      contributingFactors.push(`DOC: ${cuttingParams.depth_of_cut_mm}mm (consider reducing)`);
    }

    // Check for thin-wall issues
    if (workpieceSetup.wall_thickness_mm && workpieceSetup.wall_thickness_mm < 3) {
      rootCauses.push({
        cause: "Thin-wall workpiece vibration",
        probability: 0.5,
        explanation: "Thin walls have low stiffness and vibrate easily",
        fix: "Use follower rest, reduce DOC significantly, consider damping compound",
      });
      contributingFactors.push(`Wall thickness: ${workpieceSetup.wall_thickness_mm}mm (very thin)`);
    }

    // Sort by probability
    rootCauses.sort((a, b) => b.probability - a.probability);

    // Generate speed recommendations
    const currentRPM = (cuttingParams.cutting_speed_m_min * 1000) / (Math.PI * workpieceSetup.diameter_mm);
    const speedRecommendations: SpeedRecommendation[] = [
      {
        rpm: Math.round(currentRPM * 0.8),
        reason: "20% slower - move below resonance",
        stability_score: 0.7,
      },
      {
        rpm: Math.round(currentRPM * 1.2),
        reason: "20% faster - move above resonance",
        stability_score: 0.65,
      },
      {
        rpm: Math.round(currentRPM * 0.65),
        reason: "35% slower - significant shift for stubborn chatter",
        stability_score: 0.8,
      },
    ];

    // Parameter fixes
    const parameterFixes: ParameterAdjustment[] = [];

    if (cuttingParams.depth_of_cut_mm > 1.5) {
      parameterFixes.push({
        parameter: "depth_of_cut",
        current_value: cuttingParams.depth_of_cut_mm,
        recommended_value: cuttingParams.depth_of_cut_mm * 0.5,
        unit: "mm",
        reason: "Reduce DOC to lower cutting forces below stability limit",
      });
    }

    // Increase feed to shift from regenerative zone
    parameterFixes.push({
      parameter: "feed",
      current_value: cuttingParams.feed_mm_rev,
      recommended_value: Math.min(cuttingParams.feed_mm_rev * 1.4, 0.5),
      unit: "mm/rev",
      reason: "Higher feed shifts chip load away from regenerative zone",
    });

    // Tooling changes
    const toolingChanges: string[] = [];
    if (toolSetup.holder_type === "standard" && toolLD > 3) {
      toolingChanges.push("Switch to anti-vibration/damped boring bar");
    }
    if (toolSetup.tool_material !== "carbide") {
      toolingChanges.push("Use carbide insert with sharper edge - reduces cutting forces");
    }
    toolingChanges.push("Try insert with smaller nose radius - reduces contact length");
    toolingChanges.push("Check insert for wear - dull edge increases forces and chatter tendency");

    // Setup changes
    const setupChanges: string[] = [];
    if (!workpieceSetup.tailstock_support && workpieceLD > 3) {
      setupChanges.push("Add tailstock support to stiffen workpiece");
    }
    if (!workpieceSetup.steady_rest && unsupportedLength > 150) {
      setupChanges.push("Add steady rest for intermediate support");
    }
    setupChanges.push("Minimize tool overhang - retract as much as possible");
    setupChanges.push("Check tool and workpiece for runout");

    // Determine severity
    let severity: ChatterDiagnosis["severity"];
    if (symptoms.surface_pattern === "coarse_marks" || symptoms.noise_type === "growl") {
      severity = "severe";
    } else if (rootCauses.length > 2) {
      severity = "moderate";
    } else {
      severity = "minor";
    }

    return {
      likely_type: likelyType,
      confidence,
      root_causes: rootCauses,
      contributing_factors: contributingFactors,
      speed_recommendations: speedRecommendations,
      parameter_fixes: parameterFixes,
      tooling_changes: toolingChanges,
      setup_changes: setupChanges,
      severity,
    };
  }

  /**
   * Diagnose machining errors and provide corrective actions.
   */
  diagnoseMachiningError(
    errorType: "taper" | "out_of_round" | "poor_finish" | "oversized" | "undersized" | "chatter_marks" | "thread_pitch_error" | "concentricity",
    measurements: {
      actual_value?: number;
      target_value?: number;
      error_amount?: number;
      location?: string;
    },
    toolSetup: ToolSetup,
    workpieceSetup: WorkpieceSetup,
    cuttingParams: CuttingParameters
  ): MachiningErrorDiagnosis {
    log.info(`[LatheTroubleshooting] Diagnosing error: ${errorType}`);

    const likelyCauses: ErrorCause[] = [];
    const measurementSuggestions: string[] = [];
    const correctiveActions: CorrectiveAction[] = [];
    const preventionMeasures: string[] = [];
    const relatedErrors: string[] = [];

    switch (errorType) {
      case "taper":
        // Taper diagnosis
        likelyCauses.push(...TAPER_CAUSES.map(c => ({
          cause: c.cause,
          probability: c.probability,
          how_to_verify: c.how_to_verify,
          fix: c.fix,
        })));

        measurementSuggestions.push("Measure diameter at multiple points along length");
        measurementSuggestions.push("Use test bar to check tailstock alignment");
        measurementSuggestions.push("Check spindle runout with indicator");

        correctiveActions.push({
          priority: 1,
          action: "Realign tailstock using test bar method",
          expected_result: "Eliminate taper from misalignment",
          difficulty: "moderate",
        });
        correctiveActions.push({
          priority: 2,
          action: "Replace worn insert",
          expected_result: "Eliminate taper from uneven wear",
          difficulty: "easy",
        });
        correctiveActions.push({
          priority: 3,
          action: "Add workpiece support (tailstock/steady rest)",
          expected_result: "Reduce deflection-caused taper",
          difficulty: "easy",
        });

        preventionMeasures.push("Regular tailstock alignment checks");
        preventionMeasures.push("Monitor insert wear patterns");
        preventionMeasures.push("Use appropriate workpiece support for L/D ratio");

        relatedErrors.push("concentricity", "out_of_round");
        break;

      case "out_of_round":
        likelyCauses.push({
          cause: "Unbalanced chuck or workpiece",
          probability: 0.30,
          how_to_verify: "Check runout with dial indicator on rotating workpiece",
          fix: "Balance workpiece, check chuck jaws for wear",
        });
        likelyCauses.push({
          cause: "Loose chuck jaws",
          probability: 0.25,
          how_to_verify: "Check jaw clamping force, look for movement during cut",
          fix: "Regrind or replace jaws, increase chuck pressure",
        });
        likelyCauses.push({
          cause: "Spindle bearing problems",
          probability: 0.20,
          how_to_verify: "Check spindle runout at multiple speeds",
          fix: "Service or replace spindle bearings",
        });
        likelyCauses.push({
          cause: "Chatter during cut",
          probability: 0.15,
          how_to_verify: "Listen for chatter noise, examine surface pattern",
          fix: "Adjust speed, reduce DOC, improve rigidity",
        });
        likelyCauses.push({
          cause: "Interrupted cut effect",
          probability: 0.10,
          how_to_verify: "Check if workpiece has keyway or hole",
          fix: "Reduce feed during interrupted section, use balanced entry",
        });

        measurementSuggestions.push("Measure diameter at multiple angles (0°, 90°, 120°, etc.)");
        measurementSuggestions.push("Check roundness with roundness gauge or CMM");

        correctiveActions.push({
          priority: 1,
          action: "Check and adjust chuck jaw clamping",
          expected_result: "Improve workholding rigidity",
          difficulty: "easy",
        });
        correctiveActions.push({
          priority: 2,
          action: "Check spindle runout",
          expected_result: "Identify bearing issues",
          difficulty: "moderate",
        });

        preventionMeasures.push("Regular chuck maintenance");
        preventionMeasures.push("Proper workpiece setup and clamping");
        relatedErrors.push("taper", "concentricity");
        break;

      case "poor_finish":
        likelyCauses.push({
          cause: "Feed too high for finish operation",
          probability: 0.30,
          how_to_verify: "Check feed rate setting",
          fix: "Reduce feed to 0.05-0.15 mm/rev for finishing",
        });
        likelyCauses.push({
          cause: "Worn or chipped insert",
          probability: 0.25,
          how_to_verify: "Inspect insert edge under magnification",
          fix: "Replace insert, check for proper grade",
        });
        likelyCauses.push({
          cause: "Incorrect nose radius",
          probability: 0.15,
          how_to_verify: "Verify nose radius matches programmed value",
          fix: "Use larger nose radius for better finish",
        });
        likelyCauses.push({
          cause: "Built-up edge (BUE)",
          probability: 0.15,
          how_to_verify: "Examine insert for material adhesion",
          fix: "Increase speed, use coated insert, improve coolant",
        });
        likelyCauses.push({
          cause: "Vibration/chatter",
          probability: 0.15,
          how_to_verify: "Look for wave pattern on surface",
          fix: "Improve rigidity, adjust speed, reduce DOC",
        });

        measurementSuggestions.push("Measure Ra with profilometer");
        measurementSuggestions.push("Visually examine surface under light at angle");
        measurementSuggestions.push("Check for pattern (waves = chatter, feed marks = high feed)");

        correctiveActions.push({
          priority: 1,
          action: `Reduce feed to ${Math.min(cuttingParams.feed_mm_rev * 0.5, 0.1).toFixed(3)} mm/rev`,
          expected_result: "Ra improves proportional to f² reduction",
          difficulty: "easy",
        });
        correctiveActions.push({
          priority: 2,
          action: "Replace insert with fresh edge",
          expected_result: "Sharp edge produces better finish",
          difficulty: "easy",
        });
        correctiveActions.push({
          priority: 3,
          action: "Increase cutting speed",
          expected_result: "Higher speed reduces BUE tendency",
          difficulty: "easy",
        });

        preventionMeasures.push("Use appropriate finishing parameters");
        preventionMeasures.push("Monitor insert wear");
        preventionMeasures.push("Select proper insert grade for material");
        relatedErrors.push("chatter_marks");
        break;

      case "oversized":
        likelyCauses.push({
          cause: "Tool wear (flank wear)",
          probability: 0.35,
          how_to_verify: "Measure flank wear on insert",
          fix: "Replace insert, apply tool wear compensation",
        });
        likelyCauses.push({
          cause: "Thermal growth (spindle/workpiece)",
          probability: 0.25,
          how_to_verify: "Measure dimension before and after warmup",
          fix: "Allow machine warmup, apply thermal compensation",
        });
        likelyCauses.push({
          cause: "Tool offset incorrect",
          probability: 0.20,
          how_to_verify: "Verify tool offset value",
          fix: "Re-touch-off tool, update offset",
        });
        likelyCauses.push({
          cause: "Workpiece deflection away from tool",
          probability: 0.15,
          how_to_verify: "Check L/D ratio and support",
          fix: "Add support, reduce DOC, spring pass",
        });
        likelyCauses.push({
          cause: "Program error",
          probability: 0.05,
          how_to_verify: "Check programmed dimensions",
          fix: "Correct program",
        });

        measurementSuggestions.push("Measure immediately after cutting (before cooling)");
        measurementSuggestions.push("Measure after part reaches room temperature");
        measurementSuggestions.push("Track dimension trend over multiple parts");

        correctiveActions.push({
          priority: 1,
          action: "Apply offset correction",
          expected_result: "Bring dimension to target",
          difficulty: "easy",
        });
        correctiveActions.push({
          priority: 2,
          action: "Check and replace worn insert",
          expected_result: "Restore cutting geometry",
          difficulty: "easy",
        });
        correctiveActions.push({
          priority: 3,
          action: "Add spring pass with light DOC",
          expected_result: "Remove deflection-related error",
          difficulty: "easy",
        });

        preventionMeasures.push("Implement tool wear compensation");
        preventionMeasures.push("Allow machine warmup before production");
        preventionMeasures.push("Regular in-process gauging");
        relatedErrors.push("undersized", "taper");
        break;

      case "undersized":
        likelyCauses.push({
          cause: "Workpiece deflection toward tool",
          probability: 0.30,
          how_to_verify: "Check L/D ratio and support",
          fix: "Add support, reduce DOC, spring pass",
        });
        likelyCauses.push({
          cause: "Tool pushed into work (holder flex)",
          probability: 0.25,
          how_to_verify: "Check tool overhang L/D",
          fix: "Reduce overhang, use stiffer holder",
        });
        likelyCauses.push({
          cause: "Tool offset incorrect (negative)",
          probability: 0.20,
          how_to_verify: "Verify tool offset value",
          fix: "Re-touch-off tool, update offset",
        });
        likelyCauses.push({
          cause: "Thermal contraction (measured cold)",
          probability: 0.15,
          how_to_verify: "Measure at consistent temperature",
          fix: "Account for thermal contraction in offset",
        });
        likelyCauses.push({
          cause: "Chuck pressure deforming part",
          probability: 0.10,
          how_to_verify: "Measure in chuck vs. released",
          fix: "Reduce chuck pressure, use soft jaws",
        });

        measurementSuggestions.push("Measure while still in chuck");
        measurementSuggestions.push("Measure after releasing from chuck");
        measurementSuggestions.push("Compare to see if chuck is deforming part");

        correctiveActions.push({
          priority: 1,
          action: "Apply positive offset correction",
          expected_result: "Bring dimension to target",
          difficulty: "easy",
        });
        correctiveActions.push({
          priority: 2,
          action: "Reduce DOC and take spring pass",
          expected_result: "Minimize deflection error",
          difficulty: "easy",
        });

        preventionMeasures.push("Account for deflection in program");
        preventionMeasures.push("Use appropriate workpiece support");
        preventionMeasures.push("Minimize tool overhang");
        relatedErrors.push("oversized", "taper");
        break;

      case "chatter_marks":
        // Redirect to chatter diagnosis
        likelyCauses.push(...CHATTER_CAUSES.map(c => ({
          cause: c.cause,
          probability: c.probability,
          how_to_verify: "See chatter diagnosis for detailed analysis",
          fix: c.fix,
        })));

        measurementSuggestions.push("Measure spacing between marks to estimate chatter frequency");
        measurementSuggestions.push("Note if marks are uniform (regenerative) or random (forced)");

        correctiveActions.push({
          priority: 1,
          action: "Change spindle speed by 15-20%",
          expected_result: "Move away from resonant frequency",
          difficulty: "easy",
        });
        correctiveActions.push({
          priority: 2,
          action: "Reduce depth of cut by 50%",
          expected_result: "Lower forces below stability limit",
          difficulty: "easy",
        });

        preventionMeasures.push("Use stability lobe diagram to select optimal speed");
        preventionMeasures.push("Maintain tool and workpiece rigidity");
        relatedErrors.push("poor_finish", "out_of_round");
        break;

      case "thread_pitch_error":
        likelyCauses.push({
          cause: "Incorrect leadscrew/encoder calibration",
          probability: 0.30,
          how_to_verify: "Cut test thread, measure pitch with thread micrometer",
          fix: "Recalibrate Z-axis, check encoder counts",
        });
        likelyCauses.push({
          cause: "Spindle encoder error",
          probability: 0.25,
          how_to_verify: "Check spindle encoder synchronization",
          fix: "Replace or recalibrate spindle encoder",
        });
        likelyCauses.push({
          cause: "Programmed pitch incorrect",
          probability: 0.20,
          how_to_verify: "Verify program thread pitch value",
          fix: "Correct program",
        });
        likelyCauses.push({
          cause: "Backlash in Z-axis",
          probability: 0.15,
          how_to_verify: "Check for backlash with indicator",
          fix: "Adjust backlash compensation, service ballscrew",
        });
        likelyCauses.push({
          cause: "Threading at wrong speed",
          probability: 0.10,
          how_to_verify: "Verify threading speed matches capability",
          fix: "Reduce spindle speed for threading",
        });

        measurementSuggestions.push("Use thread pitch gauge or micrometer");
        measurementSuggestions.push("Measure over multiple thread pitches");
        measurementSuggestions.push("Check both major and pitch diameter");

        correctiveActions.push({
          priority: 1,
          action: "Verify program pitch matches drawing",
          expected_result: "Eliminate programming error",
          difficulty: "easy",
        });
        correctiveActions.push({
          priority: 2,
          action: "Recalibrate Z-axis if error is consistent",
          expected_result: "Correct cumulative pitch error",
          difficulty: "moderate",
        });

        preventionMeasures.push("Regular axis calibration");
        preventionMeasures.push("Verify thread program before production");
        relatedErrors.push("thread_pitch_error");
        break;

      case "concentricity":
        likelyCauses.push({
          cause: "Part removed and rechucked",
          probability: 0.35,
          how_to_verify: "Check if part was repositioned",
          fix: "Machine all related diameters in single setup",
        });
        likelyCauses.push({
          cause: "Chuck runout",
          probability: 0.25,
          how_to_verify: "Measure chuck runout with indicator",
          fix: "Dress soft jaws in place, check hard jaws",
        });
        likelyCauses.push({
          cause: "Spindle runout",
          probability: 0.20,
          how_to_verify: "Measure spindle runout at different RPMs",
          fix: "Service spindle bearings",
        });
        likelyCauses.push({
          cause: "Collet runout",
          probability: 0.15,
          how_to_verify: "Check collet concentricity",
          fix: "Clean, replace, or bore collet in place",
        });
        likelyCauses.push({
          cause: "Tailstock misalignment",
          probability: 0.05,
          how_to_verify: "Check tailstock alignment",
          fix: "Realign tailstock",
        });

        measurementSuggestions.push("Use indicator on related surfaces while rotating");
        measurementSuggestions.push("Measure TIR (Total Indicator Reading)");

        correctiveActions.push({
          priority: 1,
          action: "Machine related features in single setup",
          expected_result: "Eliminate rechucking error",
          difficulty: "moderate",
        });
        correctiveActions.push({
          priority: 2,
          action: "Bore soft jaws in place",
          expected_result: "Minimize chuck-induced runout",
          difficulty: "moderate",
        });

        preventionMeasures.push("Plan operations to minimize rechucking");
        preventionMeasures.push("Use true-running fixtures when rechucking required");
        preventionMeasures.push("Regular chuck/collet inspection");
        relatedErrors.push("out_of_round", "taper");
        break;
    }

    return {
      error_type: errorType,
      likely_causes: likelyCauses,
      measurement_suggestions: measurementSuggestions,
      corrective_actions: correctiveActions,
      prevention_measures: preventionMeasures,
      related_errors: relatedErrors,
    };
  }

  /**
   * Assess tool breakage risk.
   */
  assessToolBreakageRisk(
    toolSetup: ToolSetup,
    workpieceSetup: WorkpieceSetup,
    cuttingParams: CuttingParameters
  ): ToolBreakageRisk {
    log.info(`[LatheTroubleshooting] Assessing tool breakage risk`);

    const riskFactors: RiskFactor[] = [];
    const warningsSigns: string[] = [];
    const preventiveActions: string[] = [];
    const parameterLimits: ParameterLimit[] = [];

    let riskScore = 0;

    // Check tool overhang
    const toolLD = toolSetup.overhang_mm / toolSetup.shank_diameter_mm;
    const toolLimits = TOOL_LD_LIMITS[toolSetup.tool_type];
    if (toolLD > toolLimits.risky) {
      riskScore += 30;
      riskFactors.push({
        factor: "Extreme tool overhang",
        severity: 9,
        contribution_pct: 30,
        mitigation: "Reduce overhang or use damped bar",
      });
    } else if (toolLD > toolLimits.marginal) {
      riskScore += 15;
      riskFactors.push({
        factor: "High tool overhang",
        severity: 6,
        contribution_pct: 15,
        mitigation: "Consider reducing overhang",
      });
    }

    // Check DOC vs insert size
    if (toolSetup.insert_size_mm) {
      const docRatio = cuttingParams.depth_of_cut_mm / toolSetup.insert_size_mm;
      if (docRatio > 0.7) {
        riskScore += 25;
        riskFactors.push({
          factor: "DOC exceeds safe insert engagement",
          severity: 8,
          contribution_pct: 25,
          mitigation: "Reduce DOC to max 2/3 of insert length",
        });
        parameterLimits.push({
          parameter: "depth_of_cut",
          current_value: cuttingParams.depth_of_cut_mm,
          safe_limit: toolSetup.insert_size_mm * 0.67,
          unit: "mm",
          exceeded: true,
        });
      }
    }

    // Check for interrupted cutting
    if (workpieceSetup.wall_thickness_mm || cuttingParams.operation === "grooving") {
      riskScore += 10;
      riskFactors.push({
        factor: "Interrupted cut risk",
        severity: 5,
        contribution_pct: 10,
        mitigation: "Reduce feed during interrupted section",
      });
      warningsSigns.push("Listen for impact sounds during interrupted cuts");
    }

    // Check feed rate
    const maxSafeFeed = toolSetup.tool_type === "parting" ? 0.15 : 0.4;
    if (cuttingParams.feed_mm_rev > maxSafeFeed) {
      riskScore += 20;
      riskFactors.push({
        factor: "Excessive feed rate",
        severity: 7,
        contribution_pct: 20,
        mitigation: `Reduce feed to below ${maxSafeFeed} mm/rev`,
      });
      parameterLimits.push({
        parameter: "feed",
        current_value: cuttingParams.feed_mm_rev,
        safe_limit: maxSafeFeed,
        unit: "mm/rev",
        exceeded: true,
      });
    }

    // Check for parting/grooving specific risks
    if (toolSetup.tool_type === "parting" || toolSetup.tool_type === "grooving") {
      if (cuttingParams.depth_of_cut_mm > 3) {
        riskScore += 15;
        riskFactors.push({
          factor: "Deep parting/grooving cut",
          severity: 7,
          contribution_pct: 15,
          mitigation: "Consider pecking cycle or multiple passes",
        });
      }
      warningsSigns.push("Watch for chip wrapping around tool");
      warningsSigns.push("Monitor for tool rubbing in groove");
    }

    // Check coolant
    if (cuttingParams.coolant === "dry" && workpieceSetup.hardness_hrc && workpieceSetup.hardness_hrc > 40) {
      riskScore += 15;
      riskFactors.push({
        factor: "Dry cutting hardened material",
        severity: 6,
        contribution_pct: 15,
        mitigation: "Use coolant or reduce speed significantly",
      });
    }

    // Check speed for material
    if (workpieceSetup.hardness_hrc && workpieceSetup.hardness_hrc > 50 && cuttingParams.cutting_speed_m_min > 100) {
      riskScore += 20;
      riskFactors.push({
        factor: "High speed on hardened material",
        severity: 8,
        contribution_pct: 20,
        mitigation: "Reduce speed for hardened steel",
      });
    }

    // Build warning signs
    warningsSigns.push("Sudden increase in cutting noise");
    warningsSigns.push("Vibration or chatter onset");
    warningsSigns.push("Sparks or color change in chips");
    warningsSigns.push("Surface finish degradation");
    warningsSigns.push("Dimensional drift in consecutive parts");

    // Build preventive actions
    preventiveActions.push("Monitor insert wear regularly");
    preventiveActions.push("Check tool overhang before each setup");
    preventiveActions.push("Verify parameters are within safe limits");
    preventiveActions.push("Use tool life management / counting");
    if (toolSetup.is_internal) {
      preventiveActions.push("Consider anti-vibration boring bar");
    }

    // Determine overall risk level
    let overallRisk: ToolBreakageRisk["overall_risk"];
    if (riskScore >= 60) {
      overallRisk = "critical";
    } else if (riskScore >= 40) {
      overallRisk = "high";
    } else if (riskScore >= 20) {
      overallRisk = "medium";
    } else {
      overallRisk = "low";
    }

    // Monitoring recommendations
    const monitoringRecommendations: string[] = [
      "Enable tool breakage detection if available",
      "Set conservative tool life counter",
      "Perform first-part inspection thoroughly",
    ];
    if (riskScore > 30) {
      monitoringRecommendations.push("Consider in-process monitoring (spindle load, acoustic)");
      monitoringRecommendations.push("Reduce feedrate override during risky sections");
    }

    return {
      overall_risk: overallRisk,
      risk_score: Math.min(riskScore, 100),
      risk_factors: riskFactors,
      warning_signs: warningsSigns,
      preventive_actions: preventiveActions,
      parameter_limits: parameterLimits,
      monitoring_recommendations: monitoringRecommendations,
    };
  }

  /**
   * Validate setup against common mistakes checklist.
   */
  validateSetup(
    toolSetup: ToolSetup,
    workpieceSetup: WorkpieceSetup,
    cuttingParams: CuttingParameters
  ): SetupValidation {
    log.info(`[LatheTroubleshooting] Validating setup`);

    const issuesFound: SetupIssue[] = [];
    const checklistItems: ChecklistItem[] = [];
    let score = 100;

    // === Tool checks ===

    // Tool overhang
    const toolLD = toolSetup.overhang_mm / toolSetup.shank_diameter_mm;
    const toolLimits = TOOL_LD_LIMITS[toolSetup.tool_type];
    if (toolLD <= toolLimits.safe) {
      checklistItems.push({ item: "Tool overhang within safe L/D", checked: true, status: "ok" });
    } else if (toolLD <= toolLimits.marginal) {
      checklistItems.push({ item: "Tool overhang within safe L/D", checked: true, status: "warning", note: `L/D=${toolLD.toFixed(1)} - marginal` });
      issuesFound.push({
        category: "Tooling",
        issue: `Tool L/D ratio (${toolLD.toFixed(1)}) is marginal`,
        severity: "warning",
        fix: "Consider reducing overhang or using damped holder",
      });
      score -= 5;
    } else {
      checklistItems.push({ item: "Tool overhang within safe L/D", checked: false, status: "fail", note: `L/D=${toolLD.toFixed(1)} - too high` });
      issuesFound.push({
        category: "Tooling",
        issue: `Tool L/D ratio (${toolLD.toFixed(1)}) exceeds safe limit (${toolLimits.safe})`,
        severity: "critical",
        fix: "Reduce overhang or switch to damped/carbide shank holder",
      });
      score -= 20;
    }

    // Insert condition (can't verify, remind)
    checklistItems.push({ item: "Insert edge condition verified (not worn/chipped)", checked: true, status: "warning", note: "Verify visually" });

    // Tool holder seated properly
    checklistItems.push({ item: "Tool holder seated and locked", checked: true, status: "warning", note: "Verify physically" });

    // === Workpiece checks ===

    // Workpiece support
    const unsupportedLength = workpieceSetup.length_mm - workpieceSetup.chuck_grip_length_mm;
    const workpieceLD = unsupportedLength / workpieceSetup.diameter_mm;
    const workpieceLimits = WORKPIECE_LD_LIMITS[workpieceSetup.holding_method];

    if (workpieceSetup.tailstock_support || workpieceLD <= workpieceLimits.safe) {
      checklistItems.push({ item: "Workpiece adequately supported", checked: true, status: "ok" });
    } else if (workpieceLD <= workpieceLimits.marginal) {
      checklistItems.push({ item: "Workpiece adequately supported", checked: true, status: "warning", note: "Consider tailstock" });
      issuesFound.push({
        category: "Workholding",
        issue: "Workpiece unsupported length is marginal",
        severity: "warning",
        fix: "Add tailstock support for better rigidity",
      });
      score -= 5;
    } else {
      checklistItems.push({ item: "Workpiece adequately supported", checked: false, status: "fail" });
      issuesFound.push({
        category: "Workholding",
        issue: `Workpiece L/D (${workpieceLD.toFixed(1)}) exceeds safe limit without support`,
        severity: "critical",
        fix: "Add tailstock and/or steady rest support",
      });
      score -= 15;
    }

    // Chuck grip length
    const gripRatio = workpieceSetup.chuck_grip_length_mm / workpieceSetup.diameter_mm;
    if (gripRatio >= 1.0) {
      checklistItems.push({ item: "Adequate chuck grip length", checked: true, status: "ok" });
    } else if (gripRatio >= 0.5) {
      checklistItems.push({ item: "Adequate chuck grip length", checked: true, status: "warning", note: "Grip is minimal" });
      issuesFound.push({
        category: "Workholding",
        issue: "Chuck grip length is minimal",
        severity: "warning",
        fix: "Increase grip length if possible, or use step jaws",
      });
      score -= 5;
    } else {
      checklistItems.push({ item: "Adequate chuck grip length", checked: false, status: "fail" });
      issuesFound.push({
        category: "Workholding",
        issue: "Insufficient chuck grip length - workpiece may slip",
        severity: "critical",
        fix: "Increase grip or use different workholding method",
      });
      score -= 20;
    }

    // Thin wall check
    if (workpieceSetup.wall_thickness_mm) {
      const wallRatio = workpieceSetup.wall_thickness_mm / workpieceSetup.diameter_mm;
      if (wallRatio < 0.05) {
        checklistItems.push({ item: "Thin wall handling addressed", checked: false, status: "fail" });
        issuesFound.push({
          category: "Workholding",
          issue: "Very thin wall - high risk of deformation",
          severity: "critical",
          fix: "Use soft jaws, reduced chuck pressure, internal mandrel, or follower rest",
        });
        score -= 15;
      } else if (wallRatio < 0.1) {
        checklistItems.push({ item: "Thin wall handling addressed", checked: true, status: "warning", note: "Reduce chuck pressure" });
        issuesFound.push({
          category: "Workholding",
          issue: "Thin wall - risk of deformation under cutting forces",
          severity: "warning",
          fix: "Reduce DOC and chuck pressure",
        });
        score -= 5;
      } else {
        checklistItems.push({ item: "Wall thickness adequate", checked: true, status: "ok" });
      }
    } else {
      checklistItems.push({ item: "Wall thickness check", checked: true, status: "na", note: "Solid part" });
    }

    // === Parameter checks ===

    // Feed rate
    const maxFeed = toolSetup.tool_type === "parting" ? 0.15 : 0.4;
    if (cuttingParams.feed_mm_rev <= maxFeed) {
      checklistItems.push({ item: "Feed rate within limits", checked: true, status: "ok" });
    } else {
      checklistItems.push({ item: "Feed rate within limits", checked: false, status: "fail" });
      issuesFound.push({
        category: "Parameters",
        issue: `Feed (${cuttingParams.feed_mm_rev} mm/rev) exceeds recommended max (${maxFeed})`,
        severity: "critical",
        fix: "Reduce feed rate",
      });
      score -= 15;
    }

    // DOC check
    if (toolSetup.insert_size_mm) {
      const docLimit = toolSetup.insert_size_mm * 0.67;
      if (cuttingParams.depth_of_cut_mm <= docLimit) {
        checklistItems.push({ item: "DOC within insert limits", checked: true, status: "ok" });
      } else {
        checklistItems.push({ item: "DOC within insert limits", checked: false, status: "fail" });
        issuesFound.push({
          category: "Parameters",
          issue: `DOC (${cuttingParams.depth_of_cut_mm}mm) exceeds safe insert engagement`,
          severity: "critical",
          fix: `Reduce DOC to max ${docLimit.toFixed(1)}mm`,
        });
        score -= 15;
      }
    } else {
      checklistItems.push({ item: "DOC check", checked: true, status: "warning", note: "Insert size unknown - verify manually" });
    }

    // Coolant for operation
    if (cuttingParams.coolant === "dry" && workpieceSetup.hardness_hrc && workpieceSetup.hardness_hrc > 35) {
      checklistItems.push({ item: "Coolant appropriate for material", checked: false, status: "warning" });
      issuesFound.push({
        category: "Parameters",
        issue: "Dry cutting on harder material - accelerated wear",
        severity: "warning",
        fix: "Consider flood coolant or high-pressure coolant",
      });
      score -= 5;
    } else {
      checklistItems.push({ item: "Coolant appropriate for material", checked: true, status: "ok" });
    }

    // === Safety checks ===
    checklistItems.push({ item: "Guards in place", checked: true, status: "warning", note: "Verify physically" });
    checklistItems.push({ item: "Emergency stop accessible", checked: true, status: "warning", note: "Verify physically" });
    checklistItems.push({ item: "Part secure in chuck (pull test)", checked: true, status: "warning", note: "Perform before start" });

    // Determine validity and risk assessment
    const valid = !issuesFound.some(i => i.severity === "critical");

    let riskAssessment: string;
    if (score >= 90) {
      riskAssessment = "Low risk - setup appears sound";
    } else if (score >= 70) {
      riskAssessment = "Moderate risk - address warnings before production";
    } else if (score >= 50) {
      riskAssessment = "High risk - critical issues must be resolved";
    } else {
      riskAssessment = "Unacceptable risk - do not proceed without corrections";
    }

    // Build recommendations
    const recommendations: string[] = [];
    if (issuesFound.some(i => i.severity === "critical")) {
      recommendations.push("Resolve all critical issues before starting");
    }
    if (issuesFound.some(i => i.category === "Tooling")) {
      recommendations.push("Review tooling setup for rigidity improvements");
    }
    if (issuesFound.some(i => i.category === "Workholding")) {
      recommendations.push("Consider additional workpiece support");
    }
    if (score < 80) {
      recommendations.push("Run first part with reduced parameters and close monitoring");
    }

    return {
      valid,
      score: Math.max(0, score),
      issues_found: issuesFound,
      checklist_items: checklistItems,
      risk_assessment: riskAssessment,
      recommendations,
    };
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  /**
   * Estimate cutting force for deflection calculations.
   */
  private estimateCuttingForce(params: CuttingParameters): number {
    // Simplified Kienzle: Fc = kc1.1 * ap * f^(1-mc)
    // Using typical values for steel
    const kc11 = 1800; // N/mm²
    const mc = 0.25;
    const Fc = kc11 * params.depth_of_cut_mm * Math.pow(params.feed_mm_rev, 1 - mc);
    return Fc;
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const latheTroubleshootingIntelligenceEngine = new LatheTroubleshootingIntelligenceEngine();
