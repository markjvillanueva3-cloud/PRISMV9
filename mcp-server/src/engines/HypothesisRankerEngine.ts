/**
 * HypothesisRankerEngine — Multi-Hypothesis Evaluation and Ranking
 * =================================================================
 * Implements systematic hypothesis generation, evaluation, and ranking
 * for complex manufacturing problems where multiple solutions exist.
 *
 * Key Features:
 *   - Hypothesis generation from multiple perspectives
 *   - Evidence-based scoring with confidence intervals
 *   - Prior probability integration (Bayesian updates)
 *   - Cross-validation against tribal knowledge
 *   - Explainable ranking with detailed rationale
 *
 * @module engines/HypothesisRankerEngine
 */

import { log } from "../utils/Logger.js";

// ============================================================================
// TYPES
// ============================================================================

export interface Hypothesis {
  id: string;
  statement: string;
  category: "root_cause" | "solution" | "optimization" | "prediction" | "explanation";
  prior_probability: number;  // Initial belief (0-1)
  posterior_probability: number;  // Updated belief after evidence
  supporting_evidence: Evidence[];
  contradicting_evidence: Evidence[];
  assumptions: string[];
  testable_predictions: string[];
  confidence_interval: { low: number; high: number };
  metadata: {
    source: string;
    created_at: string;
    last_updated: string;
    tribal_alignment: number;
  };
}

export interface Evidence {
  id: string;
  description: string;
  type: "observation" | "measurement" | "tribal" | "physics" | "historical" | "experimental";
  strength: number;  // 0-1: How strongly this evidence supports/contradicts
  reliability: number;  // 0-1: How reliable is this evidence source
  source: string;
}

export interface HypothesisSet {
  id: string;
  problem: string;
  hypotheses: Map<string, Hypothesis>;
  rankings: HypothesisRanking[];
  best_hypothesis_id: string | null;
  consensus_reached: boolean;
  created_at: string;
  updated_at: string;
}

export interface HypothesisRanking {
  hypothesis_id: string;
  rank: number;
  score: number;
  rationale: string;
  strengths: string[];
  weaknesses: string[];
}

export interface EvaluationCriteria {
  name: string;
  weight: number;
  scorer: (h: Hypothesis) => number;
}

// ============================================================================
// DEFAULT EVALUATION CRITERIA
// ============================================================================

const DEFAULT_CRITERIA: EvaluationCriteria[] = [
  {
    name: "Evidence Support",
    weight: 0.30,
    scorer: (h) => {
      const supportWeight = h.supporting_evidence.reduce(
        (sum, e) => sum + e.strength * e.reliability,
        0
      );
      const contradictWeight = h.contradicting_evidence.reduce(
        (sum, e) => sum + e.strength * e.reliability,
        0
      );
      const total = supportWeight + contradictWeight;
      return total > 0 ? supportWeight / total : 0.5;
    },
  },
  {
    name: "Posterior Probability",
    weight: 0.25,
    scorer: (h) => h.posterior_probability,
  },
  {
    name: "Tribal Alignment",
    weight: 0.20,
    scorer: (h) => h.metadata.tribal_alignment,
  },
  {
    name: "Testability",
    weight: 0.15,
    scorer: (h) => Math.min(1, h.testable_predictions.length / 3),
  },
  {
    name: "Parsimony",
    weight: 0.10,
    scorer: (h) => 1 - Math.min(1, h.assumptions.length / 5),
  },
];

// ============================================================================
// ENGINE CLASS
// ============================================================================

export class HypothesisRankerEngine {
  private sets: Map<string, HypothesisSet> = new Map();
  private hypothesisCounter = 0;
  private evidenceCounter = 0;

  /**
   * Create a new hypothesis set for a problem.
   */
  createHypothesisSet(problem: string): HypothesisSet {
    const setId = `hset_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const set: HypothesisSet = {
      id: setId,
      problem,
      hypotheses: new Map(),
      rankings: [],
      best_hypothesis_id: null,
      consensus_reached: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    this.sets.set(setId, set);
    log.info(`[HypothesisRanker] Created hypothesis set ${setId} for: ${problem.slice(0, 50)}...`);

    return set;
  }

  /**
   * Add a hypothesis to a set.
   */
  addHypothesis(
    setId: string,
    statement: string,
    category: Hypothesis["category"],
    options: {
      prior?: number;
      assumptions?: string[];
      testable_predictions?: string[];
      source?: string;
      tribal_alignment?: number;
    } = {}
  ): Hypothesis | null {
    const set = this.sets.get(setId);
    if (!set) {
      log.error(`[HypothesisRanker] Set ${setId} not found`);
      return null;
    }

    const hypId = `hyp_${++this.hypothesisCounter}_${Date.now().toString(36)}`;
    const now = new Date().toISOString();

    const hypothesis: Hypothesis = {
      id: hypId,
      statement,
      category,
      prior_probability: options.prior ?? 0.5,
      posterior_probability: options.prior ?? 0.5,
      supporting_evidence: [],
      contradicting_evidence: [],
      assumptions: options.assumptions ?? [],
      testable_predictions: options.testable_predictions ?? [],
      confidence_interval: { low: 0.2, high: 0.8 },
      metadata: {
        source: options.source ?? "manual",
        created_at: now,
        last_updated: now,
        tribal_alignment: options.tribal_alignment ?? 0.5,
      },
    };

    set.hypotheses.set(hypId, hypothesis);
    set.updated_at = now;

    return hypothesis;
  }

  /**
   * Add evidence to a hypothesis.
   */
  addEvidence(
    setId: string,
    hypothesisId: string,
    evidence: {
      description: string;
      type: Evidence["type"];
      strength: number;
      reliability: number;
      source: string;
      supports: boolean;
    }
  ): Evidence | null {
    const set = this.sets.get(setId);
    const hypothesis = set?.hypotheses.get(hypothesisId);
    if (!hypothesis) {
      log.error(`[HypothesisRanker] Hypothesis ${hypothesisId} not found`);
      return null;
    }

    const evId = `ev_${++this.evidenceCounter}_${Date.now().toString(36)}`;

    const ev: Evidence = {
      id: evId,
      description: evidence.description,
      type: evidence.type,
      strength: evidence.strength,
      reliability: evidence.reliability,
      source: evidence.source,
    };

    if (evidence.supports) {
      hypothesis.supporting_evidence.push(ev);
    } else {
      hypothesis.contradicting_evidence.push(ev);
    }

    // Update posterior probability using Bayesian update
    this.updatePosterior(hypothesis);

    hypothesis.metadata.last_updated = new Date().toISOString();
    set!.updated_at = hypothesis.metadata.last_updated;

    return ev;
  }

  /**
   * Update posterior probability using Bayesian inference.
   */
  private updatePosterior(hypothesis: Hypothesis): void {
    const prior = hypothesis.prior_probability;

    // Calculate likelihood ratio from evidence
    let likelihoodRatio = 1.0;

    for (const ev of hypothesis.supporting_evidence) {
      // P(evidence | hypothesis) / P(evidence | ~hypothesis)
      const strengthFactor = 1 + ev.strength * ev.reliability;
      likelihoodRatio *= strengthFactor;
    }

    for (const ev of hypothesis.contradicting_evidence) {
      // Reduce likelihood for contradicting evidence
      const strengthFactor = 1 - ev.strength * ev.reliability * 0.5;
      likelihoodRatio *= Math.max(0.1, strengthFactor);
    }

    // Bayes' theorem: P(H|E) = P(E|H) * P(H) / P(E)
    // Simplified: posterior ≈ prior * likelihood_ratio / normalizer
    const unnormalizedPosterior = prior * likelihoodRatio;
    const normalizer = unnormalizedPosterior + (1 - prior);

    hypothesis.posterior_probability = Math.min(0.99, Math.max(0.01, unnormalizedPosterior / normalizer));

    // Update confidence interval
    const evidenceCount = hypothesis.supporting_evidence.length + hypothesis.contradicting_evidence.length;
    const intervalWidth = Math.max(0.1, 0.6 - evidenceCount * 0.05);
    hypothesis.confidence_interval = {
      low: Math.max(0, hypothesis.posterior_probability - intervalWidth / 2),
      high: Math.min(1, hypothesis.posterior_probability + intervalWidth / 2),
    };
  }

  /**
   * Rank all hypotheses in a set.
   */
  rankHypotheses(
    setId: string,
    criteria: EvaluationCriteria[] = DEFAULT_CRITERIA
  ): HypothesisRanking[] {
    const set = this.sets.get(setId);
    if (!set) {
      return [];
    }

    const rankings: HypothesisRanking[] = [];

    for (const [hypId, hypothesis] of set.hypotheses) {
      let totalScore = 0;
      const strengths: string[] = [];
      const weaknesses: string[] = [];

      for (const criterion of criteria) {
        const criterionScore = criterion.scorer(hypothesis);
        totalScore += criterionScore * criterion.weight;

        if (criterionScore >= 0.7) {
          strengths.push(`Strong ${criterion.name} (${(criterionScore * 100).toFixed(0)}%)`);
        } else if (criterionScore < 0.4) {
          weaknesses.push(`Weak ${criterion.name} (${(criterionScore * 100).toFixed(0)}%)`);
        }
      }

      rankings.push({
        hypothesis_id: hypId,
        rank: 0,  // Will be assigned after sorting
        score: totalScore,
        rationale: this.generateRationale(hypothesis, totalScore),
        strengths,
        weaknesses,
      });
    }

    // Sort by score descending
    rankings.sort((a, b) => b.score - a.score);

    // Assign ranks
    rankings.forEach((r, i) => {
      r.rank = i + 1;
    });

    // Update set
    set.rankings = rankings;
    set.best_hypothesis_id = rankings[0]?.hypothesis_id ?? null;
    set.consensus_reached = rankings.length >= 2 && rankings[0].score - rankings[1].score > 0.2;
    set.updated_at = new Date().toISOString();

    return rankings;
  }

  /**
   * Generate human-readable rationale for a hypothesis score.
   */
  private generateRationale(hypothesis: Hypothesis, score: number): string {
    const parts: string[] = [];

    if (hypothesis.posterior_probability > 0.7) {
      parts.push("High probability based on evidence");
    } else if (hypothesis.posterior_probability < 0.3) {
      parts.push("Low probability suggests other factors");
    }

    if (hypothesis.supporting_evidence.length > hypothesis.contradicting_evidence.length) {
      parts.push(`${hypothesis.supporting_evidence.length} supporting vs ${hypothesis.contradicting_evidence.length} contradicting evidence`);
    }

    if (hypothesis.metadata.tribal_alignment > 0.7) {
      parts.push("Aligns with tribal knowledge");
    }

    if (hypothesis.assumptions.length <= 2) {
      parts.push("Few assumptions (parsimonious)");
    } else if (hypothesis.assumptions.length > 4) {
      parts.push("Many assumptions increase uncertainty");
    }

    return parts.length > 0 ? parts.join("; ") : `Score: ${(score * 100).toFixed(1)}%`;
  }

  /**
   * Generate hypotheses for a manufacturing problem.
   */
  generateHypothesesForProblem(
    setId: string,
    problemType: "quality_issue" | "tool_failure" | "cycle_time" | "dimensional_error"
  ): Hypothesis[] {
    const templates: Record<string, { statement: string; category: Hypothesis["category"]; assumptions: string[]; predictions: string[] }[]> = {
      quality_issue: [
        { statement: "Surface finish degradation due to tool wear", category: "root_cause", assumptions: ["Tool has been in use for extended period"], predictions: ["Tool inspection shows wear marks", "Fresh tool improves finish"] },
        { statement: "Incorrect speed/feed for material hardness", category: "root_cause", assumptions: ["Material hardness may vary from spec"], predictions: ["Hardness test confirms variation", "Adjusted parameters improve finish"] },
        { statement: "Insufficient coolant coverage", category: "root_cause", assumptions: ["Coolant system functioning normally"], predictions: ["Thermal camera shows hot spots", "Improved coolant flow helps"] },
        { statement: "Machine vibration from loose components", category: "root_cause", assumptions: ["Machine has been running continuously"], predictions: ["Vibration measurement confirms issue", "Tightening reduces chatter marks"] },
      ],
      tool_failure: [
        { statement: "Excessive cutting force due to deep DOC", category: "root_cause", assumptions: ["DOC may exceed tool capacity"], predictions: ["Force measurement confirms high loads", "Reduced DOC prevents failure"] },
        { statement: "Built-up edge formation at low speed", category: "root_cause", assumptions: ["Material is prone to BUE"], predictions: ["Chip examination shows BUE", "Higher speed eliminates BUE"] },
        { statement: "Thermal shock from interrupted cut", category: "root_cause", assumptions: ["Cut involves interruptions"], predictions: ["Tool shows thermal cracks", "Tougher grade survives better"] },
        { statement: "Coolant inadequacy causing thermal failure", category: "root_cause", assumptions: ["Coolant pressure may be insufficient"], predictions: ["Thermocouple shows high temps", "High-pressure coolant extends life"] },
      ],
      cycle_time: [
        { statement: "Suboptimal feed rate for material", category: "optimization", assumptions: ["Current feeds are conservative"], predictions: ["Higher feed maintains quality", "20%+ time reduction achievable"] },
        { statement: "Excessive rapid traverse distances", category: "optimization", assumptions: ["Toolpath not optimized"], predictions: ["Toolpath analysis shows waste", "Optimized path reduces air time"] },
        { statement: "Tool change time could be reduced", category: "optimization", assumptions: ["Tool changes are frequent"], predictions: ["Tool consolidation possible", "Fewer changes = faster cycle"] },
      ],
      dimensional_error: [
        { statement: "Thermal expansion during machining", category: "root_cause", assumptions: ["Part temperature increases"], predictions: ["Post-cool measurement differs", "Thermal compensation helps"] },
        { statement: "Tool deflection under cutting load", category: "root_cause", assumptions: ["Tool stickout is significant"], predictions: ["CMM shows consistent bias", "Shorter tool reduces error"] },
        { statement: "Fixture not properly constraining part", category: "root_cause", assumptions: ["Part may shift during cutting"], predictions: ["Witness marks show movement", "Better fixturing eliminates shift"] },
        { statement: "Machine positioning error", category: "root_cause", assumptions: ["Machine calibration may be off"], predictions: ["Ball bar test shows deviation", "Calibration corrects error"] },
      ],
    };

    const problemTemplates = templates[problemType] ?? templates.quality_issue;
    const generated: Hypothesis[] = [];

    for (const template of problemTemplates) {
      const hyp = this.addHypothesis(setId, template.statement, template.category, {
        assumptions: template.assumptions,
        testable_predictions: template.predictions,
        source: "template_generation",
        tribal_alignment: 0.6,  // Templates are somewhat aligned
      });
      if (hyp) {
        generated.push(hyp);
      }
    }

    return generated;
  }

  /**
   * Get the best hypothesis from a set.
   */
  getBestHypothesis(setId: string): { hypothesis: Hypothesis; ranking: HypothesisRanking } | null {
    const set = this.sets.get(setId);
    if (!set || !set.best_hypothesis_id) {
      return null;
    }

    const hypothesis = set.hypotheses.get(set.best_hypothesis_id);
    const ranking = set.rankings.find(r => r.hypothesis_id === set.best_hypothesis_id);

    if (!hypothesis || !ranking) {
      return null;
    }

    return { hypothesis, ranking };
  }

  /**
   * Get training context for AI integration.
   */
  getTrainingContext(): string {
    return `
HYPOTHESIS RANKER ENGINE
========================
Capabilities:
  - Multi-hypothesis generation for manufacturing problems
  - Bayesian probability updates from evidence
  - Weighted multi-criteria ranking:
    * Evidence Support (30%)
    * Posterior Probability (25%)
    * Tribal Knowledge Alignment (20%)
    * Testability (15%)
    * Parsimony (10%)
  - Confidence interval estimation
  - Explainable rankings with strengths/weaknesses

Problem Templates Available:
  - Quality issues (4 hypotheses)
  - Tool failures (4 hypotheses)
  - Cycle time optimization (3 hypotheses)
  - Dimensional errors (4 hypotheses)

Evidence Types:
  - Observation, Measurement, Tribal, Physics, Historical, Experimental

Best For:
  - Root cause analysis
  - Troubleshooting systematic issues
  - Comparing multiple solutions
  - Evidence-based decision making
`.trim();
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const hypothesisRankerEngine = new HypothesisRankerEngine();
