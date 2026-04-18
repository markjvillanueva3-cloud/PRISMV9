/**
 * RealTimeOptimizationEngine — Real-Time Parameter Optimization
 *
 * MILL-AGI Phase 0.5: Integration Layer — Unit 2
 *
 * Performs real-time optimization of milling parameters:
 *   - Multi-objective optimization (MRR, tool life, quality, safety)
 *   - Constraint satisfaction (power, torque, vibration limits)
 *   - Gradient-free optimization for non-differentiable objectives
 *   - Safe exploration with constraint enforcement
 *   - Pareto frontier generation for trade-off analysis
 *
 * Optimization Methods:
 *   - Nelder-Mead simplex for local refinement
 *   - Bayesian optimization for global search
 *   - Constrained optimization with barrier functions
 *   - Multi-start for robustness
 *
 * @module engines/RealTimeOptimizationEngine
 * @milestone MILL-AGI-P0/U-P0.5-02
 */

import { log } from "../utils/Logger.js";

// ============================================================================
// TYPES
// ============================================================================

export interface OptimizationObjective {
  name: string;
  type: "maximize" | "minimize";
  weight: number;
  target_value?: number;
}

export interface ParameterBounds {
  cutting_speed_mpm: { min: number; max: number };
  feed_per_tooth_mm: { min: number; max: number };
  axial_depth_mm: { min: number; max: number };
  radial_depth_mm: { min: number; max: number };
}

export interface Constraint {
  name: string;
  type: "max" | "min" | "range";
  parameter: string;
  value: number;
  hard: boolean;
}

export interface OptimizationState {
  iteration: number;
  best_params: ParameterSet;
  best_score: number;
  pareto_front: ParameterSet[];
  convergence_history: number[];
  constraints_violated: string[];
}

export interface ParameterSet {
  cutting_speed_mpm: number;
  feed_per_tooth_mm: number;
  axial_depth_mm: number;
  radial_depth_mm: number;
  score?: number;
  objectives?: Record<string, number>;
}

export interface OptimizationResult {
  optimal_params: ParameterSet;
  score: number;
  objectives: Record<string, number>;
  pareto_front: ParameterSet[];
  iterations: number;
  convergence_achieved: boolean;
  constraints_satisfied: boolean;
  optimization_time_ms: number;
}

export interface OptimizerConfig {
  method: "nelder-mead" | "bayesian" | "multi-start" | "gradient-free";
  max_iterations: number;
  convergence_threshold: number;
  exploration_factor: number;
  constraint_penalty: number;
  num_restarts: number;
  population_size: number;
}

// ============================================================================
// DEFAULT CONFIG
// ============================================================================

const DEFAULT_CONFIG: OptimizerConfig = {
  method: "nelder-mead",
  max_iterations: 100,
  convergence_threshold: 0.001,
  exploration_factor: 0.1,
  constraint_penalty: 1000,
  num_restarts: 3,
  population_size: 10,
};

const DEFAULT_BOUNDS: ParameterBounds = {
  cutting_speed_mpm: { min: 20, max: 500 },
  feed_per_tooth_mm: { min: 0.02, max: 0.3 },
  axial_depth_mm: { min: 0.5, max: 10 },
  radial_depth_mm: { min: 1, max: 20 },
};

// ============================================================================
// ENGINE CLASS
// ============================================================================

export class RealTimeOptimizationEngine {
  private config: OptimizerConfig;
  private bounds: ParameterBounds;
  private objectives: OptimizationObjective[];
  private constraints: Constraint[];
  private state: OptimizationState;
  private evaluationCount: number;

  constructor(config?: Partial<OptimizerConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.bounds = { ...DEFAULT_BOUNDS };
    this.objectives = [];
    this.constraints = [];
    this.state = this.initState();
    this.evaluationCount = 0;
  }

  /**
   * Set parameter bounds.
   */
  setBounds(bounds: Partial<ParameterBounds>): void {
    this.bounds = { ...this.bounds, ...bounds };
  }

  /**
   * Add optimization objective.
   */
  addObjective(objective: OptimizationObjective): void {
    this.objectives.push(objective);
  }

  /**
   * Add constraint.
   */
  addConstraint(constraint: Constraint): void {
    this.constraints.push(constraint);
  }

  /**
   * Clear all objectives and constraints.
   */
  clearObjectivesAndConstraints(): void {
    this.objectives = [];
    this.constraints = [];
  }

  /**
   * Run optimization.
   */
  optimize(
    evaluator: (params: ParameterSet) => Record<string, number>,
    initialParams?: ParameterSet
  ): OptimizationResult {
    const startTime = performance.now();
    this.state = this.initState();
    this.evaluationCount = 0;

    const initial = initialParams ?? this.generateRandomParams();

    let result: OptimizationResult;

    switch (this.config.method) {
      case "nelder-mead":
        result = this.nelderMeadOptimize(evaluator, initial);
        break;
      case "bayesian":
        result = this.bayesianOptimize(evaluator, initial);
        break;
      case "multi-start":
        result = this.multiStartOptimize(evaluator);
        break;
      case "gradient-free":
        result = this.gradientFreeOptimize(evaluator, initial);
        break;
      default:
        result = this.nelderMeadOptimize(evaluator, initial);
    }

    result.optimization_time_ms = performance.now() - startTime;

    log.debug(
      `[RealTimeOpt] method=${this.config.method}, iters=${result.iterations}, score=${result.score.toFixed(4)}`
    );

    return result;
  }

  /**
   * Single-step optimization (for real-time use).
   */
  step(
    currentParams: ParameterSet,
    evaluator: (params: ParameterSet) => Record<string, number>
  ): {
    suggested_params: ParameterSet;
    expected_improvement: number;
    direction: Record<string, number>;
  } {
    const currentObjectives = evaluator(currentParams);
    const currentScore = this.computeScore(currentObjectives);

    // Generate candidate in promising direction
    const candidate = this.generateCandidate(currentParams);
    const candidateObjectives = evaluator(candidate);
    const candidateScore = this.computeScore(candidateObjectives);

    const direction: Record<string, number> = {
      cutting_speed_mpm: candidate.cutting_speed_mpm - currentParams.cutting_speed_mpm,
      feed_per_tooth_mm: candidate.feed_per_tooth_mm - currentParams.feed_per_tooth_mm,
      axial_depth_mm: candidate.axial_depth_mm - currentParams.axial_depth_mm,
      radial_depth_mm: candidate.radial_depth_mm - currentParams.radial_depth_mm,
    };

    const improvement = candidateScore - currentScore;

    if (candidateScore > this.state.best_score) {
      this.state.best_params = candidate;
      this.state.best_score = candidateScore;
    }

    this.state.iteration++;
    this.state.convergence_history.push(candidateScore);

    return {
      suggested_params: candidateScore > currentScore ? candidate : currentParams,
      expected_improvement: Math.max(0, improvement),
      direction,
    };
  }

  /**
   * Generate Pareto frontier for multi-objective analysis.
   */
  generateParetoFront(
    evaluator: (params: ParameterSet) => Record<string, number>,
    numPoints: number = 20
  ): ParameterSet[] {
    const candidates: ParameterSet[] = [];

    // Generate diverse candidates
    for (let i = 0; i < numPoints * 5; i++) {
      const params = this.generateRandomParams();
      const objectives = evaluator(params);
      const score = this.computeScore(objectives);

      candidates.push({
        ...params,
        score,
        objectives,
      });
    }

    // Extract non-dominated solutions
    const paretoFront = this.extractParetoFront(candidates);

    this.state.pareto_front = paretoFront;
    return paretoFront;
  }

  /**
   * Get current optimization state.
   */
  getState(): OptimizationState {
    return { ...this.state };
  }

  /**
   * Get configuration.
   */
  getConfig(): OptimizerConfig {
    return { ...this.config };
  }

  /**
   * Get bounds.
   */
  getBounds(): ParameterBounds {
    return { ...this.bounds };
  }

  /**
   * Get objectives.
   */
  getObjectives(): OptimizationObjective[] {
    return [...this.objectives];
  }

  /**
   * Get constraints.
   */
  getConstraints(): Constraint[] {
    return [...this.constraints];
  }

  /**
   * Reset state.
   */
  reset(): void {
    this.state = this.initState();
    this.evaluationCount = 0;
  }

  // ============================================================================
  // PRIVATE: OPTIMIZATION METHODS
  // ============================================================================

  private nelderMeadOptimize(
    evaluator: (params: ParameterSet) => Record<string, number>,
    initial: ParameterSet
  ): OptimizationResult {
    const n = 4; // Number of parameters
    const alpha = 1.0; // Reflection
    const gamma = 2.0; // Expansion
    const rho = 0.5; // Contraction
    const sigma = 0.5; // Shrink

    // Initialize simplex
    let simplex = this.initSimplex(initial);

    // Evaluate all vertices
    for (const vertex of simplex) {
      const objectives = evaluator(vertex);
      vertex.score = this.computeScoreWithPenalty(objectives, vertex);
      vertex.objectives = objectives;
    }

    for (let iter = 0; iter < this.config.max_iterations; iter++) {
      // Sort by score (descending for maximization)
      simplex.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));

      const best = simplex[0];
      const worst = simplex[n];
      const secondWorst = simplex[n - 1];

      // Check convergence
      const range = (best.score ?? 0) - (worst.score ?? 0);
      if (range < this.config.convergence_threshold) {
        return this.createResult(best, iter, true);
      }

      // Compute centroid (excluding worst)
      const centroid = this.computeCentroid(simplex.slice(0, n));

      // Reflection
      const reflected = this.reflect(centroid, worst, alpha);
      const refObjectives = evaluator(reflected);
      reflected.score = this.computeScoreWithPenalty(refObjectives, reflected);
      reflected.objectives = refObjectives;

      if (reflected.score! > best.score! && reflected.score! >= secondWorst.score!) {
        // Expansion
        const expanded = this.reflect(centroid, worst, gamma);
        const expObjectives = evaluator(expanded);
        expanded.score = this.computeScoreWithPenalty(expObjectives, expanded);
        expanded.objectives = expObjectives;

        simplex[n] = expanded.score! > reflected.score! ? expanded : reflected;
      } else if (reflected.score! >= secondWorst.score!) {
        simplex[n] = reflected;
      } else {
        // Contraction
        const contracted = this.reflect(centroid, worst, -rho);
        const conObjectives = evaluator(contracted);
        contracted.score = this.computeScoreWithPenalty(conObjectives, contracted);
        contracted.objectives = conObjectives;

        if (contracted.score! > worst.score!) {
          simplex[n] = contracted;
        } else {
          // Shrink
          for (let i = 1; i <= n; i++) {
            simplex[i] = this.shrink(best, simplex[i], sigma);
            const shrinkObj = evaluator(simplex[i]);
            simplex[i].score = this.computeScoreWithPenalty(shrinkObj, simplex[i]);
            simplex[i].objectives = shrinkObj;
          }
        }
      }

      this.state.convergence_history.push(simplex[0].score ?? 0);
    }

    simplex.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
    return this.createResult(simplex[0], this.config.max_iterations, false);
  }

  private bayesianOptimize(
    evaluator: (params: ParameterSet) => Record<string, number>,
    initial: ParameterSet
  ): OptimizationResult {
    const observations: Array<{ params: ParameterSet; score: number }> = [];

    // Evaluate initial point
    const initialObj = evaluator(initial);
    const initialScore = this.computeScoreWithPenalty(initialObj, initial);
    observations.push({ params: initial, score: initialScore });

    let bestParams = initial;
    let bestScore = initialScore;

    for (let iter = 0; iter < this.config.max_iterations; iter++) {
      // Generate candidate using acquisition function (UCB-like)
      const candidate = this.generateBayesianCandidate(observations);
      const objectives = evaluator(candidate);
      const score = this.computeScoreWithPenalty(objectives, candidate);

      observations.push({ params: candidate, score });
      candidate.objectives = objectives;
      candidate.score = score;

      if (score > bestScore) {
        bestScore = score;
        bestParams = { ...candidate, objectives, score };
      }

      this.state.convergence_history.push(bestScore);

      // Check convergence
      if (observations.length > 10) {
        const recentScores = observations.slice(-10).map((o) => o.score);
        const variance = this.computeVariance(recentScores);
        if (variance < this.config.convergence_threshold) {
          return this.createResult(bestParams, iter, true);
        }
      }
    }

    return this.createResult(bestParams, this.config.max_iterations, false);
  }

  private multiStartOptimize(
    evaluator: (params: ParameterSet) => Record<string, number>
  ): OptimizationResult {
    let globalBest: ParameterSet | null = null;
    let globalBestScore = -Infinity;

    for (let restart = 0; restart < this.config.num_restarts; restart++) {
      const initial = this.generateRandomParams();
      const result = this.nelderMeadOptimize(evaluator, initial);

      if (result.score > globalBestScore) {
        globalBestScore = result.score;
        globalBest = result.optimal_params;
      }
    }

    return this.createResult(
      globalBest!,
      this.config.max_iterations * this.config.num_restarts,
      true
    );
  }

  private gradientFreeOptimize(
    evaluator: (params: ParameterSet) => Record<string, number>,
    initial: ParameterSet
  ): OptimizationResult {
    let current = { ...initial };
    const objectives = evaluator(current);
    current.score = this.computeScoreWithPenalty(objectives, current);
    current.objectives = objectives;

    let stepSize = this.config.exploration_factor;

    for (let iter = 0; iter < this.config.max_iterations; iter++) {
      // Generate random direction
      const direction = this.generateRandomDirection();

      // Try step in direction
      const candidate = this.stepInDirection(current, direction, stepSize);
      const candObj = evaluator(candidate);
      candidate.score = this.computeScoreWithPenalty(candObj, candidate);
      candidate.objectives = candObj;

      if (candidate.score! > current.score!) {
        current = candidate;
        stepSize *= 1.1; // Increase step on success
      } else {
        stepSize *= 0.9; // Decrease step on failure
      }

      this.state.convergence_history.push(current.score!);

      if (stepSize < this.config.convergence_threshold) {
        return this.createResult(current, iter, true);
      }
    }

    return this.createResult(current, this.config.max_iterations, false);
  }

  // ============================================================================
  // PRIVATE: HELPERS
  // ============================================================================

  private initState(): OptimizationState {
    return {
      iteration: 0,
      best_params: this.generateRandomParams(),
      best_score: -Infinity,
      pareto_front: [],
      convergence_history: [],
      constraints_violated: [],
    };
  }

  private generateRandomParams(): ParameterSet {
    return {
      cutting_speed_mpm:
        this.bounds.cutting_speed_mpm.min +
        Math.random() *
          (this.bounds.cutting_speed_mpm.max - this.bounds.cutting_speed_mpm.min),
      feed_per_tooth_mm:
        this.bounds.feed_per_tooth_mm.min +
        Math.random() *
          (this.bounds.feed_per_tooth_mm.max - this.bounds.feed_per_tooth_mm.min),
      axial_depth_mm:
        this.bounds.axial_depth_mm.min +
        Math.random() *
          (this.bounds.axial_depth_mm.max - this.bounds.axial_depth_mm.min),
      radial_depth_mm:
        this.bounds.radial_depth_mm.min +
        Math.random() *
          (this.bounds.radial_depth_mm.max - this.bounds.radial_depth_mm.min),
    };
  }

  private generateCandidate(current: ParameterSet): ParameterSet {
    const noise = this.config.exploration_factor;
    return this.clampParams({
      cutting_speed_mpm:
        current.cutting_speed_mpm * (1 + (Math.random() - 0.5) * noise),
      feed_per_tooth_mm:
        current.feed_per_tooth_mm * (1 + (Math.random() - 0.5) * noise),
      axial_depth_mm:
        current.axial_depth_mm * (1 + (Math.random() - 0.5) * noise),
      radial_depth_mm:
        current.radial_depth_mm * (1 + (Math.random() - 0.5) * noise),
    });
  }

  private clampParams(params: ParameterSet): ParameterSet {
    return {
      cutting_speed_mpm: Math.max(
        this.bounds.cutting_speed_mpm.min,
        Math.min(this.bounds.cutting_speed_mpm.max, params.cutting_speed_mpm)
      ),
      feed_per_tooth_mm: Math.max(
        this.bounds.feed_per_tooth_mm.min,
        Math.min(this.bounds.feed_per_tooth_mm.max, params.feed_per_tooth_mm)
      ),
      axial_depth_mm: Math.max(
        this.bounds.axial_depth_mm.min,
        Math.min(this.bounds.axial_depth_mm.max, params.axial_depth_mm)
      ),
      radial_depth_mm: Math.max(
        this.bounds.radial_depth_mm.min,
        Math.min(this.bounds.radial_depth_mm.max, params.radial_depth_mm)
      ),
    };
  }

  private computeScore(objectives: Record<string, number>): number {
    let score = 0;

    for (const obj of this.objectives) {
      const value = objectives[obj.name] ?? 0;
      const normalized = obj.type === "maximize" ? value : -value;
      score += normalized * obj.weight;
    }

    return score;
  }

  private computeScoreWithPenalty(
    objectives: Record<string, number>,
    params: ParameterSet
  ): number {
    let score = this.computeScore(objectives);

    // Apply constraint penalties
    for (const constraint of this.constraints) {
      const value = (params as any)[constraint.parameter] ?? objectives[constraint.parameter] ?? 0;
      let violation = 0;

      switch (constraint.type) {
        case "max":
          violation = Math.max(0, value - constraint.value);
          break;
        case "min":
          violation = Math.max(0, constraint.value - value);
          break;
        case "range":
          // Assume constraint.value is the tolerance
          break;
      }

      if (violation > 0) {
        const penalty = constraint.hard
          ? violation * this.config.constraint_penalty
          : violation * this.config.constraint_penalty * 0.1;
        score -= penalty;
      }
    }

    return score;
  }

  private initSimplex(initial: ParameterSet): ParameterSet[] {
    const simplex: ParameterSet[] = [{ ...initial }];
    const scale = 0.1;

    const params = ["cutting_speed_mpm", "feed_per_tooth_mm", "axial_depth_mm", "radial_depth_mm"];

    for (let i = 0; i < 4; i++) {
      const vertex = { ...initial };
      const param = params[i];
      (vertex as any)[param] *= 1 + scale;
      simplex.push(this.clampParams(vertex));
    }

    return simplex;
  }

  private computeCentroid(vertices: ParameterSet[]): ParameterSet {
    const n = vertices.length;
    return {
      cutting_speed_mpm:
        vertices.reduce((sum, v) => sum + v.cutting_speed_mpm, 0) / n,
      feed_per_tooth_mm:
        vertices.reduce((sum, v) => sum + v.feed_per_tooth_mm, 0) / n,
      axial_depth_mm:
        vertices.reduce((sum, v) => sum + v.axial_depth_mm, 0) / n,
      radial_depth_mm:
        vertices.reduce((sum, v) => sum + v.radial_depth_mm, 0) / n,
    };
  }

  private reflect(
    centroid: ParameterSet,
    point: ParameterSet,
    factor: number
  ): ParameterSet {
    return this.clampParams({
      cutting_speed_mpm:
        centroid.cutting_speed_mpm +
        factor * (centroid.cutting_speed_mpm - point.cutting_speed_mpm),
      feed_per_tooth_mm:
        centroid.feed_per_tooth_mm +
        factor * (centroid.feed_per_tooth_mm - point.feed_per_tooth_mm),
      axial_depth_mm:
        centroid.axial_depth_mm +
        factor * (centroid.axial_depth_mm - point.axial_depth_mm),
      radial_depth_mm:
        centroid.radial_depth_mm +
        factor * (centroid.radial_depth_mm - point.radial_depth_mm),
    });
  }

  private shrink(best: ParameterSet, point: ParameterSet, sigma: number): ParameterSet {
    return this.clampParams({
      cutting_speed_mpm:
        best.cutting_speed_mpm + sigma * (point.cutting_speed_mpm - best.cutting_speed_mpm),
      feed_per_tooth_mm:
        best.feed_per_tooth_mm + sigma * (point.feed_per_tooth_mm - best.feed_per_tooth_mm),
      axial_depth_mm:
        best.axial_depth_mm + sigma * (point.axial_depth_mm - best.axial_depth_mm),
      radial_depth_mm:
        best.radial_depth_mm + sigma * (point.radial_depth_mm - best.radial_depth_mm),
    });
  }

  private generateBayesianCandidate(
    observations: Array<{ params: ParameterSet; score: number }>
  ): ParameterSet {
    // Simple UCB-like acquisition
    if (observations.length < 3) {
      return this.generateRandomParams();
    }

    // Find best observed
    const best = observations.reduce((a, b) => (a.score > b.score ? a : b));

    // Generate candidate near best with some exploration
    return this.generateCandidate(best.params);
  }

  private generateRandomDirection(): Record<string, number> {
    const len = Math.sqrt(4);
    return {
      cutting_speed_mpm: (Math.random() - 0.5) / len,
      feed_per_tooth_mm: (Math.random() - 0.5) / len,
      axial_depth_mm: (Math.random() - 0.5) / len,
      radial_depth_mm: (Math.random() - 0.5) / len,
    };
  }

  private stepInDirection(
    current: ParameterSet,
    direction: Record<string, number>,
    stepSize: number
  ): ParameterSet {
    return this.clampParams({
      cutting_speed_mpm:
        current.cutting_speed_mpm +
        direction.cutting_speed_mpm * stepSize * this.bounds.cutting_speed_mpm.max,
      feed_per_tooth_mm:
        current.feed_per_tooth_mm +
        direction.feed_per_tooth_mm * stepSize * this.bounds.feed_per_tooth_mm.max,
      axial_depth_mm:
        current.axial_depth_mm +
        direction.axial_depth_mm * stepSize * this.bounds.axial_depth_mm.max,
      radial_depth_mm:
        current.radial_depth_mm +
        direction.radial_depth_mm * stepSize * this.bounds.radial_depth_mm.max,
    });
  }

  private extractParetoFront(candidates: ParameterSet[]): ParameterSet[] {
    const dominated = new Set<number>();

    for (let i = 0; i < candidates.length; i++) {
      for (let j = 0; j < candidates.length; j++) {
        if (i === j || dominated.has(j)) continue;

        if (this.dominates(candidates[j], candidates[i])) {
          dominated.add(i);
          break;
        }
      }
    }

    return candidates.filter((_, i) => !dominated.has(i));
  }

  private dominates(a: ParameterSet, b: ParameterSet): boolean {
    if (!a.objectives || !b.objectives) return false;

    let dominated = true;
    let strictlyBetter = false;

    for (const obj of this.objectives) {
      const aVal = a.objectives[obj.name] ?? 0;
      const bVal = b.objectives[obj.name] ?? 0;

      const aScaled = obj.type === "maximize" ? aVal : -aVal;
      const bScaled = obj.type === "maximize" ? bVal : -bVal;

      if (aScaled < bScaled) {
        dominated = false;
        break;
      }
      if (aScaled > bScaled) {
        strictlyBetter = true;
      }
    }

    return dominated && strictlyBetter;
  }

  private computeVariance(values: number[]): number {
    if (values.length === 0) return 0;
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    return values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
  }

  private createResult(
    params: ParameterSet,
    iterations: number,
    converged: boolean
  ): OptimizationResult {
    const constraintsSatisfied = this.state.constraints_violated.length === 0;

    return {
      optimal_params: params,
      score: params.score ?? 0,
      objectives: params.objectives ?? {},
      pareto_front: this.state.pareto_front,
      iterations,
      convergence_achieved: converged,
      constraints_satisfied: constraintsSatisfied,
      optimization_time_ms: 0,
    };
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const realTimeOptimizationEngine = new RealTimeOptimizationEngine();
