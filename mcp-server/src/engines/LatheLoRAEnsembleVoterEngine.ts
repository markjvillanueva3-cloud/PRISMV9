/**
 * LatheLoRAEnsembleVoterEngine — LATHE-LORA-MS0 U-LLR41
 * ======================================================
 *
 * Aggregates predictions from multiple LoRA adapters via voting.
 * Supports majority, weighted, and rank-based voting strategies.
 *
 * Features:
 *   - Majority/weighted/ranked voting
 *   - Confidence-weighted aggregation
 *   - Outlier detection
 *   - Voting transparency
 *
 * @module engines/LatheLoRAEnsembleVoterEngine
 * @version 1.0.0
 */

import { log } from "../utils/Logger.js";

// ============================================================================
// TYPES
// ============================================================================

/** Voting strategy */
export type VotingStrategy = "majority" | "weighted" | "ranked" | "unanimous" | "plurality";

/** Single model prediction */
export interface ModelPrediction {
  model_id: string;
  prediction: string;
  confidence: number;
  rank?: number;
  metadata?: Record<string, unknown>;
}

/** Voting result */
export interface VotingResult {
  id: string;
  strategy: VotingStrategy;
  winner: string;
  support_count: number;
  total_voters: number;
  winning_confidence: number;
  vote_distribution: Record<string, number>;
  all_predictions: ModelPrediction[];
  outliers: string[];
  created_at: number;
}

/** Engine configuration */
export interface VoterConfig {
  default_strategy: VotingStrategy;
  min_consensus_ratio: number;
  outlier_threshold: number;
  max_voters: number;
  require_confidence: boolean;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const DEFAULT_CONFIG: VoterConfig = {
  default_strategy: "weighted",
  min_consensus_ratio: 0.5,
  outlier_threshold: 0.3,
  max_voters: 10,
  require_confidence: true,
};

// ============================================================================
// ENGINE CLASS
// ============================================================================

class LatheLoRAEnsembleVoterEngine {
  private config: VoterConfig = DEFAULT_CONFIG;
  private votingHistory: VotingResult[] = [];

  /**
   * Set configuration
   */
  setConfig(config: Partial<VoterConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get configuration
   */
  getConfig(): VoterConfig {
    return { ...this.config };
  }

  /**
   * Majority voting: most frequent prediction wins
   */
  private majorityVote(predictions: ModelPrediction[]): { winner: string; counts: Record<string, number> } {
    const counts: Record<string, number> = {};
    for (const p of predictions) {
      counts[p.prediction] = (counts[p.prediction] || 0) + 1;
    }
    let winner = "";
    let maxCount = 0;
    for (const [pred, count] of Object.entries(counts)) {
      if (count > maxCount) {
        maxCount = count;
        winner = pred;
      }
    }
    return { winner, counts };
  }

  /**
   * Weighted voting: sum of confidences per prediction
   */
  private weightedVote(predictions: ModelPrediction[]): { winner: string; weights: Record<string, number> } {
    const weights: Record<string, number> = {};
    for (const p of predictions) {
      weights[p.prediction] = (weights[p.prediction] || 0) + p.confidence;
    }
    let winner = "";
    let maxWeight = 0;
    for (const [pred, weight] of Object.entries(weights)) {
      if (weight > maxWeight) {
        maxWeight = weight;
        winner = pred;
      }
    }
    return { winner, weights };
  }

  /**
   * Ranked voting: Borda count
   */
  private rankedVote(predictions: ModelPrediction[]): { winner: string; scores: Record<string, number> } {
    const scores: Record<string, number> = {};
    const n = predictions.length;
    for (const p of predictions) {
      const rank = p.rank || 1;
      const score = n - rank + 1;
      scores[p.prediction] = (scores[p.prediction] || 0) + score;
    }
    let winner = "";
    let maxScore = 0;
    for (const [pred, score] of Object.entries(scores)) {
      if (score > maxScore) {
        maxScore = score;
        winner = pred;
      }
    }
    return { winner, scores };
  }

  /**
   * Unanimous: all must agree
   */
  private unanimousVote(predictions: ModelPrediction[]): { winner: string | null; counts: Record<string, number> } {
    const counts: Record<string, number> = {};
    for (const p of predictions) {
      counts[p.prediction] = (counts[p.prediction] || 0) + 1;
    }
    const entries = Object.entries(counts);
    if (entries.length === 1) {
      return { winner: entries[0][0], counts };
    }
    return { winner: null, counts };
  }

  /**
   * Detect outliers (predictions with confidence far below median)
   */
  detectOutliers(predictions: ModelPrediction[]): string[] {
    if (predictions.length < 3) return [];

    const confidences = predictions.map(p => p.confidence).sort((a, b) => a - b);
    const median = confidences[Math.floor(confidences.length / 2)];

    const outliers: string[] = [];
    for (const p of predictions) {
      if (p.confidence < median - this.config.outlier_threshold) {
        outliers.push(p.model_id);
      }
    }
    return outliers;
  }

  /**
   * Conduct vote with specified strategy
   */
  vote(predictions: ModelPrediction[], strategy?: VotingStrategy): VotingResult {
    if (predictions.length === 0) {
      throw new Error("Cannot vote with no predictions");
    }

    if (predictions.length > this.config.max_voters) {
      throw new Error(`Too many voters: ${predictions.length} > ${this.config.max_voters}`);
    }

    // Validate confidences
    if (this.config.require_confidence) {
      for (const p of predictions) {
        if (p.confidence < 0 || p.confidence > 1) {
          throw new Error(`Invalid confidence: ${p.confidence}`);
        }
      }
    }

    const strat = strategy || this.config.default_strategy;
    let winner = "";
    let distribution: Record<string, number> = {};
    let supportCount = 0;

    switch (strat) {
      case "majority":
      case "plurality": {
        const result = this.majorityVote(predictions);
        winner = result.winner;
        distribution = result.counts;
        supportCount = distribution[winner] || 0;
        break;
      }
      case "weighted": {
        const result = this.weightedVote(predictions);
        winner = result.winner;
        distribution = result.weights;
        supportCount = predictions.filter(p => p.prediction === winner).length;
        break;
      }
      case "ranked": {
        const result = this.rankedVote(predictions);
        winner = result.winner;
        distribution = result.scores;
        supportCount = predictions.filter(p => p.prediction === winner).length;
        break;
      }
      case "unanimous": {
        const result = this.unanimousVote(predictions);
        winner = result.winner || "";
        distribution = result.counts;
        supportCount = result.winner ? result.counts[result.winner] : 0;
        break;
      }
    }

    // Compute winning confidence (avg of supporters)
    const supporters = predictions.filter(p => p.prediction === winner);
    const winningConf = supporters.length > 0
      ? supporters.reduce((s, p) => s + p.confidence, 0) / supporters.length
      : 0;

    const outliers = this.detectOutliers(predictions);

    const result: VotingResult = {
      id: `vote-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      strategy: strat,
      winner,
      support_count: supportCount,
      total_voters: predictions.length,
      winning_confidence: winningConf,
      vote_distribution: distribution,
      all_predictions: predictions,
      outliers,
      created_at: Date.now(),
    };

    this.votingHistory.push(result);

    // Trim history
    if (this.votingHistory.length > 1000) {
      this.votingHistory = this.votingHistory.slice(-500);
    }

    return result;
  }

  /**
   * Check if result meets consensus threshold
   */
  hasConsensus(result: VotingResult): boolean {
    const ratio = result.support_count / result.total_voters;
    return ratio >= this.config.min_consensus_ratio;
  }

  /**
   * Get voting history
   */
  getHistory(limit?: number): VotingResult[] {
    const list = [...this.votingHistory];
    return limit ? list.slice(-limit) : list;
  }

  /**
   * Get voting statistics
   */
  getStats(): {
    total_votes: number;
    consensus_rate: number;
    avg_voters_per_vote: number;
    avg_winning_confidence: number;
    strategy_distribution: Record<string, number>;
  } {
    const total = this.votingHistory.length;
    if (total === 0) {
      return {
        total_votes: 0,
        consensus_rate: 0,
        avg_voters_per_vote: 0,
        avg_winning_confidence: 0,
        strategy_distribution: {},
      };
    }

    const consensusCount = this.votingHistory.filter(v => this.hasConsensus(v)).length;
    const avgVoters = this.votingHistory.reduce((s, v) => s + v.total_voters, 0) / total;
    const avgConf = this.votingHistory.reduce((s, v) => s + v.winning_confidence, 0) / total;

    const stratDist: Record<string, number> = {};
    for (const v of this.votingHistory) {
      stratDist[v.strategy] = (stratDist[v.strategy] || 0) + 1;
    }

    return {
      total_votes: total,
      consensus_rate: consensusCount / total,
      avg_voters_per_vote: avgVoters,
      avg_winning_confidence: avgConf,
      strategy_distribution: stratDist,
    };
  }

  /**
   * Get summary
   */
  getSummary(): string {
    const stats = this.getStats();
    return [
      "Ensemble Voter Summary",
      "======================",
      `Total Votes: ${stats.total_votes}`,
      `Consensus Rate: ${(stats.consensus_rate * 100).toFixed(1)}%`,
      `Avg Voters: ${stats.avg_voters_per_vote.toFixed(1)}`,
      `Avg Winning Confidence: ${stats.avg_winning_confidence.toFixed(3)}`,
    ].join("\n");
  }

  /**
   * Clear history
   */
  clear(): void {
    this.votingHistory = [];
  }

  /**
   * Reset engine state
   */
  reset(): void {
    this.votingHistory = [];
    this.config = DEFAULT_CONFIG;
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const latheLoRAEnsembleVoterEngine = new LatheLoRAEnsembleVoterEngine();
