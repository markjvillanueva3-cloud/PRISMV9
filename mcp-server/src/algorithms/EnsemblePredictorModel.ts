/**
 * Ensemble Predictor Model
 *
 * Combines multiple algorithm predictions using strategy-specific fusion:
 * - Prediction: weighted average
 * - Classification/chatter: weighted voting
 * - Optimization: best objective value
 * - Best-of: highest confidence feasible solution
 *
 * Enables multi-model consensus for higher accuracy and reliability.
 *
 * References:
 * - Dietterich, T.G. (2000). "Ensemble Methods in Machine Learning"
 * - Hastie, T. et al. (2009). "Elements of Statistical Learning" Ch.16
 *
 * @module algorithms/EnsemblePredictorModel
 */

import type {
  Algorithm,
  AlgorithmMeta,
  ValidationResult,
  ValidationIssue,
  WithWarnings,
} from "./types.js";

// ── Input / Output Types ────────────────────────────────────────────

export type EnsembleProblemType =
  | "prediction" | "tool_life" | "speed_feed"
  | "classification" | "chatter"
  | "optimization" | "scheduling";

export interface EnsembleMember {
  /** Algorithm ID or name. */
  algorithm: string;
  /** Prediction result (numeric for prediction, string for classification). */
  prediction: number | string;
  /** Weight for this member (default 1). */
  weight?: number;
  /** Confidence score [0-1] (optional). */
  confidence?: number;
  /** Objective value (for optimization problems). */
  objective?: number;
  /** Whether the solution is feasible (for optimization). */
  feasible?: boolean;
}

export interface EnsemblePredictorInput {
  /** Array of algorithm results to combine. */
  members: EnsembleMember[];
  /** Problem type determines combination strategy. */
  problem_type: EnsembleProblemType;
  /** Minimum agreement threshold for consensus [0-1]. Default 0.5. */
  consensus_threshold?: number;
}

export interface EnsemblePredictorOutput extends WithWarnings {
  /** Combined prediction (numeric or string). */
  prediction: number | string;
  /** Combined confidence [0-1]. */
  confidence: number;
  /** Combination method used. */
  method: string;
  /** Number of contributing members. */
  num_contributors: number;
  /** Agreement ratio among members [0-1]. */
  agreement: number;
  /** Individual member contributions. */
  contributions: { algorithm: string; prediction: number | string; weight: number; influence: number }[];
  /** Spread/variance of predictions (for numeric). */
  spread: number | null;
  /** Whether consensus was reached. */
  consensus_reached: boolean;
  /** Calculation method tag. */
  calculation_method: string;
}

// ── Algorithm Implementation ────────────────────────────────────────

export class EnsemblePredictorModel implements Algorithm<EnsemblePredictorInput, EnsemblePredictorOutput> {

  validate(input: EnsemblePredictorInput): ValidationResult {
    const issues: ValidationIssue[] = [];

    if (!input.members || !Array.isArray(input.members) || input.members.length === 0) {
      issues.push({ field: "members", message: "At least one ensemble member is required", severity: "error" });
    }
    if (input.members && input.members.length < 2) {
      issues.push({ field: "members", message: "Ensemble with < 2 members provides no consensus benefit", severity: "warning" });
    }
    const validTypes: EnsembleProblemType[] = [
      "prediction", "tool_life", "speed_feed", "classification", "chatter", "optimization", "scheduling",
    ];
    if (!input.problem_type || !validTypes.includes(input.problem_type)) {
      issues.push({ field: "problem_type", message: `Problem type must be one of: ${validTypes.join(", ")}`, severity: "error" });
    }

    return { valid: issues.filter(i => i.severity === "error").length === 0, issues };
  }

  calculate(input: EnsemblePredictorInput): EnsemblePredictorOutput {
    const { members, problem_type, consensus_threshold = 0.5 } = input;

    switch (problem_type) {
      case "prediction":
      case "tool_life":
      case "speed_feed":
        return this.combineWeightedAverage(members, problem_type, consensus_threshold);
      case "classification":
      case "chatter":
        return this.combineVoting(members, problem_type, consensus_threshold);
      case "optimization":
      case "scheduling":
        return this.combineBestObjective(members, problem_type, consensus_threshold);
      default:
        return this.combineWeightedAverage(members, problem_type, consensus_threshold);
    }
  }

  getMetadata(): AlgorithmMeta {
    return {
      id: "ensemble-predictor",
      name: "Ensemble Predictor Model",
      description: "Multi-algorithm fusion via weighted average, voting, or best-objective selection",
      formula: "y_hat = SUM(w_i * y_i) / SUM(w_i) (prediction); majority_vote (classification)",
      reference: "Dietterich (2000); Hastie et al. (2009) Ch.16",
      safety_class: "standard",
      domain: "force",
      inputs: {
        members: "Array of {algorithm, prediction, weight, confidence}",
        problem_type: "prediction | classification | optimization",
      },
      outputs: {
        prediction: "Combined prediction",
        confidence: "Combined confidence [0-1]",
        agreement: "Member agreement ratio [0-1]",
        method: "Combination method used",
      },
    };
  }

  // ── Combination Strategies ──────────────────────────────────────

  private combineWeightedAverage(
    members: EnsembleMember[], problemType: string, threshold: number
  ): EnsemblePredictorOutput {
    const warnings: string[] = [];
    const numericMembers = members.filter(m => typeof m.prediction === "number");

    if (numericMembers.length === 0) {
      warnings.push("No numeric predictions to average. Returning first member.");
      return this.fallbackResult(members, "weighted_average", warnings, threshold);
    }

    const totalWeight = numericMembers.reduce((sum, m) => sum + (m.weight || 1), 0);
    let weightedSum = 0;
    let weightedConfidence = 0;

    const contributions = numericMembers.map(m => {
      const w = (m.weight || 1) / totalWeight;
      weightedSum += (m.prediction as number) * w;
      weightedConfidence += (m.confidence || 0.5) * w;
      return {
        algorithm: m.algorithm,
        prediction: m.prediction,
        weight: m.weight || 1,
        influence: w,
      };
    });

    // Spread (standard deviation of predictions)
    const values = numericMembers.map(m => m.prediction as number);
    const mean = weightedSum;
    const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
    const spread = Math.sqrt(variance);

    // Agreement: 1 - (coefficient of variation)
    const cv = mean !== 0 ? spread / Math.abs(mean) : 1;
    const agreement = Math.max(0, Math.min(1, 1 - cv));

    if (cv > 0.5) {
      warnings.push(`HIGH_VARIANCE: Predictions vary by ${(cv * 100).toFixed(0)}%. Low consensus.`);
    }

    return {
      prediction: weightedSum,
      confidence: weightedConfidence,
      method: "weighted_average",
      num_contributors: numericMembers.length,
      agreement,
      contributions,
      spread,
      consensus_reached: agreement >= threshold,
      warnings,
      calculation_method: `Ensemble weighted average (${problemType})`,
    };
  }

  private combineVoting(
    members: EnsembleMember[], problemType: string, threshold: number
  ): EnsemblePredictorOutput {
    const warnings: string[] = [];
    const votes: Record<string, number> = {};
    let totalWeight = 0;

    const contributions = members.map(m => {
      const w = m.weight || 1;
      const pred = String(m.prediction);
      votes[pred] = (votes[pred] || 0) + w;
      totalWeight += w;
      return {
        algorithm: m.algorithm,
        prediction: m.prediction,
        weight: w,
        influence: 0, // filled below
      };
    });

    // Find winner
    let winner = "";
    let maxVotes = 0;
    for (const [pred, count] of Object.entries(votes)) {
      if (count > maxVotes) {
        maxVotes = count;
        winner = pred;
      }
    }

    const agreement = totalWeight > 0 ? maxVotes / totalWeight : 0;
    contributions.forEach(c => {
      c.influence = String(c.prediction) === winner ? (c.weight / totalWeight) : 0;
    });

    if (agreement < threshold) {
      warnings.push(`LOW_CONSENSUS: Only ${(agreement * 100).toFixed(0)}% agreement. No clear majority.`);
    }

    return {
      prediction: winner,
      confidence: agreement,
      method: "voting",
      num_contributors: members.length,
      agreement,
      contributions,
      spread: null,
      consensus_reached: agreement >= threshold,
      warnings,
      calculation_method: `Ensemble voting (${problemType})`,
    };
  }

  private combineBestObjective(
    members: EnsembleMember[], problemType: string, threshold: number
  ): EnsemblePredictorOutput {
    const warnings: string[] = [];

    // Filter feasible solutions first
    const feasible = members.filter(m => m.feasible !== false);
    const pool = feasible.length > 0 ? feasible : members;

    if (feasible.length === 0) {
      warnings.push("NO_FEASIBLE: No feasible solutions. Using best infeasible.");
    }

    // Sort by objective (lower is better for minimization)
    const sorted = [...pool].sort((a, b) => (a.objective || Infinity) - (b.objective || Infinity));
    const best = sorted[0];

    const contributions = members.map(m => ({
      algorithm: m.algorithm,
      prediction: m.prediction,
      weight: m.weight || 1,
      influence: m === best ? 1 : 0,
    }));

    const objectives = pool.map(m => m.objective || 0).filter(v => v > 0);
    const objMean = objectives.length > 0 ? objectives.reduce((a, b) => a + b, 0) / objectives.length : 0;
    const objSpread = objectives.length > 1
      ? Math.sqrt(objectives.reduce((sum, v) => sum + Math.pow(v - objMean, 2), 0) / objectives.length)
      : 0;

    return {
      prediction: best.prediction,
      confidence: best.confidence || 0.5,
      method: "best_objective",
      num_contributors: pool.length,
      agreement: pool.length > 0 ? 1 / pool.length : 0,
      contributions,
      spread: objSpread,
      consensus_reached: true,
      warnings,
      calculation_method: `Ensemble best objective (${problemType})`,
    };
  }

  private fallbackResult(
    members: EnsembleMember[], method: string, warnings: string[], threshold: number
  ): EnsemblePredictorOutput {
    return {
      prediction: members[0]?.prediction || 0,
      confidence: members[0]?.confidence || 0,
      method,
      num_contributors: members.length,
      agreement: 0,
      contributions: members.map(m => ({
        algorithm: m.algorithm, prediction: m.prediction,
        weight: m.weight || 1, influence: 0,
      })),
      spread: null,
      consensus_reached: false,
      warnings,
      calculation_method: `Ensemble fallback (${method})`,
    };
  }
}
