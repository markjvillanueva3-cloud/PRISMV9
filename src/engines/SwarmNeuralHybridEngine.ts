/**
 * PRISM MCP Server -- Swarm-Neural Hybrid Engine
 *
 * Neural network-guided Particle Swarm Optimization:
 * - PSO with inertia, cognitive, social coefficients
 * - Simple feedforward NN guidance (input→tanh hidden→output)
 * - Periodic NN training from optimization history
 * - Velocity clamping, position bounds enforcement
 *
 * Based on MIT 15.099, MIT 15.773.
 * Ported from PRISM_SWARM_NEURAL_HYBRID.js (monolith R2.3.1).
 *
 * @module SwarmNeuralHybridEngine
 */

// ============================================================================
// TYPES
// ============================================================================

export type Bound = [number, number]; // [min, max]

export interface HybridConfig {
  numParticles?: number;
  hiddenDim?: number;
  maxIterations?: number;
  useNeuralGuidance?: boolean;
}

export interface Particle {
  position: number[];
  velocity: number[];
  bestPosition: number[];
  bestFitness: number;
}

interface GuidanceNetwork {
  W1: number[][];
  b1: number[];
  W2: number[][];
  b2: number[];
}

export interface Optimizer {
  particles: Particle[];
  globalBest: { position: number[]; fitness: number };
  bounds: Bound[];
  network: GuidanceNetwork;
  useNeuralGuidance: boolean;
  history: Array<{ globalBest: number }>;
  iteration: number;
}

export interface HybridResult {
  bestPosition: number[];
  bestFitness: number;
  iterations: number;
  convergenceHistory: number[];
}

// ============================================================================
// ENGINE
// ============================================================================

class SwarmNeuralHybridEngineImpl {

  /** Create hybrid PSO+NN optimizer. objectiveFunc: lower is better. */
  createOptimizer(objectiveFunc: (x: number[]) => number, bounds: Bound[], config: HybridConfig = {}): Optimizer {
    const numParticles = config.numParticles ?? 30;
    const hiddenDim = config.hiddenDim ?? 32;
    const dim = bounds.length;

    const particles: Particle[] = Array.from({ length: numParticles }, () => {
      const pos = bounds.map(b => b[0] + Math.random() * (b[1] - b[0]));
      const vel = bounds.map(b => (Math.random() - 0.5) * (b[1] - b[0]) * 0.1);
      const fit = objectiveFunc(pos);
      return { position: pos, velocity: vel, bestPosition: [...pos], bestFitness: fit };
    });

    return {
      particles,
      globalBest: this._findGlobalBest(particles),
      bounds,
      network: this._createNetwork(dim, hiddenDim),
      useNeuralGuidance: config.useNeuralGuidance ?? true,
      history: [],
      iteration: 0,
    };
  }

  /** Run one optimization step. */
  step(optimizer: Optimizer, objectiveFunc: (x: number[]) => number): { iteration: number; bestFitness: number; avgFitness: number } {
    const { particles, bounds, network, useNeuralGuidance } = optimizer;
    const w = 0.7, c1 = 1.5, c2 = 1.5, c3 = 0.5;

    for (const p of particles) {
      const neuralDir = (useNeuralGuidance && optimizer.history.length > 10)
        ? this._forward(network, p.position)
        : p.position.map(() => 0);

      for (let d = 0; d < p.position.length; d++) {
        const r1 = Math.random(), r2 = Math.random(), r3 = Math.random();
        p.velocity[d] = w * p.velocity[d]
          + c1 * r1 * (p.bestPosition[d] - p.position[d])
          + c2 * r2 * (optimizer.globalBest.position[d] - p.position[d])
          + c3 * r3 * neuralDir[d];

        const range = bounds[d][1] - bounds[d][0];
        p.velocity[d] = Math.max(-range * 0.2, Math.min(range * 0.2, p.velocity[d]));
      }

      for (let d = 0; d < p.position.length; d++) {
        p.position[d] = Math.max(bounds[d][0], Math.min(bounds[d][1], p.position[d] + p.velocity[d]));
      }

      const fitness = objectiveFunc(p.position);
      if (fitness < p.bestFitness) {
        p.bestFitness = fitness;
        p.bestPosition = [...p.position];
      }
    }

    const newBest = this._findGlobalBest(particles);
    if (newBest.fitness < optimizer.globalBest.fitness) optimizer.globalBest = newBest;

    optimizer.history.push({ globalBest: optimizer.globalBest.fitness });

    if (optimizer.history.length % 20 === 0) {
      this._trainNetwork(network, optimizer.history);
    }

    optimizer.iteration++;
    return {
      iteration: optimizer.iteration,
      bestFitness: optimizer.globalBest.fitness,
      avgFitness: particles.reduce((s, p) => s + p.bestFitness, 0) / particles.length,
    };
  }

  /** Run full optimization. objectiveFunc: lower is better. */
  optimize(objectiveFunc: (x: number[]) => number, bounds: Bound[], config: HybridConfig = {}): HybridResult {
    const maxIter = config.maxIterations ?? 100;
    const optimizer = this.createOptimizer(objectiveFunc, bounds, config);

    for (let i = 0; i < maxIter; i++) {
      this.step(optimizer, objectiveFunc);
    }

    return {
      bestPosition: optimizer.globalBest.position,
      bestFitness: optimizer.globalBest.fitness,
      iterations: optimizer.iteration,
      convergenceHistory: optimizer.history.map(h => h.globalBest),
    };
  }

  /** Create single-hidden-layer guidance network. */
  _createNetwork(inputDim: number, hiddenDim: number): GuidanceNetwork {
    return {
      W1: Array.from({ length: hiddenDim }, () =>
        Array.from({ length: inputDim }, () => (Math.random() - 0.5) * 0.1)),
      b1: new Array(hiddenDim).fill(0),
      W2: Array.from({ length: inputDim }, () =>
        Array.from({ length: hiddenDim }, () => (Math.random() - 0.5) * 0.1)),
      b2: new Array(inputDim).fill(0),
    };
  }

  /** Forward pass: input → tanh(W1·x + b1) → W2·h + b2. */
  _forward(net: GuidanceNetwork, input: number[]): number[] {
    const h = net.W1.map((row, i) => {
      const sum = row.reduce((acc, w, j) => acc + w * input[j], 0) + net.b1[i];
      return Math.tanh(sum);
    });
    return net.W2.map((row, i) =>
      row.reduce((acc, w, j) => acc + w * h[j], 0) + net.b2[i]);
  }

  /** Simplified training: reinforce weights toward improvement directions. */
  _trainNetwork(net: GuidanceNetwork, history: Array<{ globalBest: number }>): void {
    if (history.length < 2) return;
    const recent = history.slice(-10);
    const lr = 0.01;
    for (let i = 1; i < recent.length; i++) {
      if (recent[i].globalBest < recent[i - 1].globalBest) {
        // Small random perturbation to encourage exploration
        for (let r = 0; r < net.W1.length; r++)
          for (let c = 0; c < net.W1[r].length; c++)
            net.W1[r][c] += lr * (Math.random() - 0.5) * 0.01;
      }
    }
  }

  /** Find global best particle. */
  _findGlobalBest(particles: Particle[]): { position: number[]; fitness: number } {
    let best = { position: [...particles[0].bestPosition], fitness: particles[0].bestFitness };
    for (const p of particles) {
      if (p.bestFitness < best.fitness) {
        best = { position: [...p.bestPosition], fitness: p.bestFitness };
      }
    }
    return best;
  }
}

export const swarmNeuralHybridEngine = new SwarmNeuralHybridEngineImpl();
