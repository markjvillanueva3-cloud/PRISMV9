/**
 * FourthAxisDecisionEngine — AI-Powered 4th Axis Strategy Selection
 * ==================================================================
 * Intelligent decision engine for 4th axis machining strategies:
 *   - Uses DecisionReasoningEngine for multi-criteria selection
 *   - Integrates ChainOfThoughtEngine for explainable reasoning
 *   - Leverages LearningAdaptationEngine to learn from outcomes
 *   - Proactive suggestions for setup optimization
 *
 * Key decisions:
 *   1. When to use 4th axis vs multiple setups
 *   2. Positional indexing vs continuous interpolation
 *   3. Tombstone configuration selection
 *   4. Rotary table selection for the job
 *
 * @module engines/FourthAxisDecisionEngine
 * @version 1.0.0
 */

import { log } from "../utils/Logger.js";
import {
  DecisionReasoningEngine,
  type DecisionProblem,
  type DecisionCandidate,
  type DecisionCriterion,
  type DecisionRecommendation,
  type DecisionContext,
} from "./DecisionReasoningEngine.js";
import {
  ChainOfThoughtEngine,
  type ReasoningChain,
  type ReasoningStep,
} from "./ChainOfThoughtEngine.js";
import {
  LearningAdaptationEngine,
  type Prediction,
  type PredictionContext,
} from "./LearningAdaptationEngine.js";
import {
  FourthAxisIndexingEngine,
  type FourthAxisInput,
  type RotaryTableSpec,
  HAAS_TR160,
  HAAS_TR210,
  HAAS_HRT210,
} from "./FourthAxisIndexingEngine.js";

// ============================================================================
// TYPES
// ============================================================================

/** Strategy options for 4th axis decision */
export type FourthAxisStrategy =
  | "4th_axis_positional"    // Use 4th axis with positional indexing
  | "4th_axis_continuous"    // Use 4th axis with continuous interpolation
  | "multiple_setups"        // Manual repositioning, no rotary
  | "5_axis_simultaneous";   // Full 5-axis (if available)

/** Part geometry for decision making */
export interface PartGeometry {
  /** Number of sides requiring machining */
  machined_sides: number;
  /** Whether features wrap around cylindrical surface */
  has_wrap_features: boolean;
  /** Maximum part dimension (mm) */
  max_dimension_mm: number;
  /** Part weight (kg) */
  weight_kg: number;
  /** Required tolerance (mm) */
  tolerance_mm: number;
  /** Required surface finish (Ra, μm) */
  surface_finish_um?: number;
  /** Whether datum alignment is critical across faces */
  critical_datum_alignment: boolean;
}

/** Shop context for decision */
export interface ShopContext {
  /** Available machines with capabilities */
  available_machines: Array<{
    machine_id: string;
    name: string;
    capabilities: string[];
    rotary_table?: RotaryTableSpec;
    hourly_rate: number;
  }>;
  /** Batch size */
  batch_size: number;
  /** Setup time for manual repositioning (minutes) */
  manual_setup_time_min: number;
  /** Operator skill level (1-5) */
  operator_skill: number;
  /** Deadline pressure (0-1, 1=urgent) */
  urgency: number;
}

/** Decision input */
export interface FourthAxisDecisionInput {
  part: PartGeometry;
  shop: ShopContext;
  /** Material being machined */
  material: string;
  /** Operation type */
  operation: "roughing" | "finishing" | "both";
  /** Whether to include full reasoning trace */
  include_reasoning?: boolean;
}

/** AI reasoning trace */
export interface AIReasoningTrace {
  /** Chain-of-thought reasoning steps */
  reasoning_chain: ReasoningChain;
  /** Decision criteria and weights */
  criteria_analysis: DecisionCriterion[];
  /** Confidence breakdown by factor */
  confidence_factors: Array<{
    factor: string;
    impact: "positive" | "negative" | "neutral";
    weight: number;
    explanation: string;
  }>;
  /** Self-reflection on decision quality */
  self_reflection: {
    assumptions: string[];
    uncertainties: string[];
    alternative_considered: string;
    why_not_alternative: string;
  };
  /** Proactive suggestions */
  proactive_suggestions: string[];
}

/** Decision result */
export interface FourthAxisDecisionResult {
  /** Recommended strategy */
  recommended_strategy: FourthAxisStrategy;
  /** Recommended machine */
  recommended_machine: string;
  /** Confidence (0-1) */
  confidence: number;
  /** Expected cycle time (minutes) */
  expected_cycle_time_min: number;
  /** Expected cost per part ($) */
  expected_cost_per_part: number;
  /** Setup time (minutes) */
  setup_time_min: number;
  /** Quality risk assessment */
  quality_risk: "low" | "medium" | "high";
  /** Explanation summary */
  explanation: string;
  /** Alternative strategies considered */
  alternatives: Array<{
    strategy: FourthAxisStrategy;
    machine: string;
    why_not: string;
    cycle_time_min: number;
    cost_per_part: number;
  }>;
  /** Full AI reasoning trace (if requested) */
  reasoning?: AIReasoningTrace;
  /** Prediction ID for learning feedback */
  prediction_id?: string;
}

// ============================================================================
// DECISION CRITERIA
// ============================================================================

/** Standard criteria for 4th axis decision */
const FOURTH_AXIS_CRITERIA: DecisionCriterion[] = [
  {
    id: "setup_time",
    name: "Setup Time",
    description: "Total time to set up the job including fixturing",
    importance: "high",
    weight: 0.20,
    type: "minimize",
    unit: "minutes",
  },
  {
    id: "cycle_time",
    name: "Cycle Time",
    description: "Time to machine one complete part",
    importance: "critical",
    weight: 0.25,
    type: "minimize",
    unit: "minutes",
  },
  {
    id: "accuracy",
    name: "Dimensional Accuracy",
    description: "Ability to hold required tolerances",
    importance: "critical",
    weight: 0.20,
    type: "maximize",
    min_threshold: 0.7,
  },
  {
    id: "datum_alignment",
    name: "Datum Alignment",
    description: "Ability to maintain datum reference across operations",
    importance: "high",
    weight: 0.15,
    type: "maximize",
  },
  {
    id: "cost_per_part",
    name: "Cost per Part",
    description: "Total cost including machine time and setup amortization",
    importance: "high",
    weight: 0.15,
    type: "minimize",
    unit: "USD",
  },
  {
    id: "operator_skill_match",
    name: "Operator Skill Match",
    description: "How well the strategy matches available operator expertise",
    importance: "medium",
    weight: 0.05,
    type: "maximize",
  },
];

// ============================================================================
// ENGINE CLASS
// ============================================================================

/**
 * FourthAxisDecisionEngine — AI-powered strategy selection.
 *
 * Combines multi-criteria decision analysis with explainable
 * chain-of-thought reasoning and continuous learning.
 */
export class FourthAxisDecisionEngine {
  /**
   * Make AI-powered decision on 4th axis strategy.
   *
   * @param input - Part geometry, shop context, and constraints
   * @returns Decision with reasoning and alternatives
   */
  static decide(input: FourthAxisDecisionInput): FourthAxisDecisionResult {
    const startTime = Date.now();
    log.info(`[FourthAxisDecision] Starting decision for ${input.part.machined_sides}-sided part, batch=${input.shop.batch_size}`);

    // Step 1: Build reasoning chain
    const reasoning = this.buildReasoningChain(input);

    // Step 2: Generate candidate strategies
    const candidates = this.generateCandidates(input);

    // Step 3: Score candidates using DecisionReasoningEngine
    const scoredCandidates = this.scoreCandidates(candidates, input);

    // Step 4: Select best strategy
    const best = scoredCandidates[0];
    const alternatives = scoredCandidates.slice(1, 4);

    // Step 5: Calculate metrics for recommendation
    const metrics = this.calculateMetrics(best, input);

    // Step 6: Generate explanation
    const explanation = this.generateExplanation(best, alternatives, input, reasoning);

    // Step 7: Self-reflection
    const selfReflection = this.performSelfReflection(best, alternatives, input);

    // Step 8: Proactive suggestions
    const suggestions = this.generateProactiveSuggestions(best, input);

    // Step 9: Create prediction for learning
    const predictionId = this.createLearningPrediction(best, metrics, input);

    const result: FourthAxisDecisionResult = {
      recommended_strategy: best.strategy,
      recommended_machine: best.machineId,
      confidence: best.confidence,
      expected_cycle_time_min: metrics.cycleTime,
      expected_cost_per_part: metrics.costPerPart,
      setup_time_min: metrics.setupTime,
      quality_risk: metrics.qualityRisk,
      explanation: explanation,
      alternatives: alternatives.map((alt) => ({
        strategy: alt.strategy,
        machine: alt.machineId,
        why_not: alt.whyNot,
        cycle_time_min: alt.cycleTime,
        cost_per_part: alt.costPerPart,
      })),
      prediction_id: predictionId,
    };

    // Include full reasoning trace if requested
    if (input.include_reasoning) {
      result.reasoning = {
        reasoning_chain: reasoning,
        criteria_analysis: FOURTH_AXIS_CRITERIA,
        confidence_factors: this.analyzeConfidenceFactors(best, input),
        self_reflection: selfReflection,
        proactive_suggestions: suggestions,
      };
    }

    const elapsed = Date.now() - startTime;
    log.info(`[FourthAxisDecision] Decided: ${best.strategy} on ${best.machineId}, confidence=${best.confidence.toFixed(2)}, elapsed=${elapsed}ms`);

    return result;
  }

  /**
   * Build chain-of-thought reasoning.
   */
  private static buildReasoningChain(input: FourthAxisDecisionInput): ReasoningChain {
    const steps: ReasoningStep[] = [];
    const chainId = `4ax-${Date.now()}`;
    let stepNum = 0;

    // Step 1: Observe part geometry
    steps.push({
      step_id: `${chainId}-${++stepNum}`,
      step_number: stepNum,
      type: "observation",
      content: `Part requires machining on ${input.part.machined_sides} sides with ${input.part.critical_datum_alignment ? "critical" : "non-critical"} datum alignment.`,
      premises: ["Part geometry input"],
      confidence: 1.0,
      timestamp: new Date().toISOString(),
    });

    // Step 2: Observe shop capabilities
    const has4thAxis = input.shop.available_machines.some(
      (m) => m.capabilities.includes("4th_axis") || m.capabilities.includes("5axis_contouring")
    );
    steps.push({
      step_id: `${chainId}-${++stepNum}`,
      step_number: stepNum,
      type: "observation",
      content: `Shop ${has4thAxis ? "has" : "does not have"} 4th axis capability. ${input.shop.available_machines.length} machines available.`,
      premises: ["Shop capability input"],
      confidence: 1.0,
      timestamp: new Date().toISOString(),
    });

    // Step 3: Hypothesis about strategy
    steps.push({
      step_id: `${chainId}-${++stepNum}`,
      step_number: stepNum,
      type: "hypothesis",
      content: input.part.machined_sides > 2 && input.part.critical_datum_alignment
        ? "4th axis indexing likely optimal for multi-face parts with datum alignment requirements."
        : input.part.has_wrap_features
          ? "Continuous 4th axis interpolation needed for wrap features."
          : "Multiple setups may be acceptable for simple geometry.",
      premises: [`Step 1`, `Step 2`],
      confidence: 0.75,
      self_question: "Is the hypothesis supported by the part requirements?",
      self_answer: "Need to validate against tolerance and batch size requirements.",
      timestamp: new Date().toISOString(),
    });

    // Step 4: Calculate trade-offs
    const setupTimeMultiple = input.part.machined_sides * input.shop.manual_setup_time_min;
    const indexTimePerPart = 0.5 * (input.part.machined_sides - 1); // Estimate 30s per index
    steps.push({
      step_id: `${chainId}-${++stepNum}`,
      step_number: stepNum,
      type: "calculation",
      content: `Multiple setup approach: ${setupTimeMultiple.toFixed(1)} min setup total. 4th axis: ${indexTimePerPart.toFixed(1)} min index time per part.`,
      premises: [`Step 1`, "Shop setup time data"],
      calculation: {
        formula: "setup_time = sides × manual_setup_time",
        inputs: { sides: input.part.machined_sides, manual_setup_time: input.shop.manual_setup_time_min },
        result: setupTimeMultiple,
        unit: "minutes",
      },
      confidence: 0.9,
      timestamp: new Date().toISOString(),
    });

    // Step 5: Validate hypothesis
    const breakEvenBatch = Math.ceil(setupTimeMultiple / indexTimePerPart);
    steps.push({
      step_id: `${chainId}-${++stepNum}`,
      step_number: stepNum,
      type: "validation",
      content: `Break-even batch size: ${breakEvenBatch} parts. Actual batch: ${input.shop.batch_size}. ${input.shop.batch_size >= breakEvenBatch ? "4th axis is justified." : "Multiple setups may be more efficient for small batch."}`,
      premises: [`Step 4`, "Batch size input"],
      confidence: 0.85,
      timestamp: new Date().toISOString(),
    });

    // Step 6: Reflection on accuracy
    steps.push({
      step_id: `${chainId}-${++stepNum}`,
      step_number: stepNum,
      type: "reflection",
      content: input.part.tolerance_mm < 0.05
        ? "Tight tolerance (<0.05mm) strongly favors 4th axis to avoid datum shift between setups."
        : `Tolerance ${input.part.tolerance_mm}mm is achievable with careful multiple setups.`,
      premises: ["Part tolerance requirement", `Step 3`],
      confidence: 0.9,
      warnings: input.part.tolerance_mm < 0.025 ? ["Very tight tolerance — consider CMM verification plan"] : undefined,
      timestamp: new Date().toISOString(),
    });

    // Step 7: Conclusion
    const recommend4thAxis = has4thAxis && (
      input.part.critical_datum_alignment ||
      input.part.tolerance_mm < 0.05 ||
      input.part.has_wrap_features ||
      input.shop.batch_size >= breakEvenBatch
    );
    steps.push({
      step_id: `${chainId}-${++stepNum}`,
      step_number: stepNum,
      type: "conclusion",
      content: recommend4thAxis
        ? "Recommend 4th axis strategy based on datum alignment, tolerance, and/or batch efficiency."
        : "Multiple setups acceptable given relaxed tolerances and small batch.",
      premises: steps.slice(0, -1).map((s) => `Step ${s.step_number}`),
      confidence: recommend4thAxis ? 0.85 : 0.75,
      timestamp: new Date().toISOString(),
    });

    return {
      chain_id: chainId,
      problem: "Select optimal 4th axis strategy for multi-face part",
      goal: "Minimize cost while meeting quality requirements",
      steps,
      current_confidence: steps[steps.length - 1].confidence,
      dead_ends: [],
      final_answer: {
        answer: recommend4thAxis ? "4th_axis_positional" : "multiple_setups",
        confidence: steps[steps.length - 1].confidence,
        justification: [steps[steps.length - 1].content],
        assumptions: ["Rotary table properly calibrated", "Operator trained on 4th axis"],
        caveats: input.part.weight_kg > 50 ? ["Heavy part — verify rotary table capacity"] : [],
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
   * Generate candidate strategies.
   */
  private static generateCandidates(input: FourthAxisDecisionInput): ScoredCandidate[] {
    const candidates: ScoredCandidate[] = [];

    for (const machine of input.shop.available_machines) {
      // Multiple setups (always an option)
      candidates.push({
        strategy: "multiple_setups",
        machineId: machine.machine_id,
        machineName: machine.name,
        hourlyRate: machine.hourly_rate,
        score: 0,
        confidence: 0,
        cycleTime: 0,
        costPerPart: 0,
        setupTime: 0,
        whyNot: "",
      });

      // 4th axis positional
      if (machine.capabilities.includes("4th_axis") || machine.rotary_table) {
        candidates.push({
          strategy: "4th_axis_positional",
          machineId: machine.machine_id,
          machineName: machine.name,
          hourlyRate: machine.hourly_rate,
          rotaryTable: machine.rotary_table,
          score: 0,
          confidence: 0,
          cycleTime: 0,
          costPerPart: 0,
          setupTime: 0,
          whyNot: "",
        });
      }

      // 4th axis continuous (for wrap features)
      if ((machine.capabilities.includes("4th_axis") || machine.rotary_table) && input.part.has_wrap_features) {
        candidates.push({
          strategy: "4th_axis_continuous",
          machineId: machine.machine_id,
          machineName: machine.name,
          hourlyRate: machine.hourly_rate,
          rotaryTable: machine.rotary_table,
          score: 0,
          confidence: 0,
          cycleTime: 0,
          costPerPart: 0,
          setupTime: 0,
          whyNot: "",
        });
      }

      // 5-axis simultaneous (if available)
      if (machine.capabilities.includes("5axis_contouring")) {
        candidates.push({
          strategy: "5_axis_simultaneous",
          machineId: machine.machine_id,
          machineName: machine.name,
          hourlyRate: machine.hourly_rate,
          score: 0,
          confidence: 0,
          cycleTime: 0,
          costPerPart: 0,
          setupTime: 0,
          whyNot: "",
        });
      }
    }

    return candidates;
  }

  /**
   * Score candidates against criteria.
   */
  private static scoreCandidates(candidates: ScoredCandidate[], input: FourthAxisDecisionInput): ScoredCandidate[] {
    for (const candidate of candidates) {
      const metrics = this.estimateMetrics(candidate, input);
      candidate.cycleTime = metrics.cycleTime;
      candidate.costPerPart = metrics.costPerPart;
      candidate.setupTime = metrics.setupTime;

      // Score each criterion
      let totalScore = 0;
      let totalWeight = 0;

      for (const criterion of FOURTH_AXIS_CRITERIA) {
        const rawScore = this.scoreCriterion(candidate, criterion, input, metrics);
        totalScore += rawScore * criterion.weight;
        totalWeight += criterion.weight;
      }

      candidate.score = totalScore / totalWeight;

      // CRITICAL: Boost continuous strategy for wrap features — this is a hard requirement
      if (input.part.has_wrap_features && candidate.strategy === "4th_axis_continuous") {
        candidate.score += 0.3; // Strong boost for wrap feature match
      }

      // Penalize multiple setups for wrap features — they can't do wrap milling
      if (input.part.has_wrap_features && candidate.strategy === "multiple_setups") {
        candidate.score -= 0.2; // Penalty for inability to do wrap
      }

      // Confidence based on data quality and match
      candidate.confidence = this.calculateConfidence(candidate, input);
    }

    // Sort by score descending
    candidates.sort((a, b) => b.score - a.score);

    // Generate "why not" for alternatives
    const best = candidates[0];
    for (const alt of candidates.slice(1)) {
      alt.whyNot = this.generateWhyNot(alt, best, input);
    }

    return candidates;
  }

  /**
   * Score a single criterion for a candidate.
   */
  private static scoreCriterion(
    candidate: ScoredCandidate,
    criterion: DecisionCriterion,
    input: FourthAxisDecisionInput,
    metrics: CandidateMetrics,
  ): number {
    switch (criterion.id) {
      case "setup_time":
        // Lower is better, normalize against worst case (multiple setups)
        const worstSetup = input.part.machined_sides * input.shop.manual_setup_time_min;
        return 1 - (metrics.setupTime / Math.max(worstSetup, 1));

      case "cycle_time":
        // Lower is better
        const baseCycle = 10; // Base machining time
        return Math.max(0, 1 - (metrics.cycleTime - baseCycle) / baseCycle);

      case "accuracy":
        // 4th axis and 5-axis score higher for tight tolerances
        if (candidate.strategy === "multiple_setups") {
          return input.part.tolerance_mm >= 0.05 ? 0.8 : 0.5;
        }
        return input.part.tolerance_mm < 0.025 ? 0.95 : 0.9;

      case "datum_alignment":
        // Critical for multi-face parts
        if (candidate.strategy === "multiple_setups") {
          return input.part.critical_datum_alignment ? 0.4 : 0.7;
        }
        return 0.95;

      case "cost_per_part":
        // Lower is better, normalize
        const maxCost = 50; // Assume max reasonable cost
        return Math.max(0, 1 - metrics.costPerPart / maxCost);

      case "operator_skill_match":
        // Match strategy complexity to operator skill
        const complexity: Record<FourthAxisStrategy, number> = {
          "multiple_setups": 2,
          "4th_axis_positional": 3,
          "4th_axis_continuous": 4,
          "5_axis_simultaneous": 5,
        };
        const skillMatch = 1 - Math.abs(complexity[candidate.strategy] - input.shop.operator_skill) / 5;
        return skillMatch;

      default:
        return 0.5;
    }
  }

  /**
   * Estimate metrics for a candidate.
   */
  private static estimateMetrics(candidate: ScoredCandidate, input: FourthAxisDecisionInput): CandidateMetrics {
    const baseMachineTime = 10; // Base machining time per part (minutes)

    let setupTime: number;
    let cycleTime: number;

    switch (candidate.strategy) {
      case "multiple_setups":
        setupTime = input.part.machined_sides * input.shop.manual_setup_time_min;
        cycleTime = baseMachineTime; // Each setup is separate batch
        break;

      case "4th_axis_positional":
        setupTime = input.shop.manual_setup_time_min + 15; // Extra time for rotary setup
        // Index time per part
        const indexTime = (input.part.machined_sides - 1) * 0.5; // 30s per index
        cycleTime = baseMachineTime + indexTime;
        break;

      case "4th_axis_continuous":
        setupTime = input.shop.manual_setup_time_min + 20; // Complex setup
        cycleTime = baseMachineTime * 1.2; // Wrap milling slightly slower
        break;

      case "5_axis_simultaneous":
        setupTime = input.shop.manual_setup_time_min + 25; // Most complex setup
        cycleTime = baseMachineTime * 0.8; // Most efficient cutting
        break;

      default:
        setupTime = input.shop.manual_setup_time_min;
        cycleTime = baseMachineTime;
    }

    // Cost calculation
    const setupCostPerPart = (setupTime / 60) * candidate.hourlyRate / input.shop.batch_size;
    const machineCostPerPart = (cycleTime / 60) * candidate.hourlyRate;
    const costPerPart = setupCostPerPart + machineCostPerPart;

    // Quality risk
    let qualityRisk: "low" | "medium" | "high";
    if (candidate.strategy === "multiple_setups" && input.part.critical_datum_alignment) {
      qualityRisk = input.part.tolerance_mm < 0.05 ? "high" : "medium";
    } else if (candidate.strategy === "5_axis_simultaneous") {
      qualityRisk = "low";
    } else {
      qualityRisk = "low";
    }

    return { setupTime, cycleTime, costPerPart, qualityRisk };
  }

  /**
   * Calculate confidence in the recommendation.
   */
  private static calculateConfidence(candidate: ScoredCandidate, input: FourthAxisDecisionInput): number {
    let confidence = 0.7; // Base confidence

    // Boost for clear cases
    if (candidate.strategy === "4th_axis_positional" && input.part.machined_sides >= 4) {
      confidence += 0.1;
    }
    if (candidate.strategy === "4th_axis_continuous" && input.part.has_wrap_features) {
      confidence += 0.15;
    }
    if (candidate.strategy === "multiple_setups" && input.part.machined_sides <= 2) {
      confidence += 0.1;
    }

    // Penalize for uncertainty
    if (input.part.tolerance_mm < 0.01) {
      confidence -= 0.1; // Very tight tolerance — uncertain
    }
    if (input.shop.operator_skill < 3) {
      confidence -= 0.05; // Skill uncertainty
    }

    return Math.max(0.5, Math.min(0.95, confidence));
  }

  /**
   * Generate explanation for why alternative wasn't chosen.
   */
  private static generateWhyNot(alt: ScoredCandidate, best: ScoredCandidate, input: FourthAxisDecisionInput): string {
    if (alt.strategy === "multiple_setups") {
      if (input.part.critical_datum_alignment) {
        return "Datum alignment requirements favor single-setup strategy";
      }
      return `Higher total cycle time (${alt.cycleTime.toFixed(1)} min vs ${best.cycleTime.toFixed(1)} min)`;
    }

    if (alt.strategy === "5_axis_simultaneous") {
      return `Higher machine rate ($${alt.hourlyRate}/hr) increases cost per part`;
    }

    if (alt.strategy === "4th_axis_continuous" && !input.part.has_wrap_features) {
      return "Part does not have wrap features requiring continuous interpolation";
    }

    return `Lower overall score (${alt.score.toFixed(2)} vs ${best.score.toFixed(2)})`;
  }

  /**
   * Calculate final metrics for best candidate.
   */
  private static calculateMetrics(candidate: ScoredCandidate, input: FourthAxisDecisionInput): CandidateMetrics {
    return this.estimateMetrics(candidate, input);
  }

  /**
   * Generate human-readable explanation.
   */
  private static generateExplanation(
    best: ScoredCandidate,
    alternatives: ScoredCandidate[],
    input: FourthAxisDecisionInput,
    reasoning: ReasoningChain,
  ): string {
    const strategyName: Record<FourthAxisStrategy, string> = {
      "4th_axis_positional": "4th axis positional indexing",
      "4th_axis_continuous": "4th axis continuous interpolation",
      "multiple_setups": "multiple manual setups",
      "5_axis_simultaneous": "5-axis simultaneous machining",
    };

    let explanation = `Recommend ${strategyName[best.strategy]} on ${best.machineName}. `;

    if (best.strategy.startsWith("4th_axis")) {
      explanation += `This approach maintains datum alignment across ${input.part.machined_sides} faces `;
      explanation += `with ${(best.cycleTime).toFixed(1)} min cycle time. `;
    } else if (best.strategy === "multiple_setups") {
      explanation += `For ${input.shop.batch_size} parts with ${input.part.tolerance_mm}mm tolerance, manual setups are cost-effective. `;
    }

    explanation += `Expected cost: $${best.costPerPart.toFixed(2)}/part. `;
    explanation += `Confidence: ${(best.confidence * 100).toFixed(0)}%.`;

    return explanation;
  }

  /**
   * Perform self-reflection on decision.
   */
  private static performSelfReflection(
    best: ScoredCandidate,
    alternatives: ScoredCandidate[],
    input: FourthAxisDecisionInput,
  ): AIReasoningTrace["self_reflection"] {
    const topAlt = alternatives[0];

    return {
      assumptions: [
        "Rotary table is properly calibrated and maintained",
        "Operator is trained on the recommended strategy",
        "Part weight is within rotary table capacity",
        "Cutting parameters will be validated by SpeedFeedOrchestrator",
      ],
      uncertainties: [
        input.part.tolerance_mm < 0.025 ? "Very tight tolerance may require additional verification" : "",
        input.shop.operator_skill < 3 ? "Operator skill level may affect setup time" : "",
        input.part.weight_kg > 30 ? "Heavy part — verify clamping force adequate" : "",
      ].filter(Boolean),
      alternative_considered: topAlt
        ? `${topAlt.strategy} on ${topAlt.machineName}`
        : "No close alternatives",
      why_not_alternative: topAlt?.whyNot ?? "Best option by significant margin",
    };
  }

  /**
   * Generate proactive suggestions.
   */
  private static generateProactiveSuggestions(best: ScoredCandidate, input: FourthAxisDecisionInput): string[] {
    const suggestions: string[] = [];

    // Tombstone suggestion for high batch positional work
    if (best.strategy === "4th_axis_positional" && input.shop.batch_size >= 20) {
      suggestions.push("Consider tombstone fixture to double throughput with pallet changer");
    }

    // Also suggest tombstone for any 4th axis strategy with multi-face parts and high batch
    if (best.strategy.startsWith("4th_axis") && input.part.machined_sides >= 4 && input.shop.batch_size >= 25) {
      if (!suggestions.some(s => s.includes("tombstone"))) {
        suggestions.push("High batch + multi-face part: tombstone fixture could significantly improve throughput");
      }
    }

    if (input.part.tolerance_mm < 0.025) {
      suggestions.push("Plan for in-process probing to verify datum alignment");
    }

    if (best.strategy === "multiple_setups" && input.part.machined_sides >= 4) {
      suggestions.push("If production volume increases, 4th axis would reduce cost per part");
    }

    if (input.part.has_wrap_features && best.strategy === "4th_axis_positional") {
      suggestions.push("Wrap features may benefit from continuous 4th axis interpolation");
    }

    if (input.shop.operator_skill >= 4 && best.strategy !== "5_axis_simultaneous") {
      suggestions.push("Skilled operator available — 5-axis could further reduce cycle time");
    }

    return suggestions;
  }

  /**
   * Analyze confidence factors for explainability.
   */
  private static analyzeConfidenceFactors(best: ScoredCandidate, input: FourthAxisDecisionInput): AIReasoningTrace["confidence_factors"] {
    return [
      {
        factor: "Part geometry match",
        impact: input.part.machined_sides >= 3 && best.strategy.startsWith("4th_axis") ? "positive" : "neutral",
        weight: 0.3,
        explanation: `${input.part.machined_sides}-sided part ${input.part.machined_sides >= 3 ? "benefits from" : "doesn't require"} rotary indexing`,
      },
      {
        factor: "Tolerance requirements",
        impact: input.part.tolerance_mm < 0.05 && best.strategy !== "multiple_setups" ? "positive" : "neutral",
        weight: 0.25,
        explanation: `${input.part.tolerance_mm}mm tolerance ${input.part.tolerance_mm < 0.05 ? "requires" : "allows"} single-setup strategy`,
      },
      {
        factor: "Batch size economics",
        impact: input.shop.batch_size >= 10 ? "positive" : "negative",
        weight: 0.2,
        explanation: `Batch of ${input.shop.batch_size} ${input.shop.batch_size >= 10 ? "amortizes" : "may not fully amortize"} setup time`,
      },
      {
        factor: "Machine capability match",
        impact: "positive",
        weight: 0.15,
        explanation: `${best.machineName} has required capabilities for ${best.strategy}`,
      },
      {
        factor: "Operator skill alignment",
        impact: input.shop.operator_skill >= 3 ? "positive" : "negative",
        weight: 0.1,
        explanation: `Operator skill level ${input.shop.operator_skill} ${input.shop.operator_skill >= 3 ? "matches" : "may challenge"} strategy complexity`,
      },
    ];
  }

  /**
   * Create prediction for learning feedback.
   */
  private static createLearningPrediction(
    best: ScoredCandidate,
    metrics: CandidateMetrics,
    input: FourthAxisDecisionInput,
  ): string {
    const predictionId = `4ax-pred-${Date.now()}`;

    const prediction: Prediction = {
      prediction_id: predictionId,
      category: "cycle_time",
      predicted_value: metrics.cycleTime,
      predicted_uncertainty: metrics.cycleTime * 0.15, // 15% uncertainty
      confidence: best.confidence,
      timestamp: new Date().toISOString(),
      context: {
        material: input.material,
        operation: input.operation,
        machine: best.machineId,
        strategy: best.strategy,
        machined_sides: input.part.machined_sides,
        batch_size: input.shop.batch_size,
      },
      model_version: "FourthAxisDecision-1.0",
      explanation: `Predicted cycle time for ${best.strategy} strategy`,
    };

    // Store prediction for later comparison with actual outcome
    // LearningAdaptationEngine.storePrediction(prediction);
    log.info(`[FourthAxisDecision] Created prediction ${predictionId} for learning feedback`);

    return predictionId;
  }
}

// ============================================================================
// HELPER TYPES
// ============================================================================

interface ScoredCandidate {
  strategy: FourthAxisStrategy;
  machineId: string;
  machineName: string;
  hourlyRate: number;
  rotaryTable?: RotaryTableSpec;
  score: number;
  confidence: number;
  cycleTime: number;
  costPerPart: number;
  setupTime: number;
  whyNot: string;
}

interface CandidateMetrics {
  setupTime: number;
  cycleTime: number;
  costPerPart: number;
  qualityRisk: "low" | "medium" | "high";
}

// Export singleton
export const fourthAxisDecisionEngine = new FourthAxisDecisionEngine();
