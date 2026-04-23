/**
 * PRISM MCP Server -- Swarm Algorithms Engine
 *
 * Swarm intelligence optimizers:
 * - Particle Swarm Optimization (PSO): inertia decay, cognitive/social terms
 * - Ant Colony Optimization (ACO): pheromone trails, roulette selection
 *
 * Based on Kennedy & Eberhart (1995), Dorigo (1992).
 * Ported from PRISM_SWARM_ALGORITHMS.js (monolith R2.3.1).
 *
 * @module SwarmAlgorithmsEngine
 */

// ============================================================================
// TYPES
// ============================================================================

export interface Bounds { min: number; max: number; }

export interface PSOConfig {
  swarmSize?: number;
  maxIterations?: number;
  w?: number;
  c1?: number;
  c2?: number;
  wDecay?: number;
}

export interface PSOResult {
  success: boolean;
  bestPosition: number[];
  bestFitness: number;
  iterations: number;
  fitnessHistory: number[];
}

export interface ACOConfig {
  numAnts?: number;
  maxIterations?: number;
  alpha?: number;
  beta?: number;
  evaporation?: number;
  Q?: number;
}

export interface ACOResult {
  success: boolean;
  sequence: number[];
  totalCost: number;
  improvement: {
    originalCost: number;
    optimizedCost: number;
    savedCost: number;
    improvementPercent: string;
  };
}

interface Particle {
  position: number[];
  velocity: number[];
  bestPosition: number[];
  bestFitness: number;
}

// ============================================================================
// ENGINE
// ============================================================================

const PSO_DEFAULTS = {
  swarmSize: 30,
  maxIterations: 100,
  w: 0.7,
  c1: 1.5,
  c2: 1.5,
  wDecay: 0.99,
};

const ACO_DEFAULTS = {
  numAnts: 20,
  maxIterations: 50,
  alpha: 1.0,
  beta: 2.0,
  evaporation: 0.3,
  Q: 100,
};

class SwarmAlgorithmsEngineImpl {

  // ── PSO ──

  /** Initialize a swarm of particles within bounds. */
  initializeSwarm(bounds: Bounds[], size: number = PSO_DEFAULTS.swarmSize): Particle[] {
    return Array.from({ length: size }, () => {
      const position = bounds.map(b => b.min + Math.random() * (b.max - b.min));
      return {
        position,
        velocity: bounds.map(b => (Math.random() - 0.5) * (b.max - b.min) * 0.1),
        bestPosition: [...position],
        bestFitness: -Infinity,
      };
    });
  }

  /** Update a particle's velocity and position (PSO standard). */
  updateParticle(particle: Particle, globalBest: number[], bounds: Bounds[], w: number, c1: number, c2: number): void {
    particle.velocity = particle.velocity.map((v, i) => {
      const cognitive = c1 * Math.random() * (particle.bestPosition[i] - particle.position[i]);
      const social = c2 * Math.random() * (globalBest[i] - particle.position[i]);
      return w * v + cognitive + social;
    });

    particle.position = particle.position.map((p, i) => {
      const newP = p + particle.velocity[i];
      return Math.max(bounds[i].min, Math.min(bounds[i].max, newP));
    });
  }

  /** Particle Swarm Optimization. Maximizes fitnessFunction. */
  psoOptimize(fitnessFunction: (pos: number[]) => number, bounds: Bounds[], config: PSOConfig = {}): PSOResult {
    const size = config.swarmSize ?? PSO_DEFAULTS.swarmSize;
    const maxIter = config.maxIterations ?? PSO_DEFAULTS.maxIterations;
    const wInit = config.w ?? PSO_DEFAULTS.w;
    const c1 = config.c1 ?? PSO_DEFAULTS.c1;
    const c2 = config.c2 ?? PSO_DEFAULTS.c2;
    const wDecay = config.wDecay ?? PSO_DEFAULTS.wDecay;

    const swarm = this.initializeSwarm(bounds, size);
    let globalBestPos: number[] = [...swarm[0].position];
    let globalBestFit = -Infinity;
    const fitHist: number[] = [];

    for (let iter = 0; iter < maxIter; iter++) {
      const w = wInit * Math.pow(wDecay, iter);

      for (const particle of swarm) {
        const fitness = fitnessFunction(particle.position);

        if (fitness > particle.bestFitness) {
          particle.bestFitness = fitness;
          particle.bestPosition = [...particle.position];
        }
        if (fitness > globalBestFit) {
          globalBestFit = fitness;
          globalBestPos = [...particle.position];
        }
      }

      fitHist.push(globalBestFit);

      for (const particle of swarm) {
        this.updateParticle(particle, globalBestPos, bounds, w, c1, c2);
      }
    }

    return {
      success: true,
      bestPosition: globalBestPos,
      bestFitness: globalBestFit,
      iterations: maxIter,
      fitnessHistory: fitHist,
    };
  }

  // ── ACO ──

  /** Build a cost matrix from operation-to-operation transition costs. */
  buildCostMatrix(operations: Array<{
    toolId?: string;
    fixtureId?: string;
    startX?: number; startY?: number; startZ?: number;
    endX?: number; endY?: number; endZ?: number;
  }>, toolChangeTime: number = 30, rapidFeedRate: number = 10000): number[][] {
    const n = operations.length;
    const costs: number[][] = Array.from({ length: n }, () => Array(n).fill(0));

    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        if (i === j) continue;
        let cost = 0;

        if (operations[i].toolId !== operations[j].toolId) {
          cost += toolChangeTime;
        }

        const dx = (operations[j].startX ?? 0) - (operations[i].endX ?? 0);
        const dy = (operations[j].startY ?? 0) - (operations[i].endY ?? 0);
        const dz = (operations[j].startZ ?? 0) - (operations[i].endZ ?? 0);
        cost += Math.sqrt(dx * dx + dy * dy + dz * dz) / rapidFeedRate * 60;

        if (operations[i].fixtureId !== operations[j].fixtureId) {
          cost += 60;
        }

        costs[i][j] = cost;
      }
    }
    return costs;
  }

  /** Build a path via pheromone-guided roulette selection. */
  buildPath(n: number, pheromones: number[][], costs: number[][], alpha: number, beta: number): number[] {
    const path: number[] = [];
    const visited = new Set<number>();

    let current = Math.floor(Math.random() * n);
    path.push(current);
    visited.add(current);

    while (path.length < n) {
      const probs: Array<{ node: number; prob: number }> = [];
      let total = 0;

      for (let j = 0; j < n; j++) {
        if (visited.has(j)) continue;
        const tau = Math.pow(pheromones[current][j], alpha);
        const eta = Math.pow(1 / (costs[current][j] + 0.1), beta);
        const prob = tau * eta;
        probs.push({ node: j, prob });
        total += prob;
      }

      let rand = Math.random() * total;
      let next = probs[0].node;
      for (const { node, prob } of probs) {
        rand -= prob;
        if (rand <= 0) { next = node; break; }
      }

      path.push(next);
      visited.add(next);
      current = next;
    }
    return path;
  }

  /** Calculate total path cost. */
  pathCost(path: number[], costs: number[][]): number {
    let total = 0;
    for (let i = 0; i < path.length - 1; i++) {
      total += costs[path[i]][path[i + 1]];
    }
    return total;
  }

  /** Update pheromone matrix with evaporation and deposit. */
  updatePheromones(pheromones: number[][], paths: number[][], pathCosts: number[], evaporation: number, Q: number): void {
    const n = pheromones.length;
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        pheromones[i][j] *= (1 - evaporation);
      }
    }
    for (let ant = 0; ant < paths.length; ant++) {
      const deposit = Q / pathCosts[ant];
      const path = paths[ant];
      for (let i = 0; i < path.length - 1; i++) {
        pheromones[path[i]][path[i + 1]] += deposit;
        pheromones[path[i + 1]][path[i]] += deposit;
      }
    }
  }

  /** Ant Colony Optimization for operation sequencing. Minimizes total transition cost. */
  acoOptimize(costs: number[][], config: ACOConfig = {}): ACOResult {
    const n = costs.length;
    if (n <= 1) {
      return {
        success: true,
        sequence: n === 1 ? [0] : [],
        totalCost: 0,
        improvement: { originalCost: 0, optimizedCost: 0, savedCost: 0, improvementPercent: "0.0%" },
      };
    }

    const numAnts = config.numAnts ?? ACO_DEFAULTS.numAnts;
    const maxIter = config.maxIterations ?? ACO_DEFAULTS.maxIterations;
    const alpha = config.alpha ?? ACO_DEFAULTS.alpha;
    const beta = config.beta ?? ACO_DEFAULTS.beta;
    const evap = config.evaporation ?? ACO_DEFAULTS.evaporation;
    const Q = config.Q ?? ACO_DEFAULTS.Q;

    const pheromones: number[][] = Array.from({ length: n }, () => Array(n).fill(1.0));
    let bestPath: number[] = [];
    let bestCost = Infinity;

    for (let iter = 0; iter < maxIter; iter++) {
      const paths: number[][] = [];
      const pCosts: number[] = [];

      for (let ant = 0; ant < numAnts; ant++) {
        const path = this.buildPath(n, pheromones, costs, alpha, beta);
        const cost = this.pathCost(path, costs);
        paths.push(path);
        pCosts.push(cost);

        if (cost < bestCost) {
          bestCost = cost;
          bestPath = [...path];
        }
      }

      this.updatePheromones(pheromones, paths, pCosts, evap, Q);
    }

    const originalCost = this.pathCost(Array.from({ length: n }, (_, i) => i), costs);
    const savedCost = originalCost - bestCost;

    return {
      success: true,
      sequence: bestPath,
      totalCost: bestCost,
      improvement: {
        originalCost,
        optimizedCost: bestCost,
        savedCost,
        improvementPercent: originalCost > 0 ? ((savedCost / originalCost) * 100).toFixed(1) + "%" : "0.0%",
      },
    };
  }
}

export const swarmAlgorithmsEngine = new SwarmAlgorithmsEngineImpl();
