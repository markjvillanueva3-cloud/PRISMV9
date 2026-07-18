/**
 * MultiPathReasoningEngine — Tree-of-Thought Reasoning
 *
 * AGENT ROADMAP: U-AGT08 (MS3)
 *
 * Explores multiple reasoning paths in parallel for complex decisions:
 * - Generates multiple hypotheses/approaches
 * - Evaluates each path against constraints
 * - Prunes dead ends early
 * - Ranks paths by confidence, safety, and cost
 * - Returns best path with alternatives noted
 *
 * Based on Tree-of-Thought (ToT) prompting techniques adapted for
 * manufacturing decision-making.
 *
 * @module engines/MultiPathReasoningEngine
 */

import {
  ManufacturingReasoningEngine,
  ManufacturingProblem,
  ManufacturingReasoningChain,
  ManufacturingDomain,
} from "./ManufacturingReasoningEngine.js";

// ============================================================================
// TYPES
// ============================================================================

/** Reasoning path representing one approach */
export interface ReasoningPath {
  id: string;
  name: string;
  description: string;
  approach: string;
  chain: ManufacturingReasoningChain;
  score: PathScore;
  status: "exploring" | "complete" | "pruned" | "failed";
  pruneReason?: string;
  explorationDepth: number;
  childPaths: string[];
  parentPath?: string;
  createdAt: string;
  completedAt?: string;
}

/** Path scoring breakdown */
export interface PathScore {
  overall: number;
  confidence: number;
  safety: number;
  cost: number;
  feasibility: number;
  complexity: number;
  weights: ScoreWeights;
}

/** Configurable score weights */
export interface ScoreWeights {
  confidence: number;
  safety: number;
  cost: number;
  feasibility: number;
  complexity: number;
}

/** Multi-path exploration result */
export interface MultiPathResult {
  problemId: string;
  problem: string;
  goal: string;
  domain: ManufacturingDomain;
  paths: ReasoningPath[];
  bestPath: ReasoningPath;
  alternativePaths: ReasoningPath[];
  prunedPaths: ReasoningPath[];
  explorationStats: ExplorationStats;
  recommendation: Recommendation;
  totalTimeMs: number;
}

/** Exploration statistics */
export interface ExplorationStats {
  totalPathsGenerated: number;
  pathsExplored: number;
  pathsPruned: number;
  pathsCompleted: number;
  maxDepthReached: number;
  averagePathConfidence: number;
  explorationTimeMs: number;
}

/** Final recommendation */
export interface Recommendation {
  primaryApproach: string;
  reasoning: string[];
  alternatives: string[];
  warnings: string[];
  confidence: number;
}

/** Path generation strategy */
export type GenerationStrategy =
  | "breadth_first"      // Explore all paths at each level
  | "best_first"         // Always expand highest scoring path
  | "beam_search"        // Keep top N paths at each level
  | "monte_carlo";       // Random sampling with backpropagation

/** Multi-path problem configuration */
export interface MultiPathProblem extends ManufacturingProblem {
  maxPaths?: number;
  maxDepth?: number;
  beamWidth?: number;
  pruneThreshold?: number;
  explorationStrategy?: GenerationStrategy;
  scoreWeights?: Partial<ScoreWeights>;
  timeoutMs?: number;
  approaches?: string[];
}

/** Approach template for path generation */
export interface ApproachTemplate {
  name: string;
  description: string;
  applicableDomains: ManufacturingDomain[];
  tradeoffs: string;
  typicalConfidence: number;
}

// ============================================================================
// ENGINE
// ============================================================================

export class MultiPathReasoningEngine {
  private reasoningEngine = new ManufacturingReasoningEngine();
  private pathCounter = 0;

  /** Default score weights */
  private readonly DEFAULT_WEIGHTS: ScoreWeights = {
    confidence: 0.3,
    safety: 0.25,
    cost: 0.2,
    feasibility: 0.15,
    complexity: 0.1
  };

  /** Standard approach templates by domain */
  private readonly APPROACH_TEMPLATES: Record<ManufacturingDomain, ApproachTemplate[]> = {
    machining: [
      {
        name: "aggressive",
        description: "Maximum material removal rate with higher risk",
        applicableDomains: ["machining"],
        tradeoffs: "Higher productivity vs. tool life, surface quality",
        typicalConfidence: 0.7
      },
      {
        name: "conservative",
        description: "Reduced parameters for safety and quality",
        applicableDomains: ["machining"],
        tradeoffs: "Lower risk vs. longer cycle time",
        typicalConfidence: 0.9
      },
      {
        name: "balanced",
        description: "Optimized trade-off between speed and quality",
        applicableDomains: ["machining"],
        tradeoffs: "Best overall value",
        typicalConfidence: 0.85
      },
      {
        name: "finish_focused",
        description: "Prioritize surface finish over speed",
        applicableDomains: ["machining"],
        tradeoffs: "Better finish vs. slower cycle",
        typicalConfidence: 0.88
      }
    ],
    tooling: [
      {
        name: "standard_tooling",
        description: "Use commonly available tools",
        applicableDomains: ["tooling"],
        tradeoffs: "Lower cost, easier replacement vs. possibly less optimal",
        typicalConfidence: 0.8
      },
      {
        name: "premium_tooling",
        description: "Use high-performance specialty tools",
        applicableDomains: ["tooling"],
        tradeoffs: "Better performance vs. higher cost",
        typicalConfidence: 0.85
      },
      {
        name: "custom_tooling",
        description: "Design custom tooling solution",
        applicableDomains: ["tooling"],
        tradeoffs: "Optimal fit vs. lead time and cost",
        typicalConfidence: 0.75
      }
    ],
    material: [
      {
        name: "substitute_material",
        description: "Consider alternative materials",
        applicableDomains: ["material"],
        tradeoffs: "Cost or availability vs. exact specs",
        typicalConfidence: 0.7
      },
      {
        name: "specified_material",
        description: "Use exact specified material",
        applicableDomains: ["material"],
        tradeoffs: "Guaranteed compatibility",
        typicalConfidence: 0.95
      }
    ],
    quality: [
      {
        name: "in_process",
        description: "Measure during machining",
        applicableDomains: ["quality"],
        tradeoffs: "Real-time feedback vs. complexity",
        typicalConfidence: 0.85
      },
      {
        name: "post_process",
        description: "Measure after completion",
        applicableDomains: ["quality"],
        tradeoffs: "Simpler vs. delayed feedback",
        typicalConfidence: 0.9
      }
    ],
    safety: [
      {
        name: "maximum_safety",
        description: "Most conservative safety approach",
        applicableDomains: ["safety"],
        tradeoffs: "Highest safety vs. slower production",
        typicalConfidence: 0.95
      }
    ],
    cost: [
      {
        name: "minimize_cost",
        description: "Lowest total cost approach",
        applicableDomains: ["cost"],
        tradeoffs: "Cost savings vs. possible quality/speed compromises",
        typicalConfidence: 0.8
      },
      {
        name: "value_optimized",
        description: "Best value considering all factors",
        applicableDomains: ["cost"],
        tradeoffs: "Balanced optimization",
        typicalConfidence: 0.85
      }
    ],
    scheduling: [
      {
        name: "fastest_delivery",
        description: "Minimize lead time",
        applicableDomains: ["scheduling"],
        tradeoffs: "Speed vs. cost",
        typicalConfidence: 0.8
      },
      {
        name: "load_balanced",
        description: "Balance workload across resources",
        applicableDomains: ["scheduling"],
        tradeoffs: "Efficiency vs. possibly longer lead time",
        typicalConfidence: 0.85
      }
    ],
    maintenance: [
      {
        name: "preventive",
        description: "Scheduled maintenance approach",
        applicableDomains: ["maintenance"],
        tradeoffs: "Predictable vs. potentially unnecessary",
        typicalConfidence: 0.85
      },
      {
        name: "predictive",
        description: "Condition-based maintenance",
        applicableDomains: ["maintenance"],
        tradeoffs: "Optimal timing vs. requires monitoring",
        typicalConfidence: 0.8
      }
    ]
  };

  /**
   * Explore multiple reasoning paths for a problem
   */
  async explorePaths(problem: MultiPathProblem): Promise<MultiPathResult> {
    const startTime = Date.now();
    const problemId = `mp_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

    const config = {
      maxPaths: problem.maxPaths || 5,
      maxDepth: problem.maxDepth || 3,
      beamWidth: problem.beamWidth || 3,
      pruneThreshold: problem.pruneThreshold || 0.3,
      strategy: problem.explorationStrategy || "beam_search",
      weights: { ...this.DEFAULT_WEIGHTS, ...problem.scoreWeights },
      timeoutMs: problem.timeoutMs || 30000
    };

    const paths: ReasoningPath[] = [];
    const approaches = problem.approaches || this.generateApproaches(problem.domain);

    // Generate initial paths
    for (const approach of approaches.slice(0, config.maxPaths)) {
      const path = await this.createPath(problem, approach, config.weights);
      paths.push(path);
    }

    // Explore and prune paths
    const explored = await this.exploreAndPrune(paths, problem, config);

    // Find best path
    const completedPaths = explored.filter(p => p.status === "complete");
    const prunedPaths = explored.filter(p => p.status === "pruned");

    completedPaths.sort((a, b) => b.score.overall - a.score.overall);

    const bestPath = completedPaths[0] || paths[0];
    const alternativePaths = completedPaths.slice(1, 3);

    const totalTimeMs = Date.now() - startTime;

    // Calculate stats
    const stats: ExplorationStats = {
      totalPathsGenerated: paths.length,
      pathsExplored: explored.filter(p => p.explorationDepth > 0).length,
      pathsPruned: prunedPaths.length,
      pathsCompleted: completedPaths.length,
      maxDepthReached: Math.max(...explored.map(p => p.explorationDepth)),
      averagePathConfidence: this.calculateAverageConfidence(completedPaths),
      explorationTimeMs: totalTimeMs
    };

    // Build recommendation
    const recommendation = this.buildRecommendation(bestPath, alternativePaths, prunedPaths);

    return {
      problemId,
      problem: problem.problem,
      goal: problem.goal,
      domain: problem.domain,
      paths: explored,
      bestPath,
      alternativePaths,
      prunedPaths,
      explorationStats: stats,
      recommendation,
      totalTimeMs
    };
  }

  /**
   * Generate approach names for a domain
   */
  private generateApproaches(domain: ManufacturingDomain): string[] {
    const templates = this.APPROACH_TEMPLATES[domain] || [];
    return templates.map(t => t.name);
  }

  /**
   * Create a reasoning path for an approach
   */
  private async createPath(
    problem: MultiPathProblem,
    approach: string,
    weights: ScoreWeights
  ): Promise<ReasoningPath> {
    const pathId = `path_${++this.pathCounter}_${approach}`;
    const template = this.findTemplate(problem.domain, approach);

    // Build approach-specific problem
    const approachProblem: ManufacturingProblem = {
      ...problem,
      problem: `${problem.problem} (${template?.description || approach} approach)`,
      known_facts: [
        ...(problem.known_facts || []),
        `Approach: ${approach}`
      ]
    };

    // Run reasoning
    const chain = await this.reasoningEngine.reason(approachProblem);

    // Score the path
    const score = this.scorePath(chain, template, weights);

    return {
      id: pathId,
      name: approach,
      description: template?.description || `${approach} approach`,
      approach,
      chain,
      score,
      status: "complete",
      explorationDepth: 1,
      childPaths: [],
      createdAt: new Date().toISOString(),
      completedAt: new Date().toISOString()
    };
  }

  /**
   * Find approach template
   */
  private findTemplate(domain: ManufacturingDomain, approach: string): ApproachTemplate | undefined {
    const templates = this.APPROACH_TEMPLATES[domain] || [];
    return templates.find(t => t.name === approach);
  }

  /**
   * Score a reasoning path
   */
  private scorePath(
    chain: ManufacturingReasoningChain,
    template: ApproachTemplate | undefined,
    weights: ScoreWeights
  ): PathScore {
    // Confidence from chain
    const confidence = chain.current_confidence;

    // Safety score: penalize unmitigated critical issues
    const criticalSafety = chain.safety_checks.filter(
      s => s.severity === "critical" && !s.mitigation
    ).length;
    const safety = Math.max(0, 1 - criticalSafety * 0.2);

    // Cost score: inverse of estimated cost (normalized)
    const totalCost = chain.cost_implications.reduce((sum, c) => sum + c.estimated_cost, 0);
    const cost = totalCost > 0 ? Math.max(0, 1 - totalCost / 100) : 0.8;

    // Feasibility: based on physics validations
    const physicsFailures = chain.physics_validations.filter(p => !p.passes).length;
    const feasibility = Math.max(0, 1 - physicsFailures * 0.3);

    // Complexity: inverse of step count (simpler is better)
    const complexity = Math.max(0.3, 1 - chain.steps.length / 30);

    // Overall weighted score
    const overall =
      confidence * weights.confidence +
      safety * weights.safety +
      cost * weights.cost +
      feasibility * weights.feasibility +
      complexity * weights.complexity;

    return {
      overall,
      confidence,
      safety,
      cost,
      feasibility,
      complexity,
      weights
    };
  }

  /**
   * Explore and prune paths
   */
  private async exploreAndPrune(
    paths: ReasoningPath[],
    problem: MultiPathProblem,
    config: {
      maxDepth: number;
      beamWidth: number;
      pruneThreshold: number;
      strategy: GenerationStrategy;
      weights: ScoreWeights;
    }
  ): Promise<ReasoningPath[]> {
    // Prune low-scoring paths
    for (const path of paths) {
      if (path.score.overall < config.pruneThreshold) {
        path.status = "pruned";
        path.pruneReason = `Score ${path.score.overall.toFixed(2)} below threshold ${config.pruneThreshold}`;
      }

      // Also prune if physics failed
      if (path.score.feasibility < 0.5) {
        path.status = "pruned";
        path.pruneReason = "Physics constraints not satisfied";
      }

      // Prune if critical safety issues
      if (path.score.safety < 0.5) {
        path.status = "pruned";
        path.pruneReason = "Critical safety concerns unaddressed";
      }
    }

    // For beam search, keep only top N
    if (config.strategy === "beam_search") {
      const sorted = [...paths].sort((a, b) => b.score.overall - a.score.overall);
      const kept = sorted.slice(0, config.beamWidth);
      const pruned = sorted.slice(config.beamWidth);

      for (const path of pruned) {
        if (path.status !== "pruned") {
          path.status = "pruned";
          path.pruneReason = `Outside beam width (rank > ${config.beamWidth})`;
        }
      }
    }

    return paths;
  }

  /**
   * Calculate average confidence across paths
   */
  private calculateAverageConfidence(paths: ReasoningPath[]): number {
    if (paths.length === 0) return 0;
    const sum = paths.reduce((s, p) => s + p.score.confidence, 0);
    return sum / paths.length;
  }

  /**
   * Build final recommendation
   */
  private buildRecommendation(
    bestPath: ReasoningPath,
    alternatives: ReasoningPath[],
    pruned: ReasoningPath[]
  ): Recommendation {
    const reasoning: string[] = [];
    const warnings: string[] = [];

    // Primary reasoning
    reasoning.push(`Selected approach: ${bestPath.description}`);
    reasoning.push(`Overall score: ${(bestPath.score.overall * 100).toFixed(1)}%`);
    reasoning.push(`Confidence: ${(bestPath.score.confidence * 100).toFixed(1)}%`);

    if (bestPath.score.safety < 1.0) {
      reasoning.push(`Safety considerations require attention (${(bestPath.score.safety * 100).toFixed(1)}%)`);
    }

    // Warnings from chain
    const chainWarnings = bestPath.chain.steps
      .filter(s => s.warnings && s.warnings.length > 0)
      .flatMap(s => s.warnings || []);
    warnings.push(...chainWarnings.slice(0, 3));

    // Warnings about pruned paths
    if (pruned.length > 0) {
      warnings.push(`${pruned.length} approach(es) ruled out due to constraints`);
    }

    return {
      primaryApproach: bestPath.approach,
      reasoning,
      alternatives: alternatives.map(a => `${a.approach}: ${(a.score.overall * 100).toFixed(1)}%`),
      warnings,
      confidence: bestPath.score.overall
    };
  }

  /**
   * Compare two approaches directly
   */
  async compareApproaches(
    problem: ManufacturingProblem,
    approach1: string,
    approach2: string
  ): Promise<{
    winner: string;
    comparison: Record<string, { a1: number; a2: number; winner: string }>;
    summary: string;
  }> {
    const mp: MultiPathProblem = {
      ...problem,
      approaches: [approach1, approach2],
      maxPaths: 2
    };

    const result = await this.explorePaths(mp);
    const path1 = result.paths.find(p => p.approach === approach1);
    const path2 = result.paths.find(p => p.approach === approach2);

    if (!path1 || !path2) {
      throw new Error("Failed to generate both paths");
    }

    const comparison: Record<string, { a1: number; a2: number; winner: string }> = {
      confidence: {
        a1: path1.score.confidence,
        a2: path2.score.confidence,
        winner: path1.score.confidence > path2.score.confidence ? approach1 : approach2
      },
      safety: {
        a1: path1.score.safety,
        a2: path2.score.safety,
        winner: path1.score.safety > path2.score.safety ? approach1 : approach2
      },
      cost: {
        a1: path1.score.cost,
        a2: path2.score.cost,
        winner: path1.score.cost > path2.score.cost ? approach1 : approach2
      },
      feasibility: {
        a1: path1.score.feasibility,
        a2: path2.score.feasibility,
        winner: path1.score.feasibility > path2.score.feasibility ? approach1 : approach2
      },
      overall: {
        a1: path1.score.overall,
        a2: path2.score.overall,
        winner: path1.score.overall > path2.score.overall ? approach1 : approach2
      }
    };

    const winner = path1.score.overall > path2.score.overall ? approach1 : approach2;
    const margin = Math.abs(path1.score.overall - path2.score.overall);

    const summary = margin < 0.05
      ? `${approach1} and ${approach2} are closely matched (difference: ${(margin * 100).toFixed(1)}%)`
      : `${winner} is preferred (${(margin * 100).toFixed(1)}% better overall)`;

    return { winner, comparison, summary };
  }

  /**
   * Get available approaches for a domain
   */
  getAvailableApproaches(domain: ManufacturingDomain): ApproachTemplate[] {
    return this.APPROACH_TEMPLATES[domain] || [];
  }

  /**
   * Score sensitivity analysis
   */
  async sensitivityAnalysis(
    problem: MultiPathProblem,
    dimension: keyof ScoreWeights
  ): Promise<{
    dimension: string;
    variations: { weight: number; bestApproach: string; score: number }[];
    stableRange: { min: number; max: number };
    recommendation: string;
  }> {
    const variations: { weight: number; bestApproach: string; score: number }[] = [];
    let lastBest = "";
    let stableMin = 0;
    let stableMax = 1;

    for (let w = 0.1; w <= 0.9; w += 0.2) {
      const weights: Partial<ScoreWeights> = { [dimension]: w };
      const result = await this.explorePaths({
        ...problem,
        scoreWeights: weights
      });

      variations.push({
        weight: w,
        bestApproach: result.bestPath.approach,
        score: result.bestPath.score.overall
      });

      if (lastBest && result.bestPath.approach !== lastBest) {
        stableMax = Math.min(stableMax, w);
      } else if (!lastBest || result.bestPath.approach === lastBest) {
        stableMin = w;
      }
      lastBest = result.bestPath.approach;
    }

    const recommendation = stableMax - stableMin > 0.4
      ? `Recommendation is robust to ${dimension} weight changes`
      : `Recommendation is sensitive to ${dimension} weight — consider carefully`;

    return {
      dimension,
      variations,
      stableRange: { min: stableMin, max: stableMax },
      recommendation
    };
  }

  /**
   * Get exploration summary for logging
   */
  getExplorationSummary(result: MultiPathResult): string {
    const lines: string[] = [
      `Multi-Path Exploration: ${result.problem}`,
      `Domain: ${result.domain}`,
      `Paths explored: ${result.explorationStats.pathsExplored}`,
      `Paths pruned: ${result.explorationStats.pathsPruned}`,
      `Best approach: ${result.bestPath.approach} (${(result.bestPath.score.overall * 100).toFixed(1)}%)`,
      "",
      "Recommendation:",
      ...result.recommendation.reasoning.map(r => `  - ${r}`),
    ];

    if (result.recommendation.warnings.length > 0) {
      lines.push("", "Warnings:");
      lines.push(...result.recommendation.warnings.map(w => `  ! ${w}`));
    }

    if (result.alternativePaths.length > 0) {
      lines.push("", "Alternatives:");
      lines.push(...result.recommendation.alternatives.map(a => `  - ${a}`));
    }

    lines.push("", `Exploration time: ${result.totalTimeMs}ms`);

    return lines.join("\n");
  }
}

// Export singleton
export const multiPathReasoningEngine = new MultiPathReasoningEngine();
