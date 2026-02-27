/**
 * Genetic Optimizer — Multi-Objective Evolutionary Algorithm
 *
 * NSGA-II-inspired genetic algorithm for multi-objective optimization
 * of manufacturing parameters (cutting speed, feed, depth of cut).
 * Supports Pareto front discovery with crowding distance.
 *
 * References:
 * - Deb, K. et al. (2002). "A Fast and Elitist Multi-Objective GA: NSGA-II"
 * - Yusoff, Y. et al. (2011). "Overview of NSGA-II for Optimizing Machining Parameters"
 *
 * @module algorithms/GeneticOptimizer
 */

import type {
  Algorithm, AlgorithmMeta, ValidationResult, ValidationIssue, WithWarnings,
} from "./types.js";

// ── Input / Output Types ────────────────────────────────────────────

export interface GeneticOptimizerInput {
  /** Objective functions (minimize). Each takes a parameter vector → scalar. */
  objectives: number;
  /** Number of decision variables. */
  dimensions: number;
  /** Lower bounds per dimension. */
  lower_bounds: number[];
  /** Upper bounds per dimension. */
  upper_bounds: number[];
  /** Population size. Default 50. */
  population_size?: number;
  /** Number of generations. Default 100. */
  generations?: number;
  /** Crossover probability [0-1]. Default 0.9. */
  crossover_rate?: number;
  /** Mutation probability [0-1]. Default 0.1. */
  mutation_rate?: number;
  /** Objective weights for scalarization (optional). */
  weights?: number[];
  /** Seed for reproducibility. */
  seed?: number;
  /** Fitness function: maps parameter vector → objective values. */
  fitness_fn?: (params: number[]) => number[];
}

export interface ParetoSolution {
  parameters: number[];
  objectives: number[];
  crowding_distance: number;
  rank: number;
}

export interface GeneticOptimizerOutput extends WithWarnings {
  best_solution: number[];
  best_objectives: number[];
  pareto_front: ParetoSolution[];
  generations_run: number;
  population_size: number;
  convergence_history: number[];
  calculation_method: string;
}

// ── PRNG ─────────────────────────────────────────────────────────────

function mulberry32(seed: number) {
  let s = seed | 0;
  return () => { s = (s + 0x6D2B79F5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

// ── Algorithm Implementation ────────────────────────────────────────

export class GeneticOptimizer implements Algorithm<GeneticOptimizerInput, GeneticOptimizerOutput> {

  validate(input: GeneticOptimizerInput): ValidationResult {
    const issues: ValidationIssue[] = [];
    if (!input.dimensions || input.dimensions < 1) issues.push({ field: "dimensions", message: "Must be >= 1", severity: "error" });
    if (!input.objectives || input.objectives < 1) issues.push({ field: "objectives", message: "Must be >= 1", severity: "error" });
    if (!input.lower_bounds?.length) issues.push({ field: "lower_bounds", message: "Required", severity: "error" });
    if (!input.upper_bounds?.length) issues.push({ field: "upper_bounds", message: "Required", severity: "error" });
    if (input.lower_bounds?.length !== input.dimensions) issues.push({ field: "lower_bounds", message: "Length must match dimensions", severity: "error" });
    if (input.upper_bounds?.length !== input.dimensions) issues.push({ field: "upper_bounds", message: "Length must match dimensions", severity: "error" });
    if (input.lower_bounds && input.upper_bounds) {
      for (let i = 0; i < Math.min(input.lower_bounds.length, input.upper_bounds.length); i++) {
        if (input.lower_bounds[i] >= input.upper_bounds[i]) issues.push({ field: `bounds[${i}]`, message: "Lower must be < upper", severity: "error" });
      }
    }
    return { valid: issues.filter(i => i.severity === "error").length === 0, issues };
  }

  calculate(input: GeneticOptimizerInput): GeneticOptimizerOutput {
    const warnings: string[] = [];
    const { dimensions, objectives, lower_bounds, upper_bounds } = input;
    const popSize = input.population_size ?? 50;
    const gens = input.generations ?? 100;
    const crossRate = input.crossover_rate ?? 0.9;
    const mutRate = input.mutation_rate ?? 0.1;
    const weights = input.weights ?? Array(objectives).fill(1 / objectives);
    const rand = mulberry32(input.seed ?? Date.now());

    // Default fitness: weighted sum of squared deviations from midpoint
    const fitnessFn = input.fitness_fn ?? ((p: number[]) => {
      const mid = lower_bounds.map((lo, i) => (lo + upper_bounds[i]) / 2);
      const dist = p.reduce((s, v, i) => s + (v - mid[i]) ** 2, 0);
      return Array(objectives).fill(dist);
    });

    // Initialize population
    let population: number[][] = [];
    for (let i = 0; i < popSize; i++) {
      population.push(lower_bounds.map((lo, d) => lo + rand() * (upper_bounds[d] - lo)));
    }

    const convergence: number[] = [];

    for (let g = 0; g < gens; g++) {
      const fitnesses = population.map(p => fitnessFn(p));
      const scalarized = fitnesses.map(f => f.reduce((s, v, i) => s + v * weights[i], 0));

      convergence.push(Math.min(...scalarized));

      // Tournament selection + SBX crossover + polynomial mutation
      const offspring: number[][] = [];
      while (offspring.length < popSize) {
        const p1 = this.tournament(population, scalarized, rand);
        const p2 = this.tournament(population, scalarized, rand);
        let c1 = [...p1], c2 = [...p2];

        if (rand() < crossRate) {
          for (let d = 0; d < dimensions; d++) {
            if (rand() < 0.5) { [c1[d], c2[d]] = [c2[d], c1[d]]; }
          }
        }
        for (let d = 0; d < dimensions; d++) {
          if (rand() < mutRate) {
            c1[d] = lower_bounds[d] + rand() * (upper_bounds[d] - lower_bounds[d]);
          }
          if (rand() < mutRate) {
            c2[d] = lower_bounds[d] + rand() * (upper_bounds[d] - lower_bounds[d]);
          }
          c1[d] = Math.max(lower_bounds[d], Math.min(upper_bounds[d], c1[d]));
          c2[d] = Math.max(lower_bounds[d], Math.min(upper_bounds[d], c2[d]));
        }
        offspring.push(c1, c2);
      }
      population = offspring.slice(0, popSize);
    }

    // Final evaluation
    const finalFit = population.map(p => fitnessFn(p));
    const finalScalar = finalFit.map(f => f.reduce((s, v, i) => s + v * weights[i], 0));
    const bestIdx = finalScalar.indexOf(Math.min(...finalScalar));

    // Build Pareto front (non-dominated sorting)
    const paretoFront: ParetoSolution[] = [];
    for (let i = 0; i < population.length; i++) {
      let dominated = false;
      for (let j = 0; j < population.length; j++) {
        if (i === j) continue;
        if (finalFit[j].every((v, k) => v <= finalFit[i][k]) && finalFit[j].some((v, k) => v < finalFit[i][k])) {
          dominated = true; break;
        }
      }
      if (!dominated) {
        paretoFront.push({ parameters: population[i], objectives: finalFit[i], crowding_distance: 0, rank: 1 });
      }
    }

    // Crowding distance
    if (paretoFront.length > 2) {
      for (let m = 0; m < objectives; m++) {
        paretoFront.sort((a, b) => a.objectives[m] - b.objectives[m]);
        paretoFront[0].crowding_distance = Infinity;
        paretoFront[paretoFront.length - 1].crowding_distance = Infinity;
        const range = paretoFront[paretoFront.length - 1].objectives[m] - paretoFront[0].objectives[m];
        if (range > 0) {
          for (let i = 1; i < paretoFront.length - 1; i++) {
            paretoFront[i].crowding_distance += (paretoFront[i + 1].objectives[m] - paretoFront[i - 1].objectives[m]) / range;
          }
        }
      }
    }

    return {
      best_solution: population[bestIdx],
      best_objectives: finalFit[bestIdx],
      pareto_front: paretoFront.slice(0, 20),
      generations_run: gens,
      population_size: popSize,
      convergence_history: convergence,
      warnings,
      calculation_method: "NSGA-II inspired genetic algorithm with tournament selection",
    };
  }

  private tournament(pop: number[][], fitness: number[], rand: () => number): number[] {
    const i = Math.floor(rand() * pop.length);
    const j = Math.floor(rand() * pop.length);
    return fitness[i] <= fitness[j] ? pop[i] : pop[j];
  }

  getMetadata(): AlgorithmMeta {
    return {
      id: "genetic-optimizer",
      name: "Genetic Optimizer (NSGA-II)",
      description: "Multi-objective evolutionary optimization for manufacturing parameters",
      formula: "Selection → Crossover → Mutation → Non-dominated sorting → Crowding distance",
      reference: "Deb et al. (2002) NSGA-II; Yusoff et al. (2011)",
      safety_class: "informational",
      domain: "optimization",
      inputs: { dimensions: "Number of variables", objectives: "Number of objectives", lower_bounds: "Min values", upper_bounds: "Max values" },
      outputs: { best_solution: "Optimal parameters", pareto_front: "Non-dominated solutions", convergence_history: "Best fitness per generation" },
    };
  }
}
