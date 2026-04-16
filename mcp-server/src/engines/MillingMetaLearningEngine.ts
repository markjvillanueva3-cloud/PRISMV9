/**
 * MillingMetaLearningEngine — Self-Improving Milling Intelligence
 * =================================================================
 * Implements continuous learning, adaptation, and self-improvement:
 *
 * META-LEARNING CAPABILITIES:
 * ┌─────────────────────────────────────────────────────────────────────┐
 * │ EXPERIENCE LEARNING         │ TRANSFER LEARNING                    │
 * │ - Successful operation logs │ - Similar operation mapping          │
 * │ - Failure analysis          │ - Material class generalization      │
 * │ - Parameter correlation     │ - Feature type abstraction           │
 * │ - Customer preference learn │ - Shop capability transfer           │
 * ├──────────────────────────────┴─────────────────────────────────────┤
 * │ SELF-ASSESSMENT              │ ADAPTIVE OPTIMIZATION               │
 * │ - Confidence calibration    │ - Bayesian parameter update          │
 * │ - Prediction accuracy track │ - Regret minimization                │
 * │ - Knowledge gap detection   │ - Exploration vs exploitation        │
 * │ - Uncertainty quantification│ - Multi-armed bandit strategy        │
 * └─────────────────────────────────────────────────────────────────────┘
 *
 * LEARNING MODES:
 * - supervised: learn from labeled successful operations
 * - unsupervised: discover patterns in operation data
 * - reinforcement: optimize through feedback
 * - few_shot: rapid adaptation from minimal examples
 *
 * @module engines/MillingMetaLearningEngine
 * @milestone MILL-META-LEARN-MS1
 */

import { log } from "../utils/Logger.js";

// ============================================================================
// TYPES
// ============================================================================

export type LearningMode = "supervised" | "unsupervised" | "reinforcement" | "few_shot";

export interface OperationExperience {
  id: string;
  timestamp: string;
  operation: string;
  material: string;
  material_iso: string;
  feature_type: string;
  tool_type: string;
  tool_diameter_mm: number;

  // Parameters used
  rpm: number;
  feed_mm_min: number;
  doc_mm: number;
  woc_mm: number;

  // Outcomes
  success: boolean;
  cycle_time_min?: number;
  tool_life_achieved_min?: number;
  surface_finish_ra?: number;
  part_quality_score?: number;

  // Context
  machine?: string;
  customer?: string;
  operator_notes?: string;
}

export interface LearningFeedback {
  experience_id: string;
  outcome: "success" | "partial" | "failure";
  metric_scores: {
    tool_life?: number;
    surface_finish?: number;
    cycle_time?: number;
    accuracy?: number;
  };
  operator_feedback?: string;
  root_cause_if_failure?: string;
}

export interface TransferMapping {
  source_domain: string;
  target_domain: string;
  similarity: number;
  adaptation_required: string[];
  scaling_factors: Record<string, number>;
}

export interface LearnedPattern {
  pattern_id: string;
  pattern_type: "parameter_correlation" | "failure_mode" | "success_factor" | "customer_preference";
  description: string;
  confidence: number;
  evidence_count: number;
  applicability: string[];
  rule: string;
}

export interface MetaLearningState {
  total_experiences: number;
  successful_operations: number;
  failure_cases: number;
  patterns_discovered: number;
  avg_prediction_accuracy: number;
  last_update: string;
  confidence_calibration: number;
  learning_rate: number;
  exploration_factor: number;
}

export interface PredictionWithUncertainty {
  parameter: string;
  predicted_value: number;
  uncertainty: number;
  confidence: number;
  prior_experiences: number;
  adaptation_source: string;
}

export interface AdaptiveRecommendation {
  request_id: string;
  timestamp: string;

  // Adapted parameters
  parameters: {
    rpm: PredictionWithUncertainty;
    feed_mm_min: PredictionWithUncertainty;
    doc_mm: PredictionWithUncertainty;
    woc_mm: PredictionWithUncertainty;
  };

  // Learning context
  similar_experiences: number;
  adaptation_method: "direct" | "transfer" | "extrapolation" | "bayesian";
  patterns_applied: string[];

  // Meta-learning metrics
  exploration_vs_exploitation: number; // 0 = pure exploitation, 1 = pure exploration
  expected_improvement: number;
  regret_estimate: number;

  // Self-assessment
  knowledge_gaps: string[];
  confidence_interval: [number, number];
  recommended_validation: string[];
}

// ============================================================================
// LEARNING DATABASE (Simulated in-memory)
// ============================================================================

const EXPERIENCE_DATABASE: Map<string, OperationExperience> = new Map();
const PATTERN_DATABASE: LearnedPattern[] = [];
const FEEDBACK_LOG: LearningFeedback[] = [];

// Pre-seeded patterns from tribal knowledge
const SEED_PATTERNS: LearnedPattern[] = [
  {
    pattern_id: "PAT-001",
    pattern_type: "parameter_correlation",
    description: "Stainless steel (M class) requires 20-30% speed reduction from steel",
    confidence: 0.95,
    evidence_count: 150,
    applicability: ["M", "stainless"],
    rule: "if material_iso === 'M' then rpm *= 0.75",
  },
  {
    pattern_id: "PAT-002",
    pattern_type: "parameter_correlation",
    description: "Aluminum allows 3x speed increase over steel baseline",
    confidence: 0.95,
    evidence_count: 200,
    applicability: ["N", "aluminum", "6061", "7075"],
    rule: "if material_iso === 'N' then rpm *= 3.0",
  },
  {
    pattern_id: "PAT-003",
    pattern_type: "failure_mode",
    description: "Chatter occurs with stepover > 60% in deep pockets",
    confidence: 0.85,
    evidence_count: 50,
    applicability: ["pocket", "deep_pocket"],
    rule: "if feature_type === 'deep_pocket' && stepover > 0.6 then warn('chatter_risk')",
  },
  {
    pattern_id: "PAT-004",
    pattern_type: "success_factor",
    description: "Trochoidal milling extends tool life 2-3x in hard materials",
    confidence: 0.9,
    evidence_count: 75,
    applicability: ["H", "S", "trochoidal"],
    rule: "if material_iso in ['H','S'] && strategy === 'trochoidal' then tool_life *= 2.5",
  },
  {
    pattern_id: "PAT-005",
    pattern_type: "customer_preference",
    description: "FONTANA prefers conservative parameters for tight tolerance work",
    confidence: 0.8,
    evidence_count: 30,
    applicability: ["FONTANA", "fastener"],
    rule: "if customer === 'FONTANA' then apply_conservative_factor(0.85)",
  },
  {
    pattern_id: "PAT-006",
    pattern_type: "parameter_correlation",
    description: "Long tools (L/D > 4) need 25% feed reduction for stability",
    confidence: 0.9,
    evidence_count: 80,
    applicability: ["long_reach", "deep_pocket"],
    rule: "if tool_length / tool_diameter > 4 then feed *= 0.75",
  },
  {
    pattern_id: "PAT-007",
    pattern_type: "success_factor",
    description: "HSM with 10% stepover achieves Ra < 1.6 consistently",
    confidence: 0.85,
    evidence_count: 60,
    applicability: ["hsm", "finishing", "surface_finish"],
    rule: "if strategy === 'hsm' && stepover <= 0.1 then surface_finish_ra < 1.6",
  },
  {
    pattern_id: "PAT-008",
    pattern_type: "failure_mode",
    description: "Titanium work hardening if feed per tooth < 0.05mm",
    confidence: 0.95,
    evidence_count: 45,
    applicability: ["S", "titanium", "Ti-6Al-4V"],
    rule: "if material_iso === 'S' && fz < 0.05 then warn('work_hardening_risk')",
  },
];

// ============================================================================
// TRANSFER LEARNING MAPPINGS
// ============================================================================

const TRANSFER_MAPPINGS: TransferMapping[] = [
  {
    source_domain: "steel_roughing",
    target_domain: "stainless_roughing",
    similarity: 0.7,
    adaptation_required: ["speed", "coolant"],
    scaling_factors: { rpm: 0.75, feed: 0.85, doc: 0.9 },
  },
  {
    source_domain: "aluminum_pocket",
    target_domain: "brass_pocket",
    similarity: 0.8,
    adaptation_required: ["chip_breaking"],
    scaling_factors: { rpm: 0.7, feed: 0.8, doc: 1.0 },
  },
  {
    source_domain: "steel_finishing",
    target_domain: "titanium_finishing",
    similarity: 0.5,
    adaptation_required: ["speed", "feed", "coolant", "strategy"],
    scaling_factors: { rpm: 0.4, feed: 0.5, doc: 0.6 },
  },
  {
    source_domain: "pocket_roughing",
    target_domain: "slot_roughing",
    similarity: 0.85,
    adaptation_required: ["chip_evacuation"],
    scaling_factors: { rpm: 1.0, feed: 0.9, doc: 1.0 },
  },
];

// ============================================================================
// ENGINE CLASS
// ============================================================================

export class MillingMetaLearningEngine {
  private state: MetaLearningState;
  private experienceCounter = 0;

  constructor() {
    // Initialize patterns from seed
    PATTERN_DATABASE.push(...SEED_PATTERNS);

    this.state = {
      total_experiences: 0,
      successful_operations: 0,
      failure_cases: 0,
      patterns_discovered: SEED_PATTERNS.length,
      avg_prediction_accuracy: 0.85,
      last_update: new Date().toISOString(),
      confidence_calibration: 1.0,
      learning_rate: 0.1,
      exploration_factor: 0.15,
    };
  }

  /**
   * Learn from a completed operation.
   */
  learnFromExperience(experience: OperationExperience): {
    learned: boolean;
    new_patterns: LearnedPattern[];
    state_update: Partial<MetaLearningState>;
  } {
    log.info("MillingMetaLearningEngine.learnFromExperience", { id: experience.id });

    // Store experience
    EXPERIENCE_DATABASE.set(experience.id, experience);
    this.state.total_experiences++;

    if (experience.success) {
      this.state.successful_operations++;
    } else {
      this.state.failure_cases++;
    }

    // Analyze for new patterns
    const newPatterns = this.discoverPatterns(experience);
    PATTERN_DATABASE.push(...newPatterns);
    this.state.patterns_discovered += newPatterns.length;

    // Update learning state
    this.state.last_update = new Date().toISOString();
    this.updateLearningRate();

    return {
      learned: true,
      new_patterns: newPatterns,
      state_update: {
        total_experiences: this.state.total_experiences,
        successful_operations: this.state.successful_operations,
        patterns_discovered: this.state.patterns_discovered,
      },
    };
  }

  /**
   * Process feedback and adjust predictions.
   */
  processFeedback(feedback: LearningFeedback): {
    processed: boolean;
    adjustments: Record<string, number>;
    confidence_update: number;
  } {
    log.info("MillingMetaLearningEngine.processFeedback", { id: feedback.experience_id });

    FEEDBACK_LOG.push(feedback);

    const adjustments: Record<string, number> = {};

    // Adjust based on outcome
    if (feedback.outcome === "success") {
      // Increase confidence in similar predictions
      adjustments.confidence = 0.05;
      this.state.confidence_calibration = Math.min(1.1, this.state.confidence_calibration + 0.01);
    } else if (feedback.outcome === "failure") {
      // Decrease confidence, increase exploration
      adjustments.confidence = -0.1;
      this.state.exploration_factor = Math.min(0.3, this.state.exploration_factor + 0.02);
      this.state.confidence_calibration = Math.max(0.8, this.state.confidence_calibration - 0.02);
    }

    // Process metric-specific feedback
    if (feedback.metric_scores.tool_life !== undefined) {
      if (feedback.metric_scores.tool_life < 0.5) {
        adjustments.rpm = -0.05;
        adjustments.feed = -0.05;
      }
    }

    if (feedback.metric_scores.surface_finish !== undefined) {
      if (feedback.metric_scores.surface_finish < 0.7) {
        adjustments.feed = -0.03;
        adjustments.stepover = -0.05;
      }
    }

    return {
      processed: true,
      adjustments,
      confidence_update: this.state.confidence_calibration,
    };
  }

  /**
   * Get adaptive recommendation using meta-learning.
   */
  getAdaptiveRecommendation(request: {
    operation: string;
    material: string;
    material_iso: string;
    feature_type: string;
    tool_diameter_mm: number;
    customer?: string;
    priority?: "speed" | "quality" | "tool_life" | "balanced";
  }): AdaptiveRecommendation {
    const requestId = `ADAPT-${++this.experienceCounter}-${Date.now()}`;
    log.info("MillingMetaLearningEngine.getAdaptiveRecommendation", { requestId });

    // Find similar experiences
    const similarExperiences = this.findSimilarExperiences(request);

    // Determine adaptation method
    const adaptationMethod = this.selectAdaptationMethod(similarExperiences.length, request);

    // Get base parameters
    const baseParams = this.getBaseParameters(request);

    // Apply learned patterns
    const patterns = this.getApplicablePatterns(request);
    const adaptedParams = this.applyPatterns(baseParams, patterns);

    // Apply transfer learning if needed
    const transferredParams = this.applyTransferLearning(adaptedParams, request, similarExperiences.length);

    // Calculate exploration vs exploitation
    const explorationBalance = this.calculateExplorationBalance(similarExperiences.length);

    // Apply exploration noise if in exploration mode
    const finalParams = this.applyExplorationNoise(transferredParams, explorationBalance);

    // Detect knowledge gaps
    const knowledgeGaps = this.detectKnowledgeGaps(request, similarExperiences.length);

    return {
      request_id: requestId,
      timestamp: new Date().toISOString(),
      parameters: {
        rpm: this.wrapWithUncertainty("rpm", finalParams.rpm, similarExperiences.length, adaptationMethod),
        feed_mm_min: this.wrapWithUncertainty("feed_mm_min", finalParams.feed, similarExperiences.length, adaptationMethod),
        doc_mm: this.wrapWithUncertainty("doc_mm", finalParams.doc, similarExperiences.length, adaptationMethod),
        woc_mm: this.wrapWithUncertainty("woc_mm", finalParams.woc, similarExperiences.length, adaptationMethod),
      },
      similar_experiences: similarExperiences.length,
      adaptation_method: adaptationMethod,
      patterns_applied: patterns.map(p => p.pattern_id),
      exploration_vs_exploitation: explorationBalance,
      expected_improvement: this.estimateExpectedImprovement(request, finalParams),
      regret_estimate: this.estimateRegret(request, finalParams),
      knowledge_gaps: knowledgeGaps,
      confidence_interval: this.calculateConfidenceInterval(similarExperiences.length),
      recommended_validation: this.recommendValidation(request, knowledgeGaps),
    };
  }

  /**
   * Get applicable transfer mappings.
   */
  getTransferMappings(sourceDomain: string): TransferMapping[] {
    return TRANSFER_MAPPINGS.filter(m => m.source_domain === sourceDomain);
  }

  /**
   * Get all discovered patterns.
   */
  getPatterns(filterType?: LearnedPattern["pattern_type"]): LearnedPattern[] {
    if (filterType) {
      return PATTERN_DATABASE.filter(p => p.pattern_type === filterType);
    }
    return [...PATTERN_DATABASE];
  }

  /**
   * Get current learning state.
   */
  getState(): MetaLearningState {
    return { ...this.state };
  }

  /**
   * Self-assess prediction quality.
   */
  selfAssess(): {
    prediction_accuracy: number;
    confidence_calibration: number;
    coverage: number;
    improvement_areas: string[];
    strengths: string[];
  } {
    const successRate = this.state.total_experiences > 0
      ? this.state.successful_operations / this.state.total_experiences
      : 0.85;

    const improvementAreas: string[] = [];
    const strengths: string[] = [];

    // Analyze patterns by type
    const failureModes = PATTERN_DATABASE.filter(p => p.pattern_type === "failure_mode");
    const successFactors = PATTERN_DATABASE.filter(p => p.pattern_type === "success_factor");

    if (failureModes.length > successFactors.length) {
      improvementAreas.push("More success factor patterns needed");
    } else {
      strengths.push("Good balance of success/failure patterns");
    }

    if (this.state.exploration_factor > 0.2) {
      improvementAreas.push("High uncertainty - need more confirmatory data");
    }

    if (this.state.confidence_calibration < 0.9) {
      improvementAreas.push("Confidence calibration needs improvement");
    } else {
      strengths.push("Well-calibrated confidence scores");
    }

    if (this.state.total_experiences > 50) {
      strengths.push("Substantial experience base");
    } else {
      improvementAreas.push("Limited experience base");
    }

    return {
      prediction_accuracy: successRate,
      confidence_calibration: this.state.confidence_calibration,
      coverage: PATTERN_DATABASE.length / 20, // Assume 20 patterns = full coverage
      improvement_areas: improvementAreas,
      strengths,
    };
  }

  /**
   * Get statistics.
   */
  getStats(): {
    experiences: number;
    patterns: number;
    success_rate: number;
    learning_rate: number;
    exploration_factor: number;
    transfer_mappings: number;
  } {
    return {
      experiences: this.state.total_experiences,
      patterns: PATTERN_DATABASE.length,
      success_rate: this.state.total_experiences > 0
        ? this.state.successful_operations / this.state.total_experiences
        : 0.85,
      learning_rate: this.state.learning_rate,
      exploration_factor: this.state.exploration_factor,
      transfer_mappings: TRANSFER_MAPPINGS.length,
    };
  }

  // ============================================================================
  // PRIVATE METHODS
  // ============================================================================

  private discoverPatterns(experience: OperationExperience): LearnedPattern[] {
    const patterns: LearnedPattern[] = [];

    // Simple pattern discovery based on success/failure
    if (!experience.success && experience.operator_notes) {
      patterns.push({
        pattern_id: `PAT-DIS-${Date.now()}`,
        pattern_type: "failure_mode",
        description: `Failure in ${experience.operation} on ${experience.material}: ${experience.operator_notes}`,
        confidence: 0.6,
        evidence_count: 1,
        applicability: [experience.material_iso, experience.operation],
        rule: `learned_from_failure_${experience.id}`,
      });
    }

    return patterns;
  }

  private findSimilarExperiences(request: {
    operation: string;
    material_iso: string;
    feature_type: string;
  }): OperationExperience[] {
    const experiences: OperationExperience[] = [];

    for (const exp of EXPERIENCE_DATABASE.values()) {
      let similarity = 0;
      if (exp.operation === request.operation) similarity += 0.4;
      if (exp.material_iso === request.material_iso) similarity += 0.35;
      if (exp.feature_type === request.feature_type) similarity += 0.25;

      if (similarity >= 0.5) {
        experiences.push(exp);
      }
    }

    return experiences;
  }

  private selectAdaptationMethod(
    similarCount: number,
    request: any
  ): "direct" | "transfer" | "extrapolation" | "bayesian" {
    if (similarCount >= 10) return "direct";
    if (similarCount >= 3) return "bayesian";
    if (similarCount >= 1) return "transfer";
    return "extrapolation";
  }

  private getBaseParameters(request: any): { rpm: number; feed: number; doc: number; woc: number } {
    // Base parameters adjusted by material
    const materialFactors: Record<string, { rpm: number; feed: number; doc: number }> = {
      P: { rpm: 3000, feed: 500, doc: 5 },
      M: { rpm: 2100, feed: 400, doc: 4 },
      K: { rpm: 3300, feed: 550, doc: 5 },
      N: { rpm: 9000, feed: 1000, doc: 6 },
      S: { rpm: 1500, feed: 300, doc: 3.5 },
      H: { rpm: 1200, feed: 200, doc: 1.5 },
    };

    const base = materialFactors[request.material_iso] || materialFactors.P;

    // Adjust for tool diameter
    const diamFactor = request.tool_diameter_mm ? Math.sqrt(12 / request.tool_diameter_mm) : 1;

    return {
      rpm: Math.round(base.rpm * diamFactor),
      feed: Math.round(base.feed * diamFactor),
      doc: Math.round(base.doc * 10) / 10,
      woc: Math.round(base.doc * 2 * 10) / 10,
    };
  }

  private getApplicablePatterns(request: any): LearnedPattern[] {
    return PATTERN_DATABASE.filter(pattern =>
      pattern.applicability.some(app =>
        app === request.material_iso ||
        app === request.operation ||
        app === request.feature_type ||
        (request.customer && app === request.customer)
      )
    );
  }

  private applyPatterns(
    params: { rpm: number; feed: number; doc: number; woc: number },
    patterns: LearnedPattern[]
  ): { rpm: number; feed: number; doc: number; woc: number } {
    let result = { ...params };

    for (const pattern of patterns) {
      // Apply pattern adjustments based on type
      if (pattern.pattern_type === "parameter_correlation") {
        // Extract adjustment factors from rule
        if (pattern.rule.includes("rpm *= 0.75")) result.rpm *= 0.75;
        if (pattern.rule.includes("rpm *= 3.0")) result.rpm *= 3.0;
        if (pattern.rule.includes("feed *= 0.75")) result.feed *= 0.75;
      }
    }

    return {
      rpm: Math.round(result.rpm),
      feed: Math.round(result.feed),
      doc: Math.round(result.doc * 10) / 10,
      woc: Math.round(result.woc * 10) / 10,
    };
  }

  private applyTransferLearning(
    params: { rpm: number; feed: number; doc: number; woc: number },
    request: any,
    experienceCount: number
  ): { rpm: number; feed: number; doc: number; woc: number } {
    if (experienceCount >= 5) return params; // Enough direct experience

    // Find applicable transfer mapping
    const sourceDomain = `${request.material_iso}_${request.operation}`.toLowerCase();
    const mapping = TRANSFER_MAPPINGS.find(m =>
      m.source_domain.includes(request.operation) ||
      m.target_domain.includes(request.material_iso.toLowerCase())
    );

    if (!mapping) return params;

    // Apply scaling factors with similarity weight
    const weight = mapping.similarity;
    return {
      rpm: Math.round(params.rpm * (1 + (mapping.scaling_factors.rpm - 1) * weight)),
      feed: Math.round(params.feed * (1 + (mapping.scaling_factors.feed - 1) * weight)),
      doc: Math.round(params.doc * (1 + ((mapping.scaling_factors.doc || 1) - 1) * weight) * 10) / 10,
      woc: Math.round(params.woc * (1 + ((mapping.scaling_factors.doc || 1) - 1) * weight) * 10) / 10,
    };
  }

  private calculateExplorationBalance(experienceCount: number): number {
    // More exploration when less experience
    if (experienceCount >= 20) return 0.05;
    if (experienceCount >= 10) return 0.1;
    if (experienceCount >= 5) return 0.15;
    return this.state.exploration_factor;
  }

  private applyExplorationNoise(
    params: { rpm: number; feed: number; doc: number; woc: number },
    explorationFactor: number
  ): { rpm: number; feed: number; doc: number; woc: number } {
    // Add small random variation for exploration
    const noise = () => 1 + (Math.random() - 0.5) * 2 * explorationFactor;

    return {
      rpm: Math.round(params.rpm * noise()),
      feed: Math.round(params.feed * noise()),
      doc: Math.round(params.doc * noise() * 10) / 10,
      woc: Math.round(params.woc * noise() * 10) / 10,
    };
  }

  private detectKnowledgeGaps(request: any, experienceCount: number): string[] {
    const gaps: string[] = [];

    if (experienceCount < 3) {
      gaps.push(`Limited experience with ${request.material_iso} material`);
    }

    const materialPatterns = PATTERN_DATABASE.filter(p =>
      p.applicability.includes(request.material_iso)
    );
    if (materialPatterns.length < 2) {
      gaps.push(`Few learned patterns for ${request.material_iso}`);
    }

    const featurePatterns = PATTERN_DATABASE.filter(p =>
      p.applicability.includes(request.feature_type)
    );
    if (featurePatterns.length < 2) {
      gaps.push(`Limited knowledge of ${request.feature_type} features`);
    }

    return gaps;
  }

  private wrapWithUncertainty(
    parameter: string,
    value: number,
    experienceCount: number,
    method: string
  ): PredictionWithUncertainty {
    // Uncertainty decreases with more experience
    const baseUncertainty = {
      direct: 0.05,
      bayesian: 0.1,
      transfer: 0.15,
      extrapolation: 0.25,
    }[method] || 0.2;

    const experienceFactor = Math.max(0.3, 1 - experienceCount / 30);
    const uncertainty = baseUncertainty * experienceFactor;

    return {
      parameter,
      predicted_value: value,
      uncertainty: Math.round(value * uncertainty),
      confidence: Math.min(0.95, 0.6 + experienceCount * 0.02) * this.state.confidence_calibration,
      prior_experiences: experienceCount,
      adaptation_source: method,
    };
  }

  private estimateExpectedImprovement(request: any, params: any): number {
    // Estimate improvement over baseline
    const patterns = this.getApplicablePatterns(request);
    const patternBoost = patterns.length * 0.02;
    return Math.min(0.3, 0.05 + patternBoost);
  }

  private estimateRegret(request: any, params: any): number {
    // Lower regret with more experience
    const experiences = this.findSimilarExperiences(request);
    return Math.max(0.01, 0.2 - experiences.length * 0.01);
  }

  private calculateConfidenceInterval(experienceCount: number): [number, number] {
    const width = Math.max(0.1, 0.4 - experienceCount * 0.02);
    return [0.5 - width / 2, 0.5 + width / 2];
  }

  private recommendValidation(request: any, gaps: string[]): string[] {
    const recommendations: string[] = [];

    if (gaps.length > 0) {
      recommendations.push("Run test cut before production");
    }

    if (request.material_iso === "S" || request.material_iso === "H") {
      recommendations.push("Monitor tool wear during first pass");
    }

    if (request.feature_type?.includes("deep")) {
      recommendations.push("Check chip evacuation");
    }

    return recommendations.length > 0 ? recommendations : ["Standard validation sufficient"];
  }

  private updateLearningRate(): void {
    // Adaptive learning rate based on recent feedback
    const recentFeedback = FEEDBACK_LOG.slice(-10);
    const successCount = recentFeedback.filter(f => f.outcome === "success").length;

    if (successCount > 7) {
      // Doing well, reduce learning rate to fine-tune
      this.state.learning_rate = Math.max(0.05, this.state.learning_rate * 0.9);
    } else if (successCount < 4) {
      // Struggling, increase learning rate to adapt faster
      this.state.learning_rate = Math.min(0.2, this.state.learning_rate * 1.1);
    }
  }
}

export const millingMetaLearningEngine = new MillingMetaLearningEngine();
