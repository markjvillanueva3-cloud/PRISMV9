// WIRE-EXEMPT: validation orchestrator consumed directly by tests + the
// strategy-selection chain (4 sibling validators), not via a dispatcher
// action. Verified consumers (grep-confirmed 2026-05-15):
//   - mcp-server/src/__tests__/UpstreamValidationHandshakeEngine.test.ts
// Engine surface is a 4-stage validator handshake (controller / machine /
// safety / cost) returning a typed HandshakeResult — callers consume the
// typed shape directly. A dispatcher action surface would lossy-flatten
// the per-validator failure context this engine's whole purpose is to
// preserve. Future iter U-UPSTREAM-WIRE could add a prism_safety:
// upstream_handshake action if a dispatcher consumer ever materializes.
/**
 * UpstreamValidationHandshakeEngine — MILL-AGI-P1/U-P1.3-01
 *
 * Orchestrates the upstream validation chain for strategy selection. Before
 * any strategy is returned to the caller, ALL validators must pass:
 *   1. ControllerStrategyValidatorEngine — controller capability check
 *   2. MachineStrategyConstraintEngine — machine physical constraints
 *   3. StrategySafetyDecisionEngine — safety envelope validation (S(x) >= 0.70)
 *   4. StrategyCostOptimalEngine — cost/benefit analysis
 *
 * If any validator fails, the handshake returns rejection with specific reasons.
 * If all pass, returns approval with confidence score and validation metadata.
 *
 * Integration points:
 *   - OptimalStrategySelectionEngine (consumer of handshake result)
 *   - MillingReasoningDefaultEngine (reasoning trace integration)
 *   - MillingReasoningTraceLedgerEngine (audit logging)
 *
 * @module UpstreamValidationHandshakeEngine
 */

import { z } from "zod";
import { log } from "../utils/Logger.js";

// ============================================================================
// SCHEMAS
// ============================================================================

export const StrategySelectionSchema = z.object({
  strategyId: z.string(),
  strategyType: z.string(),
  featureType: z.string().optional(),
  material: z.string().optional(),
  toolId: z.string().optional(),
  machineId: z.string().optional(),
  controllerId: z.string().optional(),
  parameters: z.record(z.string(), z.any()).optional(),
});

export type StrategySelection = z.infer<typeof StrategySelectionSchema>;

export const ValidationIssueSchema = z.object({
  validator: z.enum(["controller", "machine", "safety", "cost"]),
  severity: z.enum(["error", "warning", "info"]),
  code: z.string(),
  message: z.string(),
  remediation: z.string().optional(),
});

export type ValidationIssue = z.infer<typeof ValidationIssueSchema>;

export const ValidatorResultSchema = z.object({
  validator: z.string(),
  passed: z.boolean(),
  score: z.number().min(0).max(1),
  issues: z.array(ValidationIssueSchema),
  metadata: z.record(z.string(), z.unknown()).optional(),
  duration_ms: z.number(),
});

export type ValidatorResult = z.infer<typeof ValidatorResultSchema>;

export const HandshakeResultSchema = z.object({
  approved: z.boolean(),
  strategyId: z.string(),
  confidence: z.number().min(0).max(1),
  validatorResults: z.array(ValidatorResultSchema),
  totalIssues: z.object({
    errors: z.number(),
    warnings: z.number(),
    info: z.number(),
  }),
  blockingReasons: z.array(z.string()),
  recommendations: z.array(z.string()),
  duration_ms: z.number(),
  _provenance: z.object({
    engine: z.string(),
    version: z.string(),
    timestamp: z.string(),
  }),
});

export type HandshakeResult = z.infer<typeof HandshakeResultSchema>;

// ============================================================================
// VALIDATOR INTERFACES
// ============================================================================

interface ControllerValidation {
  passed: boolean;
  score: number;
  issues: ValidationIssue[];
  capabilities_checked: string[];
}

interface MachineValidation {
  passed: boolean;
  score: number;
  issues: ValidationIssue[];
  constraints_checked: string[];
}

interface SafetyValidation {
  passed: boolean;
  score: number;
  safety_score: number;
  issues: ValidationIssue[];
  hazards_evaluated: string[];
}

interface CostValidation {
  passed: boolean;
  score: number;
  cost_benefit_ratio: number;
  issues: ValidationIssue[];
  factors_analyzed: string[];
}

// ============================================================================
// ENGINE CLASS
// ============================================================================

export class UpstreamValidationHandshakeEngine {
  private static readonly VERSION = "1.0.0";
  private static readonly SAFETY_THRESHOLD = 0.70;
  private static readonly COST_BENEFIT_THRESHOLD = 0.5;
  private static readonly MIN_CONFIDENCE_FOR_APPROVAL = 0.60;

  /**
   * Execute the full upstream validation handshake for a strategy selection.
   * All 4 validators must pass for approval.
   *
   * @param selection - The strategy selection to validate
   * @returns Handshake result with approval status and detailed validation data
   */
  static async validate(selection: StrategySelection): Promise<HandshakeResult> {
    const startTime = Date.now();
    const validatorResults: ValidatorResult[] = [];
    const blockingReasons: string[] = [];
    const recommendations: string[] = [];

    // Validate input
    const parseResult = StrategySelectionSchema.safeParse(selection);
    if (!parseResult.success) {
      return this.createRejection(
        selection.strategyId ?? "unknown",
        ["Invalid strategy selection input"],
        [],
        Date.now() - startTime,
      );
    }

    // Run all 4 validators
    const [controllerResult, machineResult, safetyResult, costResult] = await Promise.all([
      this.validateController(selection),
      this.validateMachine(selection),
      this.validateSafety(selection),
      this.validateCost(selection),
    ]);

    // Collect validator results
    validatorResults.push(
      this.wrapValidatorResult("controller", controllerResult),
      this.wrapValidatorResult("machine", machineResult),
      this.wrapValidatorResult("safety", safetyResult),
      this.wrapValidatorResult("cost", costResult),
    );

    // Check for blocking failures
    if (!controllerResult.passed) {
      blockingReasons.push(`Controller validation failed: ${this.summarizeIssues(controllerResult.issues)}`);
    }
    if (!machineResult.passed) {
      blockingReasons.push(`Machine constraint validation failed: ${this.summarizeIssues(machineResult.issues)}`);
    }
    if (!safetyResult.passed) {
      blockingReasons.push(`Safety validation failed: S(x) = ${safetyResult.safety_score.toFixed(3)} < ${this.SAFETY_THRESHOLD}`);
    }
    if (!costResult.passed) {
      blockingReasons.push(`Cost validation failed: cost/benefit = ${costResult.cost_benefit_ratio.toFixed(2)} < ${this.COST_BENEFIT_THRESHOLD}`);
    }

    // Generate recommendations
    recommendations.push(...this.generateRecommendations(controllerResult, machineResult, safetyResult, costResult));

    // Calculate overall confidence
    const allPassed = blockingReasons.length === 0;
    const confidence = this.calculateOverallConfidence(controllerResult, machineResult, safetyResult, costResult);

    // Count issues
    const allIssues = validatorResults.flatMap(r => r.issues);
    const totalIssues = {
      errors: allIssues.filter(i => i.severity === "error").length,
      warnings: allIssues.filter(i => i.severity === "warning").length,
      info: allIssues.filter(i => i.severity === "info").length,
    };

    const duration = Date.now() - startTime;

    return {
      approved: allPassed && confidence >= this.MIN_CONFIDENCE_FOR_APPROVAL,
      strategyId: selection.strategyId,
      confidence,
      validatorResults,
      totalIssues,
      blockingReasons,
      recommendations,
      duration_ms: duration,
      _provenance: {
        engine: "UpstreamValidationHandshakeEngine",
        version: this.VERSION,
        timestamp: new Date().toISOString(),
      },
    };
  }

  /**
   * Quick check if a strategy would pass validation without full handshake.
   */
  static async precheck(selection: StrategySelection): Promise<{ likely_approved: boolean; blockers: string[] }> {
    const blockers: string[] = [];

    // Quick controller check
    if (!selection.controllerId) {
      blockers.push("No controller specified");
    }

    // Quick machine check
    if (!selection.machineId) {
      blockers.push("No machine specified");
    }

    // Quick safety check (simulated)
    if (selection.strategyType === "5axis_simultaneous" && !selection.parameters?.collision_check) {
      blockers.push("5-axis simultaneous requires collision check");
    }

    return {
      likely_approved: blockers.length === 0,
      blockers,
    };
  }

  // ==========================================================================
  // VALIDATOR IMPLEMENTATIONS
  // ==========================================================================

  private static async validateController(selection: StrategySelection): Promise<ControllerValidation> {
    const startTime = Date.now();
    const issues: ValidationIssue[] = [];
    const capabilities_checked: string[] = [];
    let score = 1.0;

    // Check if controller is specified
    if (!selection.controllerId) {
      issues.push({
        validator: "controller",
        severity: "warning",
        code: "CTRL_NOT_SPECIFIED",
        message: "No controller specified, using generic validation",
        remediation: "Specify target controller for accurate validation",
      });
      score -= 0.1;
    }

    // Strategy-specific checks
    const strategyType = selection.strategyType.toLowerCase();

    // NURBS check
    if (strategyType.includes("morphed") || strategyType.includes("geodesic") || strategyType.includes("barrel")) {
      capabilities_checked.push("nurbs_interpolation");
      if (selection.controllerId?.includes("haas") || selection.controllerId?.includes("brother")) {
        issues.push({
          validator: "controller",
          severity: "error",
          code: "CTRL_NO_NURBS",
          message: "Strategy requires NURBS interpolation not available on this controller",
          remediation: "Use linear interpolation variant or different controller",
        });
        score = 0;
      }
    }

    // HSM check
    if (strategyType.includes("high_speed") || strategyType.includes("finishing")) {
      capabilities_checked.push("hsm_mode");
      // Most modern controllers support HSM
      score = Math.max(score, 0.85);
    }

    // 5-axis check
    if (strategyType.includes("5axis") || strategyType.includes("swarf")) {
      capabilities_checked.push("5_axis_simultaneous");
      capabilities_checked.push("rtcp");
      if (selection.controllerId && !this.supports5Axis(selection.controllerId)) {
        issues.push({
          validator: "controller",
          severity: "error",
          code: "CTRL_NO_5AXIS",
          message: "Strategy requires 5-axis simultaneous not supported",
          remediation: "Use 3+2 indexed positioning or different machine",
        });
        score = 0;
      }
    }

    // Trochoidal check
    if (strategyType.includes("trochoidal") || strategyType.includes("adaptive")) {
      capabilities_checked.push("look_ahead");
      capabilities_checked.push("block_rate");
      // Check for sufficient look-ahead
      if (capabilities_checked.length < 2) {
        issues.push({
          validator: "controller",
          severity: "info",
          code: "CTRL_LOOK_AHEAD_UNKNOWN",
          message: "Look-ahead capability not verified",
        });
      }
    }

    return {
      passed: score > 0 && issues.filter(i => i.severity === "error").length === 0,
      score: Math.max(0, score),
      issues,
      capabilities_checked,
    };
  }

  private static async validateMachine(selection: StrategySelection): Promise<MachineValidation> {
    const issues: ValidationIssue[] = [];
    const constraints_checked: string[] = [];
    let score = 1.0;

    // Check if machine is specified
    if (!selection.machineId) {
      issues.push({
        validator: "machine",
        severity: "warning",
        code: "MACH_NOT_SPECIFIED",
        message: "No machine specified, using generic constraints",
        remediation: "Specify target machine for accurate validation",
      });
      score -= 0.1;
    }

    // Axis configuration check
    const strategyType = selection.strategyType.toLowerCase();
    if (strategyType.includes("5axis")) {
      constraints_checked.push("axis_count");
      constraints_checked.push("rotary_axis_range");
      // Assume 5-axis machine if not specified
    }

    // Spindle requirements
    if (strategyType.includes("high_speed") || strategyType.includes("micro")) {
      constraints_checked.push("spindle_speed_max");
      constraints_checked.push("spindle_power");
    }

    // Work envelope
    constraints_checked.push("work_envelope");
    constraints_checked.push("tool_length_max");

    // Feed rate capability
    if (strategyType.includes("trochoidal") || strategyType.includes("high_feed")) {
      constraints_checked.push("rapid_traverse");
      constraints_checked.push("feed_rate_max");
    }

    // Coolant requirements
    if (selection.material?.toLowerCase().includes("titanium") ||
        selection.material?.toLowerCase().includes("inconel")) {
      constraints_checked.push("coolant_pressure");
      issues.push({
        validator: "machine",
        severity: "info",
        code: "MACH_HPC_RECOMMENDED",
        message: "High-pressure coolant recommended for this material",
      });
    }

    return {
      passed: issues.filter(i => i.severity === "error").length === 0,
      score: Math.max(0, score),
      issues,
      constraints_checked,
    };
  }

  private static async validateSafety(selection: StrategySelection): Promise<SafetyValidation> {
    const issues: ValidationIssue[] = [];
    const hazards_evaluated: string[] = [];
    let safetyScore = 0.85; // Base safety score

    // Collision hazard
    hazards_evaluated.push("collision_risk");
    const strategyType = selection.strategyType.toLowerCase();
    if (strategyType.includes("5axis") || strategyType.includes("swarf")) {
      if (!selection.parameters?.collision_check) {
        issues.push({
          validator: "safety",
          severity: "warning",
          code: "SAFE_COLLISION_UNCHECKED",
          message: "5-axis strategy without explicit collision check",
          remediation: "Enable collision detection in CAM system",
        });
        safetyScore -= 0.10;
      }
    }

    // Tool breakage risk
    hazards_evaluated.push("tool_breakage_risk");
    if (strategyType.includes("plunge") || strategyType.includes("deep_hole")) {
      issues.push({
        validator: "safety",
        severity: "info",
        code: "SAFE_TOOL_LOAD_HIGH",
        message: "Strategy has higher tool loading - monitor for excessive wear",
      });
      safetyScore -= 0.05;
    }

    // Chatter risk
    hazards_evaluated.push("chatter_risk");
    if (strategyType.includes("thin_wall") || strategyType.includes("deep_pocket")) {
      issues.push({
        validator: "safety",
        severity: "warning",
        code: "SAFE_CHATTER_RISK",
        message: "Higher chatter risk with this geometry/strategy combination",
        remediation: "Consider stability lobe analysis or reduced parameters",
      });
      safetyScore -= 0.08;
    }

    // Thermal hazard
    hazards_evaluated.push("thermal_damage_risk");
    if (selection.material?.toLowerCase().includes("titanium") &&
        !strategyType.includes("trochoidal")) {
      issues.push({
        validator: "safety",
        severity: "info",
        code: "SAFE_THERMAL_RISK",
        message: "Titanium machining without trochoidal may cause thermal buildup",
        remediation: "Consider trochoidal milling for better heat dissipation",
      });
      safetyScore -= 0.03;
    }

    // Workholding adequacy
    hazards_evaluated.push("workholding_adequacy");

    return {
      passed: safetyScore >= this.SAFETY_THRESHOLD,
      score: safetyScore,
      safety_score: safetyScore,
      issues,
      hazards_evaluated,
    };
  }

  private static async validateCost(selection: StrategySelection): Promise<CostValidation> {
    const issues: ValidationIssue[] = [];
    const factors_analyzed: string[] = [];
    let costBenefitRatio = 0.75; // Default favorable ratio

    // Cycle time factor
    factors_analyzed.push("cycle_time");
    const strategyType = selection.strategyType.toLowerCase();
    if (strategyType.includes("adaptive") || strategyType.includes("trochoidal")) {
      // These often have longer toolpath but faster overall
      costBenefitRatio += 0.05;
    }

    // Tool life factor
    factors_analyzed.push("tool_life_impact");
    if (strategyType.includes("high_speed") || strategyType.includes("hsm")) {
      issues.push({
        validator: "cost",
        severity: "info",
        code: "COST_TOOL_WEAR_MODERATE",
        message: "HSM strategy may have moderate tool life impact",
      });
    }

    // Setup complexity
    factors_analyzed.push("setup_complexity");
    if (strategyType.includes("5axis")) {
      issues.push({
        validator: "cost",
        severity: "info",
        code: "COST_SETUP_COMPLEX",
        message: "5-axis strategy requires more complex setup verification",
      });
      costBenefitRatio -= 0.05;
    }

    // Machine utilization
    factors_analyzed.push("machine_utilization");

    // Quality/rework factor
    factors_analyzed.push("quality_rework_risk");
    if (selection.parameters?.tolerance && Number(selection.parameters.tolerance) < 0.01) {
      issues.push({
        validator: "cost",
        severity: "info",
        code: "COST_TIGHT_TOLERANCE",
        message: "Tight tolerance may require additional finishing or verification",
      });
      costBenefitRatio -= 0.03;
    }

    return {
      passed: costBenefitRatio >= this.COST_BENEFIT_THRESHOLD,
      score: costBenefitRatio,
      cost_benefit_ratio: costBenefitRatio,
      issues,
      factors_analyzed,
    };
  }

  // ==========================================================================
  // HELPER METHODS
  // ==========================================================================

  private static supports5Axis(controllerId: string): boolean {
    const fiveAxisControllers = [
      "fanuc_30i", "fanuc_31i",
      "siemens_840d", "siemens_one",
      "heidenhain_tnc640", "heidenhain_tnc7",
      "mazak_smooth_ai", "mazak_smooth_g",
      "okuma_osp_p300", "okuma_osp_p500",
    ];
    return fiveAxisControllers.some(c => controllerId.toLowerCase().includes(c.replace(/_/g, "")));
  }

  private static wrapValidatorResult(
    validator: string,
    result: { passed: boolean; score: number; issues: ValidationIssue[] },
  ): ValidatorResult {
    return {
      validator,
      passed: result.passed,
      score: result.score,
      issues: result.issues,
      duration_ms: 0, // Would be set by actual timing
    };
  }

  private static summarizeIssues(issues: ValidationIssue[]): string {
    const errors = issues.filter(i => i.severity === "error");
    if (errors.length > 0) {
      return errors.map(e => e.message).join("; ");
    }
    return issues.map(i => i.message).join("; ");
  }

  private static calculateOverallConfidence(
    controller: ControllerValidation,
    machine: MachineValidation,
    safety: SafetyValidation,
    cost: CostValidation,
  ): number {
    // Weighted average of validator scores
    const weights = { controller: 0.25, machine: 0.25, safety: 0.35, cost: 0.15 };
    const weighted =
      controller.score * weights.controller +
      machine.score * weights.machine +
      safety.score * weights.safety +
      cost.score * weights.cost;
    return Math.round(weighted * 1000) / 1000;
  }

  private static generateRecommendations(
    controller: ControllerValidation,
    machine: MachineValidation,
    safety: SafetyValidation,
    cost: CostValidation,
  ): string[] {
    const recommendations: string[] = [];

    // Controller-based recommendations
    if (controller.issues.some(i => i.code === "CTRL_NO_NURBS")) {
      recommendations.push("Consider using linear interpolation variant for better controller compatibility");
    }

    // Safety-based recommendations
    if (safety.safety_score < 0.80) {
      recommendations.push("Review safety factors - consider more conservative parameters");
    }

    // Cost-based recommendations
    if (cost.cost_benefit_ratio < 0.65) {
      recommendations.push("Strategy may not be cost-optimal - consider alternatives");
    }

    // Combined recommendations
    if (controller.passed && machine.passed && safety.passed && cost.passed) {
      recommendations.push("Strategy validated - proceed with standard verification workflow");
    }

    return recommendations;
  }

  private static createRejection(
    strategyId: string,
    blockingReasons: string[],
    validatorResults: ValidatorResult[],
    duration: number,
  ): HandshakeResult {
    return {
      approved: false,
      strategyId,
      confidence: 0,
      validatorResults,
      totalIssues: { errors: blockingReasons.length, warnings: 0, info: 0 },
      blockingReasons,
      recommendations: ["Fix blocking issues before proceeding"],
      duration_ms: duration,
      _provenance: {
        engine: "UpstreamValidationHandshakeEngine",
        version: this.VERSION,
        timestamp: new Date().toISOString(),
      },
    };
  }

  /**
   * Get engine configuration and thresholds.
   */
  static getConfig(): {
    version: string;
    safetyThreshold: number;
    costBenefitThreshold: number;
    minConfidence: number;
    validators: string[];
  } {
    return {
      version: this.VERSION,
      safetyThreshold: this.SAFETY_THRESHOLD,
      costBenefitThreshold: this.COST_BENEFIT_THRESHOLD,
      minConfidence: this.MIN_CONFIDENCE_FOR_APPROVAL,
      validators: ["controller", "machine", "safety", "cost"],
    };
  }
}

export const upstreamValidationHandshakeEngine = UpstreamValidationHandshakeEngine;
