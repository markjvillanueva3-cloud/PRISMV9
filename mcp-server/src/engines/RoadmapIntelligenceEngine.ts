/**
 * RoadmapIntelligenceEngine — AI-Powered Roadmap Execution for PRISM
 * ===================================================================
 * Orchestrates all AI reasoning engines for intelligent roadmap execution:
 *   - Milestone complexity assessment using chain-of-thought
 *   - Implementation order optimization using decision analysis
 *   - Effort estimation with uncertainty propagation
 *   - Learn from actual vs predicted outcomes
 *   - Risk identification and mitigation planning
 *   - Resource allocation optimization
 *
 * This engine COMPOSES the underlying AI engines, so improvements
 * to any underlying engine automatically improve roadmap intelligence.
 *
 * @module engines/RoadmapIntelligenceEngine
 * @version 1.0.0
 */

import { log } from "../utils/Logger.js";
import {
  ChainOfThoughtEngine,
  ReasoningProblem,
  ReasoningChain,
  FinalAnswer,
} from "./ChainOfThoughtEngine.js";
import {
  UncertaintyPropagationEngine,
  UncertaintyInput,
  UncertainValue,
  MonteCarloResult,
} from "./UncertaintyPropagationEngine.js";
import {
  LearningAdaptationEngine,
  Prediction,
  Outcome,
  PredictionCategory,
} from "./LearningAdaptationEngine.js";
import {
  DecisionReasoningEngine,
  DecisionProblem,
  DecisionCriterion,
  DecisionCandidate,
  DecisionRecommendation,
} from "./DecisionReasoningEngine.js";
import {
  BusinessIntelligenceEngine,
  MakeOption,
  BuyOption,
} from "./BusinessIntelligenceEngine.js";

// ============================================================================
// TYPES
// ============================================================================

/** Milestone definition */
export interface Milestone {
  id: string;
  name: string;
  description: string;
  phase: string;
  units: MilestoneUnit[];
  dependencies: string[];  // IDs of prerequisite milestones
  estimated_effort_hours?: number;
  actual_effort_hours?: number;
  status: "pending" | "in_progress" | "completed" | "blocked";
  priority?: number;
  tags?: string[];
}

/** Unit within a milestone */
export interface MilestoneUnit {
  id: string;
  name: string;
  description: string;
  estimated_hours?: number;
  actual_hours?: number;
  complexity?: "trivial" | "simple" | "moderate" | "complex" | "very_complex";
  status: "pending" | "in_progress" | "completed";
}

/** Complexity assessment result */
export interface ComplexityAssessment {
  milestone_id: string;
  overall_complexity: "trivial" | "simple" | "moderate" | "complex" | "very_complex";
  complexity_score: number;  // 1-10
  confidence: number;
  factors: Array<{
    factor: string;
    impact: "low" | "medium" | "high";
    reasoning: string;
  }>;
  risks: Array<{
    risk: string;
    probability: number;
    impact: number;
    mitigation: string;
  }>;
  reasoning_trace: ReasoningChain;
  estimated_effort_hours: {
    optimistic: number;
    expected: number;
    pessimistic: number;
  };
  recommendations: string[];
}

/** Prioritization result */
export interface PrioritizationResult {
  milestone_id: string;
  rank: number;
  score: number;
  reasoning: string[];
  dependencies_met: boolean;
  blocking_milestones: string[];
  value_score: number;
  effort_score: number;
  risk_score: number;
  urgency_score: number;
}

/** Roadmap optimization result */
export interface RoadmapOptimization {
  optimized_order: PrioritizationResult[];
  critical_path: string[];  // Milestone IDs on critical path
  parallelizable_groups: string[][];  // Groups that can run in parallel
  total_estimated_effort: {
    optimistic: number;
    expected: number;
    pessimistic: number;
    confidence_95: [number, number];
  };
  bottlenecks: Array<{
    milestone_id: string;
    reason: string;
    impact: string;
  }>;
  recommendations: string[];
}

/** Effort prediction */
export interface EffortPrediction {
  milestone_id: string;
  predicted_hours: number;
  uncertainty_hours: number;
  confidence_interval_95: [number, number];
  basis: "historical" | "complexity" | "analogy" | "expert";
  similar_past_milestones?: Array<{
    id: string;
    name: string;
    predicted: number;
    actual: number;
  }>;
  adjustment_factors: Array<{
    factor: string;
    multiplier: number;
    reason: string;
  }>;
}

/** Build vs integrate analysis */
export interface BuildVsIntegrateAnalysis {
  feature: string;
  recommendation: "build" | "integrate" | "hybrid";
  confidence: number;
  build_analysis: {
    estimated_hours: number;
    maintenance_hours_per_year: number;
    risks: string[];
    pros: string[];
    cons: string[];
  };
  integrate_analysis: {
    library_options: Array<{
      name: string;
      integration_hours: number;
      annual_cost: number;
      reliability: number;
    }>;
    pros: string[];
    cons: string[];
  };
  reasoning: string[];
}

/** Learning record for roadmap predictions */
export interface RoadmapLearningRecord {
  milestone_id: string;
  predicted_hours: number;
  actual_hours: number;
  predicted_complexity: string;
  actual_complexity: string;
  prediction_date: string;
  completion_date: string;
  factors_that_affected_estimate: string[];
  lessons_learned: string[];
}

/** Roadmap health assessment */
export interface RoadmapHealth {
  overall_health: number;  // 0-100
  on_track_milestones: number;
  at_risk_milestones: number;
  blocked_milestones: number;
  velocity_trend: "accelerating" | "stable" | "decelerating";
  estimation_accuracy: number;  // How accurate past estimates have been
  risks: Array<{
    risk: string;
    severity: "low" | "medium" | "high" | "critical";
    affected_milestones: string[];
    mitigation: string;
  }>;
  recommendations: string[];
}

// ============================================================================
// ENGINE
// ============================================================================

export class RoadmapIntelligenceEngine {
  // Complexity weights for different factors
  private static readonly COMPLEXITY_FACTORS = {
    lines_of_code_estimate: { weight: 0.15, thresholds: [100, 500, 1000, 2000] },
    integration_points: { weight: 0.20, thresholds: [1, 3, 5, 10] },
    new_concepts: { weight: 0.15, thresholds: [0, 1, 2, 4] },
    dependencies: { weight: 0.15, thresholds: [0, 2, 4, 8] },
    test_complexity: { weight: 0.10, thresholds: [1, 5, 15, 30] },
    domain_knowledge: { weight: 0.15, thresholds: [1, 2, 3, 4] },
    uncertainty: { weight: 0.10, thresholds: [0.1, 0.3, 0.5, 0.7] },
  };

  // Base hours per complexity level
  private static readonly BASE_HOURS: Record<string, number> = {
    trivial: 2,
    simple: 8,
    moderate: 24,
    complex: 80,
    very_complex: 200,
  };

  /**
   * Assess complexity of a milestone using chain-of-thought reasoning
   */
  static assessComplexity(milestone: Milestone): ComplexityAssessment {
    log.info("[RoadmapIntelligence] Assessing milestone complexity", {
      milestone_id: milestone.id,
      name: milestone.name,
    });

    // Build reasoning problem
    const problem: ReasoningProblem = {
      problem: `Assess implementation complexity of milestone: ${milestone.name}`,
      goal: "Determine complexity level, estimate effort, identify risks",
      known_facts: [
        `Description: ${milestone.description}`,
        `Units: ${milestone.units.length} (${milestone.units.map(u => u.name).join(", ")})`,
        `Dependencies: ${milestone.dependencies.length > 0 ? milestone.dependencies.join(", ") : "none"}`,
        `Phase: ${milestone.phase}`,
      ],
      constraints: [
        "Complexity levels: trivial, simple, moderate, complex, very_complex",
        "Effort must account for testing and documentation",
        "Consider integration with existing systems",
      ],
      context: {
        milestone,
        unit_count: milestone.units.length,
        dependency_count: milestone.dependencies.length,
      },
      max_steps: 12,
      confidence_threshold: 0.7,
    };

    // Run chain-of-thought reasoning
    const reasoning = ChainOfThoughtEngine.reason(problem);

    // Extract complexity factors from reasoning
    const factors = this.extractComplexityFactors(milestone, reasoning);

    // Calculate complexity score (1-10)
    const complexityScore = this.calculateComplexityScore(factors);

    // Map to complexity level
    const complexityLevel = this.scoreToComplexityLevel(complexityScore);

    // Identify risks using adversarial challenge
    const risks = this.identifyRisks(milestone, reasoning);

    // Estimate effort with uncertainty
    const effort = this.estimateEffortWithUncertainty(milestone, complexityLevel, factors);

    // Generate recommendations
    const recommendations = this.generateComplexityRecommendations(
      milestone, complexityLevel, factors, risks
    );

    log.info("[RoadmapIntelligence] Complexity assessment complete", {
      milestone_id: milestone.id,
      complexity: complexityLevel,
      score: complexityScore,
      effort_expected: effort.expected,
    });

    return {
      milestone_id: milestone.id,
      overall_complexity: complexityLevel,
      complexity_score: complexityScore,
      confidence: reasoning.current_confidence,
      factors,
      risks,
      reasoning_trace: reasoning,
      estimated_effort_hours: effort,
      recommendations,
    };
  }

  /**
   * Optimize milestone execution order using multi-criteria decision analysis
   */
  static optimizeRoadmap(milestones: Milestone[]): RoadmapOptimization {
    log.info("[RoadmapIntelligence] Optimizing roadmap", {
      milestone_count: milestones.length,
    });

    // Handle empty milestone list
    if (milestones.length === 0) {
      return {
        optimized_order: [],
        critical_path: [],
        parallelizable_groups: [],
        total_estimated_effort: { optimistic: 0, expected: 0, pessimistic: 0, confidence_95: [0, 0] },
        bottlenecks: [],
        recommendations: [],
      };
    }

    // Build prioritization criteria
    const criteria: DecisionCriterion[] = [
      {
        id: "value",
        name: "Business Value",
        description: "Value delivered to users/business",
        importance: "critical",
        weight: 0.30,
        type: "maximize",
      },
      {
        id: "effort",
        name: "Implementation Effort",
        description: "Hours required (lower is better for quick wins)",
        importance: "high",
        weight: 0.20,
        type: "minimize",
      },
      {
        id: "risk",
        name: "Technical Risk",
        description: "Probability of issues (lower is better)",
        importance: "high",
        weight: 0.20,
        type: "minimize",
      },
      {
        id: "dependencies",
        name: "Dependency Count",
        description: "Number of blocking dependencies (lower is better)",
        importance: "medium",
        weight: 0.15,
        type: "minimize",
      },
      {
        id: "urgency",
        name: "Urgency",
        description: "Time-sensitivity of the milestone",
        importance: "medium",
        weight: 0.15,
        type: "maximize",
      },
    ];

    // Score each milestone
    const candidates: DecisionCandidate[] = milestones.map(m => {
      const assessment = this.assessComplexity(m);

      return {
        id: m.id,
        name: m.name,
        category: "milestone" as const,
        properties: {
          phase: m.phase,
          complexity: assessment.overall_complexity,
          units: m.units.length,
        },
        scores: {
          value: m.priority ?? 5,  // Default to medium priority
          effort: assessment.estimated_effort_hours.expected,
          risk: assessment.risks.reduce((sum, r) => sum + r.probability * r.impact, 0),
          dependencies: m.dependencies.length,
          urgency: this.calculateUrgency(m),
        },
        normalized_scores: {},
      };
    });

    // Apply dependency constraints
    const completedIds = new Set(
      milestones.filter(m => m.status === "completed").map(m => m.id)
    );

    const constrainedCandidates = candidates.map(c => {
      const milestone = milestones.find(m => m.id === c.id)!;
      const unmetDeps = milestone.dependencies.filter(d => !completedIds.has(d));

      if (unmetDeps.length > 0) {
        // Heavily penalize milestones with unmet dependencies
        c.scores.dependencies = c.scores.dependencies + unmetDeps.length * 10;
      }

      return c;
    });

    // Run decision analysis
    const problem: DecisionProblem = {
      problem_id: `roadmap-opt-${Date.now()}`,
      category: "strategy",
      description: "Optimize milestone execution order",
      context: {},
      criteria,
      candidates: constrainedCandidates,
      constraints: [],
    };

    const decision = DecisionReasoningEngine.decide(problem);

    // Build prioritization results for ALL candidates, sorted by score
    // DecisionReasoningEngine only returns top 3 alternatives, but we need all milestones
    const allRankedCandidates = constrainedCandidates
      .map(c => ({
        ...c,
        weighted_score: c.normalized_scores
          ? Object.entries(c.normalized_scores).reduce(
              (sum, [critId, norm]) => {
                const crit = criteria.find(cr => cr.id === critId);
                return sum + (norm as number) * (crit?.weight ?? 0);
              },
              0
            )
          : decision.recommended.id === c.id
          ? decision.recommended.weighted_score
          : (decision.alternatives.find(a => a.id === c.id)?.weighted_score ?? 0),
      }))
      .sort((a, b) => (b.weighted_score ?? 0) - (a.weighted_score ?? 0));

    const prioritization: PrioritizationResult[] = allRankedCandidates
      .map((c, idx) => {
        const milestone = milestones.find(m => m.id === c.id)!;
        const unmetDeps = milestone.dependencies.filter(d => !completedIds.has(d));

        return {
          milestone_id: c.id,
          rank: idx + 1,
          score: c.weighted_score ?? 0,
          reasoning: [decision.reasoning.explanation],
          dependencies_met: unmetDeps.length === 0,
          blocking_milestones: unmetDeps,
          value_score: c.scores.value,
          effort_score: c.scores.effort,
          risk_score: c.scores.risk,
          urgency_score: c.scores.urgency,
        };
      });

    // Find critical path
    const criticalPath = this.findCriticalPath(milestones);

    // Find parallelizable groups
    const parallelGroups = this.findParallelizableGroups(milestones, completedIds);

    // Calculate total effort with uncertainty
    const totalEffort = this.calculateTotalEffortUncertainty(milestones);

    // Identify bottlenecks
    const bottlenecks = this.identifyBottlenecks(milestones, prioritization);

    // Generate recommendations
    const recommendations = this.generateOptimizationRecommendations(
      prioritization, criticalPath, bottlenecks
    );

    log.info("[RoadmapIntelligence] Roadmap optimization complete", {
      top_priority: prioritization[0]?.milestone_id,
      critical_path_length: criticalPath.length,
      parallel_groups: parallelGroups.length,
    });

    return {
      optimized_order: prioritization,
      critical_path: criticalPath,
      parallelizable_groups: parallelGroups,
      total_estimated_effort: totalEffort,
      bottlenecks,
      recommendations,
    };
  }

  /**
   * Predict effort for a milestone using learning from past outcomes
   */
  static predictEffort(
    milestone: Milestone,
    historicalData?: RoadmapLearningRecord[]
  ): EffortPrediction {
    log.info("[RoadmapIntelligence] Predicting effort", {
      milestone_id: milestone.id,
    });

    // Assess complexity first
    const assessment = this.assessComplexity(milestone);

    // Base prediction from complexity
    let basePrediction = this.BASE_HOURS[assessment.overall_complexity];
    let basis: EffortPrediction["basis"] = "complexity";

    // Find similar past milestones
    const similarMilestones: EffortPrediction["similar_past_milestones"] = [];

    if (historicalData && historicalData.length > 0) {
      // Use learning engine to adjust based on historical accuracy
      const categoryPredictions = historicalData.filter(h =>
        h.predicted_complexity === assessment.overall_complexity
      );

      if (categoryPredictions.length >= 3) {
        // We have enough data to learn from
        const avgActual = categoryPredictions.reduce(
          (sum, h) => sum + h.actual_hours, 0
        ) / categoryPredictions.length;

        const avgPredicted = categoryPredictions.reduce(
          (sum, h) => sum + h.predicted_hours, 0
        ) / categoryPredictions.length;

        // Adjustment factor based on historical accuracy
        const accuracyFactor = avgActual / avgPredicted;
        basePrediction *= accuracyFactor;
        basis = "historical";

        // Find most similar
        for (const h of categoryPredictions.slice(0, 3)) {
          similarMilestones.push({
            id: h.milestone_id,
            name: h.milestone_id,  // Would need name lookup
            predicted: h.predicted_hours,
            actual: h.actual_hours,
          });
        }
      }
    }

    // Apply adjustment factors
    const adjustments: EffortPrediction["adjustment_factors"] = [];

    // Unit count adjustment
    if (milestone.units.length > 5) {
      const multiplier = 1 + (milestone.units.length - 5) * 0.1;
      adjustments.push({
        factor: "High unit count",
        multiplier,
        reason: `${milestone.units.length} units increases coordination overhead`,
      });
      basePrediction *= multiplier;
    }

    // Dependency adjustment
    if (milestone.dependencies.length > 3) {
      const multiplier = 1 + (milestone.dependencies.length - 3) * 0.05;
      adjustments.push({
        factor: "Many dependencies",
        multiplier,
        reason: `${milestone.dependencies.length} dependencies increases integration effort`,
      });
      basePrediction *= multiplier;
    }

    // Risk adjustment
    const highRisks = assessment.risks.filter(r => r.probability * r.impact > 0.3);
    if (highRisks.length > 0) {
      const multiplier = 1 + highRisks.length * 0.15;
      adjustments.push({
        factor: "High-risk items",
        multiplier,
        reason: `${highRisks.length} high-risk factors may cause rework`,
      });
      basePrediction *= multiplier;
    }

    // Calculate uncertainty using Monte Carlo
    const inputs: UncertaintyInput[] = [
      {
        id: "base",
        value: {
          value: basePrediction,
          uncertainty: basePrediction * 0.3,  // 30% base uncertainty
          distribution: "lognormal",  // Effort is typically right-skewed
        },
      },
    ];

    const mcResult = UncertaintyPropagationEngine.propagateMonteCarlo(
      inputs,
      (inp) => inp.base,
      5000
    );

    log.info("[RoadmapIntelligence] Effort prediction complete", {
      milestone_id: milestone.id,
      predicted: basePrediction,
      ci95: mcResult.confidence_interval_95,
    });

    return {
      milestone_id: milestone.id,
      predicted_hours: basePrediction,
      uncertainty_hours: mcResult.standard_deviation,
      confidence_interval_95: mcResult.confidence_interval_95,
      basis,
      similar_past_milestones: similarMilestones.length > 0 ? similarMilestones : undefined,
      adjustment_factors: adjustments,
    };
  }

  /**
   * Record actual outcome and learn from it
   */
  static recordOutcome(
    milestoneId: string,
    predictedHours: number,
    actualHours: number,
    predictedComplexity: string,
    actualComplexity: string,
    lessonsLearned: string[]
  ): void {
    log.info("[RoadmapIntelligence] Recording outcome for learning", {
      milestone_id: milestoneId,
      predicted: predictedHours,
      actual: actualHours,
    });

    // Create prediction record for learning engine
    const prediction: Prediction = {
      prediction_id: `roadmap-${milestoneId}`,
      category: "cycle_time" as PredictionCategory,  // Reuse cycle_time for effort
      predicted_value: predictedHours,
      predicted_uncertainty: predictedHours * 0.3,
      confidence: 0.7,
      timestamp: new Date().toISOString(),
      context: {
        milestone_id: milestoneId,
        complexity: predictedComplexity,
      },
      model_version: "roadmap-1.0",
    };

    const outcome: Outcome = {
      prediction_id: `roadmap-${milestoneId}`,
      observed_value: actualHours,
      timestamp: new Date().toISOString(),
      operator_notes: lessonsLearned.join("; "),
    };

    // Feed to learning engine
    LearningAdaptationEngine.learn(prediction, outcome);
  }

  /**
   * Analyze build vs integrate decision for a feature
   */
  static analyzeBuildVsIntegrate(
    featureName: string,
    featureDescription: string,
    buildEstimateHours: number,
    maintenanceHoursPerYear: number,
    libraryOptions: Array<{
      name: string;
      integrationHours: number;
      annualCost: number;
      reliability: number;
      features: string[];
    }>
  ): BuildVsIntegrateAnalysis {
    log.info("[RoadmapIntelligence] Analyzing build vs integrate", {
      feature: featureName,
      options: libraryOptions.length,
    });

    // Convert to make vs buy format
    const makeOption: MakeOption = {
      setup_cost: 0,
      material_cost_per_unit: 0,
      labor_cost_per_unit: buildEstimateHours * 100,  // Assume $100/hr
      overhead_cost_per_unit: buildEstimateHours * 20,  // 20% overhead
      cycle_time_minutes: buildEstimateHours * 60,
      machine_hourly_rate: 0,
      tool_cost_per_unit: 0,
      quality_cost_per_unit: buildEstimateHours * 10,  // Testing
      lead_time_days: Math.ceil(buildEstimateHours / 8),
      capacity_units_per_month: 1,
    };

    const buyOptions: BuyOption[] = libraryOptions.map(lib => ({
      supplier: lib.name,
      unit_price: lib.integrationHours * 100 + lib.annualCost,
      minimum_order_quantity: 1,
      lead_time_days: Math.ceil(lib.integrationHours / 8),
      shipping_cost_per_unit: 0,
      quality_risk: lib.reliability > 0.9 ? "low" : lib.reliability > 0.7 ? "medium" : "high",
      reliability_score: lib.reliability,
    }));

    const mvbResult = BusinessIntelligenceEngine.analyzeMakeVsBuy(
      1,  // Single feature
      makeOption,
      buyOptions,
      {
        intellectual_property: "not_relevant",
        quality_control: "preferred",
        flexibility_needs: "medium",
        capacity_utilization: 0.8,
        core_competency: false,
      }
    );

    // Build analysis
    const buildRisks = [
      "Development may take longer than estimated",
      "Ongoing maintenance burden",
      "May not cover edge cases",
    ];

    const buildPros = [
      "Full control over implementation",
      "No external dependencies",
      "Can be tailored exactly to needs",
    ];

    const buildCons = [
      "Development time and cost",
      "Maintenance responsibility",
      "Testing burden",
    ];

    // Integrate analysis
    const integratePros = [
      "Faster time to value",
      "Battle-tested by others",
      "Reduced maintenance",
    ];

    const integrateCons = [
      "Less control",
      "Dependency on external project",
      "May include unnecessary features",
    ];

    // Generate reasoning
    const reasoning: string[] = [];

    if (mvbResult.recommendation === "make") {
      reasoning.push(`Building in-house is ${((mvbResult.make_analysis.total_cost / mvbResult.buy_analysis.total_cost - 1) * 100).toFixed(0)}% more cost-effective`);
      reasoning.push("Custom implementation provides exact feature fit");
    } else if (mvbResult.recommendation === "buy") {
      reasoning.push(`Integration saves ${Math.round(buildEstimateHours - libraryOptions[0]?.integrationHours)} hours`);
      reasoning.push("Existing library is well-tested and maintained");
    } else {
      reasoning.push("Consider building core functionality, integrating utilities");
    }

    return {
      feature: featureName,
      recommendation: mvbResult.recommendation === "make" ? "build" :
        mvbResult.recommendation === "buy" ? "integrate" : "hybrid",
      confidence: mvbResult.confidence,
      build_analysis: {
        estimated_hours: buildEstimateHours,
        maintenance_hours_per_year: maintenanceHoursPerYear,
        risks: buildRisks,
        pros: buildPros,
        cons: buildCons,
      },
      integrate_analysis: {
        library_options: libraryOptions.map(lib => ({
          name: lib.name,
          integration_hours: lib.integrationHours,
          annual_cost: lib.annualCost,
          reliability: lib.reliability,
        })),
        pros: integratePros,
        cons: integrateCons,
      },
      reasoning,
    };
  }

  /**
   * Assess overall roadmap health
   */
  static assessRoadmapHealth(
    milestones: Milestone[],
    historicalData?: RoadmapLearningRecord[]
  ): RoadmapHealth {
    log.info("[RoadmapIntelligence] Assessing roadmap health", {
      total_milestones: milestones.length,
    });

    const completed = milestones.filter(m => m.status === "completed");
    const inProgress = milestones.filter(m => m.status === "in_progress");
    const blocked = milestones.filter(m => m.status === "blocked");
    const pending = milestones.filter(m => m.status === "pending");

    // Calculate on-track vs at-risk
    let atRisk = 0;
    for (const m of inProgress) {
      if (m.estimated_effort_hours && m.actual_effort_hours) {
        if (m.actual_effort_hours > m.estimated_effort_hours * 0.8) {
          atRisk++;
        }
      }
    }

    // Calculate estimation accuracy
    let estimationAccuracy = 1.0;
    if (historicalData && historicalData.length >= 5) {
      const ratios = historicalData.map(h =>
        Math.min(h.actual_hours, h.predicted_hours) /
        Math.max(h.actual_hours, h.predicted_hours)
      );
      estimationAccuracy = ratios.reduce((a, b) => a + b, 0) / ratios.length;
    }

    // Determine velocity trend
    let velocityTrend: "accelerating" | "stable" | "decelerating" = "stable";
    if (historicalData && historicalData.length >= 6) {
      const recent = historicalData.slice(-3);
      const earlier = historicalData.slice(-6, -3);

      const recentVelocity = recent.reduce((s, h) => s + 1 / h.actual_hours, 0);
      const earlierVelocity = earlier.reduce((s, h) => s + 1 / h.actual_hours, 0);

      if (recentVelocity > earlierVelocity * 1.1) {
        velocityTrend = "accelerating";
      } else if (recentVelocity < earlierVelocity * 0.9) {
        velocityTrend = "decelerating";
      }
    }

    // Identify risks
    const risks: RoadmapHealth["risks"] = [];

    if (blocked.length > 0) {
      risks.push({
        risk: "Blocked milestones",
        severity: blocked.length > 3 ? "high" : "medium",
        affected_milestones: blocked.map(m => m.id),
        mitigation: "Resolve blocking dependencies or re-prioritize",
      });
    }

    if (atRisk > 0) {
      risks.push({
        risk: "Milestones approaching estimate",
        severity: atRisk > inProgress.length / 2 ? "high" : "medium",
        affected_milestones: inProgress.filter(m =>
          m.actual_effort_hours && m.estimated_effort_hours &&
          m.actual_effort_hours > m.estimated_effort_hours * 0.8
        ).map(m => m.id),
        mitigation: "Review scope, add resources, or adjust timeline",
      });
    }

    if (estimationAccuracy < 0.7) {
      risks.push({
        risk: "Poor estimation accuracy",
        severity: "medium",
        affected_milestones: [],
        mitigation: "Calibrate estimates using historical data",
      });
    }

    // Calculate overall health
    let health = 100;
    health -= blocked.length * 5;
    health -= atRisk * 3;
    health -= (1 - estimationAccuracy) * 20;
    if (velocityTrend === "decelerating") health -= 10;
    health = Math.max(0, Math.min(100, health));

    // Generate recommendations
    const recommendations: string[] = [];

    if (blocked.length > 0) {
      recommendations.push(`Unblock ${blocked.length} milestones by resolving dependencies`);
    }
    if (atRisk > 0) {
      recommendations.push(`Review ${atRisk} at-risk milestones for scope adjustment`);
    }
    if (velocityTrend === "decelerating") {
      recommendations.push("Investigate causes of velocity decrease");
    }
    if (estimationAccuracy < 0.8) {
      recommendations.push("Use historical data to improve estimation accuracy");
    }

    log.info("[RoadmapIntelligence] Health assessment complete", {
      health,
      at_risk: atRisk,
      blocked: blocked.length,
    });

    return {
      overall_health: health,
      on_track_milestones: inProgress.length - atRisk,
      at_risk_milestones: atRisk,
      blocked_milestones: blocked.length,
      velocity_trend: velocityTrend,
      estimation_accuracy: estimationAccuracy,
      risks,
      recommendations,
    };
  }

  // ============================================================================
  // PRIVATE HELPERS
  // ============================================================================

  private static extractComplexityFactors(
    milestone: Milestone,
    reasoning: ReasoningChain
  ): ComplexityAssessment["factors"] {
    const factors: ComplexityAssessment["factors"] = [];

    // Unit count factor
    const unitCount = milestone.units.length;
    factors.push({
      factor: "Unit count",
      impact: unitCount > 6 ? "high" : unitCount > 3 ? "medium" : "low",
      reasoning: `${unitCount} units to implement`,
    });

    // Dependency factor
    const depCount = milestone.dependencies.length;
    factors.push({
      factor: "Dependencies",
      impact: depCount > 4 ? "high" : depCount > 2 ? "medium" : "low",
      reasoning: `${depCount} dependencies to coordinate with`,
    });

    // Description complexity (simple heuristic)
    const descWords = milestone.description.split(/\s+/).length;
    factors.push({
      factor: "Scope complexity",
      impact: descWords > 50 ? "high" : descWords > 20 ? "medium" : "low",
      reasoning: `Description suggests ${descWords > 50 ? "broad" : descWords > 20 ? "moderate" : "focused"} scope`,
    });

    // Check for complexity keywords
    const complexityKeywords = ["integration", "migration", "refactor", "security", "performance"];
    const hasComplexKeywords = complexityKeywords.some(k =>
      milestone.description.toLowerCase().includes(k)
    );

    if (hasComplexKeywords) {
      factors.push({
        factor: "Technical complexity",
        impact: "high",
        reasoning: "Description includes complex technical requirements",
      });
    }

    return factors;
  }

  private static calculateComplexityScore(
    factors: ComplexityAssessment["factors"]
  ): number {
    let score = 5;  // Start at medium

    for (const factor of factors) {
      if (factor.impact === "high") score += 1.5;
      else if (factor.impact === "medium") score += 0.5;
      else score -= 0.5;
    }

    return Math.max(1, Math.min(10, score));
  }

  private static scoreToComplexityLevel(
    score: number
  ): "trivial" | "simple" | "moderate" | "complex" | "very_complex" {
    if (score <= 2) return "trivial";
    if (score <= 4) return "simple";
    if (score <= 6) return "moderate";
    if (score <= 8) return "complex";
    return "very_complex";
  }

  private static identifyRisks(
    milestone: Milestone,
    reasoning: ReasoningChain
  ): ComplexityAssessment["risks"] {
    const risks: ComplexityAssessment["risks"] = [];

    // Dependency risk
    if (milestone.dependencies.length > 2) {
      risks.push({
        risk: "Dependency chain risk",
        probability: 0.3,
        impact: 0.6,
        mitigation: "Ensure dependencies are completed first, have fallback plan",
      });
    }

    // Scope creep risk
    if (milestone.units.length > 5) {
      risks.push({
        risk: "Scope creep",
        probability: 0.4,
        impact: 0.5,
        mitigation: "Define clear acceptance criteria for each unit",
      });
    }

    // Technical uncertainty
    if (reasoning.dead_ends.length > 0) {
      risks.push({
        risk: "Technical uncertainty",
        probability: 0.35,
        impact: 0.4,
        mitigation: "Prototype risky components early, have alternatives ready",
      });
    }

    // Integration risk
    const desc = milestone.description.toLowerCase();
    if (desc.includes("integrat") || desc.includes("api") || desc.includes("connect")) {
      risks.push({
        risk: "Integration complexity",
        probability: 0.3,
        impact: 0.5,
        mitigation: "Define clear interfaces, test integrations early",
      });
    }

    return risks;
  }

  private static estimateEffortWithUncertainty(
    milestone: Milestone,
    complexity: "trivial" | "simple" | "moderate" | "complex" | "very_complex",
    factors: ComplexityAssessment["factors"]
  ): { optimistic: number; expected: number; pessimistic: number } {
    const base = this.BASE_HOURS[complexity];

    // Adjust for factors
    let multiplier = 1.0;
    for (const factor of factors) {
      if (factor.impact === "high") multiplier *= 1.2;
      else if (factor.impact === "medium") multiplier *= 1.1;
    }

    const expected = base * multiplier;

    return {
      optimistic: expected * 0.7,
      expected,
      pessimistic: expected * 1.8,
    };
  }

  private static generateComplexityRecommendations(
    milestone: Milestone,
    complexity: string,
    factors: ComplexityAssessment["factors"],
    risks: ComplexityAssessment["risks"]
  ): string[] {
    const recommendations: string[] = [];

    if (complexity === "very_complex" || complexity === "complex") {
      recommendations.push("Consider breaking into smaller milestones");
      recommendations.push("Allocate buffer time for unforeseen issues");
    }

    const highImpactFactors = factors.filter(f => f.impact === "high");
    if (highImpactFactors.length > 2) {
      recommendations.push("Address high-impact factors early in implementation");
    }

    const highRisks = risks.filter(r => r.probability * r.impact > 0.2);
    for (const risk of highRisks) {
      recommendations.push(`Mitigate: ${risk.mitigation}`);
    }

    if (milestone.dependencies.length > 3) {
      recommendations.push("Verify all dependencies are complete before starting");
    }

    return recommendations;
  }

  private static calculateUrgency(milestone: Milestone): number {
    // Base urgency from priority
    let urgency = milestone.priority ?? 5;

    // Increase urgency if it's a blocker for many others
    // (This would need the full milestone list for accurate calculation)

    // Increase urgency if in critical phase
    if (milestone.phase.toLowerCase().includes("core") ||
        milestone.phase.toLowerCase().includes("foundation")) {
      urgency += 2;
    }

    return Math.min(10, urgency);
  }

  private static findCriticalPath(milestones: Milestone[]): string[] {
    // Simple critical path: longest dependency chain
    const getChainLength = (id: string, visited: Set<string> = new Set()): number => {
      if (visited.has(id)) return 0;
      visited.add(id);

      const m = milestones.find(ms => ms.id === id);
      if (!m) return 0;

      if (m.dependencies.length === 0) return 1;

      const maxDepLength = Math.max(
        ...m.dependencies.map(d => getChainLength(d, visited))
      );

      return 1 + maxDepLength;
    };

    // Find milestone with longest chain
    let maxLength = 0;
    let criticalEnd = "";

    for (const m of milestones) {
      const length = getChainLength(m.id);
      if (length > maxLength) {
        maxLength = length;
        criticalEnd = m.id;
      }
    }

    // Reconstruct path
    const path: string[] = [];
    let current = criticalEnd;

    while (current) {
      path.unshift(current);
      const m = milestones.find(ms => ms.id === current);
      if (!m || m.dependencies.length === 0) break;

      // Find the dependency with longest chain
      let maxDepLength = 0;
      let nextDep = "";

      for (const d of m.dependencies) {
        const length = getChainLength(d);
        if (length > maxDepLength) {
          maxDepLength = length;
          nextDep = d;
        }
      }

      current = nextDep;
    }

    return path;
  }

  private static findParallelizableGroups(
    milestones: Milestone[],
    completedIds: Set<string>
  ): string[][] {
    const groups: string[][] = [];

    // Group by satisfied dependencies
    const ready = milestones.filter(m =>
      m.status === "pending" &&
      m.dependencies.every(d => completedIds.has(d))
    );

    if (ready.length > 0) {
      groups.push(ready.map(m => m.id));
    }

    // Find subsequent groups
    const simulated = new Set(completedIds);
    for (const m of ready) {
      simulated.add(m.id);
    }

    const nextReady = milestones.filter(m =>
      m.status === "pending" &&
      !simulated.has(m.id) &&
      m.dependencies.every(d => simulated.has(d))
    );

    if (nextReady.length > 0) {
      groups.push(nextReady.map(m => m.id));
    }

    return groups;
  }

  private static calculateTotalEffortUncertainty(
    milestones: Milestone[]
  ): RoadmapOptimization["total_estimated_effort"] {
    const pendingAndInProgress = milestones.filter(
      m => m.status === "pending" || m.status === "in_progress"
    );

    const inputs: UncertaintyInput[] = pendingAndInProgress.map((m, i) => ({
      id: `m${i}`,
      value: {
        value: m.estimated_effort_hours ?? this.BASE_HOURS.moderate,
        uncertainty: (m.estimated_effort_hours ?? this.BASE_HOURS.moderate) * 0.3,
        distribution: "lognormal" as const,
      },
    }));

    if (inputs.length === 0) {
      return { optimistic: 0, expected: 0, pessimistic: 0, confidence_95: [0, 0] };
    }

    const result = UncertaintyPropagationEngine.propagateMonteCarlo(
      inputs,
      (inp) => Object.values(inp).reduce((a, b) => a + b, 0),
      5000
    );

    return {
      optimistic: result.percentiles[10] ?? result.mean * 0.7,
      expected: result.mean,
      pessimistic: result.percentiles[90] ?? result.mean * 1.5,
      confidence_95: result.confidence_interval_95,
    };
  }

  private static identifyBottlenecks(
    milestones: Milestone[],
    prioritization: PrioritizationResult[]
  ): RoadmapOptimization["bottlenecks"] {
    const bottlenecks: RoadmapOptimization["bottlenecks"] = [];

    // Find milestones that block many others
    for (const m of milestones) {
      const dependents = milestones.filter(other =>
        other.dependencies.includes(m.id)
      );

      if (dependents.length >= 3) {
        bottlenecks.push({
          milestone_id: m.id,
          reason: `Blocks ${dependents.length} other milestones`,
          impact: `Delay will cascade to: ${dependents.map(d => d.name).join(", ")}`,
        });
      }
    }

    // Find high-effort milestones on critical path
    const highEffort = prioritization.filter(p => p.effort_score > 100);
    for (const p of highEffort) {
      if (!bottlenecks.find(b => b.milestone_id === p.milestone_id)) {
        bottlenecks.push({
          milestone_id: p.milestone_id,
          reason: "High effort milestone",
          impact: `Estimated ${p.effort_score} hours may delay schedule`,
        });
      }
    }

    return bottlenecks;
  }

  private static generateOptimizationRecommendations(
    prioritization: PrioritizationResult[],
    criticalPath: string[],
    bottlenecks: RoadmapOptimization["bottlenecks"]
  ): string[] {
    const recommendations: string[] = [];

    // Focus on critical path
    if (criticalPath.length > 3) {
      recommendations.push(
        `Critical path has ${criticalPath.length} milestones - prioritize these`
      );
    }

    // Address bottlenecks
    if (bottlenecks.length > 0) {
      recommendations.push(
        `${bottlenecks.length} bottleneck(s) identified - consider parallel work or scope reduction`
      );
    }

    // Quick wins
    const quickWins = prioritization.filter(
      p => p.value_score > 5 && p.effort_score < 20
    );
    if (quickWins.length > 0) {
      recommendations.push(
        `${quickWins.length} quick win(s) available - high value, low effort`
      );
    }

    // Blocked items
    const blocked = prioritization.filter(p => !p.dependencies_met);
    if (blocked.length > 0) {
      recommendations.push(
        `${blocked.length} milestone(s) blocked - resolve dependencies first`
      );
    }

    return recommendations;
  }
}

// Export singleton
export const roadmapIntelligenceEngine = new RoadmapIntelligenceEngine();
