/**
 * ParticleSwarmOptimizationEngine — Particle Swarm Optimization (PSO)
 *
 * Swarm-based metaheuristic for continuous optimization problems.
 * Each particle tracks personal best + global best, with inertia
 * weight decay for exploration→exploitation transition.
 *
 * Variants: standard PSO, constriction factor (Clerc-Kennedy),
 * adaptive inertia, multi-swarm.
 *
 * @module ParticleSwarmOptimizationEngine
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PSOConfig {
  dimensions: number;
  bounds: { min: number; max: number }[];
  swarmSize?: number;          // Default 30
  maxIterations?: number;      // Default 200
  inertiaStart?: number;       // Default 0.9
  inertiaEnd?: number;         // Default 0.4
  cognitiveCoeff?: number;     // c1, default 2.0
  socialCoeff?: number;        // c2, default 2.0
  useConstriction?: boolean;   // Clerc-Kennedy χ factor
  velocityClamp?: number;      // Max velocity as fraction of range. Default 0.5
  tolerance?: number;          // Convergence tolerance. Default 1e-8
  seed?: number;               // RNG seed for reproducibility
}

export interface Particle {
  position: number[];
  velocity: number[];
  fitness: number;
  bestPosition: number[];
  bestFitness: number;
}

export interface PSOResult {
  bestPosition: number[];
  bestFitness: number;
  iterations: number;
  converged: boolean;
  convergenceHistory: number[];
  swarmDiversity: number;
  particleCount: number;
}

// ---------------------------------------------------------------------------
// Engine
// ---------------------------------------------------------------------------

class ParticleSwarmOptimizationEngineImpl {

  /**
   * Minimize an objective function using PSO.
   */
  minimize(
    objective: (x: number[]) => number,
    config: PSOConfig
  ): PSOResult {
    const {
      dimensions, bounds,
      swarmSize = 30,
      maxIterations = 200,
      inertiaStart = 0.9,
      inertiaEnd = 0.4,
      cognitiveCoeff: c1 = 2.0,
      socialCoeff: c2 = 2.0,
      useConstriction = false,
      velocityClamp = 0.5,
      tolerance = 1e-8,
      seed,
    } = config;

    const rng = seed != null ? this._seededRng(seed) : Math.random;

    // Constriction factor (Clerc-Kennedy)
    const phi = c1 + c2;
    const chi = useConstriction && phi > 4
      ? 2 / Math.abs(2 - phi - Math.sqrt(phi * phi - 4 * phi))
      : 1;

    // Initialize swarm
    const swarm: Particle[] = [];
    let globalBest: number[] = [];
    let globalBestFitness = Infinity;

    for (let i = 0; i < swarmSize; i++) {
      const position = bounds.map(b => b.min + rng() * (b.max - b.min));
      const vMax = bounds.map(b => (b.max - b.min) * velocityClamp);
      const velocity = vMax.map(vm => (rng() * 2 - 1) * vm);
      const fitness = objective(position);

      const particle: Particle = {
        position: [...position],
        velocity,
        fitness,
        bestPosition: [...position],
        bestFitness: fitness,
      };
      swarm.push(particle);

      if (fitness < globalBestFitness) {
        globalBestFitness = fitness;
        globalBest = [...position];
      }
    }

    const history: number[] = [globalBestFitness];
    let converged = false;
    let iter = 0;

    for (iter = 0; iter < maxIterations; iter++) {
      const w = useConstriction
        ? 1 // constriction handles damping
        : inertiaStart - (inertiaStart - inertiaEnd) * (iter / maxIterations);

      for (const p of swarm) {
        // Update velocity and position
        for (let d = 0; d < dimensions; d++) {
          const r1 = rng();
          const r2 = rng();
          const cognitive = c1 * r1 * (p.bestPosition[d] - p.position[d]);
          const social = c2 * r2 * (globalBest[d] - p.position[d]);

          p.velocity[d] = chi * (w * p.velocity[d] + cognitive + social);

          // Velocity clamping
          const vMax = (bounds[d].max - bounds[d].min) * velocityClamp;
          p.velocity[d] = Math.max(-vMax, Math.min(vMax, p.velocity[d]));

          p.position[d] += p.velocity[d];

          // Boundary handling (reflection)
          if (p.position[d] < bounds[d].min) {
            p.position[d] = bounds[d].min;
            p.velocity[d] *= -0.5;
          } else if (p.position[d] > bounds[d].max) {
            p.position[d] = bounds[d].max;
            p.velocity[d] *= -0.5;
          }
        }

        // Evaluate fitness
        p.fitness = objective(p.position);

        // Update personal best
        if (p.fitness < p.bestFitness) {
          p.bestFitness = p.fitness;
          p.bestPosition = [...p.position];
        }

        // Update global best
        if (p.fitness < globalBestFitness) {
          globalBestFitness = p.fitness;
          globalBest = [...p.position];
        }
      }

      history.push(globalBestFitness);

      // Convergence check
      if (history.length > 10) {
        const recent = history.slice(-10);
        const improvement = recent[0] - recent[recent.length - 1];
        if (Math.abs(improvement) < tolerance) {
          converged = true;
          break;
        }
      }
    }

    return {
      bestPosition: globalBest,
      bestFitness: globalBestFitness,
      iterations: iter + 1,
      converged,
      convergenceHistory: history,
      swarmDiversity: this._calcDiversity(swarm, bounds),
      particleCount: swarmSize,
    };
  }

  /**
   * Maximize an objective function (negates internally).
   */
  maximize(
    objective: (x: number[]) => number,
    config: PSOConfig
  ): PSOResult {
    const result = this.minimize(x => -objective(x), config);
    return {
      ...result,
      bestFitness: -result.bestFitness,
      convergenceHistory: result.convergenceHistory.map(v => -v),
    };
  }

  private _calcDiversity(swarm: Particle[], bounds: { min: number; max: number }[]): number {
    const n = swarm.length;
    if (n <= 1) return 0;
    const dims = swarm[0].position.length;
    let totalSpread = 0;

    for (let d = 0; d < dims; d++) {
      const vals = swarm.map(p => p.position[d]);
      const mean = vals.reduce((a, b) => a + b, 0) / n;
      const variance = vals.reduce((a, v) => a + (v - mean) ** 2, 0) / n;
      const range = bounds[d].max - bounds[d].min;
      totalSpread += Math.sqrt(variance) / (range || 1);
    }

    return totalSpread / dims; // Normalized 0-1
  }

  private _seededRng(seed: number): () => number {
    let s = seed;
    return () => {
      s = (s * 1664525 + 1013904223) & 0x7fffffff;
      return s / 0x7fffffff;
    };
  }
}

export const particleSwarmOptimizationEngine = new ParticleSwarmOptimizationEngineImpl();
