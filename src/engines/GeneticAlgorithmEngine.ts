/**
 * PRISM MCP Server -- Genetic Algorithm Engine
 *
 * Real-valued genetic algorithm optimizer:
 * - Selection: tournament, roulette
 * - Crossover: single-point, two-point, uniform, BLX-alpha blend
 * - Mutation: Gaussian, uniform
 * - Elitism, convergence detection, stagnation limit
 *
 * Based on MIT 6.034, Stanford CS 221.
 * Ported from PRISM_GA_ENGINE.js (monolith R2.3.1).
 *
 * @module GeneticAlgorithmEngine
 */

// ============================================================================
// TYPES
// ============================================================================

export interface Bounds { min: number; max: number; }

export interface Individual {
  genes: number[];
  fitness: number;
}

export interface GAConfig {
  populationSize?: number;
  maxGenerations?: number;
  mutationRate?: number;
  crossoverRate?: number;
  eliteRatio?: number;
  selection?: "tournament" | "roulette";
  crossover?: "single" | "two" | "uniform" | "blend";
  tournamentSize?: number;
  convergenceThreshold?: number;
  stagnationLimit?: number;
}

export interface GAResult {
  success: boolean;
  bestGenes: number[];
  bestFitness: number;
  generations: number;
  converged: boolean;
  convergenceGeneration: number | null;
  fitnessHistory: number[];
  diversityHistory: number[];
}

// ============================================================================
// ENGINE
// ============================================================================

const DEFAULTS = {
  populationSize: 200,
  maxGenerations: 100,
  mutationRate: 0.01,
  crossoverRate: 0.8,
  eliteRatio: 0.1,
  tournamentSize: 3,
  convergenceThreshold: 1e-6,
  stagnationLimit: 20,
};

class GeneticAlgorithmEngineImpl {

  /** Create random individual within bounds. */
  createIndividual(bounds: Bounds[]): Individual {
    return { genes: bounds.map(b => b.min + Math.random() * (b.max - b.min)), fitness: -Infinity };
  }

  /** Initialize random population. */
  initializePopulation(size: number, bounds: Bounds[]): Individual[] {
    return Array.from({ length: size }, () => this.createIndividual(bounds));
  }

  /** Tournament selection. */
  tournamentSelection(population: Individual[], size: number = DEFAULTS.tournamentSize): Individual {
    let best: Individual | null = null;
    for (let i = 0; i < size; i++) {
      const c = population[Math.floor(Math.random() * population.length)];
      if (!best || c.fitness > best.fitness) best = c;
    }
    return { ...best!, genes: [...best!.genes] };
  }

  /** Roulette wheel (fitness proportionate) selection. */
  rouletteSelection(population: Individual[]): Individual {
    const minF = Math.min(...population.map(p => p.fitness));
    const shift = minF < 0 ? -minF + 1 : 0;
    const total = population.reduce((s, p) => s + p.fitness + shift, 0);
    let spin = Math.random() * total;
    for (const ind of population) {
      spin -= (ind.fitness + shift);
      if (spin <= 0) return { ...ind, genes: [...ind.genes] };
    }
    const last = population[population.length - 1];
    return { ...last, genes: [...last.genes] };
  }

  // ── Crossover operators ──

  singlePointCrossover(p1: Individual, p2: Individual): [Individual, Individual] {
    const pt = Math.floor(Math.random() * p1.genes.length);
    return [
      { genes: [...p1.genes.slice(0, pt), ...p2.genes.slice(pt)], fitness: -Infinity },
      { genes: [...p2.genes.slice(0, pt), ...p1.genes.slice(pt)], fitness: -Infinity },
    ];
  }

  twoPointCrossover(p1: Individual, p2: Individual): [Individual, Individual] {
    let a = Math.floor(Math.random() * p1.genes.length);
    let b = Math.floor(Math.random() * p1.genes.length);
    if (a > b) [a, b] = [b, a];
    return [
      { genes: [...p1.genes.slice(0, a), ...p2.genes.slice(a, b), ...p1.genes.slice(b)], fitness: -Infinity },
      { genes: [...p2.genes.slice(0, a), ...p1.genes.slice(a, b), ...p2.genes.slice(b)], fitness: -Infinity },
    ];
  }

  uniformCrossover(p1: Individual, p2: Individual, ratio: number = 0.5): [Individual, Individual] {
    const g1: number[] = [], g2: number[] = [];
    for (let i = 0; i < p1.genes.length; i++) {
      if (Math.random() < ratio) { g1.push(p1.genes[i]); g2.push(p2.genes[i]); }
      else { g1.push(p2.genes[i]); g2.push(p1.genes[i]); }
    }
    return [{ genes: g1, fitness: -Infinity }, { genes: g2, fitness: -Infinity }];
  }

  blendCrossover(p1: Individual, p2: Individual, alpha: number, bounds: Bounds[]): [Individual, Individual] {
    const g1: number[] = [], g2: number[] = [];
    for (let i = 0; i < p1.genes.length; i++) {
      const lo = Math.min(p1.genes[i], p2.genes[i]);
      const hi = Math.max(p1.genes[i], p2.genes[i]);
      const range = hi - lo;
      const lower = Math.max(bounds[i].min, lo - alpha * range);
      const upper = Math.min(bounds[i].max, hi + alpha * range);
      g1.push(lower + Math.random() * (upper - lower));
      g2.push(lower + Math.random() * (upper - lower));
    }
    return [{ genes: g1, fitness: -Infinity }, { genes: g2, fitness: -Infinity }];
  }

  // ── Mutation operators ──

  gaussianMutation(ind: Individual, bounds: Bounds[], rate: number = DEFAULTS.mutationRate, sigma: number = 0.1): Individual {
    const genes = ind.genes.map((g, i) => {
      if (Math.random() < rate) {
        const range = bounds[i].max - bounds[i].min;
        return Math.max(bounds[i].min, Math.min(bounds[i].max, g + (Math.random() * 2 - 1) * sigma * range));
      }
      return g;
    });
    return { genes, fitness: -Infinity };
  }

  uniformMutation(ind: Individual, bounds: Bounds[], rate: number = DEFAULTS.mutationRate): Individual {
    const genes = ind.genes.map((g, i) =>
      Math.random() < rate ? bounds[i].min + Math.random() * (bounds[i].max - bounds[i].min) : g,
    );
    return { genes, fitness: -Infinity };
  }

  // ── Main optimizer ──

  optimize(fitnessFunction: (genes: number[]) => number, bounds: Bounds[], config: GAConfig = {}): GAResult {
    const popSize = config.populationSize ?? DEFAULTS.populationSize;
    const maxGen = config.maxGenerations ?? DEFAULTS.maxGenerations;
    const mutRate = config.mutationRate ?? DEFAULTS.mutationRate;
    const cxRate = config.crossoverRate ?? DEFAULTS.crossoverRate;
    const eliteR = config.eliteRatio ?? DEFAULTS.eliteRatio;
    const selMethod = config.selection ?? "tournament";
    const cxMethod = config.crossover ?? "blend";
    const convThresh = config.convergenceThreshold ?? DEFAULTS.convergenceThreshold;
    const stagLimit = config.stagnationLimit ?? DEFAULTS.stagnationLimit;

    let pop = this.initializePopulation(popSize, bounds);
    for (const ind of pop) ind.fitness = fitnessFunction(ind.genes);
    pop.sort((a, b) => b.fitness - a.fitness);

    let best: Individual = { ...pop[0], genes: [...pop[0].genes] };
    const fitnessHistory = [best.fitness];
    const diversityHistory: number[] = [];
    let stag = 0, lastBest = best.fitness, convGen: number | null = null;

    for (let gen = 0; gen < maxGen; gen++) {
      const next: Individual[] = [];
      const eliteN = Math.floor(popSize * eliteR);
      for (let i = 0; i < eliteN; i++) next.push({ ...pop[i], genes: [...pop[i].genes] });

      while (next.length < popSize) {
        const p1 = selMethod === "tournament" ? this.tournamentSelection(pop) : this.rouletteSelection(pop);
        const p2 = selMethod === "tournament" ? this.tournamentSelection(pop) : this.rouletteSelection(pop);

        let offspring: [Individual, Individual];
        if (Math.random() < cxRate) {
          switch (cxMethod) {
            case "single": offspring = this.singlePointCrossover(p1, p2); break;
            case "two": offspring = this.twoPointCrossover(p1, p2); break;
            case "uniform": offspring = this.uniformCrossover(p1, p2); break;
            default: offspring = this.blendCrossover(p1, p2, 0.5, bounds); break;
          }
        } else {
          offspring = [{ genes: [...p1.genes], fitness: -Infinity }, { genes: [...p2.genes], fitness: -Infinity }];
        }

        for (const child of offspring) {
          next.push(this.gaussianMutation(child, bounds, mutRate));
          if (next.length >= popSize) break;
        }
      }

      pop = next.slice(0, popSize);
      for (const ind of pop) { if (ind.fitness === -Infinity) ind.fitness = fitnessFunction(ind.genes); }
      pop.sort((a, b) => b.fitness - a.fitness);

      if (pop[0].fitness > best.fitness) best = { ...pop[0], genes: [...pop[0].genes] };
      fitnessHistory.push(best.fitness);

      const avg = pop.reduce((s, p) => s + p.fitness, 0) / popSize;
      diversityHistory.push(Math.sqrt(pop.reduce((s, p) => s + (p.fitness - avg) ** 2, 0) / popSize));

      if (Math.abs(best.fitness - lastBest) < convThresh) {
        if (++stag >= stagLimit) { convGen = gen; break; }
      } else { stag = 0; }
      lastBest = best.fitness;
    }

    return {
      success: true,
      bestGenes: best.genes,
      bestFitness: best.fitness,
      generations: fitnessHistory.length - 1,
      converged: convGen !== null,
      convergenceGeneration: convGen,
      fitnessHistory,
      diversityHistory,
    };
  }
}

export const geneticAlgorithmEngine = new GeneticAlgorithmEngineImpl();
