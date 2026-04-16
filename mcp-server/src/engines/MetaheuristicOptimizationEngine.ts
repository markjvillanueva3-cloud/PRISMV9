// @ts-nocheck
/**
 * MetaheuristicOptimizationEngine
 *
 * Implements 5 metaheuristic optimization algorithms for manufacturing parameter
 * optimization, toolpath planning, and process tuning:
 *
 * 1. Genetic Algorithm (GA) — Holland 1975, Deb & Agrawal 1995 (SBX)
 * 2. Differential Evolution (DE) — Storn & Price 1997
 * 3. Particle Swarm Optimization (PSO) — Kennedy & Eberhart 1995
 * 4. Simulated Annealing (SA) — Kirkpatrick, Gelatt & Vecchi 1983
 * 5. Bayesian Optimization (BO) — Mockus 1989, Jones et al. 1998 (EGO)
 *
 * All methods use a seeded Park-Miller PRNG (Lehmer 1969) for reproducibility.
 */

// ─── Seeded PRNG (Park-Miller / Lehmer LCG) ────────────────────────────────

/**
 * Park-Miller multiplicative LCG.
 * s(n+1) = (s(n) * 16807) mod (2^31 - 1)
 * Period: 2^31 - 2. Ref: Park & Miller, CACM 1988.
 */
class SeededRNG {
  private state: number;

  constructor(seed: number = 42) {
    this.state = seed % 2147483647;
    if (this.state <= 0) this.state += 2147483646;
  }

  /** Returns uniform random in (0, 1). */
  next(): number {
    this.state = (this.state * 16807) % 2147483647;
    return this.state / 2147483647;
  }

  /** Returns uniform random in [lo, hi]. */
  uniform(lo: number, hi: number): number {
    return lo + (hi - lo) * this.next();
  }

  /** Returns approximate Gaussian via Box-Muller transform. */
  gaussian(mean: number = 0, std: number = 1): number {
    const u1 = this.next();
    const u2 = this.next();
    const z = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
    return mean + std * z;
  }

  /** Returns random integer in [lo, hi] inclusive. */
  randInt(lo: number, hi: number): number {
    return Math.floor(this.uniform(lo, hi + 1));
  }
}

// ─── Shared Types ───────────────────────────────────────────────────────────

export type ObjectiveFunction = (x: number[]) => number;
export type Bounds = [number, number][];

// ─── GA Types ───────────────────────────────────────────────────────────────

/**
 * Input parameters for the Genetic Algorithm.
 * @see Holland, J.H. (1975) "Adaptation in Natural and Artificial Systems"
 */
export interface GAInput {
  /** Objective function to minimize. */
  objectiveFn: ObjectiveFunction;
  /** Number of decision variables. */
  dimensions: number;
  /** Population size. */
  popSize: number;
  /** Maximum number of generations. */
  maxGenerations: number;
  /** Variable bounds [[lo,hi], ...]. */
  bounds: Bounds;
  /** Crossover probability (default 0.9). */
  crossoverRate?: number;
  /** Mutation probability per gene (default 1/dimensions). */
  mutationRate?: number;
  /** Tournament selection size (default 3). */
  tournamentSize?: number;
  /** Number of elite individuals preserved (default 2). */
  elitismCount?: number;
  /** RNG seed (default 42). */
  seed?: number;
}

export interface GAResult {
  bestSolution: number[];
  bestFitness: number;
  convergenceHistory: number[];
  finalPopulation: number[][];
  generations: number;
}

// ─── DE Types ───────────────────────────────────────────────────────────────

/**
 * Input parameters for Differential Evolution (DE/rand/1/bin).
 * @see Storn, R. & Price, K. (1997) "Differential Evolution — A Simple and
 *      Efficient Heuristic for Global Optimization over Continuous Spaces"
 */
export interface DEInput {
  objectiveFn: ObjectiveFunction;
  dimensions: number;
  popSize: number;
  maxGenerations: number;
  bounds: Bounds;
  /** Mutation/scaling factor F (default 0.8). */
  F?: number;
  /** Crossover rate CR (default 0.9). */
  CR?: number;
  seed?: number;
}

export interface DEResult {
  bestSolution: number[];
  bestFitness: number;
  convergenceHistory: number[];
  generations: number;
}

// ─── PSO Types ──────────────────────────────────────────────────────────────

/**
 * Input parameters for Particle Swarm Optimization.
 * @see Kennedy, J. & Eberhart, R. (1995) "Particle Swarm Optimization"
 */
export interface PSOInput {
  objectiveFn: ObjectiveFunction;
  dimensions: number;
  swarmSize: number;
  maxIterations: number;
  bounds: Bounds;
  /** Cognitive coefficient c1 (default 2.0). */
  c1?: number;
  /** Social coefficient c2 (default 2.0). */
  c2?: number;
  /** Initial inertia weight (default 0.9). */
  wStart?: number;
  /** Final inertia weight (default 0.4). */
  wEnd?: number;
  seed?: number;
}

export interface PSOResult {
  bestPosition: number[];
  bestFitness: number;
  convergenceHistory: number[];
  iterations: number;
}

// ─── SA Types ───────────────────────────────────────────────────────────────

/**
 * Input parameters for Simulated Annealing.
 * @see Kirkpatrick, S., Gelatt, C.D. & Vecchi, M.P. (1983)
 *      "Optimization by Simulated Annealing", Science 220(4598)
 */
export interface SAInput {
  objectiveFn: ObjectiveFunction;
  /** Starting point. */
  initialSolution: number[];
  /** Initial temperature T0. */
  initialTemp: number;
  /** Cooling rate alpha in (0,1); T(k+1) = T(k)*alpha. */
  coolingRate: number;
  /** Maximum number of iterations. */
  maxIterations: number;
  /** Gaussian perturbation step size (std dev, default 1.0). */
  stepSize?: number;
  /** Variable bounds for clamping (optional). */
  bounds?: Bounds;
  seed?: number;
}

export interface SAResult {
  bestSolution: number[];
  bestEnergy: number;
  convergenceHistory: number[];
  finalTemperature: number;
  iterations: number;
}

// ─── Bayesian Optimization Types ────────────────────────────────────────────

/**
 * Input parameters for Bayesian Optimization with Gaussian Process surrogate.
 * @see Mockus, J. (1989) "Bayesian Approach to Global Optimization"
 * @see Jones, D.R., Schonlau, M. & Welch, W.J. (1998)
 *      "Efficient Global Optimization of Expensive Black-Box Functions"
 */
export interface BayesOptInput {
  objectiveFn: ObjectiveFunction;
  dimensions: number;
  bounds: Bounds;
  /** Number of initial Latin Hypercube samples (default 5*dimensions). */
  nInitial?: number;
  /** Number of BO iterations after initial sampling (default 25). */
  maxIterations?: number;
  /** Squared-exponential kernel length scale (default 1.0). */
  lengthScale?: number;
  /** Signal variance (default 1.0). */
  signalVariance?: number;
  /** Observation noise variance (default 1e-6). */
  noiseVariance?: number;
  /** Number of candidate points for acquisition maximization (default 1000). */
  nCandidates?: number;
  seed?: number;
}

export interface BayesOptResult {
  bestSolution: number[];
  bestValue: number;
  observationsX: number[][];
  observationsY: number[];
  convergenceHistory: number[];
}

// ─── Linear Algebra Helpers ─────────────────────────────────────────────────

/**
 * Cholesky decomposition of a symmetric positive-definite matrix A.
 * Returns lower-triangular L such that A = L * L^T.
 * Uses the Cholesky-Banachiewicz algorithm.
 */
function choleskyDecomposition(A: number[][]): number[][] {
  const n = A.length;
  const L: number[][] = Array.from({ length: n }, () => new Array(n).fill(0));

  for (let i = 0; i < n; i++) {
    for (let j = 0; j <= i; j++) {
      let sum = 0;
      for (let k = 0; k < j; k++) {
        sum += L[i][k] * L[j][k];
      }
      if (i === j) {
        const diag = A[i][i] - sum;
        L[i][j] = Math.sqrt(Math.max(diag, 1e-10));
      } else {
        L[i][j] = (A[i][j] - sum) / L[j][j];
      }
    }
  }
  return L;
}

/**
 * Solve L * x = b where L is lower triangular (forward substitution).
 */
function forwardSolve(L: number[][], b: number[]): number[] {
  const n = b.length;
  const x = new Array(n).fill(0);
  for (let i = 0; i < n; i++) {
    let sum = 0;
    for (let j = 0; j < i; j++) {
      sum += L[i][j] * x[j];
    }
    x[i] = (b[i] - sum) / L[i][i];
  }
  return x;
}

/**
 * Solve L^T * x = b where L is lower triangular (backward substitution).
 */
function backwardSolve(L: number[][], b: number[]): number[] {
  const n = b.length;
  const x = new Array(n).fill(0);
  for (let i = n - 1; i >= 0; i--) {
    let sum = 0;
    for (let j = i + 1; j < n; j++) {
      sum += L[j][i] * x[j];
    }
    x[i] = (b[i] - sum) / L[i][i];
  }
  return x;
}

/**
 * Solve A * x = b via Cholesky decomposition for SPD matrix A.
 */
function choleskySolve(A: number[][], b: number[]): number[] {
  const L = choleskyDecomposition(A);
  const y = forwardSolve(L, b);
  return backwardSolve(L, y);
}

/**
 * Compute dot product of two vectors.
 */
function dot(a: number[], b: number[]): number {
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    sum += a[i] * b[i];
  }
  return sum;
}

/**
 * Clamp value x to [lo, hi].
 */
function clamp(x: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, x));
}

/**
 * Clamp a solution vector to the given bounds.
 */
function clampToBounds(x: number[], bounds: Bounds): number[] {
  return x.map((v, i) => clamp(v, bounds[i][0], bounds[i][1]));
}

/**
 * Standard normal CDF approximation (Abramowitz & Stegun 26.2.17).
 */
function normalCDF(x: number): number {
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;

  const sign = x < 0 ? -1 : 1;
  const t = 1.0 / (1.0 + p * Math.abs(x));
  const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x / 2);
  return 0.5 * (1.0 + sign * y);
}

/**
 * Standard normal PDF.
 */
function normalPDF(x: number): number {
  return Math.exp(-0.5 * x * x) / Math.sqrt(2.0 * Math.PI);
}

// ─── Engine ─────────────────────────────────────────────────────────────────

export class MetaheuristicOptimizationEngine {
  private calculations = 0;

  /**
   * Genetic Algorithm with real-coded chromosomes, SBX crossover,
   * polynomial mutation, tournament selection, and elitism.
   *
   * @description Minimizes the objective function using an evolutionary strategy.
   * SBX (Simulated Binary Crossover) with distribution index eta_c=20 produces
   * offspring concentrated near parents for fine-grained search.
   * Polynomial mutation with eta_m=20 provides controlled perturbation.
   *
   * @see Holland, J.H. (1975) "Adaptation in Natural and Artificial Systems"
   * @see Deb, K. & Agrawal, R.B. (1995) "Simulated Binary Crossover for
   *      Continuous Search Space", Complex Systems 9(2):115-148
   */
  geneticAlgorithm(input: GAInput): GAResult {
    this.calculations++;

    const {
      objectiveFn,
      dimensions,
      popSize,
      maxGenerations,
      bounds,
      crossoverRate = 0.9,
      mutationRate = 1.0 / dimensions,
      tournamentSize = 3,
      elitismCount = 2,
      seed = 42,
    } = input;

    const rng = new SeededRNG(seed);
    const eta_c = 20; // SBX distribution index
    const eta_m = 20; // Polynomial mutation distribution index

    // Initialize population uniformly within bounds
    let population: number[][] = [];
    for (let i = 0; i < popSize; i++) {
      const individual: number[] = [];
      for (let d = 0; d < dimensions; d++) {
        individual.push(rng.uniform(bounds[d][0], bounds[d][1]));
      }
      population.push(individual);
    }

    // Evaluate fitness
    let fitness: number[] = population.map((ind) => objectiveFn(ind));
    const convergenceHistory: number[] = [];

    let bestIdx = 0;
    for (let i = 1; i < popSize; i++) {
      if (fitness[i] < fitness[bestIdx]) bestIdx = i;
    }
    let bestSolution = [...population[bestIdx]];
    let bestFitness = fitness[bestIdx];
    convergenceHistory.push(bestFitness);

    /**
     * Tournament selection: pick tournamentSize individuals at random,
     * return the one with lowest fitness (minimization).
     */
    const tournamentSelect = (): number[] => {
      let best = rng.randInt(0, popSize - 1);
      for (let t = 1; t < tournamentSize; t++) {
        const candidate = rng.randInt(0, popSize - 1);
        if (fitness[candidate] < fitness[best]) {
          best = candidate;
        }
      }
      return [...population[best]];
    };

    /**
     * SBX crossover (Deb & Agrawal 1995).
     * For each gene, compute spread factor beta from a polynomial distribution
     * controlled by eta_c, then create two offspring symmetrically around parents.
     */
    const sbxCrossover = (p1: number[], p2: number[]): [number[], number[]] => {
      const c1 = [...p1];
      const c2 = [...p2];

      if (rng.next() > crossoverRate) return [c1, c2];

      for (let d = 0; d < dimensions; d++) {
        if (rng.next() > 0.5) continue; // per-gene crossover with 50% chance

        if (Math.abs(p1[d] - p2[d]) < 1e-14) continue;

        const y1 = Math.min(p1[d], p2[d]);
        const y2 = Math.max(p1[d], p2[d]);
        const lo = bounds[d][0];
        const hi = bounds[d][1];

        // Compute beta for lower bound constraint
        const betaLo = 1.0 + (2.0 * (y1 - lo) / (y2 - y1));
        const alphaLo = 2.0 - Math.pow(betaLo, -(eta_c + 1));
        const u1 = rng.next();
        let betaq1: number;
        if (u1 <= 1.0 / alphaLo) {
          betaq1 = Math.pow(u1 * alphaLo, 1.0 / (eta_c + 1));
        } else {
          betaq1 = Math.pow(1.0 / (2.0 - u1 * alphaLo), 1.0 / (eta_c + 1));
        }

        // Compute beta for upper bound constraint
        const betaHi = 1.0 + (2.0 * (hi - y2) / (y2 - y1));
        const alphaHi = 2.0 - Math.pow(betaHi, -(eta_c + 1));
        const u2 = rng.next();
        let betaq2: number;
        if (u2 <= 1.0 / alphaHi) {
          betaq2 = Math.pow(u2 * alphaHi, 1.0 / (eta_c + 1));
        } else {
          betaq2 = Math.pow(1.0 / (2.0 - u2 * alphaHi), 1.0 / (eta_c + 1));
        }

        c1[d] = clamp(0.5 * ((y1 + y2) - betaq1 * (y2 - y1)), lo, hi);
        c2[d] = clamp(0.5 * ((y1 + y2) + betaq2 * (y2 - y1)), lo, hi);
      }
      return [c1, c2];
    };

    /**
     * Polynomial mutation (Deb & Goyal 1996).
     * Perturbs each gene with probability mutationRate using a polynomial
     * distribution controlled by eta_m.
     */
    const polynomialMutate = (individual: number[]): number[] => {
      const result = [...individual];
      for (let d = 0; d < dimensions; d++) {
        if (rng.next() >= mutationRate) continue;

        const y = result[d];
        const lo = bounds[d][0];
        const hi = bounds[d][1];
        const delta = hi - lo;

        const u = rng.next();
        let deltaq: number;
        if (u < 0.5) {
          const xy = (y - lo) / delta;
          const val = 2.0 * u + (1.0 - 2.0 * u) * Math.pow(1.0 - xy, eta_m + 1);
          deltaq = Math.pow(val, 1.0 / (eta_m + 1)) - 1.0;
        } else {
          const xy = (hi - y) / delta;
          const val = 2.0 * (1.0 - u) + 2.0 * (u - 0.5) * Math.pow(1.0 - xy, eta_m + 1);
          deltaq = 1.0 - Math.pow(val, 1.0 / (eta_m + 1));
        }

        result[d] = clamp(y + deltaq * delta, lo, hi);
      }
      return result;
    };

    // Main generational loop
    for (let gen = 1; gen < maxGenerations; gen++) {
      // Sort population by fitness for elitism
      const indices = Array.from({ length: popSize }, (_, i) => i);
      indices.sort((a, b) => fitness[a] - fitness[b]);

      const newPopulation: number[][] = [];
      const newFitness: number[] = [];

      // Elitism: carry forward the best individuals unchanged
      for (let e = 0; e < elitismCount && e < popSize; e++) {
        newPopulation.push([...population[indices[e]]]);
        newFitness.push(fitness[indices[e]]);
      }

      // Fill rest of population with offspring
      while (newPopulation.length < popSize) {
        const parent1 = tournamentSelect();
        const parent2 = tournamentSelect();
        let [child1, child2] = sbxCrossover(parent1, parent2);
        child1 = polynomialMutate(child1);
        child2 = polynomialMutate(child2);

        if (newPopulation.length < popSize) {
          newPopulation.push(child1);
          newFitness.push(objectiveFn(child1));
        }
        if (newPopulation.length < popSize) {
          newPopulation.push(child2);
          newFitness.push(objectiveFn(child2));
        }
      }

      population = newPopulation;
      fitness = newFitness;

      // Track best
      for (let i = 0; i < popSize; i++) {
        if (fitness[i] < bestFitness) {
          bestFitness = fitness[i];
          bestSolution = [...population[i]];
        }
      }
      convergenceHistory.push(bestFitness);
    }

    return {
      bestSolution,
      bestFitness,
      convergenceHistory,
      finalPopulation: population.map((ind) => [...ind]),
      generations: maxGenerations,
    };
  }

  /**
   * Differential Evolution using the DE/rand/1/bin strategy.
   *
   * @description For each target vector x_i, three distinct vectors (x_r1, x_r2, x_r3)
   * are randomly selected. A mutant vector is created as:
   *   v = x_r1 + F * (x_r2 - x_r3)
   * Binomial crossover with rate CR produces a trial vector.
   * The trial replaces the target if it has lower fitness.
   *
   * @see Storn, R. & Price, K. (1997) "Differential Evolution — A Simple and
   *      Efficient Heuristic for Global Optimization over Continuous Spaces",
   *      J. Global Optimization 11(4):341-359
   */
  differentialEvolution(input: DEInput): DEResult {
    this.calculations++;

    const {
      objectiveFn,
      dimensions,
      popSize,
      maxGenerations,
      bounds,
      F = 0.8,
      CR = 0.9,
      seed = 42,
    } = input;

    const rng = new SeededRNG(seed);

    // Initialize population
    let population: number[][] = [];
    for (let i = 0; i < popSize; i++) {
      const individual: number[] = [];
      for (let d = 0; d < dimensions; d++) {
        individual.push(rng.uniform(bounds[d][0], bounds[d][1]));
      }
      population.push(individual);
    }

    let fitness: number[] = population.map((ind) => objectiveFn(ind));
    const convergenceHistory: number[] = [];

    let bestIdx = 0;
    for (let i = 1; i < popSize; i++) {
      if (fitness[i] < fitness[bestIdx]) bestIdx = i;
    }
    let bestSolution = [...population[bestIdx]];
    let bestFitness = fitness[bestIdx];
    convergenceHistory.push(bestFitness);

    /**
     * Pick k distinct random indices from [0, popSize) excluding `exclude`.
     */
    const pickDistinct = (exclude: number, k: number): number[] => {
      const result: number[] = [];
      while (result.length < k) {
        const r = rng.randInt(0, popSize - 1);
        if (r !== exclude && !result.includes(r)) {
          result.push(r);
        }
      }
      return result;
    };

    for (let gen = 1; gen < maxGenerations; gen++) {
      const newPop: number[][] = [];
      const newFit: number[] = [];

      for (let i = 0; i < popSize; i++) {
        // DE/rand/1: select 3 distinct vectors r1, r2, r3 != i
        const [r1, r2, r3] = pickDistinct(i, 3);

        // Mutation: v = x_r1 + F * (x_r2 - x_r3)
        const mutant: number[] = new Array(dimensions);
        for (let d = 0; d < dimensions; d++) {
          mutant[d] = population[r1][d] + F * (population[r2][d] - population[r3][d]);
          mutant[d] = clamp(mutant[d], bounds[d][0], bounds[d][1]);
        }

        // Binomial crossover
        const trial: number[] = [...population[i]];
        const jRand = rng.randInt(0, dimensions - 1); // ensure at least one mutant gene
        for (let d = 0; d < dimensions; d++) {
          if (rng.next() < CR || d === jRand) {
            trial[d] = mutant[d];
          }
        }

        // Selection (greedy)
        const trialFit = objectiveFn(trial);
        if (trialFit <= fitness[i]) {
          newPop.push(trial);
          newFit.push(trialFit);
        } else {
          newPop.push([...population[i]]);
          newFit.push(fitness[i]);
        }

        // Track global best
        if (newFit[newFit.length - 1] < bestFitness) {
          bestFitness = newFit[newFit.length - 1];
          bestSolution = [...newPop[newPop.length - 1]];
        }
      }

      population = newPop;
      fitness = newFit;
      convergenceHistory.push(bestFitness);
    }

    return {
      bestSolution,
      bestFitness,
      convergenceHistory,
      generations: maxGenerations,
    };
  }

  /**
   * Particle Swarm Optimization with linearly decreasing inertia weight.
   *
   * @description Each particle maintains position x and velocity v.
   * Update equations (Shi & Eberhart 1998 inertia weight variant):
   *   v(t+1) = w*v(t) + c1*r1*(pBest - x(t)) + c2*r2*(gBest - x(t))
   *   x(t+1) = x(t) + v(t+1)
   *
   * Inertia weight decreases linearly: w = wStart - (wStart-wEnd) * t/maxIter
   * Velocity is clamped to 20% of the domain range per dimension.
   *
   * @see Kennedy, J. & Eberhart, R. (1995) "Particle Swarm Optimization",
   *      Proc. IEEE Int'l Conf. Neural Networks, pp.1942-1948
   * @see Shi, Y. & Eberhart, R. (1998) "A Modified Particle Swarm Optimizer",
   *      Proc. IEEE World Congress on Computational Intelligence
   */
  particleSwarmOptimization(input: PSOInput): PSOResult {
    this.calculations++;

    const {
      objectiveFn,
      dimensions,
      swarmSize,
      maxIterations,
      bounds,
      c1 = 2.0,
      c2 = 2.0,
      wStart = 0.9,
      wEnd = 0.4,
      seed = 42,
    } = input;

    const rng = new SeededRNG(seed);

    // Velocity limits: ±20% of domain range per dimension
    const vMax: number[] = bounds.map(([lo, hi]) => 0.2 * (hi - lo));

    // Initialize particles
    const positions: number[][] = [];
    const velocities: number[][] = [];
    const pBestPos: number[][] = [];
    const pBestFit: number[] = [];

    for (let i = 0; i < swarmSize; i++) {
      const pos: number[] = [];
      const vel: number[] = [];
      for (let d = 0; d < dimensions; d++) {
        pos.push(rng.uniform(bounds[d][0], bounds[d][1]));
        vel.push(rng.uniform(-vMax[d], vMax[d]));
      }
      positions.push(pos);
      velocities.push(vel);
      pBestPos.push([...pos]);
      pBestFit.push(objectiveFn(pos));
    }

    // Global best
    let gBestIdx = 0;
    for (let i = 1; i < swarmSize; i++) {
      if (pBestFit[i] < pBestFit[gBestIdx]) gBestIdx = i;
    }
    let gBestPos = [...pBestPos[gBestIdx]];
    let gBestFit = pBestFit[gBestIdx];

    const convergenceHistory: number[] = [gBestFit];

    for (let iter = 1; iter < maxIterations; iter++) {
      // Linear inertia weight schedule
      const w = wStart - (wStart - wEnd) * (iter / maxIterations);

      for (let i = 0; i < swarmSize; i++) {
        for (let d = 0; d < dimensions; d++) {
          const r1 = rng.next();
          const r2 = rng.next();

          // Velocity update
          velocities[i][d] =
            w * velocities[i][d] +
            c1 * r1 * (pBestPos[i][d] - positions[i][d]) +
            c2 * r2 * (gBestPos[d] - positions[i][d]);

          // Velocity clamping
          velocities[i][d] = clamp(velocities[i][d], -vMax[d], vMax[d]);

          // Position update
          positions[i][d] += velocities[i][d];

          // Bounds clamping (reflect velocity on boundary contact)
          if (positions[i][d] < bounds[d][0]) {
            positions[i][d] = bounds[d][0];
            velocities[i][d] *= -0.5; // absorbing boundary with damping
          } else if (positions[i][d] > bounds[d][1]) {
            positions[i][d] = bounds[d][1];
            velocities[i][d] *= -0.5;
          }
        }

        // Evaluate
        const fit = objectiveFn(positions[i]);

        // Update personal best
        if (fit < pBestFit[i]) {
          pBestFit[i] = fit;
          pBestPos[i] = [...positions[i]];

          // Update global best
          if (fit < gBestFit) {
            gBestFit = fit;
            gBestPos = [...positions[i]];
          }
        }
      }

      convergenceHistory.push(gBestFit);
    }

    return {
      bestPosition: gBestPos,
      bestFitness: gBestFit,
      convergenceHistory,
      iterations: maxIterations,
    };
  }

  /**
   * Simulated Annealing with exponential (geometric) cooling schedule.
   *
   * @description At each iteration, a neighbor is generated by Gaussian perturbation:
   *   x' = x + N(0, stepSize)
   *
   * The Metropolis acceptance criterion accepts worse solutions with probability:
   *   P(accept) = exp(-deltaE / T)  where deltaE = f(x') - f(x) > 0
   *
   * Temperature decays exponentially: T(k) = T0 * alpha^k
   * where alpha is the cooling rate (typically 0.95-0.999).
   *
   * @see Kirkpatrick, S., Gelatt, C.D. & Vecchi, M.P. (1983)
   *      "Optimization by Simulated Annealing", Science 220(4598):671-680
   * @see Metropolis, N. et al. (1953) "Equation of State Calculations by
   *      Fast Computing Machines", J. Chemical Physics 21(6):1087-1092
   */
  simulatedAnnealing(input: SAInput): SAResult {
    this.calculations++;

    const {
      objectiveFn,
      initialSolution,
      initialTemp,
      coolingRate,
      maxIterations,
      stepSize = 1.0,
      bounds,
      seed = 42,
    } = input;

    const rng = new SeededRNG(seed);
    const dimensions = initialSolution.length;

    let currentSolution = [...initialSolution];
    let currentEnergy = objectiveFn(currentSolution);
    let bestSolution = [...currentSolution];
    let bestEnergy = currentEnergy;

    const convergenceHistory: number[] = [bestEnergy];
    let T = initialTemp;

    for (let iter = 1; iter < maxIterations; iter++) {
      // Generate neighbor via Gaussian perturbation
      const neighbor: number[] = new Array(dimensions);
      for (let d = 0; d < dimensions; d++) {
        neighbor[d] = currentSolution[d] + rng.gaussian(0, stepSize);
      }

      // Clamp to bounds if provided
      if (bounds) {
        for (let d = 0; d < dimensions; d++) {
          neighbor[d] = clamp(neighbor[d], bounds[d][0], bounds[d][1]);
        }
      }

      const neighborEnergy = objectiveFn(neighbor);
      const deltaE = neighborEnergy - currentEnergy;

      // Metropolis acceptance criterion
      if (deltaE < 0 || Math.exp(-deltaE / T) > rng.next()) {
        currentSolution = neighbor;
        currentEnergy = neighborEnergy;
      }

      // Track best
      if (currentEnergy < bestEnergy) {
        bestEnergy = currentEnergy;
        bestSolution = [...currentSolution];
      }

      // Exponential cooling: T(k) = T0 * alpha^k
      T = initialTemp * Math.pow(coolingRate, iter);

      convergenceHistory.push(bestEnergy);
    }

    return {
      bestSolution,
      bestEnergy,
      convergenceHistory,
      finalTemperature: T,
      iterations: maxIterations,
    };
  }

  /**
   * Bayesian Optimization with Gaussian Process surrogate and Expected
   * Improvement (EI) acquisition function.
   *
   * @description Uses a GP with squared-exponential (RBF) kernel:
   *   k(x, x') = sigma_f^2 * exp(-||x-x'||^2 / (2*l^2))
   *
   * Posterior mean and variance are computed via Cholesky decomposition:
   *   mu(x*) = k*^T (K + sigma_n^2 I)^{-1} y
   *   sigma^2(x*) = k(x*,x*) - k*^T (K + sigma_n^2 I)^{-1} k*
   *
   * Expected Improvement (Jones et al. 1998):
   *   EI(x) = (f_best - mu(x)) * Phi(Z) + sigma(x) * phi(Z)
   *   where Z = (f_best - mu(x)) / sigma(x)
   *
   * Initial sampling uses Latin Hypercube Sampling for space-filling coverage.
   *
   * @see Mockus, J. (1989) "Bayesian Approach to Global Optimization",
   *      Kluwer Academic Publishers
   * @see Jones, D.R., Schonlau, M. & Welch, W.J. (1998) "Efficient Global
   *      Optimization of Expensive Black-Box Functions", J. Global Optimization
   *      13(4):455-492
   * @see Rasmussen, C.E. & Williams, C.K.I. (2006) "Gaussian Processes for
   *      Machine Learning", MIT Press
   */
  bayesianOptimization(input: BayesOptInput): BayesOptResult {
    this.calculations++;

    const {
      objectiveFn,
      dimensions,
      bounds,
      nInitial = 5 * dimensions,
      maxIterations = 25,
      lengthScale = 1.0,
      signalVariance = 1.0,
      noiseVariance = 1e-6,
      nCandidates = 1000,
      seed = 42,
    } = input;

    const rng = new SeededRNG(seed);
    const l2 = lengthScale * lengthScale;
    const sf2 = signalVariance;

    /**
     * Squared-exponential (RBF) kernel:
     * k(xi, xj) = sigma_f^2 * exp(-sum((xi_d - xj_d)^2) / (2 * l^2))
     */
    const kernel = (xi: number[], xj: number[]): number => {
      let sqDist = 0;
      for (let d = 0; d < xi.length; d++) {
        const diff = xi[d] - xj[d];
        sqDist += diff * diff;
      }
      return sf2 * Math.exp(-sqDist / (2 * l2));
    };

    /**
     * Build the kernel matrix K(X, X) + sigma_n^2 * I.
     */
    const buildKernelMatrix = (X: number[][]): number[][] => {
      const n = X.length;
      const K: number[][] = Array.from({ length: n }, () => new Array(n).fill(0));
      for (let i = 0; i < n; i++) {
        for (let j = i; j < n; j++) {
          const k = kernel(X[i], X[j]);
          K[i][j] = k;
          K[j][i] = k;
        }
        K[i][i] += noiseVariance; // add noise to diagonal
      }
      return K;
    };

    /**
     * Latin Hypercube Sampling.
     * Divides each dimension into nSamples equal strata, generates one sample
     * per stratum, then shuffles across dimensions for uniform coverage.
     */
    const latinHypercube = (nSamples: number): number[][] => {
      const samples: number[][] = [];
      // Create permutation for each dimension
      const perms: number[][] = [];
      for (let d = 0; d < dimensions; d++) {
        const perm = Array.from({ length: nSamples }, (_, i) => i);
        // Fisher-Yates shuffle
        for (let i = nSamples - 1; i > 0; i--) {
          const j = rng.randInt(0, i);
          [perm[i], perm[j]] = [perm[j], perm[i]];
        }
        perms.push(perm);
      }

      for (let s = 0; s < nSamples; s++) {
        const point: number[] = [];
        for (let d = 0; d < dimensions; d++) {
          // Random point within the stratum
          const stratum = perms[d][s];
          const u = (stratum + rng.next()) / nSamples;
          point.push(bounds[d][0] + u * (bounds[d][1] - bounds[d][0]));
        }
        samples.push(point);
      }
      return samples;
    };

    /**
     * Predict GP posterior mean and variance at a test point x*.
     * Uses precomputed Cholesky factor and alpha = (K + sn2*I)^{-1} y.
     */
    const gpPredict = (
      xStar: number[],
      X: number[][],
      alpha: number[],
      L: number[][]
    ): { mu: number; sigma2: number } => {
      const n = X.length;

      // k* = [k(x*, x_1), ..., k(x*, x_n)]
      const kStar: number[] = new Array(n);
      for (let i = 0; i < n; i++) {
        kStar[i] = kernel(xStar, X[i]);
      }

      // mu = k*^T * alpha
      const mu = dot(kStar, alpha);

      // v = L^{-1} k* (forward solve)
      const v = forwardSolve(L, kStar);

      // sigma^2 = k(x*, x*) - v^T v
      const kSelf = kernel(xStar, xStar);
      const sigma2 = Math.max(kSelf - dot(v, v), 1e-10);

      return { mu, sigma2 };
    };

    /**
     * Expected Improvement acquisition function.
     * EI(x) = (f_best - mu) * Phi(Z) + sigma * phi(Z)
     * where Z = (f_best - mu) / sigma
     * Returns 0 when sigma ~ 0 (already-observed region).
     */
    const expectedImprovement = (
      mu: number,
      sigma2: number,
      fBest: number
    ): number => {
      const sigma = Math.sqrt(sigma2);
      if (sigma < 1e-12) return 0;
      const z = (fBest - mu) / sigma;
      return (fBest - mu) * normalCDF(z) + sigma * normalPDF(z);
    };

    // ─── Main BO Loop ───────────────────────────────────────────────

    // Step 1: Initial sampling via Latin Hypercube
    const observationsX: number[][] = latinHypercube(nInitial);
    const observationsY: number[] = observationsX.map((x) => objectiveFn(x));

    let bestIdx = 0;
    for (let i = 1; i < observationsY.length; i++) {
      if (observationsY[i] < observationsY[bestIdx]) bestIdx = i;
    }
    let bestSolution = [...observationsX[bestIdx]];
    let bestValue = observationsY[bestIdx];
    const convergenceHistory: number[] = [bestValue];

    // Step 2: Sequential BO iterations
    for (let iter = 0; iter < maxIterations; iter++) {
      const n = observationsX.length;

      // Build kernel matrix and Cholesky factorize
      const K = buildKernelMatrix(observationsX);
      const L = choleskyDecomposition(K);

      // alpha = (K + sn2*I)^{-1} y via Cholesky solve
      const yFwd = forwardSolve(L, observationsY);
      const alpha = backwardSolve(L, yFwd);

      // Maximize EI over random candidate set
      let bestEI = -Infinity;
      let bestCandidate: number[] | null = null;

      for (let c = 0; c < nCandidates; c++) {
        const candidate: number[] = [];
        for (let d = 0; d < dimensions; d++) {
          candidate.push(rng.uniform(bounds[d][0], bounds[d][1]));
        }
        const { mu, sigma2 } = gpPredict(candidate, observationsX, alpha, L);
        const ei = expectedImprovement(mu, sigma2, bestValue);

        if (ei > bestEI) {
          bestEI = ei;
          bestCandidate = candidate;
        }
      }

      // Evaluate the best candidate
      if (bestCandidate) {
        const yNew = objectiveFn(bestCandidate);
        observationsX.push(bestCandidate);
        observationsY.push(yNew);

        if (yNew < bestValue) {
          bestValue = yNew;
          bestSolution = [...bestCandidate];
        }
      }

      convergenceHistory.push(bestValue);
    }

    return {
      bestSolution,
      bestValue,
      observationsX: observationsX.map((x) => [...x]),
      observationsY: [...observationsY],
      convergenceHistory,
    };
  }

  /**
   * Returns engine statistics.
   */
  stats(): { methods: string[]; totalCalculations: number } {
    return {
      methods: [
        'geneticAlgorithm (GA) — Holland 1975, SBX crossover',
        'differentialEvolution (DE/rand/1/bin) — Storn & Price 1997',
        'particleSwarmOptimization (PSO) — Kennedy & Eberhart 1995',
        'simulatedAnnealing (SA) — Kirkpatrick, Gelatt & Vecchi 1983',
        'bayesianOptimization (BO/EGO) — Mockus 1989, Jones et al. 1998',
      ],
      totalCalculations: this.calculations,
    };
  }
}
