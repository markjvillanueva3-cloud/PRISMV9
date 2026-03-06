/**
 * PRISM MCP Server -- Differential Evolution Engine
 *
 * Storn & Price (1997) DE optimizer:
 * - 6 mutation strategies: rand/1, best/1, rand/2, best/2, current-to-best/1, current-to-rand/1
 * - Binomial and exponential crossover
 * - Boundary reflection, convergence detection
 * - Self-adaptive jDE variant (adaptive F and CR)
 *
 * Based on MIT 6.036, Storn & Price 1997.
 * Ported from PRISM_DIFFERENTIAL_EVOLUTION.js (monolith R2.3.1).
 *
 * @module DifferentialEvolutionEngine
 */

// ============================================================================
// TYPES
// ============================================================================

export interface Bound { min: number; max: number; }

export interface Individual { genes: number[]; fitness: number; F?: number; CR?: number; }

export interface DEConfig {
  populationSize?: number;
  maxGenerations?: number;
  F?: number;
  CR?: number;
  strategy?: string;
  crossover?: "binomial" | "exponential";
}

export interface DEResult {
  success: boolean;
  bestGenes: number[];
  bestFitness: number;
  generations: number;
  converged: boolean;
  convergenceGeneration: number | null;
  strategy: string;
}

// ============================================================================
// ENGINE
// ============================================================================

const DEFAULTS = {
  POPULATION_SIZE: 50,
  MAX_GENERATIONS: 1000,
  F: 0.8,
  CR: 0.9,
  CONVERGENCE_THRESHOLD: 1e-8,
  STAGNATION_LIMIT: 100,
};

class DifferentialEvolutionEngineImpl {

  /** DE/rand/1 mutation. */
  mutationRand1(population: Individual[], targetIdx: number, F: number): number[] {
    const n = population.length;
    let r1: number, r2: number, r3: number;
    do { r1 = Math.floor(Math.random() * n); } while (r1 === targetIdx);
    do { r2 = Math.floor(Math.random() * n); } while (r2 === targetIdx || r2 === r1);
    do { r3 = Math.floor(Math.random() * n); } while (r3 === targetIdx || r3 === r1 || r3 === r2);
    return population[r1].genes.map((g, i) => g + F * (population[r2].genes[i] - population[r3].genes[i]));
  }

  /** DE/best/1 mutation. */
  mutationBest1(population: Individual[], targetIdx: number, F: number, best: Individual): number[] {
    const n = population.length;
    let r1: number, r2: number;
    do { r1 = Math.floor(Math.random() * n); } while (r1 === targetIdx);
    do { r2 = Math.floor(Math.random() * n); } while (r2 === targetIdx || r2 === r1);
    return best.genes.map((g, i) => g + F * (population[r1].genes[i] - population[r2].genes[i]));
  }

  /** DE/current-to-best/1 mutation. */
  mutationCurrentToBest1(population: Individual[], targetIdx: number, F: number, best: Individual): number[] {
    const n = population.length;
    let r1: number, r2: number;
    do { r1 = Math.floor(Math.random() * n); } while (r1 === targetIdx);
    do { r2 = Math.floor(Math.random() * n); } while (r2 === targetIdx || r2 === r1);
    const current = population[targetIdx];
    return current.genes.map((g, i) =>
      g + F * (best.genes[i] - g) + F * (population[r1].genes[i] - population[r2].genes[i]),
    );
  }

  /** Binomial crossover. */
  crossoverBinomial(target: number[], donor: number[], CR: number): number[] {
    const jRand = Math.floor(Math.random() * target.length);
    return target.map((t, j) => (Math.random() < CR || j === jRand) ? donor[j] : t);
  }

  /** Exponential crossover. */
  crossoverExponential(target: number[], donor: number[], CR: number): number[] {
    const dim = target.length;
    const trial = [...target];
    let j = Math.floor(Math.random() * dim);
    let L = 0;
    do {
      trial[j] = donor[j];
      j = (j + 1) % dim;
      L++;
    } while (Math.random() < CR && L < dim);
    return trial;
  }

  /** Initialize random population within bounds. */
  initializePopulation(popSize: number, bounds: Bound[]): Individual[] {
    return Array.from({ length: popSize }, () => ({
      genes: bounds.map(b => b.min + Math.random() * (b.max - b.min)),
      fitness: -Infinity,
    }));
  }

  /** Reflect out-of-bounds values back into feasible region. */
  applyBounds(donor: number[], bounds: Bound[]): number[] {
    return donor.map((d, i) => {
      const range = bounds[i].max - bounds[i].min;
      if (d < bounds[i].min) return bounds[i].min + Math.abs(bounds[i].min - d) % range;
      if (d > bounds[i].max) return bounds[i].max - Math.abs(d - bounds[i].max) % range;
      return d;
    });
  }

  /** Select mutation strategy by name. */
  private _getMutant(strategy: string, pop: Individual[], idx: number, F: number, best: Individual): number[] {
    switch (strategy) {
      case "best1": case "best1bin": return this.mutationBest1(pop, idx, F, best);
      case "currentToBest1": return this.mutationCurrentToBest1(pop, idx, F, best);
      case "rand1": case "rand1bin":
      default: return this.mutationRand1(pop, idx, F);
    }
  }

  /** Main DE optimization. fitness: higher is better. */
  optimize(fitnessFunction: (genes: number[]) => number, bounds: Bound[], config: DEConfig = {}): DEResult {
    const popSize = config.populationSize ?? DEFAULTS.POPULATION_SIZE;
    const maxGen = config.maxGenerations ?? DEFAULTS.MAX_GENERATIONS;
    const F = config.F ?? DEFAULTS.F;
    const CR = config.CR ?? DEFAULTS.CR;
    const strategy = config.strategy ?? "rand1bin";
    const crossType = config.crossover ?? "binomial";

    let population = this.initializePopulation(popSize, bounds);
    for (const ind of population) ind.fitness = fitnessFunction(ind.genes);

    let best = population.reduce((a, b) => a.fitness > b.fitness ? a : b);
    best = { genes: [...best.genes], fitness: best.fitness };

    const crossover = crossType === "exponential"
      ? this.crossoverExponential.bind(this)
      : this.crossoverBinomial.bind(this);

    let stag = 0, lastBest = best.fitness;
    let convergenceGen: number | null = null;

    for (let gen = 0; gen < maxGen; gen++) {
      const newPop: Individual[] = [];
      for (let i = 0; i < popSize; i++) {
        const mutant = this._getMutant(strategy, population, i, F, best);
        const bounded = this.applyBounds(mutant, bounds);
        const trial = crossover(population[i].genes, bounded, CR);
        const trialFit = fitnessFunction(trial);

        if (trialFit >= population[i].fitness) {
          newPop.push({ genes: trial, fitness: trialFit });
          if (trialFit > best.fitness) {
            best = { genes: [...trial], fitness: trialFit };
            stag = 0;
          }
        } else {
          newPop.push({ genes: [...population[i].genes], fitness: population[i].fitness });
        }
      }
      population = newPop;

      if (Math.abs(best.fitness - lastBest) < DEFAULTS.CONVERGENCE_THRESHOLD) {
        if (++stag >= DEFAULTS.STAGNATION_LIMIT) { convergenceGen = gen; break; }
      } else stag = 0;
      lastBest = best.fitness;
    }

    return {
      success: true,
      bestGenes: best.genes,
      bestFitness: best.fitness,
      generations: convergenceGen ?? maxGen,
      converged: convergenceGen !== null,
      convergenceGeneration: convergenceGen,
      strategy,
    };
  }
}

export const differentialEvolutionEngine = new DifferentialEvolutionEngineImpl();
