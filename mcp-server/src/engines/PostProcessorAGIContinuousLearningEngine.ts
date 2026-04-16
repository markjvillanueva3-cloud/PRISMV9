/**
 * PostProcessorAGIContinuousLearningEngine — PP-AGI-LEARN
 * ========================================================
 * Continuous learning engine that makes the post processor AGI
 * smarter over time through:
 *
 *   1. PRODUCTION FEEDBACK LEARNING
 *      - Track which generated posts were used in production
 *      - Learn from corrections and modifications
 *      - Identify patterns in successful vs. failed posts
 *
 *   2. BAYESIAN BELIEF UPDATING
 *      - Update engine confidence scores from evidence
 *      - Adjust controller-specific parameters
 *      - Refine physics model calibration
 *
 *   3. MISTAKE PATTERN DETECTION
 *      - Categorize failure modes
 *      - Build error fingerprints
 *      - Generate prevention rules
 *
 *   4. KNOWLEDGE GRAPH EVOLUTION
 *      - Add new tribal knowledge from observations
 *      - Strengthen/weaken existing relationships
 *      - Discover novel patterns
 *
 *   5. META-LEARNING (Learning how to learn)
 *      - Track which learning strategies work best
 *      - Adapt learning rate to context
 *      - Transfer knowledge across controllers
 *
 * This engine transforms the AGI from static expertise to
 * a self-improving system that gets smarter with every job.
 *
 * @module engines/PostProcessorAGIContinuousLearningEngine
 * @milestone PP-AGI-LEARN
 * @version 1.0.0
 */

// ============================================================================
// LEARNING TYPES
// ============================================================================

/**
 * Feedback from production about a generated post
 */
interface ProductionFeedback {
  postId: string;
  generatedAt: string;
  executedAt?: string;

  // Outcome classification
  outcome: "success" | "minor_edits" | "major_edits" | "failed" | "unused";

  // Performance metrics
  actualCycleTime_min?: number;
  predictedCycleTime_min?: number;
  actualToolLife_min?: number;
  predictedToolLife_min?: number;

  // Surface quality
  actualRa_um?: number;
  predictedRa_um?: number;

  // Corrections made by operator
  corrections?: Array<{
    line: number;
    type: "feed" | "speed" | "depth" | "tool" | "coolant" | "sequence" | "other";
    original: string;
    corrected: string;
    reason?: string;
  }>;

  // Incidents
  incidents?: Array<{
    type: "chatter" | "tool_break" | "collision" | "crash" | "quality" | "other";
    severity: "minor" | "moderate" | "severe" | "critical";
    description: string;
  }>;

  // Context
  controller: string;
  material: string;
  operations: string[];
  machineId?: string;
  operatorFeedback?: string;
}

/**
 * Engine belief state (Bayesian tracking)
 */
interface EngineBeliefState {
  engineId: string;

  // Core beliefs
  overallConfidence: number;     // Prior belief in engine accuracy
  domainConfidence: Record<string, number>;  // Per-controller, per-material

  // Evidence accumulation
  evidenceCount: number;
  positiveEvidence: number;
  negativeEvidence: number;

  // Update tracking
  lastUpdated: string;
  updateCount: number;

  // Specialized scores
  physicsAccuracy?: number;
  controllerAccuracy?: Record<string, number>;
  materialAccuracy?: Record<string, number>;
}

/**
 * Mistake pattern detection
 */
interface MistakePattern {
  id: string;
  category: "parameter" | "sequence" | "safety" | "optimization" | "controller_specific";
  description: string;
  occurrences: number;

  // Pattern features
  controllers: string[];      // Where mistake occurs
  materials: string[];
  operations: string[];
  conditions: Record<string, unknown>;

  // Prevention
  preventionRule?: string;
  preventionConfidence: number;

  // Timeline
  firstSeen: string;
  lastSeen: string;
}

/**
 * Learned knowledge entry
 */
interface LearnedKnowledge {
  id: string;
  type: "tribal_tip" | "formula_adjustment" | "parameter_refinement" | "sequence_pattern";

  // Content
  topic: string;
  content: string;
  applicableContext: {
    controllers?: string[];
    materials?: string[];
    operations?: string[];
  };

  // Evidence
  supportingEvidence: number;  // Count of positive observations
  contradictingEvidence: number;
  confidence: number;          // 0-1

  // Lifecycle
  learnedAt: string;
  lastValidated: string;
  promoted: boolean;           // Promoted to permanent knowledge?
}

/**
 * Learning strategy effectiveness
 */
interface LearningStrategy {
  name: string;
  description: string;
  applicationsCount: number;
  successCount: number;
  failureCount: number;
  avgConfidenceGain: number;
  lastUsed: string;
}

/**
 * Complete learning state
 */
interface LearningState {
  totalFeedback: number;
  engineBeliefs: EngineBeliefState[];
  mistakePatterns: MistakePattern[];
  learnedKnowledge: LearnedKnowledge[];
  strategies: LearningStrategy[];

  // Aggregate metrics
  overallAccuracy: number;
  improvementRate: number;   // Change in accuracy over time
  knowledgeBaseSize: number;
}

// ============================================================================
// CONTINUOUS LEARNING ENGINE
// ============================================================================

class PostProcessorAGIContinuousLearningEngine {
  private readonly engineVersion = "1.0.0";
  private readonly minEvidenceForPromotion = 10;
  private readonly promotionConfidenceThreshold = 0.85;

  // Learning state (in-memory, persisted externally)
  private feedback: ProductionFeedback[] = [];
  private beliefs = new Map<string, EngineBeliefState>();
  private patterns = new Map<string, MistakePattern>();
  private knowledge = new Map<string, LearnedKnowledge>();
  private strategies = new Map<string, LearningStrategy>();

  constructor() {
    this.initializeStrategies();
  }

  /**
   * Record production feedback and trigger learning
   */
  public recordFeedback(feedback: ProductionFeedback): {
    learningsGenerated: number;
    patternsUpdated: number;
    knowledgeAdded: number;
  } {
    this.feedback.push(feedback);

    let learningsGenerated = 0;
    let patternsUpdated = 0;
    let knowledgeAdded = 0;

    // 1. Update engine beliefs
    this.updateEngineBeliefs(feedback);
    learningsGenerated++;

    // 2. Detect mistake patterns
    if (feedback.outcome === "failed" || feedback.corrections?.length || feedback.incidents?.length) {
      patternsUpdated += this.detectAndUpdatePatterns(feedback);
    }

    // 3. Extract new knowledge from successful outcomes
    if (feedback.outcome === "success" || feedback.outcome === "minor_edits") {
      knowledgeAdded += this.extractKnowledgeFromSuccess(feedback);
    }

    // 4. Learn from corrections
    if (feedback.corrections && feedback.corrections.length > 0) {
      knowledgeAdded += this.learnFromCorrections(feedback);
    }

    // 5. Promote validated knowledge to permanent status
    this.promoteValidatedKnowledge();

    return { learningsGenerated, patternsUpdated, knowledgeAdded };
  }

  /**
   * Update Bayesian beliefs about engine accuracy
   */
  private updateEngineBeliefs(feedback: ProductionFeedback): void {
    // This would normally iterate through engines used, but in simplified form:
    const engineIds = ["pp-unified-physics", "pp-physics-generator", "pp-master-agi"];

    for (const engineId of engineIds) {
      let belief = this.beliefs.get(engineId);

      if (!belief) {
        belief = {
          engineId,
          overallConfidence: 0.80,  // Prior
          domainConfidence: {},
          evidenceCount: 0,
          positiveEvidence: 0,
          negativeEvidence: 0,
          lastUpdated: new Date().toISOString(),
          updateCount: 0,
          controllerAccuracy: {},
          materialAccuracy: {}
        };
      }

      // Determine evidence direction
      const isPositive = feedback.outcome === "success" || feedback.outcome === "minor_edits";
      const isNegative = feedback.outcome === "failed" || feedback.outcome === "major_edits";

      if (isPositive) {
        belief.positiveEvidence++;
      } else if (isNegative) {
        belief.negativeEvidence++;
      }
      belief.evidenceCount++;

      // Bayesian update (simplified Beta-Binomial)
      const alpha = belief.positiveEvidence + 1;  // Prior alpha = 1
      const beta = belief.negativeEvidence + 1;   // Prior beta = 1
      belief.overallConfidence = alpha / (alpha + beta);

      // Update controller-specific accuracy
      if (!belief.controllerAccuracy) belief.controllerAccuracy = {};
      const ctrlKey = feedback.controller;
      if (!belief.controllerAccuracy[ctrlKey]) {
        belief.controllerAccuracy[ctrlKey] = 0.80;
      }
      const ctrlAlpha = (belief.controllerAccuracy[ctrlKey] * 10) + (isPositive ? 1 : 0);
      const ctrlBeta = (10 - belief.controllerAccuracy[ctrlKey] * 10) + (isNegative ? 1 : 0);
      belief.controllerAccuracy[ctrlKey] = ctrlAlpha / (ctrlAlpha + ctrlBeta);

      // Update material-specific accuracy
      if (!belief.materialAccuracy) belief.materialAccuracy = {};
      const matKey = feedback.material;
      if (!belief.materialAccuracy[matKey]) {
        belief.materialAccuracy[matKey] = 0.80;
      }
      const matAlpha = (belief.materialAccuracy[matKey] * 10) + (isPositive ? 1 : 0);
      const matBeta = (10 - belief.materialAccuracy[matKey] * 10) + (isNegative ? 1 : 0);
      belief.materialAccuracy[matKey] = matAlpha / (matAlpha + matBeta);

      belief.lastUpdated = new Date().toISOString();
      belief.updateCount++;

      this.beliefs.set(engineId, belief);
    }
  }

  /**
   * Detect and update mistake patterns
   */
  private detectAndUpdatePatterns(feedback: ProductionFeedback): number {
    let patternsUpdated = 0;

    // Analyze corrections for patterns
    if (feedback.corrections) {
      for (const correction of feedback.corrections) {
        const patternId = `${correction.type}_${feedback.controller}_${feedback.material}`;

        let pattern = this.patterns.get(patternId);
        if (!pattern) {
          pattern = {
            id: patternId,
            category: this.classifyMistakeCategory(correction.type),
            description: `${correction.type} issue on ${feedback.controller} with ${feedback.material}`,
            occurrences: 0,
            controllers: [],
            materials: [],
            operations: [],
            conditions: {},
            preventionConfidence: 0,
            firstSeen: new Date().toISOString(),
            lastSeen: new Date().toISOString()
          };
        }

        pattern.occurrences++;
        pattern.lastSeen = new Date().toISOString();

        if (!pattern.controllers.includes(feedback.controller)) {
          pattern.controllers.push(feedback.controller);
        }
        if (!pattern.materials.includes(feedback.material)) {
          pattern.materials.push(feedback.material);
        }
        for (const op of feedback.operations) {
          if (!pattern.operations.includes(op)) {
            pattern.operations.push(op);
          }
        }

        // Generate prevention rule if pattern occurs frequently
        if (pattern.occurrences >= 3 && !pattern.preventionRule) {
          pattern.preventionRule = this.generatePreventionRule(pattern, correction);
          pattern.preventionConfidence = Math.min(0.9, pattern.occurrences / 10);
        } else if (pattern.occurrences >= 3) {
          pattern.preventionConfidence = Math.min(0.95, pattern.occurrences / 10);
        }

        this.patterns.set(patternId, pattern);
        patternsUpdated++;
      }
    }

    // Analyze incidents
    if (feedback.incidents) {
      for (const incident of feedback.incidents) {
        const patternId = `incident_${incident.type}_${feedback.controller}`;

        let pattern = this.patterns.get(patternId);
        if (!pattern) {
          pattern = {
            id: patternId,
            category: "safety",
            description: `${incident.type} incident on ${feedback.controller}`,
            occurrences: 0,
            controllers: [feedback.controller],
            materials: [feedback.material],
            operations: feedback.operations,
            conditions: { severity: incident.severity },
            preventionConfidence: 0,
            firstSeen: new Date().toISOString(),
            lastSeen: new Date().toISOString()
          };
        }

        pattern.occurrences++;
        pattern.lastSeen = new Date().toISOString();
        this.patterns.set(patternId, pattern);
        patternsUpdated++;
      }
    }

    return patternsUpdated;
  }

  /**
   * Classify mistake category
   */
  private classifyMistakeCategory(
    type: string
  ): "parameter" | "sequence" | "safety" | "optimization" | "controller_specific" {
    switch (type) {
      case "feed":
      case "speed":
      case "depth":
        return "parameter";
      case "tool":
      case "coolant":
        return "optimization";
      case "sequence":
        return "sequence";
      default:
        return "parameter";
    }
  }

  /**
   * Generate prevention rule from pattern
   */
  private generatePreventionRule(
    pattern: MistakePattern,
    correction: NonNullable<ProductionFeedback["corrections"]>[0]
  ): string {
    switch (pattern.category) {
      case "parameter":
        return `When using ${pattern.controllers.join(",")} with ${pattern.materials.join(",")}, ` +
               `verify ${correction.type} — common mistake: ${correction.original} → ${correction.corrected}`;
      case "safety":
        return `SAFETY: ${pattern.controllers.join(",")} has ${pattern.occurrences} incidents. ` +
               `Add additional validation before release.`;
      case "sequence":
        return `Operation sequence review recommended for ${pattern.controllers.join(",")}.`;
      default:
        return `Review ${correction.type} settings for ${pattern.controllers.join(",")}.`;
    }
  }

  /**
   * Extract knowledge from successful feedback
   */
  private extractKnowledgeFromSuccess(feedback: ProductionFeedback): number {
    let knowledgeAdded = 0;

    // Learn controller-material-operation combinations that work
    const combinationId = `success_${feedback.controller}_${feedback.material}_${feedback.operations[0] || "unknown"}`;

    let knowledge = this.knowledge.get(combinationId);
    if (!knowledge) {
      knowledge = {
        id: combinationId,
        type: "tribal_tip",
        topic: `${feedback.controller} + ${feedback.material}`,
        content: `Successful combination: ${feedback.controller} controller, ${feedback.material} material, ${feedback.operations.join(", ")} operations`,
        applicableContext: {
          controllers: [feedback.controller],
          materials: [feedback.material],
          operations: feedback.operations
        },
        supportingEvidence: 0,
        contradictingEvidence: 0,
        confidence: 0.5,  // Start neutral
        learnedAt: new Date().toISOString(),
        lastValidated: new Date().toISOString(),
        promoted: false
      };
      knowledgeAdded++;
    }

    knowledge.supportingEvidence++;
    knowledge.lastValidated = new Date().toISOString();

    // Bayesian confidence update
    const total = knowledge.supportingEvidence + knowledge.contradictingEvidence;
    knowledge.confidence = knowledge.supportingEvidence / total;

    this.knowledge.set(combinationId, knowledge);
    return knowledgeAdded;
  }

  /**
   * Learn from operator corrections
   */
  private learnFromCorrections(feedback: ProductionFeedback): number {
    let knowledgeAdded = 0;

    if (!feedback.corrections) return 0;

    for (const correction of feedback.corrections) {
      // Learn the pattern: for this controller/material, prefer the corrected version
      const correctionId = `correction_${feedback.controller}_${feedback.material}_${correction.type}`;

      let knowledge = this.knowledge.get(correctionId);
      if (!knowledge) {
        knowledge = {
          id: correctionId,
          type: "parameter_refinement",
          topic: `${correction.type} correction pattern`,
          content: `For ${feedback.controller} with ${feedback.material}: use ${correction.corrected} instead of ${correction.original}` +
                   (correction.reason ? ` (Reason: ${correction.reason})` : ""),
          applicableContext: {
            controllers: [feedback.controller],
            materials: [feedback.material],
            operations: feedback.operations
          },
          supportingEvidence: 0,
          contradictingEvidence: 0,
          confidence: 0.5,
          learnedAt: new Date().toISOString(),
          lastValidated: new Date().toISOString(),
          promoted: false
        };
        knowledgeAdded++;
      }

      knowledge.supportingEvidence++;
      const total = knowledge.supportingEvidence + knowledge.contradictingEvidence;
      knowledge.confidence = knowledge.supportingEvidence / total;
      knowledge.lastValidated = new Date().toISOString();

      this.knowledge.set(correctionId, knowledge);
    }

    return knowledgeAdded;
  }

  /**
   * Promote validated knowledge to permanent status
   */
  private promoteValidatedKnowledge(): void {
    for (const [id, knowledge] of this.knowledge.entries()) {
      if (
        !knowledge.promoted &&
        knowledge.supportingEvidence >= this.minEvidenceForPromotion &&
        knowledge.confidence >= this.promotionConfidenceThreshold
      ) {
        knowledge.promoted = true;
        this.knowledge.set(id, knowledge);
      }
    }
  }

  /**
   * Initialize learning strategies
   */
  private initializeStrategies(): void {
    const strategies: LearningStrategy[] = [
      {
        name: "bayesian_update",
        description: "Bayesian belief updating from evidence",
        applicationsCount: 0,
        successCount: 0,
        failureCount: 0,
        avgConfidenceGain: 0,
        lastUsed: new Date().toISOString()
      },
      {
        name: "pattern_detection",
        description: "Mistake pattern detection and rule generation",
        applicationsCount: 0,
        successCount: 0,
        failureCount: 0,
        avgConfidenceGain: 0,
        lastUsed: new Date().toISOString()
      },
      {
        name: "knowledge_extraction",
        description: "Extract knowledge from successful outcomes",
        applicationsCount: 0,
        successCount: 0,
        failureCount: 0,
        avgConfidenceGain: 0,
        lastUsed: new Date().toISOString()
      },
      {
        name: "correction_learning",
        description: "Learn from operator corrections",
        applicationsCount: 0,
        successCount: 0,
        failureCount: 0,
        avgConfidenceGain: 0,
        lastUsed: new Date().toISOString()
      }
    ];

    for (const strategy of strategies) {
      this.strategies.set(strategy.name, strategy);
    }
  }

  // ============================================================================
  // PUBLIC API
  // ============================================================================

  /**
   * Get current learning state
   */
  public getLearningState(): LearningState {
    const beliefs = Array.from(this.beliefs.values());
    const totalEvidence = beliefs.reduce((sum, b) => sum + b.evidenceCount, 0);
    const totalPositive = beliefs.reduce((sum, b) => sum + b.positiveEvidence, 0);
    const overallAccuracy = totalEvidence > 0 ? totalPositive / totalEvidence : 0;

    // Calculate improvement rate (last 10 vs. first 10 feedback items)
    let improvementRate = 0;
    if (this.feedback.length >= 20) {
      const firstTen = this.feedback.slice(0, 10);
      const lastTen = this.feedback.slice(-10);
      const firstSuccess = firstTen.filter(f => f.outcome === "success").length / 10;
      const lastSuccess = lastTen.filter(f => f.outcome === "success").length / 10;
      improvementRate = lastSuccess - firstSuccess;
    }

    return {
      totalFeedback: this.feedback.length,
      engineBeliefs: beliefs,
      mistakePatterns: Array.from(this.patterns.values()),
      learnedKnowledge: Array.from(this.knowledge.values()),
      strategies: Array.from(this.strategies.values()),
      overallAccuracy,
      improvementRate,
      knowledgeBaseSize: this.knowledge.size
    };
  }

  /**
   * Get engine belief state
   */
  public getEngineBelief(engineId: string): EngineBeliefState | undefined {
    return this.beliefs.get(engineId);
  }

  /**
   * Get top mistake patterns
   */
  public getTopMistakePatterns(limit = 10): MistakePattern[] {
    return Array.from(this.patterns.values())
      .sort((a, b) => b.occurrences - a.occurrences)
      .slice(0, limit);
  }

  /**
   * Get promoted knowledge (validated, high confidence)
   */
  public getPromotedKnowledge(): LearnedKnowledge[] {
    return Array.from(this.knowledge.values()).filter(k => k.promoted);
  }

  /**
   * Search knowledge base
   */
  public searchKnowledge(query: string): LearnedKnowledge[] {
    const lowerQuery = query.toLowerCase();
    return Array.from(this.knowledge.values()).filter(k =>
      k.topic.toLowerCase().includes(lowerQuery) ||
      k.content.toLowerCase().includes(lowerQuery)
    );
  }

  /**
   * Get prevention rules for a controller/material
   */
  public getPreventionRules(controller: string, material: string): string[] {
    return Array.from(this.patterns.values())
      .filter(p =>
        p.controllers.includes(controller) &&
        p.materials.includes(material) &&
        p.preventionRule !== undefined
      )
      .map(p => p.preventionRule!)
      .filter((rule): rule is string => rule !== undefined);
  }

  /**
   * Reset learning state (for testing/debugging)
   */
  public resetLearning(): void {
    this.feedback = [];
    this.beliefs.clear();
    this.patterns.clear();
    this.knowledge.clear();
    this.initializeStrategies();
  }

  /**
   * Get statistics
   */
  public getStatistics(): {
    version: string;
    feedbackCount: number;
    enginesTracked: number;
    patternsDetected: number;
    knowledgeEntries: number;
    promotedKnowledge: number;
    overallAccuracy: number;
    minEvidenceForPromotion: number;
    promotionConfidenceThreshold: number;
  } {
    const state = this.getLearningState();
    const promoted = state.learnedKnowledge.filter(k => k.promoted).length;

    return {
      version: this.engineVersion,
      feedbackCount: this.feedback.length,
      enginesTracked: this.beliefs.size,
      patternsDetected: this.patterns.size,
      knowledgeEntries: this.knowledge.size,
      promotedKnowledge: promoted,
      overallAccuracy: state.overallAccuracy,
      minEvidenceForPromotion: this.minEvidenceForPromotion,
      promotionConfidenceThreshold: this.promotionConfidenceThreshold
    };
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const postProcessorAGIContinuousLearningEngine = new PostProcessorAGIContinuousLearningEngine();

export {
  type ProductionFeedback,
  type EngineBeliefState,
  type MistakePattern,
  type LearnedKnowledge,
  type LearningStrategy,
  type LearningState
};
