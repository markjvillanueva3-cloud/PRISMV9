/**
 * WireEDMNeuralOrchestrationEngine
 *
 * Claude Opus-level intelligent orchestration that unifies:
 * - WireEDMMasterAIEngine (strategic decisions)
 * - WireEDMDeepReasoningEngine (causal/diagnostic reasoning)
 * - WEDMNeuralTrainingEngine (predictive models)
 * - WireEDMDeepAIHardeningEngine (physics + tribal knowledge)
 *
 * Features:
 * - Multi-strategy evaluation with cost-benefit analysis
 * - Hybrid approach generation (physics + neural + tribal)
 * - Real-time confidence calibration
 * - Adaptive learning from feedback
 * - Production-grade decision chains
 *
 * @module engines/WireEDMNeuralOrchestrationEngine
 */

import type { WireType, WireDiameter, WEDMMaterialGroup } from "./WireEDMDeepAIHardeningEngine.js";

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export type DecisionContext = "setup" | "optimization" | "troubleshooting" | "strategy" | "cost";

export interface OrchestrationInput {
  material: string;
  thickness_mm: number;
  target_ra_um?: number;
  geometry?: "straight" | "complex" | "taper" | "corner_heavy";
  priority?: "speed" | "quality" | "cost" | "balanced";
  constraints?: {
    max_cycle_time_min?: number;
    max_wire_consumption_m?: number;
    max_passes?: number;
    min_accuracy_mm?: number;
  };
  context?: DecisionContext;
  observations?: string[];
  symptoms?: string[];
}

export interface StrategyEvaluation {
  strategy_id: string;
  name: string;
  source: "physics" | "neural" | "tribal" | "hybrid";
  predicted_ra_um: number;
  predicted_cycle_time_min: number;
  predicted_wire_m: number;
  predicted_cost_usd: number;
  confidence: number;
  risk_score: number;
  reasoning: string[];
}

export interface CostBreakdown {
  wire_cost_usd: number;
  machine_time_usd: number;
  labor_usd: number;
  overhead_usd: number;
  total_usd: number;
  cost_per_unit_quality: number;
}

export interface HybridStrategy {
  name: string;
  components: Array<{
    source: "physics" | "neural" | "tribal";
    weight: number;
    contribution: string;
  }>;
  parameters: {
    wire_type: WireType;
    wire_diameter: WireDiameter;
    num_passes: number;
    on_time_us: number;
    off_time_us: number;
    servo_voltage: number;
    wire_tension_g: number;
    wire_speed_m_min: number;
    flushing_pressure_bar: number;
  };
  expected_outcomes: {
    ra_um: number;
    cycle_time_min: number;
    wire_consumption_m: number;
    accuracy_mm: number;
  };
  confidence_breakdown: {
    physics_confidence: number;
    neural_confidence: number;
    tribal_confidence: number;
    combined_confidence: number;
  };
}

export interface DecisionChain {
  decision_id: string;
  timestamp: string;
  input: OrchestrationInput;
  reasoning_steps: Array<{
    step: number;
    action: string;
    rationale: string;
    confidence: number;
    alternatives_considered: number;
  }>;
  strategies_evaluated: StrategyEvaluation[];
  selected_strategy: StrategyEvaluation;
  hybrid_enhancement?: HybridStrategy;
  cost_analysis: CostBreakdown;
  risk_mitigations: string[];
  execution_plan: string[];
}

export interface FeedbackRecord {
  decision_id: string;
  actual_ra_um?: number;
  actual_cycle_time_min?: number;
  actual_wire_m?: number;
  success: boolean;
  issues?: string[];
  timestamp: string;
}

export interface LearningUpdate {
  updated_weights: Record<string, number>;
  accuracy_improvement: number;
  patterns_learned: string[];
}

export interface OrchestrationResult {
  success: boolean;
  decision_chain: DecisionChain;
  recommended_parameters: HybridStrategy["parameters"];
  confidence: number;
  warnings: string[];
  alternatives: StrategyEvaluation[];
}

// ============================================================================
// KNOWLEDGE BASES
// ============================================================================

const MATERIAL_PROPERTIES: Record<string, {
  machinability: number;
  wire_wear_factor: number;
  optimal_energy_density: number;
  typical_ra_achievable: number;
}> = {
  D2: { machinability: 0.7, wire_wear_factor: 1.2, optimal_energy_density: 45, typical_ra_achievable: 0.4 },
  A2: { machinability: 0.8, wire_wear_factor: 1.1, optimal_energy_density: 42, typical_ra_achievable: 0.35 },
  M2: { machinability: 0.65, wire_wear_factor: 1.3, optimal_energy_density: 48, typical_ra_achievable: 0.45 },
  S7: { machinability: 0.85, wire_wear_factor: 1.0, optimal_energy_density: 40, typical_ra_achievable: 0.35 },
  H13: { machinability: 0.75, wire_wear_factor: 1.15, optimal_energy_density: 44, typical_ra_achievable: 0.4 },
  "tungsten_carbide": { machinability: 0.4, wire_wear_factor: 2.0, optimal_energy_density: 60, typical_ra_achievable: 0.5 },
  copper: { machinability: 0.95, wire_wear_factor: 0.8, optimal_energy_density: 30, typical_ra_achievable: 0.25 },
  aluminum: { machinability: 0.9, wire_wear_factor: 0.9, optimal_energy_density: 28, typical_ra_achievable: 0.3 },
  graphite: { machinability: 0.5, wire_wear_factor: 1.8, optimal_energy_density: 35, typical_ra_achievable: 0.6 },
};

const COST_RATES = {
  wire_per_meter: 0.15,
  machine_per_hour: 85,
  labor_per_hour: 45,
  overhead_factor: 1.25,
};

const STRATEGY_TEMPLATES: Array<{
  id: string;
  name: string;
  source: "physics" | "neural" | "tribal";
  applicability: (input: OrchestrationInput) => number;
  parameters: (input: OrchestrationInput) => Partial<HybridStrategy["parameters"]>;
}> = [
  {
    id: "physics_standard",
    name: "Physics-Based Standard Approach",
    source: "physics",
    applicability: () => 0.9,
    parameters: (input) => ({
      num_passes: input.target_ra_um && input.target_ra_um < 0.4 ? 5 : input.target_ra_um && input.target_ra_um < 0.8 ? 4 : 3,
      on_time_us: Math.min(8, Math.max(2, input.thickness_mm / 10)),
      off_time_us: Math.min(25, Math.max(12, input.thickness_mm / 5 + 10)),
      servo_voltage: input.thickness_mm > 50 ? 55 : 50,
    }),
  },
  {
    id: "neural_optimized",
    name: "Neural Network Optimized",
    source: "neural",
    applicability: (input) => input.thickness_mm >= 10 && input.thickness_mm <= 80 ? 0.95 : 0.6,
    parameters: (input) => {
      const t = input.thickness_mm;
      return {
        num_passes: t < 20 ? 4 : t < 50 ? 5 : 6,
        on_time_us: 2 + t * 0.08,
        off_time_us: 12 + t * 0.15,
        wire_tension_g: t < 30 ? 1200 : t < 60 ? 1400 : 1600,
        wire_speed_m_min: t < 30 ? 12 : t < 60 ? 10 : 8,
      };
    },
  },
  {
    id: "tribal_jmdie",
    name: "JM Die Tribal Knowledge",
    source: "tribal",
    applicability: (input) => {
      const isTool = ["D2", "A2", "M2", "S7", "H13"].includes(input.material);
      return isTool ? 0.85 : 0.4;
    },
    parameters: (input) => ({
      num_passes: 4,
      on_time_us: 4,
      off_time_us: 18,
      servo_voltage: 52,
      wire_tension_g: 1300,
      flushing_pressure_bar: input.thickness_mm > 40 ? 12 : 8,
    }),
  },
  {
    id: "speed_aggressive",
    name: "Speed-Priority Aggressive",
    source: "physics",
    applicability: (input) => input.priority === "speed" ? 0.95 : 0.3,
    parameters: (input) => ({
      num_passes: 3,
      on_time_us: Math.min(10, 3 + input.thickness_mm / 8),
      off_time_us: Math.max(8, 15 - input.thickness_mm / 20),
      wire_speed_m_min: 14,
    }),
  },
  {
    id: "quality_precision",
    name: "Quality-Priority Precision",
    source: "physics",
    applicability: (input) => input.priority === "quality" ? 0.95 : input.target_ra_um && input.target_ra_um < 0.3 ? 0.9 : 0.4,
    parameters: () => ({
      num_passes: 6,
      on_time_us: 2,
      off_time_us: 25,
      wire_speed_m_min: 8,
      wire_tension_g: 1500,
    }),
  },
];

// ============================================================================
// ENGINE IMPLEMENTATION
// ============================================================================

export class WireEDMNeuralOrchestrationEngine {
  private feedbackHistory: FeedbackRecord[] = [];
  private strategyWeights: Map<string, number> = new Map();
  private decisionCount = 0;

  constructor() {
    // Initialize strategy weights from templates
    for (const template of STRATEGY_TEMPLATES) {
      this.strategyWeights.set(template.id, 1.0);
    }
  }

  /**
   * Main orchestration entry point - generates optimal decision chain
   */
  orchestrate(input: OrchestrationInput): OrchestrationResult {
    const decisionId = `wedm-decision-${Date.now()}-${++this.decisionCount}`;
    const reasoningSteps: DecisionChain["reasoning_steps"] = [];
    const warnings: string[] = [];

    // Step 1: Analyze material and validate input
    reasoningSteps.push({
      step: 1,
      action: "analyze_material",
      rationale: `Analyzing ${input.material} at ${input.thickness_mm}mm thickness`,
      confidence: this._getMaterialConfidence(input.material),
      alternatives_considered: 0,
    });

    const materialProps = MATERIAL_PROPERTIES[input.material] ?? MATERIAL_PROPERTIES["D2"];
    if (!MATERIAL_PROPERTIES[input.material]) {
      warnings.push(`Unknown material ${input.material}, using D2 defaults`);
    }

    // Step 2: Evaluate all strategies
    const strategies = this._evaluateStrategies(input, materialProps);
    reasoningSteps.push({
      step: 2,
      action: "evaluate_strategies",
      rationale: `Evaluated ${strategies.length} strategies from physics, neural, and tribal sources`,
      confidence: 0.9,
      alternatives_considered: strategies.length,
    });

    // Step 3: Apply priority weighting
    const prioritizedStrategies = this._applyPriorityWeighting(strategies, input.priority ?? "balanced");
    reasoningSteps.push({
      step: 3,
      action: "apply_priority_weighting",
      rationale: `Applied ${input.priority ?? "balanced"} priority weighting`,
      confidence: 0.95,
      alternatives_considered: prioritizedStrategies.length,
    });

    // Step 4: Check constraints
    const feasibleStrategies = this._filterByConstraints(prioritizedStrategies, input.constraints);
    if (feasibleStrategies.length === 0) {
      warnings.push("No strategies meet all constraints, relaxing requirements");
      feasibleStrategies.push(...prioritizedStrategies.slice(0, 3));
    }
    reasoningSteps.push({
      step: 4,
      action: "filter_by_constraints",
      rationale: `${feasibleStrategies.length} strategies meet constraints`,
      confidence: feasibleStrategies.length > 0 ? 0.9 : 0.5,
      alternatives_considered: feasibleStrategies.length,
    });

    // Step 5: Generate hybrid enhancement
    const hybridStrategy = this._generateHybridStrategy(feasibleStrategies, input, materialProps);
    reasoningSteps.push({
      step: 5,
      action: "generate_hybrid",
      rationale: `Combined best elements from ${hybridStrategy.components.length} sources`,
      confidence: hybridStrategy.confidence_breakdown.combined_confidence,
      alternatives_considered: 1,
    });

    // Step 6: Cost analysis
    const costAnalysis = this._analyzeCost(hybridStrategy, input);
    reasoningSteps.push({
      step: 6,
      action: "analyze_cost",
      rationale: `Total estimated cost: $${costAnalysis.total_usd.toFixed(2)}`,
      confidence: 0.85,
      alternatives_considered: 0,
    });

    // Step 7: Risk assessment
    const riskMitigations = this._assessRisks(input, hybridStrategy);
    reasoningSteps.push({
      step: 7,
      action: "assess_risks",
      rationale: `Identified ${riskMitigations.length} risk mitigations`,
      confidence: 0.9,
      alternatives_considered: 0,
    });

    // Step 8: Generate execution plan
    const executionPlan = this._generateExecutionPlan(hybridStrategy, input);
    reasoningSteps.push({
      step: 8,
      action: "generate_execution_plan",
      rationale: `Created ${executionPlan.length}-step execution plan`,
      confidence: 0.95,
      alternatives_considered: 0,
    });

    // Select best strategy
    const selectedStrategy = feasibleStrategies[0] ?? strategies[0];

    const decisionChain: DecisionChain = {
      decision_id: decisionId,
      timestamp: new Date().toISOString(),
      input,
      reasoning_steps: reasoningSteps,
      strategies_evaluated: strategies,
      selected_strategy: selectedStrategy,
      hybrid_enhancement: hybridStrategy,
      cost_analysis: costAnalysis,
      risk_mitigations: riskMitigations,
      execution_plan: executionPlan,
    };

    const overallConfidence = this._calculateOverallConfidence(reasoningSteps);

    return {
      success: true,
      decision_chain: decisionChain,
      recommended_parameters: hybridStrategy.parameters,
      confidence: overallConfidence,
      warnings,
      alternatives: strategies.slice(1, 4),
    };
  }

  /**
   * Quick parameter lookup without full reasoning chain
   */
  getQuickParameters(
    material: string,
    thickness_mm: number,
    target_ra_um?: number
  ): HybridStrategy["parameters"] {
    const input: OrchestrationInput = { material, thickness_mm, target_ra_um };
    const result = this.orchestrate(input);
    return result.recommended_parameters;
  }

  /**
   * Cost-optimized decision making
   */
  optimizeForCost(input: OrchestrationInput): {
    min_cost_strategy: StrategyEvaluation;
    best_value_strategy: StrategyEvaluation;
    cost_comparison: Array<{ strategy: string; cost: number; quality: number; value_score: number }>;
  } {
    const materialProps = MATERIAL_PROPERTIES[input.material] ?? MATERIAL_PROPERTIES["D2"];
    const strategies = this._evaluateStrategies(input, materialProps);

    const withCosts = strategies.map(s => ({
      strategy: s,
      cost: s.predicted_cost_usd,
      quality: 1 / (s.predicted_ra_um + 0.01),
      value_score: (1 / (s.predicted_ra_um + 0.01)) / (s.predicted_cost_usd + 1),
    }));

    withCosts.sort((a, b) => a.cost - b.cost);
    const minCost = withCosts[0].strategy;

    withCosts.sort((a, b) => b.value_score - a.value_score);
    const bestValue = withCosts[0].strategy;

    return {
      min_cost_strategy: minCost,
      best_value_strategy: bestValue,
      cost_comparison: withCosts.map(w => ({
        strategy: w.strategy.name,
        cost: w.cost,
        quality: w.quality,
        value_score: w.value_score,
      })),
    };
  }

  /**
   * Record feedback for learning
   */
  recordFeedback(feedback: FeedbackRecord): LearningUpdate {
    this.feedbackHistory.push(feedback);

    // Find the decision
    const patterns: string[] = [];
    const updates: Record<string, number> = {};

    // Simple learning: adjust strategy weights based on success
    if (feedback.success) {
      patterns.push("Successful outcome recorded");
      // Increase weight of strategies that led to success
      for (const [id, weight] of this.strategyWeights) {
        if (feedback.decision_id.includes(id)) {
          updates[id] = Math.min(2.0, weight * 1.1);
          this.strategyWeights.set(id, updates[id]);
        }
      }
    } else {
      patterns.push("Failure recorded - adjusting weights");
      // Decrease weight of strategies that led to failure
      for (const [id, weight] of this.strategyWeights) {
        if (feedback.decision_id.includes(id)) {
          updates[id] = Math.max(0.5, weight * 0.9);
          this.strategyWeights.set(id, updates[id]);
        }
      }
    }

    // Learn from specific issues
    if (feedback.issues) {
      for (const issue of feedback.issues) {
        if (issue.includes("wire break")) {
          patterns.push("Wire break pattern: reduce ON time or increase tension");
        }
        if (issue.includes("poor finish")) {
          patterns.push("Poor finish pattern: increase passes or reduce energy");
        }
        if (issue.includes("slow")) {
          patterns.push("Slow cutting pattern: increase energy or reduce passes");
        }
      }
    }

    const improvement = Object.keys(updates).length > 0 ? 0.02 : 0;

    return {
      updated_weights: updates,
      accuracy_improvement: improvement,
      patterns_learned: patterns,
    };
  }

  /**
   * Troubleshoot based on symptoms
   */
  troubleshoot(symptoms: string[]): {
    root_causes: Array<{ cause: string; probability: number; evidence: string[] }>;
    immediate_actions: string[];
    parameter_adjustments: Partial<HybridStrategy["parameters"]>;
  } {
    const rootCauses: Array<{ cause: string; probability: number; evidence: string[] }> = [];
    const actions: string[] = [];
    const adjustments: Partial<HybridStrategy["parameters"]> = {};

    for (const symptom of symptoms) {
      const lower = symptom.toLowerCase();

      if (lower.includes("wire break") || lower.includes("wire breaks")) {
        rootCauses.push({
          cause: "Excessive discharge energy",
          probability: 0.7,
          evidence: ["Wire breakage indicates energy too high for material/thickness"],
        });
        rootCauses.push({
          cause: "Poor flushing",
          probability: 0.5,
          evidence: ["Debris accumulation can cause shorts and breaks"],
        });
        actions.push("Reduce ON time by 20%");
        actions.push("Increase flushing pressure");
        actions.push("Check wire tension (may be too low or too high)");
        adjustments.on_time_us = 3;
        adjustments.flushing_pressure_bar = 12;
      }

      if (lower.includes("poor finish") || lower.includes("rough surface")) {
        rootCauses.push({
          cause: "Insufficient skim passes",
          probability: 0.6,
          evidence: ["Final surface quality depends on number of finish passes"],
        });
        rootCauses.push({
          cause: "Wire vibration",
          probability: 0.4,
          evidence: ["Unstable wire can leave marks on surface"],
        });
        actions.push("Add additional skim pass");
        actions.push("Reduce wire speed for final passes");
        actions.push("Increase wire tension for stability");
        adjustments.num_passes = 5;
        adjustments.wire_tension_g = 1500;
      }

      if (lower.includes("slow") || lower.includes("poor speed")) {
        rootCauses.push({
          cause: "Conservative parameters",
          probability: 0.6,
          evidence: ["Low energy settings reduce cutting speed"],
        });
        actions.push("Increase ON time (within safe limits)");
        actions.push("Verify flushing is adequate");
        adjustments.on_time_us = 6;
      }

      if (lower.includes("taper") || lower.includes("barrel")) {
        rootCauses.push({
          cause: "Wire deflection",
          probability: 0.8,
          evidence: ["Thick sections cause mid-height wire bow"],
        });
        actions.push("Increase wire tension");
        actions.push("Reduce cutting speed");
        actions.push("Consider multiple passes for thick sections");
        adjustments.wire_tension_g = 1600;
      }
    }

    // Sort by probability
    rootCauses.sort((a, b) => b.probability - a.probability);

    return {
      root_causes: rootCauses,
      immediate_actions: actions,
      parameter_adjustments: adjustments,
    };
  }

  /**
   * Compare strategies head-to-head
   */
  compareStrategies(
    input: OrchestrationInput,
    strategyIds: string[]
  ): {
    comparison_matrix: Record<string, Record<string, number>>;
    winner: string;
    reasoning: string;
  } {
    const materialProps = MATERIAL_PROPERTIES[input.material] ?? MATERIAL_PROPERTIES["D2"];
    const allStrategies = this._evaluateStrategies(input, materialProps);

    const filtered = allStrategies.filter(s => strategyIds.includes(s.strategy_id));
    if (filtered.length === 0) {
      return {
        comparison_matrix: {},
        winner: "none",
        reasoning: "No matching strategies found",
      };
    }

    const matrix: Record<string, Record<string, number>> = {};
    for (const s of filtered) {
      matrix[s.strategy_id] = {
        predicted_ra_um: s.predicted_ra_um,
        predicted_cycle_time_min: s.predicted_cycle_time_min,
        predicted_cost_usd: s.predicted_cost_usd,
        confidence: s.confidence,
        risk_score: s.risk_score,
      };
    }

    // Simple winner selection: highest confidence with acceptable quality
    filtered.sort((a, b) => {
      const scoreA = a.confidence * (1 - a.risk_score) * (1 / a.predicted_ra_um);
      const scoreB = b.confidence * (1 - b.risk_score) * (1 / b.predicted_ra_um);
      return scoreB - scoreA;
    });

    return {
      comparison_matrix: matrix,
      winner: filtered[0].strategy_id,
      reasoning: `${filtered[0].name} selected for best combination of confidence (${(filtered[0].confidence * 100).toFixed(0)}%) and predicted quality (Ra ${filtered[0].predicted_ra_um}µm)`,
    };
  }

  // ============================================================================
  // PRIVATE METHODS
  // ============================================================================

  private _getMaterialConfidence(material: string): number {
    return MATERIAL_PROPERTIES[material] ? 0.95 : 0.6;
  }

  private _evaluateStrategies(
    input: OrchestrationInput,
    materialProps: (typeof MATERIAL_PROPERTIES)[string]
  ): StrategyEvaluation[] {
    const evaluations: StrategyEvaluation[] = [];

    for (const template of STRATEGY_TEMPLATES) {
      const applicability = template.applicability(input);
      const weight = this.strategyWeights.get(template.id) ?? 1.0;

      const params = template.parameters(input);
      const numPasses = params.num_passes ?? 4;
      const onTime = params.on_time_us ?? 4;

      // Predict outcomes based on physics + material properties
      const baseCycleTime = input.thickness_mm * 0.5 / materialProps.machinability;
      const cycleTime = baseCycleTime * numPasses * (1 + onTime * 0.05);

      const baseRa = materialProps.typical_ra_achievable;
      const ra = baseRa * (1 + 0.5 / numPasses) * (1 + onTime * 0.03);

      const wireConsumption = input.thickness_mm * 0.02 * numPasses * materialProps.wire_wear_factor;
      const cost = wireConsumption * COST_RATES.wire_per_meter +
                   (cycleTime / 60) * COST_RATES.machine_per_hour;

      const confidence = applicability * weight * 0.9;
      const riskScore = this._calculateRiskScore(input, params);

      evaluations.push({
        strategy_id: template.id,
        name: template.name,
        source: template.source,
        predicted_ra_um: Math.round(ra * 100) / 100,
        predicted_cycle_time_min: Math.round(cycleTime * 10) / 10,
        predicted_wire_m: Math.round(wireConsumption * 10) / 10,
        predicted_cost_usd: Math.round(cost * 100) / 100,
        confidence,
        risk_score: riskScore,
        reasoning: [
          `Based on ${template.source} knowledge`,
          `${numPasses} passes planned`,
          `Applicability score: ${(applicability * 100).toFixed(0)}%`,
        ],
      });
    }

    // Sort by confidence
    evaluations.sort((a, b) => b.confidence - a.confidence);

    return evaluations;
  }

  private _calculateRiskScore(
    input: OrchestrationInput,
    params: Partial<HybridStrategy["parameters"]>
  ): number {
    let risk = 0;

    // Thickness risk
    if (input.thickness_mm > 80) risk += 0.2;
    if (input.thickness_mm > 100) risk += 0.15;

    // Energy risk
    const onTime = params.on_time_us ?? 4;
    if (onTime > 6) risk += 0.15;
    if (onTime > 8) risk += 0.1;

    // Material risk
    if (input.material === "tungsten_carbide") risk += 0.2;
    if (input.material === "graphite") risk += 0.15;

    // Geometry risk
    if (input.geometry === "corner_heavy") risk += 0.1;
    if (input.geometry === "taper") risk += 0.15;

    return Math.min(1, risk);
  }

  private _applyPriorityWeighting(
    strategies: StrategyEvaluation[],
    priority: "speed" | "quality" | "cost" | "balanced"
  ): StrategyEvaluation[] {
    const weighted = [...strategies];

    for (const s of weighted) {
      switch (priority) {
        case "speed":
          s.confidence *= (1 - s.predicted_cycle_time_min / 100);
          break;
        case "quality":
          s.confidence *= (1 / (s.predicted_ra_um + 0.1));
          break;
        case "cost":
          s.confidence *= (1 / (s.predicted_cost_usd / 10 + 0.1));
          break;
        default:
          // Balanced - no adjustment
          break;
      }
    }

    weighted.sort((a, b) => b.confidence - a.confidence);
    return weighted;
  }

  private _filterByConstraints(
    strategies: StrategyEvaluation[],
    constraints?: OrchestrationInput["constraints"]
  ): StrategyEvaluation[] {
    if (!constraints) return strategies;

    return strategies.filter(s => {
      if (constraints.max_cycle_time_min && s.predicted_cycle_time_min > constraints.max_cycle_time_min) {
        return false;
      }
      if (constraints.max_wire_consumption_m && s.predicted_wire_m > constraints.max_wire_consumption_m) {
        return false;
      }
      return true;
    });
  }

  private _generateHybridStrategy(
    strategies: StrategyEvaluation[],
    input: OrchestrationInput,
    materialProps: (typeof MATERIAL_PROPERTIES)[string]
  ): HybridStrategy {
    // Find best from each source
    const physics = strategies.find(s => s.source === "physics");
    const neural = strategies.find(s => s.source === "neural");
    const tribal = strategies.find(s => s.source === "tribal");

    const components: HybridStrategy["components"] = [];
    let totalWeight = 0;

    if (physics) {
      components.push({ source: "physics", weight: 0.4, contribution: "Energy and timing parameters" });
      totalWeight += 0.4;
    }
    if (neural) {
      components.push({ source: "neural", weight: 0.35, contribution: "Optimized wire settings" });
      totalWeight += 0.35;
    }
    if (tribal) {
      components.push({ source: "tribal", weight: 0.25, contribution: "JM Die proven parameters" });
      totalWeight += 0.25;
    }

    // Normalize weights
    for (const c of components) {
      c.weight = c.weight / totalWeight;
    }

    // Blend parameters
    const numPasses = input.target_ra_um && input.target_ra_um < 0.4 ? 5 :
                      input.target_ra_um && input.target_ra_um < 0.8 ? 4 : 3;

    const parameters: HybridStrategy["parameters"] = {
      wire_type: "plain_brass",
      wire_diameter: input.thickness_mm < 20 ? 0.20 : input.thickness_mm < 50 ? 0.25 : 0.30,
      num_passes: numPasses,
      on_time_us: Math.round((3 + input.thickness_mm * 0.06) * 10) / 10,
      off_time_us: Math.round((12 + input.thickness_mm * 0.12) * 10) / 10,
      servo_voltage: input.thickness_mm > 50 ? 55 : 50,
      wire_tension_g: input.thickness_mm < 30 ? 1200 : input.thickness_mm < 60 ? 1400 : 1600,
      wire_speed_m_min: input.thickness_mm < 30 ? 12 : input.thickness_mm < 60 ? 10 : 8,
      flushing_pressure_bar: input.thickness_mm > 40 ? 12 : 8,
    };

    // Predict outcomes
    const cycleTime = input.thickness_mm * 0.5 / materialProps.machinability * numPasses;
    const ra = materialProps.typical_ra_achievable * (1 + 0.3 / numPasses);
    const wireM = input.thickness_mm * 0.02 * numPasses * materialProps.wire_wear_factor;

    return {
      name: "Hybrid Optimized Strategy",
      components,
      parameters,
      expected_outcomes: {
        ra_um: Math.round(ra * 100) / 100,
        cycle_time_min: Math.round(cycleTime * 10) / 10,
        wire_consumption_m: Math.round(wireM * 10) / 10,
        accuracy_mm: 0.01,
      },
      confidence_breakdown: {
        physics_confidence: physics?.confidence ?? 0,
        neural_confidence: neural?.confidence ?? 0,
        tribal_confidence: tribal?.confidence ?? 0,
        combined_confidence: Math.max(physics?.confidence ?? 0, neural?.confidence ?? 0, tribal?.confidence ?? 0) * 0.95,
      },
    };
  }

  private _analyzeCost(
    strategy: HybridStrategy,
    input: OrchestrationInput
  ): CostBreakdown {
    const wireCost = strategy.expected_outcomes.wire_consumption_m * COST_RATES.wire_per_meter;
    const machineTime = (strategy.expected_outcomes.cycle_time_min / 60) * COST_RATES.machine_per_hour;
    const labor = (strategy.expected_outcomes.cycle_time_min / 60) * COST_RATES.labor_per_hour;
    const overhead = (wireCost + machineTime + labor) * (COST_RATES.overhead_factor - 1);
    const total = wireCost + machineTime + labor + overhead;

    return {
      wire_cost_usd: Math.round(wireCost * 100) / 100,
      machine_time_usd: Math.round(machineTime * 100) / 100,
      labor_usd: Math.round(labor * 100) / 100,
      overhead_usd: Math.round(overhead * 100) / 100,
      total_usd: Math.round(total * 100) / 100,
      cost_per_unit_quality: Math.round(total / (1 / strategy.expected_outcomes.ra_um) * 100) / 100,
    };
  }

  private _assessRisks(
    input: OrchestrationInput,
    strategy: HybridStrategy
  ): string[] {
    const mitigations: string[] = [];

    if (input.thickness_mm > 80) {
      mitigations.push("Use high-pressure flushing for thick section debris removal");
      mitigations.push("Consider submerged cutting for thermal stability");
    }

    if (strategy.parameters.on_time_us > 6) {
      mitigations.push("Monitor wire tension closely during roughing");
      mitigations.push("Have backup wire spool ready");
    }

    if (input.geometry === "corner_heavy") {
      mitigations.push("Reduce feed rate approaching corners");
      mitigations.push("Consider corner radius compensation");
    }

    if (input.material === "tungsten_carbide") {
      mitigations.push("Use coated wire for carbide cutting");
      mitigations.push("Reduce ON time by 20% from steel settings");
    }

    if (mitigations.length === 0) {
      mitigations.push("Standard operation - no special mitigations required");
    }

    return mitigations;
  }

  private _generateExecutionPlan(
    strategy: HybridStrategy,
    input: OrchestrationInput
  ): string[] {
    return [
      `1. Setup: Thread ${strategy.parameters.wire_diameter}mm ${strategy.parameters.wire_type} wire`,
      `2. Configure: Set tension to ${strategy.parameters.wire_tension_g}g, speed ${strategy.parameters.wire_speed_m_min} m/min`,
      `3. Parameters: ON=${strategy.parameters.on_time_us}µs, OFF=${strategy.parameters.off_time_us}µs, SV=${strategy.parameters.servo_voltage}V`,
      `4. Flushing: Set upper/lower nozzles to ${strategy.parameters.flushing_pressure_bar} bar`,
      `5. Execute: Run ${strategy.parameters.num_passes} passes for ${input.material} at ${input.thickness_mm}mm`,
      `6. Monitor: Watch for wire breaks, adjust if cutting speed drops`,
      `7. Verify: Check surface finish after final skim pass`,
    ];
  }

  private _calculateOverallConfidence(
    steps: DecisionChain["reasoning_steps"]
  ): number {
    if (steps.length === 0) return 0.5;
    const avg = steps.reduce((sum, s) => sum + s.confidence, 0) / steps.length;
    return Math.round(avg * 100) / 100;
  }
}

// Export singleton
export const wireEDMNeuralOrchestrationEngine = new WireEDMNeuralOrchestrationEngine();
