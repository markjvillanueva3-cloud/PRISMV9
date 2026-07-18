/**
 * LatheGeneticAlgorithmEngine - Evolutionary Optimization for Lathe Machining Parameters
 * ======================================================================================
 *
 * Advanced genetic algorithm implementation specialized for CNC lathe parameter optimization.
 * Implements state-of-the-art evolutionary computing techniques:
 *
 *   1. Population Initialization
 *      - Random parameter generation within bounds
 *      - Latin Hypercube Sampling (LHS) for uniform coverage
 *      - Heuristic seeding from known good programs
 *      - Population diversity metrics (Shannon entropy, genotypic variance)
 *
 *   2. Selection Operators
 *      - Tournament selection (configurable size)
 *      - Roulette wheel (fitness proportionate)
 *      - Rank-based selection (linear/exponential ranking)
 *      - Elitism preservation with adaptive rate
 *
 *   3. Crossover Operators
 *      - Single-point crossover
 *      - Two-point crossover
 *      - Uniform crossover
 *      - Arithmetic crossover (weighted average)
 *      - BLX-alpha (blend crossover for real-valued params)
 *      - Simulated Binary Crossover (SBX) - Deb & Agrawal 1995
 *
 *   4. Mutation Operators
 *      - Gaussian mutation (normal distribution)
 *      - Uniform mutation (random replacement)
 *      - Polynomial mutation (Deb & Goyal 1996)
 *      - Adaptive mutation rate (1/5th rule)
 *      - Cauchy mutation (heavy-tailed for escape)
 *
 *   5. Multi-Objective Optimization (NSGA-II)
 *      - Fast non-dominated sorting
 *      - Crowding distance assignment
 *      - Binary tournament with crowding comparison
 *      - Reference point method (NSGA-III compatible)
 *
 *   6. Manufacturing Applications
 *      - Speed/Feed/DOC optimization
 *      - Tool path sequencing
 *      - Operation ordering
 *      - Multi-pass strategy optimization
 *      - Cycle time minimization
 *      - Surface finish vs MRR trade-off
 *
 * References:
 *   - Holland, J.H. (1975) "Adaptation in Natural and Artificial Systems"
 *   - Goldberg, D.E. (1989) "Genetic Algorithms in Search, Optimization & Machine Learning"
 *   - Deb, K. et al. (2002) "A Fast and Elitist Multiobjective Genetic Algorithm: NSGA-II"
 *   - Deb, K. & Agrawal, R.B. (1995) "Simulated Binary Crossover for Continuous Search Space"
 *
 * @module engines/LatheGeneticAlgorithmEngine
 * @version 1.0.0
 * @milestone LATHE-GA-MS1
 */

import { log } from "../utils/Logger.js";
import {
  CANONICAL_KIENZLE,
  CANONICAL_TAYLOR,
  CANONICAL_MATERIAL_DB,
  type ISOGroup,
  type MaterialPhysics,
} from "../physics/constants.js";

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

/** Parameter bounds for optimization */
export interface ParameterBounds {
  min: number;
  max: number;
  name: string;
  unit: string;
  /** If true, parameter is integer (e.g., number of passes) */
  integer?: boolean;
}

/** Individual in the population (chromosome) */
export interface LatheIndividual {
  /** Gene values (parameter vector) */
  genes: number[];
  /** Fitness values (single or multi-objective) */
  fitness: number[];
  /** Constraint violations (sum of penalties) */
  constraint_violation: number;
  /** Pareto rank (for NSGA-II) */
  rank?: number;
  /** Crowding distance (for NSGA-II) */
  crowding_distance?: number;
  /** Generation born */
  generation?: number;
  /** Unique identifier */
  id: string;
}

/** Optimization objective */
export interface LatheObjective {
  name: string;
  /** If true, lower is better */
  minimize: boolean;
  /** Weight for weighted sum (0-1) */
  weight: number;
  /** Target value (optional) */
  target?: number;
  /** Hard constraint limit */
  hard_limit?: number;
  /** Unit of measure */
  unit: string;
}

/** Constraint function */
export interface LatheConstraint {
  name: string;
  /** Returns violation magnitude (0 = satisfied) */
  evaluate: (genes: number[]) => number;
  /** Penalty coefficient */
  penalty: number;
}

/** GA Configuration */
export interface LatheGAConfig {
  /** Population size */
  population_size: number;
  /** Maximum generations */
  max_generations: number;
  /** Mutation rate (0-1) */
  mutation_rate: number;
  /** Crossover rate (0-1) */
  crossover_rate: number;
  /** Elite ratio (0-1, fraction preserved) */
  elite_ratio: number;
  /** Selection method */
  selection_method: "tournament" | "roulette" | "rank";
  /** Crossover method */
  crossover_method: "single" | "two_point" | "uniform" | "arithmetic" | "blx_alpha" | "sbx";
  /** Mutation method */
  mutation_method: "gaussian" | "uniform" | "polynomial" | "adaptive" | "cauchy";
  /** Tournament size (for tournament selection) */
  tournament_size: number;
  /** BLX-alpha parameter (for BLX crossover) */
  blx_alpha: number;
  /** SBX distribution index (for SBX crossover) */
  sbx_eta: number;
  /** Polynomial mutation distribution index */
  pm_eta: number;
  /** Gaussian mutation sigma (std dev as fraction of range) */
  gaussian_sigma: number;
  /** Convergence threshold */
  convergence_threshold: number;
  /** Stagnation limit (generations without improvement) */
  stagnation_limit: number;
  /** Random seed for reproducibility */
  seed?: number;
  /** Use adaptive mutation rate */
  adaptive_mutation: boolean;
  /** Use niching for diversity preservation */
  use_niching: boolean;
  /** Niche radius (for niching) */
  niche_radius: number;
}

/** GA Result */
export interface LatheGAResult {
  success: boolean;
  /** Best individual found */
  best_individual: LatheIndividual;
  /** Decoded best parameters */
  best_parameters: Record<string, number>;
  /** Best fitness value(s) */
  best_fitness: number[];
  /** Total generations run */
  generations: number;
  /** Whether algorithm converged */
  converged: boolean;
  /** Generation at convergence (if converged) */
  convergence_generation: number | null;
  /** Fitness history (best per generation) */
  fitness_history: number[][];
  /** Diversity history */
  diversity_history: number[];
  /** Final population */
  final_population: LatheIndividual[];
  /** Pareto front (for multi-objective) */
  pareto_front?: LatheIndividual[];
  /** Statistics */
  statistics: GAStatistics;
  /**
   * U-LW-A4: predicted machining performance for `best_parameters`, computed with the
   * per-MATERIAL Kienzle/Taylor coefficients the optimizer used (not the ISO-group generic).
   * Present for optimizeParameters() results. Lets a consumer see the recommended params'
   * force/power/tool-life/MRR — previously the result exposed only the params. `evolve` selects
   * on the PRIMARY objective's fitness (fitness[0]), so a coefficient that only scales force/power
   * leaves the selected params unchanged for the common kc1_1-independent objectives (mrr,
   * cycle_time, surface_finish); it moves them only when force/power is the primary objective.
   * Exposing predicted performance surfaces the corrected per-material coefficient regardless.
   */
  predicted_performance?: LatheGAPredictedPerformance;
}

/**
 * Predicted machining performance for the GA's best parameters (U-LW-A4). Uses the SAME
 * simplified Kienzle (Fc = kc1_1 * ap * f^(1-mc)) and Taylor (T = (C/Vc)^(1/n)) the fitness
 * function used, so these numbers are self-consistent with the optimization.
 */
export interface LatheGAPredictedPerformance {
  /** Tangential cutting force Fc [N]. */
  cutting_force_N: number;
  /** Cutting power [kW]. */
  cutting_power_kW: number;
  /** Spindle torque [N*m]. */
  spindle_torque_Nm: number;
  /** Taylor tool life [min]. */
  tool_life_min: number;
  /** Material removal rate [cm^3/min]. */
  mrr_cm3_min: number;
  /** The Kienzle kc1.1 [N/mm^2] actually used — the per-material value when available, else ISO-group. */
  kc1_1_used: number;
  /**
   * True when cutting_power_kW is within the machine max_power (allowing a small soft-penalty
   * tolerance). FALSE means the optimizer could not find a power-feasible recommendation within the
   * given bounds/tool limits — the recommendation exceeds the spindle budget and MUST be reviewed
   * before running (fail-loud, U-LW-GA-CONSTRAINTS P1). The exterior penalty returns the
   * least-infeasible point when no feasible one exists, so this flag is the loud signal.
   */
  power_feasible: boolean;
  /** Populated only when power_feasible is false — a human-readable breach message. */
  power_warning?: string;
}

/** GA Statistics */
export interface GAStatistics {
  total_evaluations: number;
  unique_individuals: number;
  avg_constraint_violation: number;
  population_diversity: number;
  improvement_rate: number;
  elite_contribution: number;
}

/** NSGA-II Result */
export interface NSGAII_Result {
  success: boolean;
  pareto_front: LatheIndividual[];
  pareto_set: Record<string, number>[];
  generations: number;
  total_evaluations: number;
  hypervolume: number;
  spread: number;
  convergence_metric: number;
  utopia_point: number[];
  nadir_point: number[];
  best_compromise: LatheIndividual | null;
  objective_correlations: Record<string, Record<string, number>>;
}

/** Manufacturing optimization input */
export interface ManufacturingOptInput {
  /** Material being machined */
  material: string;
  /** ISO material group override */
  iso_group?: ISOGroup;
  /** Operation type */
  operation: "roughing" | "finishing" | "threading" | "grooving" | "boring" | "facing";
  /** Machine limits */
  machine: {
    max_spindle_rpm: number;
    max_power_kw: number;
    max_feed_mm_rev: number;
    max_rapid_mm_min: number;
    turret_stations: number;
  };
  /** Tool specifications */
  tool: {
    insert_grade: string;
    nose_radius_mm: number;
    approach_angle_deg: number;
    max_depth_mm: number;
    tool_life_ref_min?: number;
  };
  /** Workpiece geometry */
  workpiece: {
    diameter_mm: number;
    length_mm: number;
    stock_allowance_mm: number;
  };
  /** Objectives to optimize */
  objectives: LatheObjective[];
  /** Additional constraints */
  constraints?: LatheConstraint[];
  /** GA configuration overrides */
  config?: Partial<LatheGAConfig>;
}

/** Lathe parameter set for decoding */
export interface LatheParameterSet {
  cutting_speed_m_min: number;
  feed_mm_rev: number;
  depth_of_cut_mm: number;
  spindle_rpm: number;
  number_of_passes: number;
  finishing_allowance_mm: number;
}

/** Heuristic seed source */
export interface HeuristicSeed {
  parameters: LatheParameterSet;
  source: string;
  confidence: number;
  performance_score?: number;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const DEFAULT_CONFIG: LatheGAConfig = {
  population_size: 100,
  max_generations: 150,
  mutation_rate: 0.05,
  crossover_rate: 0.85,
  elite_ratio: 0.1,
  selection_method: "tournament",
  crossover_method: "sbx",
  mutation_method: "polynomial",
  tournament_size: 3,
  blx_alpha: 0.5,
  sbx_eta: 15,
  pm_eta: 20,
  gaussian_sigma: 0.1,
  convergence_threshold: 1e-6,
  stagnation_limit: 25,
  adaptive_mutation: true,
  use_niching: false,
  niche_radius: 0.1,
};

/** Standard lathe parameter bounds for roughing */
const ROUGHING_BOUNDS: ParameterBounds[] = [
  { name: "cutting_speed_m_min", min: 50, max: 400, unit: "m/min" },
  { name: "feed_mm_rev", min: 0.1, max: 0.8, unit: "mm/rev" },
  { name: "depth_of_cut_mm", min: 0.5, max: 6.0, unit: "mm" },
  { name: "number_of_passes", min: 1, max: 10, unit: "count", integer: true },
];

/** Standard lathe parameter bounds for finishing */
const FINISHING_BOUNDS: ParameterBounds[] = [
  { name: "cutting_speed_m_min", min: 80, max: 500, unit: "m/min" },
  { name: "feed_mm_rev", min: 0.05, max: 0.25, unit: "mm/rev" },
  { name: "depth_of_cut_mm", min: 0.1, max: 1.5, unit: "mm" },
  { name: "finishing_allowance_mm", min: 0.1, max: 0.5, unit: "mm" },
];

// ============================================================================
// SEEDED PRNG - Park-Miller LCG
// ============================================================================

/**
 * Seeded pseudo-random number generator for reproducibility.
 * Uses Park-Miller multiplicative linear congruential generator.
 * Period: 2^31 - 2. Reference: Park & Miller, CACM 1988.
 */
class SeededRNG {
  private state: number;

  constructor(seed: number = Date.now()) {
    this.state = seed % 2147483647;
    if (this.state <= 0) this.state += 2147483646;
  }

  /** Returns uniform random in (0, 1) */
  next(): number {
    this.state = (this.state * 16807) % 2147483647;
    return this.state / 2147483647;
  }

  /** Returns uniform random in [lo, hi] */
  uniform(lo: number, hi: number): number {
    return lo + (hi - lo) * this.next();
  }

  /** Returns approximate Gaussian via Box-Muller transform */
  gaussian(mean: number = 0, std: number = 1): number {
    const u1 = this.next();
    const u2 = this.next();
    const z = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
    return mean + std * z;
  }

  /** Returns Cauchy-distributed random (heavy-tailed) */
  cauchy(location: number = 0, scale: number = 1): number {
    const u = this.next();
    return location + scale * Math.tan(Math.PI * (u - 0.5));
  }

  /** Returns random integer in [lo, hi] inclusive */
  randInt(lo: number, hi: number): number {
    return Math.floor(this.uniform(lo, hi + 1));
  }

  /** Shuffle array in place using Fisher-Yates */
  shuffle<T>(array: T[]): T[] {
    for (let i = array.length - 1; i > 0; i--) {
      const j = this.randInt(0, i);
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }
}

// ============================================================================
// LATHE GENETIC ALGORITHM ENGINE
// ============================================================================

class LatheGeneticAlgorithmEngineImpl {
  private rng: SeededRNG;
  private evaluationCount: number = 0;
  private uniqueIndividuals: Set<string> = new Set();

  constructor() {
    this.rng = new SeededRNG();
  }

  // --------------------------------------------------------------------------
  // POPULATION INITIALIZATION
  // --------------------------------------------------------------------------

  /**
   * Initialize population with random individuals within bounds.
   * Uses uniform random sampling for each parameter.
   */
  initializeRandomPopulation(
    size: number,
    bounds: ParameterBounds[],
    seed?: number
  ): LatheIndividual[] {
    if (seed !== undefined) {
      this.rng = new SeededRNG(seed);
    }

    const population: LatheIndividual[] = [];
    for (let i = 0; i < size; i++) {
      const genes = bounds.map((b) => {
        const val = this.rng.uniform(b.min, b.max);
        return b.integer ? Math.round(val) : val;
      });
      population.push(this.createIndividual(genes, i));
    }
    return population;
  }

  /**
   * Latin Hypercube Sampling (LHS) for uniform parameter space coverage.
   * Ensures each parameter dimension is evenly sampled.
   * Reference: McKay et al. (1979) "A Comparison of Three Methods for Selecting
   *            Values of Input Variables in the Analysis of Output from a Computer Code"
   */
  initializeLatinHypercube(
    size: number,
    bounds: ParameterBounds[],
    seed?: number
  ): LatheIndividual[] {
    if (seed !== undefined) {
      this.rng = new SeededRNG(seed);
    }

    const dimensions = bounds.length;
    const population: LatheIndividual[] = [];

    // Create permutation matrices for each dimension
    const permutations: number[][] = [];
    for (let d = 0; d < dimensions; d++) {
      const perm = Array.from({ length: size }, (_, i) => i);
      this.rng.shuffle(perm);
      permutations.push(perm);
    }

    // Generate individuals using LHS
    for (let i = 0; i < size; i++) {
      const genes: number[] = [];
      for (let d = 0; d < dimensions; d++) {
        const stratum = permutations[d][i];
        // Random point within stratum
        const stratumLow = stratum / size;
        const stratumHigh = (stratum + 1) / size;
        const normalized = this.rng.uniform(stratumLow, stratumHigh);
        // Scale to bounds
        let val = bounds[d].min + normalized * (bounds[d].max - bounds[d].min);
        if (bounds[d].integer) {
          val = Math.round(val);
        }
        genes.push(val);
      }
      population.push(this.createIndividual(genes, i));
    }

    return population;
  }

  /**
   * Heuristic seeding from known good programs.
   * Injects domain knowledge into initial population.
   */
  seedWithHeuristics(
    population: LatheIndividual[],
    seeds: HeuristicSeed[],
    bounds: ParameterBounds[],
    ratio: number = 0.2
  ): LatheIndividual[] {
    const seedCount = Math.min(
      Math.floor(population.length * ratio),
      seeds.length
    );

    // Sort seeds by confidence/performance
    const sortedSeeds = [...seeds].sort(
      (a, b) =>
        (b.performance_score ?? b.confidence) -
        (a.performance_score ?? a.confidence)
    );

    // Replace worst individuals with heuristic seeds
    for (let i = 0; i < seedCount; i++) {
      const seed = sortedSeeds[i];
      const genes = this.encodeParameters(seed.parameters, bounds);
      population[population.length - 1 - i] = this.createIndividual(
        genes,
        population.length - 1 - i
      );
    }

    return population;
  }

  /**
   * Calculate population diversity using genotypic variance.
   * Higher values indicate more diverse population.
   */
  calculateDiversity(population: LatheIndividual[]): number {
    if (population.length < 2) return 0;

    const dimensions = population[0].genes.length;
    let totalVariance = 0;

    for (let d = 0; d < dimensions; d++) {
      const values = population.map((ind) => ind.genes[d]);
      const mean = values.reduce((s, v) => s + v, 0) / values.length;
      const variance =
        values.reduce((s, v) => s + (v - mean) ** 2, 0) / (values.length - 1);
      totalVariance += variance;
    }

    return Math.sqrt(totalVariance / dimensions);
  }

  /**
   * Calculate Shannon entropy of population for diversity measure.
   * Uses histogram-based estimation.
   */
  calculateShannonEntropy(
    population: LatheIndividual[],
    bins: number = 10
  ): number {
    if (population.length < 2) return 0;

    const dimensions = population[0].genes.length;
    let totalEntropy = 0;

    for (let d = 0; d < dimensions; d++) {
      const values = population.map((ind) => ind.genes[d]);
      const min = Math.min(...values);
      const max = Math.max(...values);
      const range = max - min || 1;

      // Build histogram
      const histogram = new Array(bins).fill(0);
      for (const v of values) {
        const bin = Math.min(Math.floor(((v - min) / range) * bins), bins - 1);
        histogram[bin]++;
      }

      // Calculate entropy
      let entropy = 0;
      for (const count of histogram) {
        if (count > 0) {
          const p = count / values.length;
          entropy -= p * Math.log2(p);
        }
      }
      totalEntropy += entropy;
    }

    return totalEntropy / dimensions;
  }

  // --------------------------------------------------------------------------
  // SELECTION OPERATORS
  // --------------------------------------------------------------------------

  /**
   * Tournament selection with configurable size.
   * Selects best individual from random tournament.
   */
  tournamentSelection(
    population: LatheIndividual[],
    tournamentSize: number = 3
  ): LatheIndividual {
    let best: LatheIndividual | null = null;

    for (let i = 0; i < tournamentSize; i++) {
      const candidate =
        population[Math.floor(this.rng.next() * population.length)];
      if (!best || this.compareFitness(candidate, best) > 0) {
        best = candidate;
      }
    }

    return this.cloneIndividual(best!);
  }

  /**
   * Roulette wheel (fitness proportionate) selection.
   * Probability proportional to fitness value.
   */
  rouletteSelection(population: LatheIndividual[]): LatheIndividual {
    // Handle negative fitness by shifting
    const fitnessValues = population.map((p) => p.fitness[0]);
    const minFitness = Math.min(...fitnessValues);
    const shift = minFitness < 0 ? -minFitness + 1 : 0;

    const totalFitness = fitnessValues.reduce((s, f) => s + f + shift, 0);
    let spin = this.rng.next() * totalFitness;

    for (const individual of population) {
      spin -= individual.fitness[0] + shift;
      if (spin <= 0) {
        return this.cloneIndividual(individual);
      }
    }

    return this.cloneIndividual(population[population.length - 1]);
  }

  /**
   * Rank-based selection with linear ranking.
   * Selection probability based on rank, not raw fitness.
   * Reduces selection pressure from fitness variance.
   */
  rankBasedSelection(
    population: LatheIndividual[],
    selectivePressure: number = 1.5
  ): LatheIndividual {
    // Sort by fitness (descending)
    const sorted = [...population].sort(
      (a, b) => this.compareFitness(b, a)
    );
    const n = sorted.length;

    // Linear ranking: P(i) = (2-s)/n + 2*i*(s-1)/(n*(n-1))
    // where s = selective pressure (1.0-2.0), i = rank (0 = best)
    const s = Math.min(2.0, Math.max(1.0, selectivePressure));
    const probabilities: number[] = [];

    for (let i = 0; i < n; i++) {
      const prob = (2 - s) / n + (2 * (n - 1 - i) * (s - 1)) / (n * (n - 1));
      probabilities.push(prob);
    }

    // Roulette on ranked probabilities
    let spin = this.rng.next();
    let cumulative = 0;

    for (let i = 0; i < n; i++) {
      cumulative += probabilities[i];
      if (spin <= cumulative) {
        return this.cloneIndividual(sorted[i]);
      }
    }

    return this.cloneIndividual(sorted[n - 1]);
  }

  /**
   * Elitism preservation - copy top individuals directly.
   */
  preserveElites(
    population: LatheIndividual[],
    eliteRatio: number
  ): LatheIndividual[] {
    const eliteCount = Math.max(1, Math.floor(population.length * eliteRatio));
    const sorted = [...population].sort(
      (a, b) => this.compareFitness(b, a)
    );
    return sorted.slice(0, eliteCount).map((e) => this.cloneIndividual(e));
  }

  // --------------------------------------------------------------------------
  // CROSSOVER OPERATORS
  // --------------------------------------------------------------------------

  /**
   * Single-point crossover.
   * Splits parents at random point and exchanges tails.
   */
  singlePointCrossover(
    p1: LatheIndividual,
    p2: LatheIndividual,
    bounds: ParameterBounds[]
  ): [LatheIndividual, LatheIndividual] {
    const point = Math.floor(this.rng.next() * p1.genes.length);

    const c1Genes = [...p1.genes.slice(0, point), ...p2.genes.slice(point)];
    const c2Genes = [...p2.genes.slice(0, point), ...p1.genes.slice(point)];

    return [
      this.createIndividual(this.applyBounds(c1Genes, bounds), -1),
      this.createIndividual(this.applyBounds(c2Genes, bounds), -1),
    ];
  }

  /**
   * Two-point crossover.
   * Exchanges middle segment between two random points.
   */
  twoPointCrossover(
    p1: LatheIndividual,
    p2: LatheIndividual,
    bounds: ParameterBounds[]
  ): [LatheIndividual, LatheIndividual] {
    let a = Math.floor(this.rng.next() * p1.genes.length);
    let b = Math.floor(this.rng.next() * p1.genes.length);
    if (a > b) [a, b] = [b, a];

    const c1Genes = [
      ...p1.genes.slice(0, a),
      ...p2.genes.slice(a, b),
      ...p1.genes.slice(b),
    ];
    const c2Genes = [
      ...p2.genes.slice(0, a),
      ...p1.genes.slice(a, b),
      ...p2.genes.slice(b),
    ];

    return [
      this.createIndividual(this.applyBounds(c1Genes, bounds), -1),
      this.createIndividual(this.applyBounds(c2Genes, bounds), -1),
    ];
  }

  /**
   * Uniform crossover.
   * Each gene selected independently from either parent.
   */
  uniformCrossover(
    p1: LatheIndividual,
    p2: LatheIndividual,
    bounds: ParameterBounds[],
    ratio: number = 0.5
  ): [LatheIndividual, LatheIndividual] {
    const c1Genes: number[] = [];
    const c2Genes: number[] = [];

    for (let i = 0; i < p1.genes.length; i++) {
      if (this.rng.next() < ratio) {
        c1Genes.push(p1.genes[i]);
        c2Genes.push(p2.genes[i]);
      } else {
        c1Genes.push(p2.genes[i]);
        c2Genes.push(p1.genes[i]);
      }
    }

    return [
      this.createIndividual(this.applyBounds(c1Genes, bounds), -1),
      this.createIndividual(this.applyBounds(c2Genes, bounds), -1),
    ];
  }

  /**
   * Arithmetic crossover (weighted average).
   * Offspring genes are linear combinations of parents.
   */
  arithmeticCrossover(
    p1: LatheIndividual,
    p2: LatheIndividual,
    bounds: ParameterBounds[],
    alpha: number = 0.5
  ): [LatheIndividual, LatheIndividual] {
    const c1Genes: number[] = [];
    const c2Genes: number[] = [];

    for (let i = 0; i < p1.genes.length; i++) {
      c1Genes.push(alpha * p1.genes[i] + (1 - alpha) * p2.genes[i]);
      c2Genes.push((1 - alpha) * p1.genes[i] + alpha * p2.genes[i]);
    }

    return [
      this.createIndividual(this.applyBounds(c1Genes, bounds), -1),
      this.createIndividual(this.applyBounds(c2Genes, bounds), -1),
    ];
  }

  /**
   * BLX-alpha (Blend Crossover).
   * Offspring genes sampled from extended interval.
   * Reference: Eshelman & Schaffer (1993)
   */
  blxAlphaCrossover(
    p1: LatheIndividual,
    p2: LatheIndividual,
    bounds: ParameterBounds[],
    alpha: number = 0.5
  ): [LatheIndividual, LatheIndividual] {
    const c1Genes: number[] = [];
    const c2Genes: number[] = [];

    for (let i = 0; i < p1.genes.length; i++) {
      const lo = Math.min(p1.genes[i], p2.genes[i]);
      const hi = Math.max(p1.genes[i], p2.genes[i]);
      const range = hi - lo;
      const lower = Math.max(bounds[i].min, lo - alpha * range);
      const upper = Math.min(bounds[i].max, hi + alpha * range);

      c1Genes.push(this.rng.uniform(lower, upper));
      c2Genes.push(this.rng.uniform(lower, upper));
    }

    return [
      this.createIndividual(this.applyBounds(c1Genes, bounds), -1),
      this.createIndividual(this.applyBounds(c2Genes, bounds), -1),
    ];
  }

  /**
   * Simulated Binary Crossover (SBX).
   * Produces offspring with similar spread as single-point crossover.
   * Reference: Deb & Agrawal (1995)
   */
  sbxCrossover(
    p1: LatheIndividual,
    p2: LatheIndividual,
    bounds: ParameterBounds[],
    eta: number = 15
  ): [LatheIndividual, LatheIndividual] {
    const c1Genes: number[] = [];
    const c2Genes: number[] = [];

    for (let i = 0; i < p1.genes.length; i++) {
      if (this.rng.next() <= 0.5) {
        // Apply SBX
        if (Math.abs(p1.genes[i] - p2.genes[i]) > 1e-14) {
          const y1 = Math.min(p1.genes[i], p2.genes[i]);
          const y2 = Math.max(p1.genes[i], p2.genes[i]);
          const beta = this.sbxBeta(y1, y2, bounds[i], eta);

          c1Genes.push(0.5 * ((y1 + y2) - beta * (y2 - y1)));
          c2Genes.push(0.5 * ((y1 + y2) + beta * (y2 - y1)));
        } else {
          c1Genes.push(p1.genes[i]);
          c2Genes.push(p2.genes[i]);
        }
      } else {
        c1Genes.push(p1.genes[i]);
        c2Genes.push(p2.genes[i]);
      }
    }

    return [
      this.createIndividual(this.applyBounds(c1Genes, bounds), -1),
      this.createIndividual(this.applyBounds(c2Genes, bounds), -1),
    ];
  }

  /** Calculate SBX beta parameter */
  private sbxBeta(
    y1: number,
    y2: number,
    bound: ParameterBounds,
    eta: number
  ): number {
    const rand = this.rng.next();
    const delta = y2 - y1;
    const bl = (y1 - bound.min) / delta;
    const bu = (bound.max - y2) / delta;

    let beta: number;
    const betaL = 1 + 2 * bl;
    const betaU = 1 + 2 * bu;

    if (rand <= 0.5) {
      const alpha = 2 - Math.pow(betaL, -(eta + 1));
      beta = Math.pow(rand / alpha, 1 / (eta + 1));
    } else {
      const alpha = 2 - Math.pow(betaU, -(eta + 1));
      beta = Math.pow(1 / (2 - rand * alpha), 1 / (eta + 1));
    }

    return beta;
  }

  // --------------------------------------------------------------------------
  // MUTATION OPERATORS
  // --------------------------------------------------------------------------

  /**
   * Gaussian mutation.
   * Adds normally distributed noise to genes.
   */
  gaussianMutation(
    individual: LatheIndividual,
    bounds: ParameterBounds[],
    rate: number,
    sigma: number = 0.1
  ): LatheIndividual {
    const mutatedGenes = individual.genes.map((g, i) => {
      if (this.rng.next() < rate) {
        const range = bounds[i].max - bounds[i].min;
        let newVal = g + this.rng.gaussian(0, sigma * range);
        if (bounds[i].integer) {
          newVal = Math.round(newVal);
        }
        return newVal;
      }
      return g;
    });

    return this.createIndividual(
      this.applyBounds(mutatedGenes, bounds),
      individual.generation ?? -1
    );
  }

  /**
   * Uniform mutation.
   * Replaces gene with random value from its range.
   */
  uniformMutation(
    individual: LatheIndividual,
    bounds: ParameterBounds[],
    rate: number
  ): LatheIndividual {
    const mutatedGenes = individual.genes.map((g, i) => {
      if (this.rng.next() < rate) {
        let newVal = this.rng.uniform(bounds[i].min, bounds[i].max);
        if (bounds[i].integer) {
          newVal = Math.round(newVal);
        }
        return newVal;
      }
      return g;
    });

    return this.createIndividual(
      this.applyBounds(mutatedGenes, bounds),
      individual.generation ?? -1
    );
  }

  /**
   * Polynomial mutation.
   * Produces offspring close to parent with polynomial probability distribution.
   * Reference: Deb & Goyal (1996)
   */
  polynomialMutation(
    individual: LatheIndividual,
    bounds: ParameterBounds[],
    rate: number,
    eta: number = 20
  ): LatheIndividual {
    const mutatedGenes = individual.genes.map((g, i) => {
      if (this.rng.next() < rate) {
        const y = g;
        const lb = bounds[i].min;
        const ub = bounds[i].max;
        const delta1 = (y - lb) / (ub - lb);
        const delta2 = (ub - y) / (ub - lb);

        const rnd = this.rng.next();
        let deltaQ: number;

        if (rnd < 0.5) {
          const xy = 1 - delta1;
          const val = 2 * rnd + (1 - 2 * rnd) * Math.pow(xy, eta + 1);
          deltaQ = Math.pow(val, 1 / (eta + 1)) - 1;
        } else {
          const xy = 1 - delta2;
          const val = 2 * (1 - rnd) + 2 * (rnd - 0.5) * Math.pow(xy, eta + 1);
          deltaQ = 1 - Math.pow(val, 1 / (eta + 1));
        }

        let newVal = y + deltaQ * (ub - lb);
        if (bounds[i].integer) {
          newVal = Math.round(newVal);
        }
        return newVal;
      }
      return g;
    });

    return this.createIndividual(
      this.applyBounds(mutatedGenes, bounds),
      individual.generation ?? -1
    );
  }

  /**
   * Cauchy mutation (heavy-tailed).
   * Better for escaping local optima.
   */
  cauchyMutation(
    individual: LatheIndividual,
    bounds: ParameterBounds[],
    rate: number,
    scale: number = 0.1
  ): LatheIndividual {
    const mutatedGenes = individual.genes.map((g, i) => {
      if (this.rng.next() < rate) {
        const range = bounds[i].max - bounds[i].min;
        let newVal = g + this.rng.cauchy(0, scale * range);
        if (bounds[i].integer) {
          newVal = Math.round(newVal);
        }
        return newVal;
      }
      return g;
    });

    return this.createIndividual(
      this.applyBounds(mutatedGenes, bounds),
      individual.generation ?? -1
    );
  }

  /**
   * Adaptive mutation rate using 1/5th success rule.
   * Increases rate if too few mutations succeed, decreases if too many.
   * Reference: Rechenberg (1973)
   */
  adaptMutationRate(
    successRate: number,
    currentRate: number,
    targetRate: number = 0.2
  ): number {
    const adaptFactor = successRate > targetRate ? 0.82 : 1.22;
    return Math.max(0.01, Math.min(0.5, currentRate * adaptFactor));
  }

  // --------------------------------------------------------------------------
  // NSGA-II MULTI-OBJECTIVE OPTIMIZATION
  // --------------------------------------------------------------------------

  /**
   * NSGA-II algorithm for multi-objective optimization.
   * Reference: Deb et al. (2002) "A Fast and Elitist Multiobjective GA"
   */
  nsgaII(
    objectives: LatheObjective[],
    bounds: ParameterBounds[],
    fitnessFunction: (genes: number[]) => number[],
    config: Partial<LatheGAConfig> = {}
  ): NSGAII_Result {
    const cfg = { ...DEFAULT_CONFIG, ...config };
    if (cfg.seed !== undefined) {
      this.rng = new SeededRNG(cfg.seed);
    }

    this.evaluationCount = 0;
    this.uniqueIndividuals = new Set();

    // Initialize population with LHS
    let population = this.initializeLatinHypercube(
      cfg.population_size,
      bounds,
      cfg.seed
    );

    // Evaluate initial population
    for (const ind of population) {
      ind.fitness = fitnessFunction(ind.genes);
      this.evaluationCount++;
      this.uniqueIndividuals.add(this.hashGenes(ind.genes));
    }

    // Assign ranks and crowding distance
    this.fastNonDominatedSort(population, objectives);
    this.assignCrowdingDistance(population, objectives);

    let generation = 0;
    const fitnessHistory: number[][] = [];

    while (generation < cfg.max_generations) {
      // Create offspring population
      const offspring: LatheIndividual[] = [];

      while (offspring.length < cfg.population_size) {
        // Binary tournament selection using crowded comparison
        const p1 = this.crowdedTournament(population);
        const p2 = this.crowdedTournament(population);

        // Crossover
        let children: [LatheIndividual, LatheIndividual];
        if (this.rng.next() < cfg.crossover_rate) {
          children = this.sbxCrossover(p1, p2, bounds, cfg.sbx_eta);
        } else {
          children = [this.cloneIndividual(p1), this.cloneIndividual(p2)];
        }

        // Mutation
        for (let child of children) {
          child = this.polynomialMutation(
            child,
            bounds,
            cfg.mutation_rate,
            cfg.pm_eta
          );
          child.fitness = fitnessFunction(child.genes);
          this.evaluationCount++;
          this.uniqueIndividuals.add(this.hashGenes(child.genes));
          offspring.push(child);
          if (offspring.length >= cfg.population_size) break;
        }
      }

      // Combine parent and offspring
      const combined = [...population, ...offspring];

      // Fast non-dominated sort
      this.fastNonDominatedSort(combined, objectives);

      // Select next generation based on rank and crowding
      const nextPopulation: LatheIndividual[] = [];
      let rank = 0;

      while (nextPopulation.length + this.getRankCount(combined, rank) <= cfg.population_size) {
        const front = combined.filter((ind) => ind.rank === rank);
        nextPopulation.push(...front);
        rank++;
      }

      // Fill remaining spots with crowding distance selection
      if (nextPopulation.length < cfg.population_size) {
        const lastFront = combined.filter((ind) => ind.rank === rank);
        this.assignCrowdingDistanceForFront(lastFront, objectives);
        lastFront.sort(
          (a, b) => (b.crowding_distance ?? 0) - (a.crowding_distance ?? 0)
        );

        const remaining = cfg.population_size - nextPopulation.length;
        nextPopulation.push(...lastFront.slice(0, remaining));
      }

      population = nextPopulation;
      this.assignCrowdingDistance(population, objectives);

      // Record best fitness per objective
      const paretoFront = population.filter((ind) => ind.rank === 0);
      fitnessHistory.push(
        objectives.map((obj, i) => {
          const values = paretoFront.map((ind) => ind.fitness[i]);
          return obj.minimize ? Math.min(...values) : Math.max(...values);
        })
      );

      generation++;
    }

    // Extract final Pareto front
    const paretoFront = population.filter((ind) => ind.rank === 0);

    // Calculate metrics
    const utopiaPoint = objectives.map((obj, i) => {
      const values = paretoFront.map((ind) => ind.fitness[i]);
      return obj.minimize ? Math.min(...values) : Math.max(...values);
    });

    const nadirPoint = objectives.map((obj, i) => {
      const values = paretoFront.map((ind) => ind.fitness[i]);
      return obj.minimize ? Math.max(...values) : Math.min(...values);
    });

    // Find best compromise (closest to utopia)
    let bestCompromise: LatheIndividual | null = null;
    let minDist = Infinity;

    for (const sol of paretoFront) {
      let dist = 0;
      for (let i = 0; i < objectives.length; i++) {
        const range = Math.abs(nadirPoint[i] - utopiaPoint[i]) || 1;
        const normalized = (sol.fitness[i] - utopiaPoint[i]) / range;
        dist += objectives[i].weight * normalized * normalized;
      }
      if (dist < minDist) {
        minDist = dist;
        bestCompromise = sol;
      }
    }

    // Calculate hypervolume (approximate using reference point)
    const hypervolume = this.calculateHypervolume(paretoFront, nadirPoint, objectives);

    // Calculate spread (diversity indicator)
    const spread = this.calculateSpread(paretoFront, objectives);

    // Objective correlations
    const correlations = this.calculateObjectiveCorrelations(paretoFront, objectives);

    log.info(`[LatheGeneticAlgorithm] NSGA-II completed: generations=${generation}, front=${paretoFront.length}, evals=${this.evaluationCount}`);

    return {
      success: true,
      pareto_front: paretoFront,
      pareto_set: paretoFront.map((ind) =>
        this.decodeParameters(ind.genes, bounds)
      ),
      generations: generation,
      total_evaluations: this.evaluationCount,
      hypervolume,
      spread,
      convergence_metric: hypervolume,
      utopia_point: utopiaPoint,
      nadir_point: nadirPoint,
      best_compromise: bestCompromise,
      objective_correlations: correlations,
    };
  }

  /**
   * Fast non-dominated sorting (O(MN^2) complexity).
   * Reference: Deb et al. (2002)
   */
  private fastNonDominatedSort(
    population: LatheIndividual[],
    objectives: LatheObjective[]
  ): void {
    const n = population.length;
    const dominationCount: number[] = new Array(n).fill(0);
    const dominatedSet: number[][] = Array.from({ length: n }, () => []);

    // Calculate domination relationships
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const comparison = this.paretoCompare(
          population[i],
          population[j],
          objectives
        );
        if (comparison === 1) {
          // i dominates j
          dominatedSet[i].push(j);
          dominationCount[j]++;
        } else if (comparison === -1) {
          // j dominates i
          dominatedSet[j].push(i);
          dominationCount[i]++;
        }
      }
    }

    // Build fronts
    let rank = 0;
    let front = population
      .map((_, i) => i)
      .filter((i) => dominationCount[i] === 0);

    while (front.length > 0) {
      const nextFront: number[] = [];

      for (const i of front) {
        population[i].rank = rank;
        for (const j of dominatedSet[i]) {
          dominationCount[j]--;
          if (dominationCount[j] === 0) {
            nextFront.push(j);
          }
        }
      }

      rank++;
      front = nextFront;
    }
  }

  /**
   * Pareto dominance comparison.
   * Returns 1 if a dominates b, -1 if b dominates a, 0 if non-dominated.
   */
  private paretoCompare(
    a: LatheIndividual,
    b: LatheIndividual,
    objectives: LatheObjective[]
  ): number {
    let aBetter = false;
    let bBetter = false;

    for (let i = 0; i < objectives.length; i++) {
      const aVal = a.fitness[i];
      const bVal = b.fitness[i];

      if (objectives[i].minimize) {
        if (aVal < bVal) aBetter = true;
        if (bVal < aVal) bBetter = true;
      } else {
        if (aVal > bVal) aBetter = true;
        if (bVal > aVal) bBetter = true;
      }

      if (aBetter && bBetter) return 0; // Non-dominated
    }

    if (aBetter && !bBetter) return 1;
    if (bBetter && !aBetter) return -1;
    return 0;
  }

  /**
   * Assign crowding distance for diversity preservation.
   */
  private assignCrowdingDistance(
    population: LatheIndividual[],
    objectives: LatheObjective[]
  ): void {
    // Group by rank
    const ranks = new Map<number, LatheIndividual[]>();
    for (const ind of population) {
      const rank = ind.rank ?? 0;
      if (!ranks.has(rank)) ranks.set(rank, []);
      ranks.get(rank)!.push(ind);
    }

    for (const front of Array.from(ranks.values())) {
      this.assignCrowdingDistanceForFront(front, objectives);
    }
  }

  /**
   * Assign crowding distance for a single Pareto front.
   */
  private assignCrowdingDistanceForFront(
    front: LatheIndividual[],
    objectives: LatheObjective[]
  ): void {
    const n = front.length;
    if (n === 0) return;

    // Initialize crowding distance
    for (const ind of front) {
      ind.crowding_distance = 0;
    }

    // Calculate for each objective
    for (let m = 0; m < objectives.length; m++) {
      // Sort by objective m
      const sorted = [...front].sort((a, b) => a.fitness[m] - b.fitness[m]);
      const indices = new Map<LatheIndividual, number>();
      sorted.forEach((ind, i) => indices.set(ind, i));

      // Boundary points get infinite distance
      sorted[0].crowding_distance = Infinity;
      sorted[n - 1].crowding_distance = Infinity;

      const fMin = sorted[0].fitness[m];
      const fMax = sorted[n - 1].fitness[m];
      const range = fMax - fMin || 1;

      // Calculate crowding distance
      for (let i = 1; i < n - 1; i++) {
        if (sorted[i].crowding_distance !== Infinity) {
          sorted[i].crowding_distance! +=
            (sorted[i + 1].fitness[m] - sorted[i - 1].fitness[m]) / range;
        }
      }
    }
  }

  /**
   * Binary tournament selection using crowded comparison operator.
   */
  private crowdedTournament(population: LatheIndividual[]): LatheIndividual {
    const i1 = Math.floor(this.rng.next() * population.length);
    const i2 = Math.floor(this.rng.next() * population.length);

    const a = population[i1];
    const b = population[i2];

    // Compare by rank first
    const rankA = a.rank ?? Infinity;
    const rankB = b.rank ?? Infinity;

    if (rankA < rankB) return this.cloneIndividual(a);
    if (rankB < rankA) return this.cloneIndividual(b);

    // Same rank: prefer higher crowding distance
    const cdA = a.crowding_distance ?? 0;
    const cdB = b.crowding_distance ?? 0;

    return this.cloneIndividual(cdA >= cdB ? a : b);
  }

  /**
   * Get Pareto front from population.
   */
  getParetoFront(
    population: LatheIndividual[],
    objectives: LatheObjective[]
  ): LatheIndividual[] {
    this.fastNonDominatedSort(population, objectives);
    return population.filter((ind) => ind.rank === 0);
  }

  /**
   * Calculate hypervolume indicator (2D/3D only for efficiency).
   * Reference: Zitzler & Thiele (1999)
   */
  private calculateHypervolume(
    front: LatheIndividual[],
    referencePoint: number[],
    objectives: LatheObjective[]
  ): number {
    if (front.length === 0) return 0;
    if (objectives.length > 3) {
      // Approximate for high dimensions
      return this.approximateHypervolume(front, referencePoint, objectives);
    }

    // Normalize objectives
    const normalized = front.map((ind) =>
      objectives.map((obj, i) => {
        const val = ind.fitness[i];
        const ref = referencePoint[i];
        return obj.minimize ? (ref - val) / Math.abs(ref || 1) : (val - ref) / Math.abs(ref || 1);
      })
    );

    if (objectives.length === 2) {
      // 2D: sweep line algorithm
      const sorted = normalized
        .filter((p) => p[0] > 0 && p[1] > 0)
        .sort((a, b) => a[0] - b[0]);

      let hv = 0;
      let prevY = 0;

      for (let i = 0; i < sorted.length; i++) {
        const x = sorted[i][0];
        const y = sorted[i][1];
        const nextX = i + 1 < sorted.length ? sorted[i + 1][0] : 0;
        if (y > prevY) {
          hv += (x - nextX) * y;
          prevY = y;
        }
      }

      return hv;
    }

    // 3D: inclusion-exclusion approximation
    return this.approximateHypervolume(front, referencePoint, objectives);
  }

  /**
   * Approximate hypervolume using Monte Carlo sampling.
   */
  private approximateHypervolume(
    front: LatheIndividual[],
    referencePoint: number[],
    objectives: LatheObjective[],
    samples: number = 10000
  ): number {
    let dominated = 0;

    for (let s = 0; s < samples; s++) {
      const point = objectives.map((obj, i) => {
        const min = Math.min(
          ...front.map((ind) => ind.fitness[i]),
          referencePoint[i]
        );
        const max = Math.max(
          ...front.map((ind) => ind.fitness[i]),
          referencePoint[i]
        );
        return this.rng.uniform(min, max);
      });

      // Check if point is dominated by any front member
      for (const ind of front) {
        let dominates = true;
        for (let i = 0; i < objectives.length; i++) {
          if (objectives[i].minimize) {
            if (ind.fitness[i] > point[i]) {
              dominates = false;
              break;
            }
          } else {
            if (ind.fitness[i] < point[i]) {
              dominates = false;
              break;
            }
          }
        }
        if (dominates) {
          dominated++;
          break;
        }
      }
    }

    // Estimate hypervolume as fraction of reference hypercube
    const volume = objectives.reduce((prod, obj, i) => {
      const min = Math.min(...front.map((ind) => ind.fitness[i]));
      const max = referencePoint[i];
      return prod * Math.abs(max - min);
    }, 1);

    return (dominated / samples) * volume;
  }

  /**
   * Calculate spread/spacing metric for diversity.
   */
  private calculateSpread(
    front: LatheIndividual[],
    objectives: LatheObjective[]
  ): number {
    if (front.length < 2) return 0;

    // Calculate Euclidean distances between consecutive points
    const sorted = [...front].sort((a, b) => a.fitness[0] - b.fitness[0]);
    const distances: number[] = [];

    for (let i = 0; i < sorted.length - 1; i++) {
      let dist = 0;
      for (let m = 0; m < objectives.length; m++) {
        dist += (sorted[i + 1].fitness[m] - sorted[i].fitness[m]) ** 2;
      }
      distances.push(Math.sqrt(dist));
    }

    const avgDist = distances.reduce((s, d) => s + d, 0) / distances.length;
    const variance =
      distances.reduce((s, d) => s + (d - avgDist) ** 2, 0) / distances.length;

    return Math.sqrt(variance); // Lower is better (more uniform spread)
  }

  /**
   * Calculate correlations between objectives.
   */
  private calculateObjectiveCorrelations(
    front: LatheIndividual[],
    objectives: LatheObjective[]
  ): Record<string, Record<string, number>> {
    const correlations: Record<string, Record<string, number>> = {};

    for (let i = 0; i < objectives.length; i++) {
      correlations[objectives[i].name] = {};
      for (let j = 0; j < objectives.length; j++) {
        if (i === j) {
          correlations[objectives[i].name][objectives[j].name] = 1;
        } else {
          const xVals = front.map((ind) => ind.fitness[i]);
          const yVals = front.map((ind) => ind.fitness[j]);
          correlations[objectives[i].name][objectives[j].name] =
            this.correlation(xVals, yVals);
        }
      }
    }

    return correlations;
  }

  /**
   * Pearson correlation coefficient.
   */
  private correlation(x: number[], y: number[]): number {
    const n = x.length;
    if (n < 2) return 0;

    const mx = x.reduce((s, v) => s + v, 0) / n;
    const my = y.reduce((s, v) => s + v, 0) / n;

    let num = 0;
    let dx2 = 0;
    let dy2 = 0;

    for (let i = 0; i < n; i++) {
      const dx = x[i] - mx;
      const dy = y[i] - my;
      num += dx * dy;
      dx2 += dx * dx;
      dy2 += dy * dy;
    }

    const denom = Math.sqrt(dx2 * dy2);
    return denom > 0 ? num / denom : 0;
  }

  /** Count individuals with given rank */
  private getRankCount(population: LatheIndividual[], rank: number): number {
    return population.filter((ind) => ind.rank === rank).length;
  }

  // --------------------------------------------------------------------------
  // MAIN GA EVOLUTION LOOP
  // --------------------------------------------------------------------------

  /**
   * Main evolutionary optimization loop.
   * Supports both single-objective and weighted-sum multi-objective.
   */
  evolve(
    fitnessFunction: (genes: number[]) => number | number[],
    bounds: ParameterBounds[],
    objectives: LatheObjective[],
    config: Partial<LatheGAConfig> = {}
  ): LatheGAResult {
    const cfg = { ...DEFAULT_CONFIG, ...config };
    if (cfg.seed !== undefined) {
      this.rng = new SeededRNG(cfg.seed);
    }

    this.evaluationCount = 0;
    this.uniqueIndividuals = new Set();
    let mutationRate = cfg.mutation_rate;
    let successfulMutations = 0;
    let totalMutations = 0;

    // Initialize population with LHS for better coverage
    let population = this.initializeLatinHypercube(
      cfg.population_size,
      bounds,
      cfg.seed
    );

    // Evaluate initial population
    for (const ind of population) {
      const raw = fitnessFunction(ind.genes);
      ind.fitness = Array.isArray(raw) ? raw : [raw];
      this.evaluationCount++;
      this.uniqueIndividuals.add(this.hashGenes(ind.genes));
    }

    // Sort population by weighted sum fitness
    population.sort((a, b) => this.compareFitness(b, a));

    let best = this.cloneIndividual(population[0]);
    const fitnessHistory: number[][] = [[...best.fitness]];
    const diversityHistory: number[] = [this.calculateDiversity(population)];

    let stagnation = 0;
    let lastBestFitness = this.weightedFitness(best.fitness, objectives);
    let convergenceGeneration: number | null = null;
    let generation = 0;

    while (generation < cfg.max_generations) {
      generation++;

      // Preserve elites
      const elites = this.preserveElites(population, cfg.elite_ratio);
      const nextPopulation: LatheIndividual[] = [...elites];

      // Generate offspring
      while (nextPopulation.length < cfg.population_size) {
        // Selection
        let p1: LatheIndividual;
        let p2: LatheIndividual;

        switch (cfg.selection_method) {
          case "roulette":
            p1 = this.rouletteSelection(population);
            p2 = this.rouletteSelection(population);
            break;
          case "rank":
            p1 = this.rankBasedSelection(population);
            p2 = this.rankBasedSelection(population);
            break;
          case "tournament":
          default:
            p1 = this.tournamentSelection(population, cfg.tournament_size);
            p2 = this.tournamentSelection(population, cfg.tournament_size);
        }

        // Crossover
        let offspring: [LatheIndividual, LatheIndividual];
        if (this.rng.next() < cfg.crossover_rate) {
          switch (cfg.crossover_method) {
            case "single":
              offspring = this.singlePointCrossover(p1, p2, bounds);
              break;
            case "two_point":
              offspring = this.twoPointCrossover(p1, p2, bounds);
              break;
            case "uniform":
              offspring = this.uniformCrossover(p1, p2, bounds);
              break;
            case "arithmetic":
              offspring = this.arithmeticCrossover(p1, p2, bounds);
              break;
            case "blx_alpha":
              offspring = this.blxAlphaCrossover(p1, p2, bounds, cfg.blx_alpha);
              break;
            case "sbx":
            default:
              offspring = this.sbxCrossover(p1, p2, bounds, cfg.sbx_eta);
          }
        } else {
          offspring = [this.cloneIndividual(p1), this.cloneIndividual(p2)];
        }

        // Mutation
        for (let child of offspring) {
          const beforeFitness = this.weightedFitness(child.fitness, objectives);

          switch (cfg.mutation_method) {
            case "uniform":
              child = this.uniformMutation(child, bounds, mutationRate);
              break;
            case "polynomial":
              child = this.polynomialMutation(
                child,
                bounds,
                mutationRate,
                cfg.pm_eta
              );
              break;
            case "cauchy":
              child = this.cauchyMutation(child, bounds, mutationRate, 0.1);
              break;
            case "gaussian":
            default:
              child = this.gaussianMutation(
                child,
                bounds,
                mutationRate,
                cfg.gaussian_sigma
              );
          }

          // Evaluate child
          const raw = fitnessFunction(child.genes);
          child.fitness = Array.isArray(raw) ? raw : [raw];
          child.generation = generation;
          this.evaluationCount++;
          this.uniqueIndividuals.add(this.hashGenes(child.genes));

          // Track mutation success for adaptive rate
          totalMutations++;
          if (
            this.weightedFitness(child.fitness, objectives) > beforeFitness
          ) {
            successfulMutations++;
          }

          nextPopulation.push(child);
          if (nextPopulation.length >= cfg.population_size) break;
        }
      }

      // Trim to population size and sort
      population = nextPopulation.slice(0, cfg.population_size);
      population.sort((a, b) => this.compareFitness(b, a));

      // Update best
      if (this.compareFitness(population[0], best) > 0) {
        best = this.cloneIndividual(population[0]);
      }

      // Record history
      fitnessHistory.push([...best.fitness]);
      diversityHistory.push(this.calculateDiversity(population));

      // Adaptive mutation rate
      if (cfg.adaptive_mutation && totalMutations > 0) {
        const successRate = successfulMutations / totalMutations;
        mutationRate = this.adaptMutationRate(successRate, mutationRate);
        successfulMutations = 0;
        totalMutations = 0;
      }

      // Check convergence
      const currentBestFitness = this.weightedFitness(best.fitness, objectives);
      if (Math.abs(currentBestFitness - lastBestFitness) < cfg.convergence_threshold) {
        stagnation++;
        if (stagnation >= cfg.stagnation_limit) {
          convergenceGeneration = generation;
          break;
        }
      } else {
        stagnation = 0;
      }
      lastBestFitness = currentBestFitness;
    }

    // Calculate statistics
    const avgViolation =
      population.reduce((s, i) => s + i.constraint_violation, 0) /
      population.length;
    const improvementRate =
      fitnessHistory.length > 1
        ? (this.weightedFitness(fitnessHistory[fitnessHistory.length - 1], objectives) -
            this.weightedFitness(fitnessHistory[0], objectives)) /
          fitnessHistory.length
        : 0;

    const statistics: GAStatistics = {
      total_evaluations: this.evaluationCount,
      unique_individuals: this.uniqueIndividuals.size,
      avg_constraint_violation: avgViolation,
      population_diversity: diversityHistory[diversityHistory.length - 1],
      improvement_rate: improvementRate,
      elite_contribution: cfg.elite_ratio,
    };

    log.info(`[LatheGeneticAlgorithm] Evolution completed: generations=${generation}, fitness=${best.fitness[0]?.toFixed(4)}, converged=${convergenceGeneration !== null}`);

    return {
      success: true,
      best_individual: best,
      best_parameters: this.decodeParameters(best.genes, bounds),
      best_fitness: best.fitness,
      generations: generation,
      converged: convergenceGeneration !== null,
      convergence_generation: convergenceGeneration,
      fitness_history: fitnessHistory,
      diversity_history: diversityHistory,
      final_population: population,
      statistics,
    };
  }

  /**
   * Evaluate fitness with constraint handling.
   */
  evaluateFitness(
    individual: LatheIndividual,
    fitnessFunction: (genes: number[]) => number | number[],
    constraints: LatheConstraint[] = []
  ): number[] {
    const raw = fitnessFunction(individual.genes);
    const fitness = Array.isArray(raw) ? raw : [raw];

    // Calculate constraint violations
    let totalViolation = 0;
    for (const constraint of constraints) {
      const violation = constraint.evaluate(individual.genes);
      totalViolation += constraint.penalty * violation;
    }

    individual.constraint_violation = totalViolation;

    // Apply penalty to fitness (for single-objective)
    if (totalViolation > 0 && fitness.length === 1) {
      fitness[0] -= totalViolation;
    }

    return fitness;
  }

  // --------------------------------------------------------------------------
  // MANUFACTURING-SPECIFIC OPTIMIZATION
  // --------------------------------------------------------------------------

  /**
   * Optimize lathe machining parameters for manufacturing objectives.
   * Combines physics-based fitness functions with genetic optimization.
   */
  optimizeParameters(
    input: ManufacturingOptInput
  ): LatheGAResult {
    // Get material properties
    const material = CANONICAL_MATERIAL_DB[input.material] ??
                     CANONICAL_MATERIAL_DB["steel"];
    const isoGroup = input.iso_group ?? material.iso_group;
    // U-LW-A4 (slot:whiskey, 2026-07-05): prefer the per-MATERIAL Kienzle coefficients
    // (enriched onto the material entry from AISI_CUTTING_COEFFICIENTS via buildMaterialPhysics)
    // over the generic per-ISO-GROUP values. e.g. AISI 4140 kc1_1=1950 vs P-group 1800 (~8%):
    // every GA force/power/tool-life number for a named alloy was silently using the wrong
    // constant while the correct one sat on the `material` object already in scope. The
    // per-material value is the more AUTHORITATIVE source — usually higher (e.g. 4140 1950>1800)
    // but sometimes lower (1018 1700, 303 2000, A2 3000 are below their ISO-group average). The
    // goal is ACCURACY, not added margin (safety margin lives in the S(x)/safety-factor layer).
    // Falls back to the ISO group when a material carries no specific coefficient. Mirrors
    // TurningForceEngine's `input.material_kc1_1 ?? KIENZLE_ISO[iso]` precedence. Taylor stays on
    // the ISO group — per-material Taylor is U-LW-A2 (divergent-tables).
    // Honor an explicit input.iso_group override for Kienzle too (arm B P1, 2026-07-05): if the
    // caller pins a DIFFERENT group than the material's natural one, use that group's generic
    // Kienzle (the override intent) — otherwise use the more-accurate per-material coefficient.
    // Without this branch the always-populated material.kc1_1 makes the `?? CANONICAL_KIENZLE`
    // fallback dead, silently ignoring the override for Kienzle while Taylor (below) still honors it
    // — a documented-field regression in an UNSAFE (under-prediction) direction.
    const kienzleGroupOverride = input.iso_group != null && input.iso_group !== material.iso_group;
    const kienzle = kienzleGroupOverride
      ? CANONICAL_KIENZLE[isoGroup]
      : {
          kc1_1: material.kc1_1 ?? CANONICAL_KIENZLE[isoGroup].kc1_1,
          mc: material.mc ?? CANONICAL_KIENZLE[isoGroup].mc,
        };
    const taylor = CANONICAL_TAYLOR[isoGroup];

    // Define bounds based on operation
    const bounds: ParameterBounds[] =
      input.operation === "finishing" ? [...FINISHING_BOUNDS] : [...ROUGHING_BOUNDS];

    // Adjust bounds for machine limits
    bounds[0].max = Math.min(
      bounds[0].max,
      (Math.PI * input.workpiece.diameter_mm * input.machine.max_spindle_rpm) / 1000
    );
    bounds[1].max = Math.min(bounds[1].max, input.machine.max_feed_mm_rev);
    bounds[2].max = Math.min(bounds[2].max, input.tool.max_depth_mm);

    // Define fitness function based on objectives
    const fitnessFunction = (genes: number[]): number[] => {
      const vc = genes[0]; // Cutting speed m/min
      const f = genes[1];  // Feed mm/rev
      const ap = genes[2]; // Depth of cut mm
      const passes = input.operation === "roughing" ? Math.round(genes[3]) : 1;

      // Calculate spindle RPM
      const rpm = Math.min(
        (1000 * vc) / (Math.PI * input.workpiece.diameter_mm),
        input.machine.max_spindle_rpm
      );

      // Kienzle force model: Fc = kc1.1 * ap * f^(1-mc)
      const kc1_1 = kienzle.kc1_1;
      const mc = kienzle.mc;
      const Fc = kc1_1 * ap * Math.pow(f, 1 - mc);

      // Power requirement [kW]
      const power = (Fc * vc) / (60 * 1000);

      // Material removal rate [cm^3/min]
      const mrr = (ap * f * rpm * Math.PI * input.workpiece.diameter_mm) / 1000;

      // Tool life (Taylor): T = (C/Vc)^(1/n)
      const toolLifeRef = input.tool.tool_life_ref_min ?? 60;
      const vcRef = taylor.C * Math.pow(toolLifeRef, taylor.n);
      const toolLife = Math.pow(vcRef / vc, 1 / taylor.n);

      // Surface finish Ra (empirical)
      const Ra = (f * f * 1000) / (8 * input.tool.nose_radius_mm) + 0.2;

      // Cycle time [min]
      const machineLength = input.workpiece.length_mm + 5; // Allow clearance
      const feedRate = f * rpm;
      const cycleTime = (machineLength * passes) / feedRate + passes * 0.1;

      // Cost model
      const machineRate = 1.5; // $/min
      const toolCost = 50;     // $ per insert
      const partsPerTool = Math.max(1, Math.floor(toolLife / cycleTime));
      const costPerPart = cycleTime * machineRate + toolCost / partsPerTool;

      // Map to objectives
      const fitness: number[] = [];
      for (const obj of input.objectives) {
        switch (obj.name.toLowerCase()) {
          case "cycle_time":
            fitness.push(obj.minimize ? -cycleTime : cycleTime);
            break;
          case "surface_finish":
          case "ra":
            fitness.push(obj.minimize ? -Ra : Ra);
            break;
          case "tool_life":
            fitness.push(obj.minimize ? -toolLife : toolLife);
            break;
          case "power":
            fitness.push(obj.minimize ? -power : power);
            break;
          case "cost":
            fitness.push(obj.minimize ? -costPerPart : costPerPart);
            break;
          case "mrr":
            fitness.push(obj.minimize ? -mrr : mrr);
            break;
          case "force":
            fitness.push(obj.minimize ? -Fc : Fc);
            break;
          default:
            fitness.push(0);
        }
      }

      return fitness;
    };

    // Add machine constraints. Copy input.constraints so pushing max_power never mutates a
    // caller-owned array (which, now that the constraints are consumed, would double-count the
    // penalty if the same array reference were reused across calls — arm B P2, U-LW-GA-CONSTRAINTS).
    const constraints: LatheConstraint[] = [...(input.constraints ?? [])];

    // Power constraint
    constraints.push({
      name: "max_power",
      evaluate: (genes: number[]) => {
        const vc = genes[0];
        const f = genes[1];
        const ap = genes[2];
        const Fc = kienzle.kc1_1 * ap * Math.pow(f, 1 - kienzle.mc);
        const power = (Fc * vc) / (60 * 1000);
        return Math.max(0, power - input.machine.max_power_kw);
      },
      penalty: 1000,
    });

    // Run optimization
    const config: Partial<LatheGAConfig> = {
      ...DEFAULT_CONFIG,
      ...input.config,
      population_size: input.config?.population_size ?? 100,
      max_generations: input.config?.max_generations ?? 100,
    };

    // U-LW-GA-CONSTRAINTS (slot:whiskey, 2026-07-05): the `constraints` above (max_power + any
    // input.constraints) were previously BUILT then DISCARDED — evolve() evaluates the raw
    // fitnessFunction and never applied a penalty, so the machine spindle-power limit did NOT bind
    // the recommendation (it could recommend >2x the power budget). Wire them in via a
    // penalty-augmented fitness wrapper (the standard GA exterior-penalty method): each violating
    // solution has penalty*violation subtracted from EVERY objective, so evolve's weighted-sum
    // selection (compareFitness) drives the population to the feasible region. Feasible solutions
    // (violation === 0) are unchanged, so the feasible Pareto structure is preserved. Localized
    // here so evolve()'s signature + its other caller are untouched.
    const constrainedFitness = (genes: number[]): number[] => {
      const raw = fitnessFunction(genes);
      const base = Array.isArray(raw) ? raw : [raw];
      let totalViolation = 0;
      for (const constraint of constraints) {
        const violation = constraint.evaluate(genes);
        if (violation > 0) totalViolation += constraint.penalty * violation;
      }
      return totalViolation > 0 ? base.map((v) => v - totalViolation) : base;
    };

    const result = this.evolve(constrainedFitness, bounds, input.objectives, config);

    // Decode best parameters with meaningful names
    const bestParams = result.best_parameters;
    const decodedParams: LatheParameterSet = {
      cutting_speed_m_min: bestParams["cutting_speed_m_min"],
      feed_mm_rev: bestParams["feed_mm_rev"],
      depth_of_cut_mm: bestParams["depth_of_cut_mm"],
      spindle_rpm: Math.round(
        (1000 * bestParams["cutting_speed_m_min"]) /
          (Math.PI * input.workpiece.diameter_mm)
      ),
      number_of_passes: Math.round(bestParams["number_of_passes"] ?? 1),
      finishing_allowance_mm: bestParams["finishing_allowance_mm"] ?? 0,
    };

    // U-LW-A4: predicted performance for the recommended params, using the SAME per-material
    // Kienzle/Taylor coefficients + formulas the fitness function used (kienzle/taylor above).
    // This surfaces the effect of the per-material coefficient: `evolve` selects on the primary
    // objective's fitness, so a uniform kc1_1 scaling of force/power leaves the selected params
    // unchanged for kc1_1-independent objectives (mrr/cycle_time/Ra) — without this exposure the
    // correction would be unobservable for those common objectives. Computed at the reported
    // (rounded, unclamped) spindle_rpm, so mrr/torque are self-consistent with what the caller sees.
    const vcBest = decodedParams.cutting_speed_m_min;
    const fBest = decodedParams.feed_mm_rev;
    const apBest = decodedParams.depth_of_cut_mm;
    const rpmBest = decodedParams.spindle_rpm;
    const FcBest = kienzle.kc1_1 * apBest * Math.pow(fBest, 1 - kienzle.mc);
    const powerBest = (FcBest * vcBest) / (60 * 1000);
    const toolLifeRef = input.tool.tool_life_ref_min ?? 60;
    const vcRefBest = taylor.C * Math.pow(toolLifeRef, taylor.n);
    // U-LW-GA-CONSTRAINTS P1 (fail-loud): the exterior penalty returns the least-infeasible point
    // when the feasible region is empty/unsampled, so a spindle-power breach must be surfaced
    // explicitly rather than returned silently. A 5% tolerance absorbs the soft-penalty equilibrium
    // sitting marginally over the boundary; anything beyond it is a real "no feasible params" breach.
    const maxPowerKw = input.machine.max_power_kw;
    const POWER_FEASIBLE_TOLERANCE = 1.05;
    const power_feasible = !(maxPowerKw > 0) || powerBest <= maxPowerKw * POWER_FEASIBLE_TOLERANCE;
    const predicted_performance: LatheGAPredictedPerformance = {
      cutting_force_N: FcBest,
      cutting_power_kW: powerBest,
      spindle_torque_Nm: rpmBest > 0 ? (powerBest * 9549) / rpmBest : 0,
      tool_life_min: vcBest > 0 ? Math.pow(vcRefBest / vcBest, 1 / taylor.n) : 0,
      mrr_cm3_min: (apBest * fBest * rpmBest * Math.PI * input.workpiece.diameter_mm) / 1000,
      kc1_1_used: kienzle.kc1_1,
      power_feasible,
      power_warning: power_feasible
        ? undefined
        : `Recommended cutting power ${powerBest.toFixed(2)} kW exceeds machine max_power ` +
          `${maxPowerKw} kW — no power-feasible parameters were found within the given bounds/tool ` +
          `limits. Review machine spindle power, tool, or depth/feed limits before running this recommendation.`,
    };

    // Update result with decoded parameters (cast through unknown for type safety)
    const updatedResult = {
      ...result,
      best_parameters: decodedParams as unknown as Record<string, number>,
      predicted_performance,
    };

    return updatedResult;
  }

  /**
   * Optimize tool sequencing for minimum total machining time.
   * Uses genetic algorithm for operation ordering.
   */
  optimizeToolSequence(
    operations: Array<{
      name: string;
      time_min: number;
      tool_id: string;
      dependencies?: string[];
    }>,
    config: Partial<LatheGAConfig> = {}
  ): {
    sequence: string[];
    total_time: number;
    tool_changes: number;
  } {
    const n = operations.length;
    const cfg = { ...DEFAULT_CONFIG, ...config };

    // Build dependency graph
    const deps = new Map<string, Set<string>>();
    for (const op of operations) {
      deps.set(op.name, new Set(op.dependencies ?? []));
    }

    // Encode: permutation as priorities
    const bounds: ParameterBounds[] = operations.map((op, i) => ({
      name: op.name,
      min: 0,
      max: 1,
      unit: "priority",
    }));

    // Fitness: minimize total time + tool changes
    const toolChangePenalty = 0.5; // minutes per tool change
    const fitnessFunction = (genes: number[]): number => {
      // Convert priorities to sequence
      const indexed = genes.map((g, i) => ({ priority: g, index: i }));
      indexed.sort((a, b) => b.priority - a.priority);
      const sequence = indexed.map((x) => operations[x.index]);

      // Check dependency violations
      const completed = new Set<string>();
      let violations = 0;
      for (const op of sequence) {
        const opDeps = deps.get(op.name);
        if (opDeps) {
          for (const dep of Array.from(opDeps)) {
            if (!completed.has(dep)) {
              violations++;
            }
          }
        }
        completed.add(op.name);
      }

      // Calculate total time with tool changes
      let totalTime = 0;
      let lastTool: string | null = null;
      let toolChanges = 0;

      for (const op of sequence) {
        totalTime += op.time_min;
        if (lastTool !== null && lastTool !== op.tool_id) {
          totalTime += toolChangePenalty;
          toolChanges++;
        }
        lastTool = op.tool_id;
      }

      // Penalty for violations
      totalTime += violations * 100;

      // Return negative (GA maximizes)
      return -totalTime;
    };

    const result = this.evolve(
      fitnessFunction,
      bounds,
      [{ name: "time", minimize: true, weight: 1, unit: "min" }],
      cfg
    );

    // Extract best sequence
    const indexed = result.best_individual.genes.map((g, i) => ({
      priority: g,
      index: i,
    }));
    indexed.sort((a, b) => b.priority - a.priority);
    const sequence = indexed.map((x) => operations[x.index].name);

    // Count tool changes
    let toolChanges = 0;
    let lastTool: string | null = null;
    for (const idx of indexed) {
      const tool = operations[idx.index].tool_id;
      if (lastTool !== null && lastTool !== tool) {
        toolChanges++;
      }
      lastTool = tool;
    }

    const totalTime = -result.best_fitness[0];

    return { sequence, total_time: totalTime, tool_changes: toolChanges };
  }

  /**
   * Optimize multi-pass roughing strategy.
   * Determines optimal number of passes and DOC distribution.
   */
  optimizeMultiPassStrategy(
    totalStock: number,
    constraints: {
      max_doc_mm: number;
      min_doc_mm: number;
      max_passes: number;
      tool_stability_factor: number;
    },
    objectives: LatheObjective[],
    config: Partial<LatheGAConfig> = {}
  ): {
    passes: number[];
    total_passes: number;
    cutting_time_factor: number;
    tool_wear_factor: number;
  } {
    const cfg = { ...DEFAULT_CONFIG, ...config };
    const maxPasses = constraints.max_passes;

    // Encode: array of DOC values (up to max passes)
    const bounds: ParameterBounds[] = Array.from({ length: maxPasses }, (_, i) => ({
      name: `doc_pass_${i + 1}`,
      min: 0,
      max: constraints.max_doc_mm,
      unit: "mm",
    }));

    const fitnessFunction = (genes: number[]): number[] => {
      // Filter active passes (DOC > min)
      const passes = genes.filter((doc) => doc >= constraints.min_doc_mm);
      const totalCut = passes.reduce((s, d) => s + d, 0);

      // Penalty if total cut doesn't match stock
      const stockError = Math.abs(totalCut - totalStock);

      // Cutting time proportional to sum of 1/DOC (shallower = more time)
      const timeFactor = passes.reduce(
        (s, d) => s + 1 / Math.max(d, 0.1),
        0
      );

      // Tool wear increases with deeper cuts (nonlinear)
      const wearFactor = passes.reduce(
        (s, d) => s + Math.pow(d / constraints.max_doc_mm, 1.5),
        0
      );

      // Stability penalty for deep cuts
      const stabilityPenalty = passes.reduce(
        (s, d) =>
          s +
          Math.max(
            0,
            (d - constraints.max_doc_mm * constraints.tool_stability_factor) * 10
          ),
        0
      );

      // Return multi-objective fitness
      return [
        -(timeFactor + stockError * 100 + stabilityPenalty),
        -(wearFactor + stockError * 50),
        -passes.length, // Minimize number of passes
      ];
    };

    const result = this.evolve(fitnessFunction, bounds, objectives, cfg);

    const passes = result.best_individual.genes.filter(
      (doc) => doc >= constraints.min_doc_mm
    );

    return {
      passes: passes.map((p) => Math.round(p * 100) / 100),
      total_passes: passes.length,
      cutting_time_factor: passes.reduce((s, d) => s + 1 / Math.max(d, 0.1), 0),
      tool_wear_factor: passes.reduce(
        (s, d) => s + Math.pow(d / constraints.max_doc_mm, 1.5),
        0
      ),
    };
  }

  // --------------------------------------------------------------------------
  // HELPER METHODS
  // --------------------------------------------------------------------------

  /** Create a new individual */
  private createIndividual(genes: number[], gen: number): LatheIndividual {
    return {
      genes: [...genes],
      fitness: [],
      constraint_violation: 0,
      generation: gen,
      id: this.generateId(),
    };
  }

  /** Clone an individual */
  private cloneIndividual(individual: LatheIndividual): LatheIndividual {
    return {
      genes: [...individual.genes],
      fitness: [...individual.fitness],
      constraint_violation: individual.constraint_violation,
      rank: individual.rank,
      crowding_distance: individual.crowding_distance,
      generation: individual.generation,
      id: this.generateId(),
    };
  }

  /** Generate unique ID */
  private generateId(): string {
    return `ind_${Date.now()}_${Math.floor(this.rng.next() * 100000)}`;
  }

  /** Hash genes for uniqueness tracking */
  private hashGenes(genes: number[]): string {
    return genes.map((g) => g.toFixed(6)).join(",");
  }

  /** Apply bounds to genes */
  private applyBounds(genes: number[], bounds: ParameterBounds[]): number[] {
    return genes.map((g, i) => {
      let val = Math.max(bounds[i].min, Math.min(bounds[i].max, g));
      if (bounds[i].integer) {
        val = Math.round(val);
      }
      return val;
    });
  }

  /** Encode parameter set to genes */
  private encodeParameters(
    params: LatheParameterSet,
    bounds: ParameterBounds[]
  ): number[] {
    return bounds.map((b) => {
      const val = (params as unknown as Record<string, number>)[b.name];
      return val !== undefined ? val : (b.min + b.max) / 2;
    });
  }

  /** Decode genes to parameter dictionary */
  private decodeParameters(
    genes: number[],
    bounds: ParameterBounds[]
  ): Record<string, number> {
    const params: Record<string, number> = {};
    bounds.forEach((b, i) => {
      params[b.name] = bounds[i].integer ? Math.round(genes[i]) : genes[i];
    });
    return params;
  }

  /** Compare fitness (returns positive if a > b) */
  private compareFitness(a: LatheIndividual, b: LatheIndividual): number {
    // Prefer lower constraint violation
    if (a.constraint_violation !== b.constraint_violation) {
      return b.constraint_violation - a.constraint_violation;
    }

    // Compare first fitness value (assumes maximization or negated minimization)
    const fa = a.fitness[0] ?? 0;
    const fb = b.fitness[0] ?? 0;
    return fa - fb;
  }

  /** Calculate weighted sum fitness */
  private weightedFitness(
    fitness: number[],
    objectives: LatheObjective[]
  ): number {
    let sum = 0;
    for (let i = 0; i < fitness.length && i < objectives.length; i++) {
      sum += objectives[i].weight * fitness[i];
    }
    return sum;
  }

  // --------------------------------------------------------------------------
  // PUBLIC UTILITY METHODS
  // --------------------------------------------------------------------------

  /**
   * Get default configuration.
   */
  getDefaultConfig(): LatheGAConfig {
    return { ...DEFAULT_CONFIG };
  }

  /**
   * Get parameter bounds for operation type.
   */
  getBoundsForOperation(
    operation: "roughing" | "finishing"
  ): ParameterBounds[] {
    return operation === "finishing"
      ? [...FINISHING_BOUNDS]
      : [...ROUGHING_BOUNDS];
  }

  /**
   * Adjust bounds for material properties.
   */
  adjustBoundsForMaterial(
    bounds: ParameterBounds[],
    material: MaterialPhysics
  ): ParameterBounds[] {
    const speedBound = bounds.find((b) => b.name === "cutting_speed_m_min");
    if (speedBound) {
      speedBound.min = material.vc_base_roughing * 0.5;
      speedBound.max = material.vc_base_finishing * 1.2;
    }

    return bounds;
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const latheGeneticAlgorithmEngine = new LatheGeneticAlgorithmEngineImpl();
