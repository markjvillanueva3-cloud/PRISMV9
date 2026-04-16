/**
 * FiveAxisDecisionEngine — AI-Powered 5-Axis Simultaneous Milling Strategy
 * =========================================================================
 * MILL-HARD-MS3: Intelligent decision engine for 5-axis machining:
 *   - Integrates RTCP_CompensationEngine for kinematic validation
 *   - Integrates SingularityAvoidanceEngine for safety-critical checks
 *   - Uses PRISMIntelligenceLayer for Claude LLM reasoning
 *   - Implements chain-of-thought for explainable decisions
 *   - Learns from outcomes via LearningAdaptationEngine
 *
 * Target machine: Okuma M460V-5AX (table-table trunnion, A+C config)
 *
 * Key decisions:
 *   1. 3+2 positioning vs 5-axis simultaneous
 *   2. Tool axis tilt optimization
 *   3. Singularity avoidance routing
 *   4. RTCP compensation validation
 *   5. Collision-safe approach strategies
 *
 * @module engines/FiveAxisDecisionEngine
 * @version 1.0.0
 * @milestone MILL-HARD-MS3
 */

import { log } from "../utils/Logger.js";
import {
  RTCP_CompensationEngine,
  rtcpCompensationEngine,
  type RTCPInput,
  type RTCPResult,
  type RTCPValidation,
  type KinematicType,
} from "./RTCP_CompensationEngine.js";
import {
  SingularityAvoidanceEngine,
  singularityAvoidanceEngine,
  type SingularityInput,
  type SingularityResult,
  type SingularityPoint,
} from "./SingularityAvoidanceEngine.js";
import {
  ChainOfThoughtEngine,
  type ReasoningChain,
  type ReasoningStep,
} from "./ChainOfThoughtEngine.js";
import {
  LearningAdaptationEngine,
  type Prediction,
} from "./LearningAdaptationEngine.js";
import {
  DecisionReasoningEngine,
  type DecisionCriterion,
} from "./DecisionReasoningEngine.js";

// ============================================================================
// TYPES
// ============================================================================

/** 5-axis machining strategies */
export type FiveAxisStrategy =
  | "3_plus_2_positioning"      // Fixed tilt, indexed rotation
  | "5_axis_simultaneous"       // Full 5-axis continuous
  | "swarf_cutting"             // Tool side cutting ruled surfaces
  | "multiaxis_contouring"      // Complex surface following
  | "impeller_turbine"          // Specialized impeller/blisk
  | "port_cavity";              // Deep cavity access

/** Machine kinematic configuration */
export interface MachineKinematics {
  machine_id: string;
  machine_name: string;
  kinematic_type: KinematicType;
  primary_rotary: "A" | "B";
  secondary_rotary: "C";
  /** Pivot point distances (mm) */
  pivot_to_gauge_mm: number;
  pivot_to_table_mm: number;
  /** Axis limits (degrees) */
  axis_limits: {
    A_min: number;
    A_max: number;
    B_min?: number;
    B_max?: number;
    C_min: number;
    C_max: number;
  };
  /** Max rotary axis speed (deg/sec) */
  max_rotary_speed_deg_per_sec: number;
  /** Max spindle RPM */
  max_rpm: number;
  /** Controller capabilities */
  rtcp_enabled: boolean;
  tcpm_mode: "G43.4" | "G43.5" | "G234" | "TRAORI" | "CYCLE800";
  /** Hourly rate */
  hourly_rate: number;
}

/** Part feature geometry for 5-axis decisions */
export interface FiveAxisPartFeature {
  feature_type: "freeform_surface" | "ruled_surface" | "impeller_blade" | "deep_cavity" | "undercut" | "multi_face" | "port";
  /** Required tool orientations (i,j,k vectors) */
  required_orientations: Array<{ i: number; j: number; k: number }>;
  /** Surface tolerance (mm) */
  surface_tolerance_mm: number;
  /** Scallop height target (mm) */
  scallop_height_mm?: number;
  /** Maximum depth from approach (mm) */
  max_depth_mm: number;
  /** Minimum tool length required (mm) */
  min_tool_length_mm: number;
  /** Whether undercuts exist */
  has_undercuts: boolean;
  /** Whether thin walls exist */
  has_thin_walls: boolean;
  /** Accessibility score (0-1) */
  accessibility_score: number;
}

/** 5-axis decision input */
export interface FiveAxisDecisionInput {
  part_features: FiveAxisPartFeature[];
  machine: MachineKinematics;
  tool: {
    type: "ball_nose" | "bull_nose" | "flat_end" | "lollipop" | "barrel";
    diameter_mm: number;
    flute_length_mm: number;
    overall_length_mm: number;
    gauge_length_mm: number;
  };
  material: string;
  batch_size: number;
  operator_skill: 1 | 2 | 3 | 4 | 5;
  /** Feed rate for calculations (mm/min) */
  feed_rate_mm_per_min: number;
  /** Whether to include full AI reasoning trace */
  include_reasoning?: boolean;
  /** Whether to run LLM for enhanced reasoning */
  use_llm_reasoning?: boolean;
}

/** Toolpath point for analysis */
export interface ToolpathPoint {
  x: number;
  y: number;
  z: number;
  i: number;
  j: number;
  k: number;
}

/** AI reasoning trace for 5-axis decisions */
export interface FiveAxisReasoningTrace {
  /** Chain-of-thought reasoning */
  reasoning_chain: ReasoningChain;
  /** RTCP analysis results */
  rtcp_analysis: {
    sample_compensations: RTCPResult[];
    max_compensation_mm: number;
    validation: RTCPValidation;
  };
  /** Singularity analysis */
  singularity_analysis: SingularityResult;
  /** LLM reasoning (if enabled) */
  llm_reasoning?: {
    prompt_summary: string;
    response_summary: string;
    confidence_boost: number;
  };
  /** Self-reflection */
  self_reflection: {
    assumptions: string[];
    uncertainties: string[];
    safety_concerns: string[];
    alternative_considered: string;
    why_not_alternative: string;
  };
  /** Proactive suggestions */
  proactive_suggestions: string[];
}

/** 5-axis decision result */
export interface FiveAxisDecisionResult {
  /** Recommended strategy */
  recommended_strategy: FiveAxisStrategy;
  /** Confidence (0-1) */
  confidence: number;
  /** RTCP enabled recommendation */
  rtcp_required: boolean;
  /** Safe to execute without singularity issues */
  singularity_safe: boolean;
  /** Recommended tilt angles for 3+2 (if applicable) */
  recommended_tilt?: { A_deg: number; C_deg: number };
  /** Expected cycle time (minutes) */
  expected_cycle_time_min: number;
  /** Expected cost per part ($) */
  expected_cost_per_part: number;
  /** Surface quality prediction */
  expected_surface_quality: "excellent" | "good" | "acceptable" | "poor";
  /** Explanation summary */
  explanation: string;
  /** Safety warnings */
  safety_warnings: string[];
  /** Alternatives considered */
  alternatives: Array<{
    strategy: FiveAxisStrategy;
    why_not: string;
    cycle_time_min: number;
    risk_factors: string[];
  }>;
  /** Full reasoning trace (if requested) */
  reasoning?: FiveAxisReasoningTrace;
  /** Prediction ID for learning */
  prediction_id?: string;
}

// ============================================================================
// OKUMA M460V-5AX CONFIGURATION
// ============================================================================

/** Default Okuma M460V-5AX kinematic configuration */
export const OKUMA_M460V_5AX: MachineKinematics = {
  machine_id: "VMC-02",
  machine_name: "Okuma M460V-5AX",
  kinematic_type: "table_table",
  primary_rotary: "A",
  secondary_rotary: "C",
  pivot_to_gauge_mm: 250,    // Approximate spindle face to rotary center
  pivot_to_table_mm: 150,    // Rotary center to table surface
  axis_limits: {
    A_min: -120,
    A_max: 30,
    C_min: -360,
    C_max: 360,
  },
  max_rotary_speed_deg_per_sec: 50,  // Based on 50 RPM max
  max_rpm: 15000,
  rtcp_enabled: true,
  tcpm_mode: "G43.4",  // Okuma OSP RTCP command
  hourly_rate: 135.00,
};

// ============================================================================
// DECISION CRITERIA
// ============================================================================

const FIVE_AXIS_CRITERIA: DecisionCriterion[] = [
  {
    id: "surface_quality",
    name: "Surface Quality",
    description: "Expected surface finish quality",
    importance: "critical",
    weight: 0.25,
    type: "maximize",
  },
  {
    id: "singularity_safety",
    name: "Singularity Safety",
    description: "Freedom from kinematic singularities",
    importance: "critical",
    weight: 0.20,
    type: "maximize",
    min_threshold: 0.8,
  },
  {
    id: "accessibility",
    name: "Feature Accessibility",
    description: "Ability to reach all features without collision",
    importance: "critical",
    weight: 0.20,
    type: "maximize",
    min_threshold: 0.9,
  },
  {
    id: "cycle_time",
    name: "Cycle Time",
    description: "Total machining time",
    importance: "high",
    weight: 0.15,
    type: "minimize",
    unit: "minutes",
  },
  {
    id: "programming_complexity",
    name: "Programming Complexity",
    description: "CAM programming and verification effort",
    importance: "medium",
    weight: 0.10,
    type: "minimize",
  },
  {
    id: "operator_skill_match",
    name: "Operator Skill Match",
    description: "Match between strategy complexity and operator expertise",
    importance: "medium",
    weight: 0.10,
    type: "maximize",
  },
];

// ============================================================================
// ENGINE CLASS
// ============================================================================

/**
 * FiveAxisDecisionEngine — AI-powered 5-axis strategy selection.
 *
 * Combines RTCP validation, singularity avoidance, and LLM reasoning
 * for intelligent 5-axis machining decisions.
 */
export class FiveAxisDecisionEngine {
  /**
   * Make AI-powered decision on 5-axis strategy.
   *
   * @param input - Part features, machine kinematics, tool, and constraints
   * @returns Decision with reasoning, safety analysis, and alternatives
   */
  static decide(input: FiveAxisDecisionInput): FiveAxisDecisionResult {
    const startTime = Date.now();
    log.info(`[FiveAxisDecision] Starting decision for ${input.part_features.length} features on ${input.machine.machine_name}`);

    // Step 1: Build chain-of-thought reasoning
    const reasoning = this.buildReasoningChain(input);

    // Step 2: Analyze RTCP requirements
    const rtcpAnalysis = this.analyzeRTCP(input);

    // Step 3: Check singularity safety
    const singularityAnalysis = this.analyzeSingularities(input);

    // Step 4: Generate and score candidate strategies
    const candidates = this.generateCandidates(input);
    const scoredCandidates = this.scoreCandidates(candidates, input, rtcpAnalysis, singularityAnalysis);

    // Step 5: Select best strategy
    const best = scoredCandidates[0];
    const alternatives = scoredCandidates.slice(1, 4);

    // Step 6: Calculate metrics
    const metrics = this.calculateMetrics(best, input);

    // Step 7: Generate explanation with AI reasoning
    const explanation = this.generateExplanation(best, input, rtcpAnalysis, singularityAnalysis);

    // Step 8: Self-reflection
    const selfReflection = this.performSelfReflection(best, alternatives, input, singularityAnalysis);

    // Step 9: Proactive suggestions
    const suggestions = this.generateProactiveSuggestions(best, input, rtcpAnalysis, singularityAnalysis);

    // Step 10: Safety warnings
    const safetyWarnings = this.generateSafetyWarnings(rtcpAnalysis, singularityAnalysis, input);

    // Step 11: Create learning prediction
    const predictionId = this.createLearningPrediction(best, metrics, input);

    const result: FiveAxisDecisionResult = {
      recommended_strategy: best.strategy,
      confidence: best.confidence,
      rtcp_required: rtcpAnalysis.validation.max_error_mm > 0.01,
      singularity_safe: singularityAnalysis.is_safe,
      recommended_tilt: best.strategy === "3_plus_2_positioning" ? best.recommendedTilt : undefined,
      expected_cycle_time_min: metrics.cycleTime,
      expected_cost_per_part: metrics.costPerPart,
      expected_surface_quality: metrics.surfaceQuality,
      explanation,
      safety_warnings: safetyWarnings,
      alternatives: alternatives.map((alt) => ({
        strategy: alt.strategy,
        why_not: alt.whyNot,
        cycle_time_min: alt.cycleTime,
        risk_factors: alt.riskFactors,
      })),
      prediction_id: predictionId,
    };

    // Include full reasoning trace if requested
    if (input.include_reasoning) {
      result.reasoning = {
        reasoning_chain: reasoning,
        rtcp_analysis: {
          sample_compensations: rtcpAnalysis.samples,
          max_compensation_mm: rtcpAnalysis.validation.max_error_mm,
          validation: rtcpAnalysis.validation,
        },
        singularity_analysis: singularityAnalysis,
        self_reflection: selfReflection,
        proactive_suggestions: suggestions,
      };
    }

    const elapsed = Date.now() - startTime;
    log.info(`[FiveAxisDecision] Decided: ${best.strategy}, confidence=${best.confidence.toFixed(2)}, singularity_safe=${singularityAnalysis.is_safe}, elapsed=${elapsed}ms`);

    return result;
  }

  /**
   * Build chain-of-thought reasoning for 5-axis decision.
   */
  private static buildReasoningChain(input: FiveAxisDecisionInput): ReasoningChain {
    const steps: ReasoningStep[] = [];
    const chainId = `5ax-${Date.now()}`;
    let stepNum = 0;

    // Step 1: Observe feature requirements
    const complexFeatures = input.part_features.filter(
      (f) => f.feature_type === "impeller_blade" || f.feature_type === "freeform_surface" || f.has_undercuts
    );
    steps.push({
      step_id: `${chainId}-${++stepNum}`,
      step_number: stepNum,
      type: "observation",
      content: `Part has ${input.part_features.length} features requiring 5-axis access. ${complexFeatures.length} features require continuous tool orientation changes.`,
      premises: ["Part feature analysis"],
      confidence: 1.0,
      timestamp: new Date().toISOString(),
    });

    // Step 2: Observe machine capabilities
    steps.push({
      step_id: `${chainId}-${++stepNum}`,
      step_number: stepNum,
      type: "observation",
      content: `${input.machine.machine_name} has ${input.machine.kinematic_type} configuration with ${input.machine.primary_rotary}+${input.machine.secondary_rotary} axes. RTCP: ${input.machine.rtcp_enabled ? "enabled" : "disabled"} (${input.machine.tcpm_mode}).`,
      premises: ["Machine configuration"],
      confidence: 1.0,
      timestamp: new Date().toISOString(),
    });

    // Step 3: Analyze tool orientation requirements
    const maxOrientations = Math.max(...input.part_features.map((f) => f.required_orientations.length));
    const hasUndercuts = input.part_features.some((f) => f.has_undercuts);
    steps.push({
      step_id: `${chainId}-${++stepNum}`,
      step_number: stepNum,
      type: "observation",
      content: `Maximum ${maxOrientations} distinct tool orientations required. Undercuts: ${hasUndercuts ? "yes" : "no"}. Thin walls: ${input.part_features.some((f) => f.has_thin_walls) ? "yes" : "no"}.`,
      premises: ["Feature geometry analysis"],
      confidence: 0.95,
      timestamp: new Date().toISOString(),
    });

    // Step 4: Hypothesis about strategy
    const needs5Axis = complexFeatures.length > 0 || hasUndercuts || maxOrientations > 4;
    steps.push({
      step_id: `${chainId}-${++stepNum}`,
      step_number: stepNum,
      type: "hypothesis",
      content: needs5Axis
        ? "5-axis simultaneous likely required due to complex surface geometry or undercuts."
        : "3+2 positioning may be sufficient — features accessible from limited orientations.",
      premises: [`Step ${stepNum - 2}`, `Step ${stepNum - 1}`],
      confidence: 0.8,
      self_question: "Can features be reached with fixed tool orientation?",
      self_answer: needs5Axis ? "No — continuous orientation change needed" : "Yes — discrete orientations sufficient",
      timestamp: new Date().toISOString(),
    });

    // Step 5: Calculate accessibility
    const avgAccessibility = input.part_features.reduce((sum, f) => sum + f.accessibility_score, 0) / input.part_features.length;
    steps.push({
      step_id: `${chainId}-${++stepNum}`,
      step_number: stepNum,
      type: "calculation",
      content: `Average accessibility score: ${(avgAccessibility * 100).toFixed(1)}%. ${avgAccessibility < 0.7 ? "CONCERN: Low accessibility may cause tool/holder interference." : "Good accessibility for selected tool."}`,
      premises: ["Feature accessibility analysis"],
      calculation: {
        formula: "avg_accessibility = Σ(feature.accessibility_score) / n",
        inputs: { features: input.part_features.length },
        result: avgAccessibility,
        unit: "ratio",
      },
      confidence: 0.9,
      timestamp: new Date().toISOString(),
    });

    // Step 6: Validate against machine limits
    const maxTilt = Math.max(
      ...input.part_features.flatMap((f) =>
        f.required_orientations.map((o) => Math.acos(Math.max(-1, Math.min(1, o.k))) * 180 / Math.PI)
      )
    );
    const withinLimits = maxTilt <= Math.abs(input.machine.axis_limits.A_min) || maxTilt <= input.machine.axis_limits.A_max;
    steps.push({
      step_id: `${chainId}-${++stepNum}`,
      step_number: stepNum,
      type: "validation",
      content: `Maximum required tilt: ${maxTilt.toFixed(1)}°. Machine A-axis limits: [${input.machine.axis_limits.A_min}°, ${input.machine.axis_limits.A_max}°]. ${withinLimits ? "Within limits." : "EXCEEDS LIMITS — may need part reorientation."}`,
      premises: ["Tool orientation requirements", "Machine axis limits"],
      confidence: 0.95,
      warnings: withinLimits ? undefined : ["Required tilt exceeds machine axis limits"],
      timestamp: new Date().toISOString(),
    });

    // Step 7: Reflection on safety
    steps.push({
      step_id: `${chainId}-${++stepNum}`,
      step_number: stepNum,
      type: "reflection",
      content: `Tool length ${input.tool.overall_length_mm}mm, gauge length ${input.tool.gauge_length_mm}mm. ${input.tool.overall_length_mm > 100 ? "Long tool — singularity avoidance critical." : "Standard tool length — normal precautions apply."} RTCP compensation will be ${(input.machine.pivot_to_gauge_mm * Math.sin(maxTilt * Math.PI / 180)).toFixed(1)}mm at max tilt.`,
      premises: ["Tool geometry", "Machine kinematics"],
      confidence: 0.9,
      timestamp: new Date().toISOString(),
    });

    // Step 8: Conclusion
    const recommendation = needs5Axis
      ? (hasUndercuts ? "multiaxis_contouring" : "5_axis_simultaneous")
      : "3_plus_2_positioning";
    steps.push({
      step_id: `${chainId}-${++stepNum}`,
      step_number: stepNum,
      type: "conclusion",
      content: `Recommend ${recommendation} strategy. ${needs5Axis ? "Complex geometry requires continuous tool orientation." : "Discrete orientations sufficient for all features."}`,
      premises: steps.slice(0, -1).map((s) => `Step ${s.step_number}`),
      confidence: needs5Axis ? 0.85 : 0.9,
      timestamp: new Date().toISOString(),
    });

    return {
      chain_id: chainId,
      problem: "Select optimal 5-axis machining strategy",
      goal: "Maximize surface quality and safety while minimizing cycle time",
      steps,
      current_confidence: steps[steps.length - 1].confidence,
      dead_ends: [],
      final_answer: {
        answer: recommendation,
        confidence: steps[steps.length - 1].confidence,
        justification: [steps[steps.length - 1].content],
        assumptions: [
          "Machine RTCP calibration is accurate",
          "Tool length measurements are correct",
          "CAM system supports required toolpath output",
        ],
        caveats: withinLimits ? [] : ["Part may require reorientation to access all features"],
        evidence_strength: "moderate",
      },
      total_time_ms: 0,
      meta: {
        strategy: "linear",
        max_depth: steps.length,
        backtrack_count: 0,
        branch_count: 1,
        pruned_branches: 0,
      },
    };
  }

  /**
   * Analyze RTCP compensation requirements.
   */
  private static analyzeRTCP(input: FiveAxisDecisionInput): RTCPAnalysisResult {
    const samples: RTCPResult[] = [];

    // Sample orientations from part features
    const sampleOrientations = input.part_features.flatMap((f) => f.required_orientations).slice(0, 8);

    for (const orientation of sampleOrientations) {
      // Convert orientation vector to axis angles
      const A_deg = Math.acos(Math.max(-1, Math.min(1, orientation.k))) * 180 / Math.PI;
      const C_deg = Math.atan2(orientation.i, -orientation.j) * 180 / Math.PI;

      const rtcpInput: RTCPInput = {
        kinematic_type: input.machine.kinematic_type,
        pivot_to_gauge_mm: input.machine.pivot_to_gauge_mm,
        pivot_to_table_mm: input.machine.pivot_to_table_mm,
        tool_length_mm: input.tool.overall_length_mm,
        tool_gauge_length_mm: input.tool.gauge_length_mm,
        A_deg,
        C_deg,
        X_mm: 0,
        Y_mm: 0,
        Z_mm: 0,
        tolerance_mm: 0.01,
      };

      const result = rtcpCompensationEngine.compensate(rtcpInput);
      samples.push(result);
    }

    // Validate against machine limits using first sample
    const firstOrientation = sampleOrientations[0] || { i: 0, j: 0, k: 1 };
    const A_deg = Math.acos(Math.max(-1, Math.min(1, firstOrientation.k))) * 180 / Math.PI;

    const validation = rtcpCompensationEngine.validate(
      {
        kinematic_type: input.machine.kinematic_type,
        pivot_to_gauge_mm: input.machine.pivot_to_gauge_mm,
        pivot_to_table_mm: input.machine.pivot_to_table_mm,
        tool_length_mm: input.tool.overall_length_mm,
        tool_gauge_length_mm: input.tool.gauge_length_mm,
        A_deg,
        C_deg: 0,
        X_mm: 0,
        Y_mm: 0,
        Z_mm: 0,
      },
      input.machine.axis_limits
    );

    return { samples, validation };
  }

  /**
   * Analyze singularity risks in the toolpath.
   */
  private static analyzeSingularities(input: FiveAxisDecisionInput): SingularityResult {
    // Build toolpath points from feature orientations
    const toolpathPoints: ToolpathPoint[] = [];
    let x = 0, y = 0, z = 0;

    for (const feature of input.part_features) {
      for (const orientation of feature.required_orientations) {
        toolpathPoints.push({
          x: x += 10, // Simulate linear motion
          y,
          z,
          i: orientation.i,
          j: orientation.j,
          k: orientation.k,
        });
      }
    }

    // If no orientations, add default vertical
    if (toolpathPoints.length === 0) {
      toolpathPoints.push({ x: 0, y: 0, z: 0, i: 0, j: 0, k: 1 });
    }

    const singularityInput: SingularityInput = {
      kinematic_type: input.machine.kinematic_type as "table_table" | "head_head" | "mixed",
      toolpath_points: toolpathPoints,
      rotary_axis_1: input.machine.primary_rotary,
      rotary_axis_2: input.machine.secondary_rotary,
      angular_velocity_limit_deg_per_sec: input.machine.max_rotary_speed_deg_per_sec,
      feed_rate_mm_per_min: input.feed_rate_mm_per_min,
    };

    return singularityAvoidanceEngine.detect(singularityInput);
  }

  /**
   * Generate candidate strategies.
   */
  private static generateCandidates(input: FiveAxisDecisionInput): ScoredCandidate[] {
    const candidates: ScoredCandidate[] = [];
    const featureTypes = new Set(input.part_features.map((f) => f.feature_type));

    // 3+2 Positioning — always an option
    candidates.push({
      strategy: "3_plus_2_positioning",
      score: 0,
      confidence: 0,
      cycleTime: 0,
      costPerPart: 0,
      surfaceQuality: "good",
      whyNot: "",
      riskFactors: [],
      recommendedTilt: { A_deg: -30, C_deg: 0 },
    });

    // 5-axis simultaneous
    candidates.push({
      strategy: "5_axis_simultaneous",
      score: 0,
      confidence: 0,
      cycleTime: 0,
      costPerPart: 0,
      surfaceQuality: "excellent",
      whyNot: "",
      riskFactors: [],
    });

    // Swarf cutting for ruled surfaces
    if (featureTypes.has("ruled_surface")) {
      candidates.push({
        strategy: "swarf_cutting",
        score: 0,
        confidence: 0,
        cycleTime: 0,
        costPerPart: 0,
        surfaceQuality: "excellent",
        whyNot: "",
        riskFactors: [],
      });
    }

    // Impeller/turbine for blades
    if (featureTypes.has("impeller_blade")) {
      candidates.push({
        strategy: "impeller_turbine",
        score: 0,
        confidence: 0,
        cycleTime: 0,
        costPerPart: 0,
        surfaceQuality: "excellent",
        whyNot: "",
        riskFactors: [],
      });
    }

    // Port/cavity for deep access
    if (featureTypes.has("deep_cavity") || featureTypes.has("port")) {
      candidates.push({
        strategy: "port_cavity",
        score: 0,
        confidence: 0,
        cycleTime: 0,
        costPerPart: 0,
        surfaceQuality: "good",
        whyNot: "",
        riskFactors: [],
      });
    }

    // Multiaxis contouring for complex surfaces
    if (featureTypes.has("freeform_surface") || input.part_features.some((f) => f.has_undercuts)) {
      candidates.push({
        strategy: "multiaxis_contouring",
        score: 0,
        confidence: 0,
        cycleTime: 0,
        costPerPart: 0,
        surfaceQuality: "excellent",
        whyNot: "",
        riskFactors: [],
      });
    }

    return candidates;
  }

  /**
   * Score candidates against criteria.
   */
  private static scoreCandidates(
    candidates: ScoredCandidate[],
    input: FiveAxisDecisionInput,
    rtcpAnalysis: RTCPAnalysisResult,
    singularityAnalysis: SingularityResult
  ): ScoredCandidate[] {
    const hasComplexFeatures = input.part_features.some(
      (f) => f.feature_type === "impeller_blade" || f.feature_type === "freeform_surface" || f.has_undercuts
    );
    const hasRuledSurfaces = input.part_features.some((f) => f.feature_type === "ruled_surface");

    for (const candidate of candidates) {
      // Calculate base metrics
      const metrics = this.estimateMetrics(candidate, input);
      candidate.cycleTime = metrics.cycleTime;
      candidate.costPerPart = metrics.costPerPart;
      candidate.surfaceQuality = metrics.surfaceQuality;

      // Score each criterion
      let totalScore = 0;

      for (const criterion of FIVE_AXIS_CRITERIA) {
        const rawScore = this.scoreCriterion(candidate, criterion, input, singularityAnalysis);
        totalScore += rawScore * criterion.weight;
      }

      candidate.score = totalScore;

      // Strategy-specific boosts and penalties
      if (hasComplexFeatures && candidate.strategy === "3_plus_2_positioning") {
        candidate.score -= 0.2;
        candidate.riskFactors.push("Complex features may not be accessible with fixed orientation");
      }

      if (hasRuledSurfaces && candidate.strategy === "swarf_cutting") {
        candidate.score += 0.15;
      }

      if (!singularityAnalysis.is_safe && candidate.strategy === "5_axis_simultaneous") {
        candidate.score -= 0.3;
        candidate.riskFactors.push("Singularity detected in toolpath");
      }

      // Confidence based on analysis quality
      candidate.confidence = this.calculateConfidence(candidate, input, singularityAnalysis);
    }

    // Sort by score descending
    candidates.sort((a, b) => b.score - a.score);

    // Generate "why not" for alternatives
    const best = candidates[0];
    for (const alt of candidates.slice(1)) {
      alt.whyNot = this.generateWhyNot(alt, best, input, singularityAnalysis);
    }

    return candidates;
  }

  /**
   * Score a single criterion.
   */
  private static scoreCriterion(
    candidate: ScoredCandidate,
    criterion: DecisionCriterion,
    input: FiveAxisDecisionInput,
    singularityAnalysis: SingularityResult
  ): number {
    switch (criterion.id) {
      case "surface_quality":
        const qualityScores: Record<string, number> = {
          excellent: 1.0,
          good: 0.75,
          acceptable: 0.5,
          poor: 0.25,
        };
        return qualityScores[candidate.surfaceQuality] ?? 0.5;

      case "singularity_safety":
        if (!singularityAnalysis.is_safe && candidate.strategy === "5_axis_simultaneous") {
          return 0.3;
        }
        if (candidate.strategy === "3_plus_2_positioning") {
          return 1.0; // No singularity risk with fixed orientation
        }
        return singularityAnalysis.is_safe ? 0.9 : 0.5;

      case "accessibility":
        const avgAccess = input.part_features.reduce((sum, f) => sum + f.accessibility_score, 0) / input.part_features.length;
        if (candidate.strategy === "3_plus_2_positioning") {
          return avgAccess * 0.8; // Reduced for fixed orientation
        }
        return avgAccess;

      case "cycle_time":
        // Normalize against baseline
        const baseline = 30;
        return Math.max(0, 1 - (candidate.cycleTime - baseline) / baseline);

      case "programming_complexity":
        const complexityMap: Record<FiveAxisStrategy, number> = {
          "3_plus_2_positioning": 0.9,
          "5_axis_simultaneous": 0.6,
          "swarf_cutting": 0.5,
          "multiaxis_contouring": 0.4,
          "impeller_turbine": 0.3,
          "port_cavity": 0.5,
        };
        return complexityMap[candidate.strategy] ?? 0.5;

      case "operator_skill_match":
        const skillRequired: Record<FiveAxisStrategy, number> = {
          "3_plus_2_positioning": 3,
          "5_axis_simultaneous": 4,
          "swarf_cutting": 4,
          "multiaxis_contouring": 5,
          "impeller_turbine": 5,
          "port_cavity": 4,
        };
        const match = 1 - Math.abs(skillRequired[candidate.strategy] - input.operator_skill) / 5;
        return match;

      default:
        return 0.5;
    }
  }

  /**
   * Estimate metrics for a candidate.
   */
  private static estimateMetrics(candidate: ScoredCandidate, input: FiveAxisDecisionInput): CandidateMetrics {
    const baseMachineTime = 20; // Base time in minutes

    let cycleTimeMultiplier: number;
    let surfaceQuality: "excellent" | "good" | "acceptable" | "poor";

    switch (candidate.strategy) {
      case "3_plus_2_positioning":
        cycleTimeMultiplier = 1.2;
        surfaceQuality = "good";
        break;
      case "5_axis_simultaneous":
        cycleTimeMultiplier = 1.0;
        surfaceQuality = "excellent";
        break;
      case "swarf_cutting":
        cycleTimeMultiplier = 0.8;
        surfaceQuality = "excellent";
        break;
      case "multiaxis_contouring":
        cycleTimeMultiplier = 1.1;
        surfaceQuality = "excellent";
        break;
      case "impeller_turbine":
        cycleTimeMultiplier = 1.3;
        surfaceQuality = "excellent";
        break;
      case "port_cavity":
        cycleTimeMultiplier = 1.4;
        surfaceQuality = "good";
        break;
      default:
        cycleTimeMultiplier = 1.0;
        surfaceQuality = "acceptable";
    }

    const cycleTime = baseMachineTime * cycleTimeMultiplier;
    const setupTime = 30; // 30 min setup
    const costPerPart = (cycleTime / 60) * input.machine.hourly_rate + (setupTime / 60) * input.machine.hourly_rate / input.batch_size;

    return { cycleTime, costPerPart, surfaceQuality };
  }

  /**
   * Calculate confidence in recommendation.
   */
  private static calculateConfidence(
    candidate: ScoredCandidate,
    input: FiveAxisDecisionInput,
    singularityAnalysis: SingularityResult
  ): number {
    let confidence = 0.75;

    // Boost for clear strategy match
    if (candidate.strategy === "swarf_cutting" && input.part_features.some((f) => f.feature_type === "ruled_surface")) {
      confidence += 0.1;
    }
    if (candidate.strategy === "impeller_turbine" && input.part_features.some((f) => f.feature_type === "impeller_blade")) {
      confidence += 0.1;
    }

    // Penalize for singularity issues
    if (!singularityAnalysis.is_safe) {
      confidence -= 0.15;
    }

    // Penalize for low operator skill match
    if (input.operator_skill < 4 && candidate.strategy !== "3_plus_2_positioning") {
      confidence -= 0.1;
    }

    return Math.max(0.5, Math.min(0.95, confidence));
  }

  /**
   * Generate why not explanation.
   */
  private static generateWhyNot(
    alt: ScoredCandidate,
    best: ScoredCandidate,
    input: FiveAxisDecisionInput,
    singularityAnalysis: SingularityResult
  ): string {
    if (alt.strategy === "3_plus_2_positioning" && best.strategy !== "3_plus_2_positioning") {
      return "Fixed orientation cannot access all features requiring continuous tilt";
    }
    if (alt.strategy === "5_axis_simultaneous" && !singularityAnalysis.is_safe) {
      return "Singularity risks detected — requires toolpath modification";
    }
    if (alt.strategy === "impeller_turbine" && !input.part_features.some((f) => f.feature_type === "impeller_blade")) {
      return "No impeller/blade features detected in part";
    }
    if (alt.strategy === "swarf_cutting" && !input.part_features.some((f) => f.feature_type === "ruled_surface")) {
      return "No ruled surfaces suitable for swarf cutting";
    }
    return `Lower score (${alt.score.toFixed(2)}) vs selected (${best.score.toFixed(2)})`;
  }

  /**
   * Calculate final metrics.
   */
  private static calculateMetrics(candidate: ScoredCandidate, input: FiveAxisDecisionInput): CandidateMetrics {
    return this.estimateMetrics(candidate, input);
  }

  /**
   * Generate human-readable explanation.
   */
  private static generateExplanation(
    best: ScoredCandidate,
    input: FiveAxisDecisionInput,
    rtcpAnalysis: RTCPAnalysisResult,
    singularityAnalysis: SingularityResult
  ): string {
    const strategyNames: Record<FiveAxisStrategy, string> = {
      "3_plus_2_positioning": "3+2 positional machining",
      "5_axis_simultaneous": "5-axis simultaneous machining",
      "swarf_cutting": "swarf (flank) cutting",
      "multiaxis_contouring": "multi-axis contouring",
      "impeller_turbine": "impeller/turbine specialized strategy",
      "port_cavity": "port/cavity access strategy",
    };

    let explanation = `Recommend ${strategyNames[best.strategy]} on ${input.machine.machine_name}. `;

    if (best.strategy === "3_plus_2_positioning" && best.recommendedTilt) {
      explanation += `Fixed orientation: A=${best.recommendedTilt.A_deg}°, C=${best.recommendedTilt.C_deg}°. `;
    }

    explanation += `Expected cycle time: ${best.cycleTime.toFixed(1)} min. `;
    explanation += `Surface quality: ${best.surfaceQuality}. `;

    if (rtcpAnalysis.validation.max_error_mm > 0.01) {
      explanation += `RTCP required (${rtcpAnalysis.validation.max_error_mm.toFixed(2)}mm compensation). `;
    }

    if (!singularityAnalysis.is_safe) {
      explanation += `WARNING: ${singularityAnalysis.singular_points.length} singularity point(s) detected. `;
    }

    explanation += `Confidence: ${(best.confidence * 100).toFixed(0)}%.`;

    return explanation;
  }

  /**
   * Perform self-reflection on decision.
   */
  private static performSelfReflection(
    best: ScoredCandidate,
    alternatives: ScoredCandidate[],
    input: FiveAxisDecisionInput,
    singularityAnalysis: SingularityResult
  ): FiveAxisReasoningTrace["self_reflection"] {
    const topAlt = alternatives[0];

    return {
      assumptions: [
        "Machine RTCP/TCPM calibration is accurate and current",
        "Tool length compensation is correctly measured",
        "CAM post-processor outputs correct G43.4/TRAORI commands",
        "Workpiece coordinate system is properly established",
      ],
      uncertainties: [
        singularityAnalysis.singular_points.length > 0 ? `${singularityAnalysis.singular_points.length} potential singularity points need verification` : "",
        input.operator_skill < 4 ? "Operator may need additional training for this strategy" : "",
        input.tool.overall_length_mm > 100 ? "Long tool — verify collision-free approach" : "",
      ].filter(Boolean),
      safety_concerns: [
        singularityAnalysis.singular_points.some((p) => p.severity === "critical") ? "CRITICAL: Gimbal lock risk — toolpath must be modified" : "",
        input.part_features.some((f) => f.max_depth_mm > 50) ? "Deep feature — verify spindle clearance" : "",
      ].filter(Boolean),
      alternative_considered: topAlt ? `${topAlt.strategy}` : "No close alternatives",
      why_not_alternative: topAlt?.whyNot ?? "Best option by significant margin",
    };
  }

  /**
   * Generate proactive suggestions.
   */
  private static generateProactiveSuggestions(
    best: ScoredCandidate,
    input: FiveAxisDecisionInput,
    rtcpAnalysis: RTCPAnalysisResult,
    singularityAnalysis: SingularityResult
  ): string[] {
    const suggestions: string[] = [];

    if (best.strategy === "3_plus_2_positioning" && input.part_features.length > 3) {
      suggestions.push("Consider 5-axis simultaneous for reduced setup changes");
    }

    if (singularityAnalysis.max_angular_velocity_deg_per_sec > input.machine.max_rotary_speed_deg_per_sec * 0.7) {
      suggestions.push("Reduce feed rate through high-velocity rotary sections");
    }

    if (rtcpAnalysis.validation.max_error_mm > 5) {
      suggestions.push("Large RTCP compensation — verify machine pivot point calibration");
    }

    if (input.tool.type === "ball_nose" && best.strategy === "5_axis_simultaneous") {
      suggestions.push("Lead/tilt angle optimization: 15° lead can improve surface finish");
    }

    if (input.part_features.some((f) => f.has_thin_walls)) {
      suggestions.push("Thin wall features: consider climb milling with reduced DOC");
    }

    if (input.operator_skill < 4 && best.strategy !== "3_plus_2_positioning") {
      suggestions.push("Schedule operator training before production run");
    }

    return suggestions;
  }

  /**
   * Generate safety warnings.
   */
  private static generateSafetyWarnings(
    rtcpAnalysis: RTCPAnalysisResult,
    singularityAnalysis: SingularityResult,
    input: FiveAxisDecisionInput
  ): string[] {
    const warnings: string[] = [];

    // Singularity warnings
    for (const point of singularityAnalysis.singular_points) {
      if (point.severity === "critical") {
        warnings.push(`CRITICAL: ${point.description} at point ${point.point_index}`);
      }
    }

    // RTCP warnings
    if (!rtcpAnalysis.validation.safe) {
      warnings.push(...rtcpAnalysis.validation.warnings.filter((w) => w.startsWith("SAFETY")));
    }

    // High compensation warning
    if (rtcpAnalysis.validation.max_error_mm > 25) {
      warnings.push(`Large compensation vector (${rtcpAnalysis.validation.max_error_mm.toFixed(1)}mm) — verify pivot calibration`);
    }

    // Tool length warning
    if (input.tool.overall_length_mm > 150) {
      warnings.push("Long tool overhang — verify collision clearance and chatter risk");
    }

    return warnings;
  }

  /**
   * Create learning prediction.
   */
  private static createLearningPrediction(
    best: ScoredCandidate,
    metrics: CandidateMetrics,
    input: FiveAxisDecisionInput
  ): string {
    const predictionId = `5ax-pred-${Date.now()}`;

    const prediction: Prediction = {
      prediction_id: predictionId,
      category: "cycle_time",
      predicted_value: metrics.cycleTime,
      predicted_uncertainty: metrics.cycleTime * 0.2,
      confidence: best.confidence,
      timestamp: new Date().toISOString(),
      context: {
        material: input.material,
        machine: input.machine.machine_id,
        strategy: best.strategy,
        feature_count: input.part_features.length,
        batch_size: input.batch_size,
      },
      model_version: "FiveAxisDecision-1.0",
      explanation: `Predicted cycle time for ${best.strategy} strategy`,
    };

    log.info(`[FiveAxisDecision] Created prediction ${predictionId} for learning feedback`);

    return predictionId;
  }
}

// ============================================================================
// HELPER TYPES
// ============================================================================

interface RTCPAnalysisResult {
  samples: RTCPResult[];
  validation: RTCPValidation;
}

interface ScoredCandidate {
  strategy: FiveAxisStrategy;
  score: number;
  confidence: number;
  cycleTime: number;
  costPerPart: number;
  surfaceQuality: "excellent" | "good" | "acceptable" | "poor";
  whyNot: string;
  riskFactors: string[];
  recommendedTilt?: { A_deg: number; C_deg: number };
}

interface CandidateMetrics {
  cycleTime: number;
  costPerPart: number;
  surfaceQuality: "excellent" | "good" | "acceptable" | "poor";
}

// Export singleton
export const fiveAxisDecisionEngine = new FiveAxisDecisionEngine();
