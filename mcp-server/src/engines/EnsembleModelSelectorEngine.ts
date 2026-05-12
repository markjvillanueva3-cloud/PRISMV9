/**
 * EnsembleModelSelectorEngine — Ensemble Model Selection & Weighting
 *
 * MILL-AGI Phase 0.4: Online Learning Layer — Unit 4
 *
 * Dynamically selects and weights ensemble members for milling prediction:
 *   - Online model performance tracking
 *   - Exponential weighting with forgetting factor
 *   - Hedge algorithm for adaptive model selection
 *   - Stacking with learned meta-weights
 *   - Diversity-aware ensemble construction
 *
 * Ensemble Types:
 *   - Force prediction ensemble (MLP, physics, hybrid)
 *   - Thermal prediction ensemble (LSTM, Loewen-Shaw, hybrid)
 *   - Tool life ensemble (GNN, Taylor, hybrid)
 *   - Surface finish ensemble (CNN, Brammertz, hybrid)
 *
 * References:
 *   [1] Freund & Schapire (1997) "A Decision-Theoretic Generalization of
 *       On-Line Learning and an Application to Boosting" JCSS
 *   [2] Cesa-Bianchi & Lugosi (2006) "Prediction, Learning, and Games"
 *   [3] MIT 6.S191 — Ensemble Methods and Model Selection
 *
 * @module engines/EnsembleModelSelectorEngine
 * @milestone MILL-AGI-P0/U-P0.4-04
 */

import { log } from "../utils/Logger.js";

// ============================================================================
// TYPES
// ============================================================================

export interface EnsembleMember {
  id: string;
  name: string;
  type: "neural" | "physics" | "hybrid" | "statistical";
  domain: "force" | "thermal" | "tool_life" | "surface" | "chatter";
  weight: number;
  active: boolean;
}

export interface MemberPerformance {
  member_id: string;
  predictions: number;
  total_error: number;
  mean_error: number;
  recent_error: number;
  loss: number;
  weight: number;
}

export interface EnsemblePrediction {
  value: number;
  uncertainty: number;
  member_contributions: Array<{
    member_id: string;
    prediction: number;
    weight: number;
  }>;
  diversity_score: number;
}

export interface SelectorConfig {
  algorithm: "exponential" | "hedge" | "follow-leader" | "ucb-expert";
  learning_rate: number;
  forgetting_factor: number;
  min_weight: number;
  diversity_bonus: number;
  recent_window: number;
}

// ============================================================================
// DEFAULT CONFIG
// ============================================================================

const DEFAULT_CONFIG: SelectorConfig = {
  algorithm: "hedge",
  learning_rate: 0.1,
  forgetting_factor: 0.995,
  min_weight: 0.01,
  diversity_bonus: 0.1,
  recent_window: 50,
};

// ============================================================================
// ENGINE CLASS
// ============================================================================

export class EnsembleModelSelectorEngine {
  private config: SelectorConfig;
  private members: Map<string, EnsembleMember>;
  private performance: Map<string, MemberPerformance>;
  private recentErrors: Map<string, number[]>;
  private totalRounds: number;

  constructor(config?: Partial<SelectorConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.members = new Map();
    this.performance = new Map();
    this.recentErrors = new Map();
    this.totalRounds = 0;
  }

  /**
   * Register an ensemble member.
   */
  registerMember(member: EnsembleMember): void {
    this.members.set(member.id, { ...member });
    this.performance.set(member.id, {
      member_id: member.id,
      predictions: 0,
      total_error: 0,
      mean_error: 0,
      recent_error: 0,
      loss: 0,
      weight: member.weight,
    });
    this.recentErrors.set(member.id, []);
  }

  /**
   * Get ensemble prediction by combining member predictions.
   */
  predict(
    memberPredictions: Map<string, number>,
    domain?: EnsembleMember["domain"]
  ): EnsemblePrediction {
    const contributions: EnsemblePrediction["member_contributions"] = [];
    let totalWeight = 0;
    let weightedSum = 0;
    let predictions: number[] = [];

    for (const [memberId, prediction] of memberPredictions) {
      const member = this.members.get(memberId);
      const perf = this.performance.get(memberId);

      if (!member || !perf || !member.active) continue;
      if (domain && member.domain !== domain) continue;

      const weight = perf.weight;
      totalWeight += weight;
      weightedSum += weight * prediction;
      predictions.push(prediction);

      contributions.push({
        member_id: memberId,
        prediction,
        weight,
      });
    }

    const value = totalWeight > 0 ? weightedSum / totalWeight : 0;

    // Uncertainty from prediction disagreement
    const variance = this.computeVariance(predictions, value);
    const uncertainty = Math.sqrt(variance);

    // Diversity: higher when predictions disagree
    const diversity = this.computeDiversity(predictions);

    return {
      value,
      uncertainty,
      member_contributions: contributions,
      diversity_score: diversity,
    };
  }

  /**
   * Update member weights based on observed loss.
   */
  updateWeights(
    memberErrors: Map<string, number>,
    actual: number
  ): {
    updated_weights: Map<string, number>;
    best_member: string;
    worst_member: string;
  } {
    this.totalRounds++;

    let bestMember = "";
    let worstMember = "";
    let minError = Infinity;
    let maxError = -Infinity;

    // Update performance tracking
    for (const [memberId, error] of memberErrors) {
      const perf = this.performance.get(memberId);
      if (!perf) continue;

      perf.predictions++;
      perf.total_error += error;
      perf.mean_error = perf.total_error / perf.predictions;

      // Track recent errors
      const recent = this.recentErrors.get(memberId)!;
      recent.push(error);
      if (recent.length > this.config.recent_window) {
        recent.shift();
      }
      perf.recent_error =
        recent.reduce((a, b) => a + b, 0) / recent.length;

      // Update cumulative loss
      perf.loss += error;

      if (error < minError) {
        minError = error;
        bestMember = memberId;
      }
      if (error > maxError) {
        maxError = error;
        worstMember = memberId;
      }
    }

    // Update weights based on algorithm
    const updatedWeights = this.computeNewWeights(memberErrors);

    for (const [memberId, weight] of updatedWeights) {
      const perf = this.performance.get(memberId);
      if (perf) {
        perf.weight = weight;
      }
    }

    log.debug(
      `[Ensemble] round=${this.totalRounds}, best=${bestMember}, worst=${worstMember}`
    );

    return {
      updated_weights: updatedWeights,
      best_member: bestMember,
      worst_member: worstMember,
    };
  }

  /**
   * Get current weights for all members.
   */
  getWeights(): Map<string, number> {
    const weights = new Map<string, number>();
    for (const [id, perf] of this.performance) {
      weights.set(id, perf.weight);
    }
    return weights;
  }

  /**
   * Get performance summary for a member.
   */
  getMemberPerformance(memberId: string): MemberPerformance | null {
    return this.performance.get(memberId) ?? null;
  }

  /**
   * Get all member performances.
   */
  getAllPerformances(): MemberPerformance[] {
    return Array.from(this.performance.values());
  }

  /**
   * Get best performing member.
   */
  getBestMember(metric: "mean_error" | "recent_error" | "weight" = "recent_error"): {
    member: EnsembleMember;
    performance: MemberPerformance;
  } | null {
    let best: { member: EnsembleMember; performance: MemberPerformance } | null = null;
    let bestScore = metric === "weight" ? -Infinity : Infinity;

    for (const [id, perf] of this.performance) {
      const member = this.members.get(id);
      if (!member || !member.active || perf.predictions < 5) continue;

      const score = perf[metric];
      const isBetter = metric === "weight" ? score > bestScore : score < bestScore;

      if (isBetter) {
        bestScore = score;
        best = { member, performance: perf };
      }
    }

    return best;
  }

  /**
   * Prune poorly performing members.
   */
  pruneMembers(threshold: number = 0.05): string[] {
    const pruned: string[] = [];

    for (const [id, perf] of this.performance) {
      const member = this.members.get(id);
      if (!member) continue;

      if (perf.weight < threshold && perf.predictions > 20) {
        member.active = false;
        pruned.push(id);
      }
    }

    return pruned;
  }

  /**
   * Reactivate pruned member.
   */
  reactivateMember(memberId: string): boolean {
    const member = this.members.get(memberId);
    if (!member) return false;

    member.active = true;
    const perf = this.performance.get(memberId);
    if (perf) {
      perf.weight = this.config.min_weight;
    }

    return true;
  }

  /**
   * Get ensemble diversity metrics.
   */
  getDiversityMetrics(): {
    active_count: number;
    type_distribution: Record<EnsembleMember["type"], number>;
    domain_distribution: Record<EnsembleMember["domain"], number>;
    weight_entropy: number;
  } {
    let activeCount = 0;
    const typeCount: Record<string, number> = { neural: 0, physics: 0, hybrid: 0, statistical: 0 };
    const domainCount: Record<string, number> = {
      force: 0,
      thermal: 0,
      tool_life: 0,
      surface: 0,
      chatter: 0,
    };
    const weights: number[] = [];

    for (const [id, member] of this.members) {
      if (member.active) {
        activeCount++;
        typeCount[member.type]++;
        domainCount[member.domain]++;
        const perf = this.performance.get(id);
        if (perf) weights.push(perf.weight);
      }
    }

    // Weight entropy
    const totalWeight = weights.reduce((a, b) => a + b, 0);
    let entropy = 0;
    if (totalWeight > 0) {
      for (const w of weights) {
        const p = w / totalWeight;
        if (p > 0) {
          entropy -= p * Math.log2(p);
        }
      }
    }

    return {
      active_count: activeCount,
      type_distribution: typeCount as Record<EnsembleMember["type"], number>,
      domain_distribution: domainCount as Record<EnsembleMember["domain"], number>,
      weight_entropy: entropy,
    };
  }

  /**
   * Get configuration.
   */
  getConfig(): SelectorConfig {
    return { ...this.config };
  }

  /**
   * Reset all weights and statistics.
   */
  reset(): void {
    for (const [id, perf] of this.performance) {
      perf.predictions = 0;
      perf.total_error = 0;
      perf.mean_error = 0;
      perf.recent_error = 0;
      perf.loss = 0;
      perf.weight = 1 / this.members.size;
    }
    for (const arr of this.recentErrors.values()) {
      arr.length = 0;
    }
    this.totalRounds = 0;
  }

  // ============================================================================
  // PRIVATE: WEIGHT UPDATE ALGORITHMS
  // ============================================================================

  private computeNewWeights(errors: Map<string, number>): Map<string, number> {
    switch (this.config.algorithm) {
      case "exponential":
        return this.exponentialWeights(errors);
      case "hedge":
        return this.hedgeWeights(errors);
      case "follow-leader":
        return this.followLeaderWeights();
      case "ucb-expert":
        return this.ucbExpertWeights(errors);
      default:
        return this.hedgeWeights(errors);
    }
  }

  private exponentialWeights(errors: Map<string, number>): Map<string, number> {
    const weights = new Map<string, number>();
    let totalWeight = 0;

    for (const [id, perf] of this.performance) {
      const error = errors.get(id) ?? 0;

      // Apply forgetting factor to old weight
      const decayedWeight = perf.weight * this.config.forgetting_factor;

      // Exponential update
      const newWeight = decayedWeight * Math.exp(-this.config.learning_rate * error);
      const clampedWeight = Math.max(this.config.min_weight, newWeight);

      weights.set(id, clampedWeight);
      totalWeight += clampedWeight;
    }

    // Normalize
    for (const [id, w] of weights) {
      weights.set(id, w / totalWeight);
    }

    return weights;
  }

  private hedgeWeights(errors: Map<string, number>): Map<string, number> {
    const weights = new Map<string, number>();
    let totalWeight = 0;

    for (const [id, perf] of this.performance) {
      const error = errors.get(id) ?? 0;

      // Hedge algorithm: multiplicative update
      const newWeight = perf.weight * Math.exp(-this.config.learning_rate * error);
      const clampedWeight = Math.max(this.config.min_weight, newWeight);

      weights.set(id, clampedWeight);
      totalWeight += clampedWeight;
    }

    // Normalize to probability distribution
    for (const [id, w] of weights) {
      weights.set(id, w / totalWeight);
    }

    return weights;
  }

  private followLeaderWeights(): Map<string, number> {
    const weights = new Map<string, number>();

    // Find member with lowest cumulative loss
    let minLoss = Infinity;
    let leaderId = "";

    for (const [id, perf] of this.performance) {
      if (perf.loss < minLoss) {
        minLoss = perf.loss;
        leaderId = id;
      }
    }

    // All weight to leader, with small epsilon for others
    const epsilon = this.config.min_weight;
    const leaderWeight = 1 - epsilon * (this.members.size - 1);

    for (const id of this.members.keys()) {
      weights.set(id, id === leaderId ? leaderWeight : epsilon);
    }

    return weights;
  }

  private ucbExpertWeights(errors: Map<string, number>): Map<string, number> {
    const weights = new Map<string, number>();
    let totalScore = 0;

    for (const [id, perf] of this.performance) {
      const error = errors.get(id) ?? 0;

      // UCB-style score: mean performance + exploration bonus
      const meanReward = 1 - perf.mean_error;
      const exploration = Math.sqrt(
        (2 * Math.log(this.totalRounds + 1)) / (perf.predictions + 1)
      );

      const score = meanReward + exploration;
      weights.set(id, Math.max(score, this.config.min_weight));
      totalScore += score;
    }

    // Normalize
    for (const [id, w] of weights) {
      weights.set(id, w / totalScore);
    }

    return weights;
  }

  // ============================================================================
  // PRIVATE: HELPERS
  // ============================================================================

  private computeVariance(values: number[], mean?: number): number {
    if (values.length === 0) return 0;

    const m = mean ?? values.reduce((a, b) => a + b, 0) / values.length;
    return values.reduce((sum, v) => sum + Math.pow(v - m, 2), 0) / values.length;
  }

  private computeDiversity(predictions: number[]): number {
    if (predictions.length < 2) return 0;

    // Diversity as coefficient of variation
    const mean = predictions.reduce((a, b) => a + b, 0) / predictions.length;
    if (mean === 0) return 0;

    const std = Math.sqrt(this.computeVariance(predictions, mean));
    return Math.min(std / Math.abs(mean), 1);
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const ensembleModelSelectorEngine = new EnsembleModelSelectorEngine();
