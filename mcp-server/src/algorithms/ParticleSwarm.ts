/**
 * Particle Swarm Optimization (PSO)
 *
 * Swarm intelligence optimizer for continuous manufacturing parameter spaces.
 * Each particle tracks personal best and follows the global best with inertia.
 * Supports constriction coefficient (Clerc-Kennedy) variant.
 *
 * References:
 * - Kennedy, J. & Eberhart, R. (1995). "Particle Swarm Optimization"
 * - Clerc, M. & Kennedy, J. (2002). "The Particle Swarm: Explosion, Stability, Convergence"
 *
 * @module algorithms/ParticleSwarm
 */

import type {
  Algorithm, AlgorithmMeta, ValidationResult, ValidationIssue, WithWarnings,
} from "./types.js";

export interface ParticleSwarmInput {
  /** Number of decision variables. */
  dimensions: number;
  /** Lower bounds per dimension. */
  lower_bounds: number[];
  /** Upper bounds per dimension. */
  upper_bounds: number[];
  /** Number of particles. Default 30. */
  particles?: number;
  /** Maximum iterations. Default 200. */
  max_iterations?: number;
  /** Inertia weight. Default 0.729. */
  inertia?: number;
  /** Cognitive coefficient (c1). Default 1.494. */
  cognitive?: number;
  /** Social coefficient (c2). Default 1.494. */
  social?: number;
  /** Seed for reproducibility. */
  seed?: number;
}

export interface ParticleSwarmOutput extends WithWarnings {
  best_position: number[];
  best_fitness: number;
  iterations_run: number;
  convergence_history: number[];
  swarm_diversity: number;
  calculation_method: string;
}

function mulberry32(seed: number) {
  let s = seed | 0;
  return () => { s = (s + 0x6D2B79F5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

export class ParticleSwarm implements Algorithm<ParticleSwarmInput, ParticleSwarmOutput> {

  validate(input: ParticleSwarmInput): ValidationResult {
    const issues: ValidationIssue[] = [];
    if (!input.dimensions || input.dimensions < 1) issues.push({ field: "dimensions", message: "Must be >= 1", severity: "error" });
    if (!input.lower_bounds?.length || !input.upper_bounds?.length) issues.push({ field: "bounds", message: "Required", severity: "error" });
    if (input.lower_bounds?.length !== input.dimensions) issues.push({ field: "lower_bounds", message: "Length must match dimensions", severity: "error" });
    if ((input.particles ?? 30) < 2) issues.push({ field: "particles", message: "Must be >= 2", severity: "error" });
    return { valid: issues.filter(i => i.severity === "error").length === 0, issues };
  }

  calculate(input: ParticleSwarmInput): ParticleSwarmOutput {
    const warnings: string[] = [];
    const { dimensions, lower_bounds, upper_bounds } = input;
    const nParticles = input.particles ?? 30;
    const maxIter = input.max_iterations ?? 200;
    const w = input.inertia ?? 0.729;
    const c1 = input.cognitive ?? 1.494;
    const c2 = input.social ?? 1.494;
    const rand = mulberry32(input.seed ?? Date.now());

    // Default fitness: sphere function (minimize)
    const fitness = (x: number[]) => x.reduce((s, v, i) => {
      const mid = (lower_bounds[i] + upper_bounds[i]) / 2;
      return s + (v - mid) ** 2;
    }, 0);

    // Initialize swarm
    const positions: number[][] = [];
    const velocities: number[][] = [];
    const pBest: number[][] = [];
    const pBestFit: number[] = [];

    for (let p = 0; p < nParticles; p++) {
      const pos = lower_bounds.map((lo, d) => lo + rand() * (upper_bounds[d] - lo));
      const vel = lower_bounds.map((lo, d) => (rand() - 0.5) * (upper_bounds[d] - lo) * 0.1);
      positions.push(pos);
      velocities.push(vel);
      pBest.push([...pos]);
      pBestFit.push(fitness(pos));
    }

    let gBestIdx = pBestFit.indexOf(Math.min(...pBestFit));
    let gBest = [...pBest[gBestIdx]];
    let gBestFit = pBestFit[gBestIdx];
    const convergence: number[] = [gBestFit];

    for (let iter = 0; iter < maxIter; iter++) {
      for (let p = 0; p < nParticles; p++) {
        // Update velocity
        for (let d = 0; d < dimensions; d++) {
          const r1 = rand(), r2 = rand();
          velocities[p][d] = w * velocities[p][d]
            + c1 * r1 * (pBest[p][d] - positions[p][d])
            + c2 * r2 * (gBest[d] - positions[p][d]);

          // Velocity clamping
          const vMax = (upper_bounds[d] - lower_bounds[d]) * 0.2;
          velocities[p][d] = Math.max(-vMax, Math.min(vMax, velocities[p][d]));
        }

        // Update position
        for (let d = 0; d < dimensions; d++) {
          positions[p][d] += velocities[p][d];
          positions[p][d] = Math.max(lower_bounds[d], Math.min(upper_bounds[d], positions[p][d]));
        }

        // Evaluate
        const fit = fitness(positions[p]);
        if (fit < pBestFit[p]) {
          pBest[p] = [...positions[p]];
          pBestFit[p] = fit;
          if (fit < gBestFit) {
            gBest = [...positions[p]];
            gBestFit = fit;
          }
        }
      }
      convergence.push(gBestFit);
    }

    // Swarm diversity: average distance from centroid
    const centroid = Array(dimensions).fill(0);
    positions.forEach(p => p.forEach((v, d) => centroid[d] += v / nParticles));
    const diversity = positions.reduce((s, p) =>
      s + Math.sqrt(p.reduce((ss, v, d) => ss + (v - centroid[d]) ** 2, 0)), 0) / nParticles;

    return {
      best_position: gBest,
      best_fitness: gBestFit,
      iterations_run: maxIter,
      convergence_history: convergence,
      swarm_diversity: diversity,
      warnings,
      calculation_method: `PSO (w=${w}, c1=${c1}, c2=${c2}, ${nParticles} particles)`,
    };
  }

  getMetadata(): AlgorithmMeta {
    return {
      id: "particle-swarm",
      name: "Particle Swarm Optimization",
      description: "Swarm intelligence optimizer for continuous parameter spaces",
      formula: "v(t+1) = w×v(t) + c1×r1×(pBest-x) + c2×r2×(gBest-x); x(t+1) = x(t) + v(t+1)",
      reference: "Kennedy & Eberhart (1995); Clerc & Kennedy (2002)",
      safety_class: "informational",
      domain: "optimization",
      inputs: { dimensions: "Number of variables", particles: "Swarm size", inertia: "w weight" },
      outputs: { best_position: "Optimal parameters", best_fitness: "Minimum cost", swarm_diversity: "Population spread" },
    };
  }
}
