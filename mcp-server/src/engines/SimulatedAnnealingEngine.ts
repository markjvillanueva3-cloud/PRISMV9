/**
 * PRISM MCP Server -- Simulated Annealing Engine
 *
 * Simulated annealing optimizer:
 * - Metropolis acceptance criterion
 * - Cooling schedules: geometric, linear, logarithmic, adaptive
 * - Adaptive neighbor step size, boundary reflection
 * - Reheating on stagnation
 * - Batch optimization (multi-start)
 * - Tool sequence optimization (2-opt TSP)
 *
 * Based on Kirkpatrick et al. (1983), MIT 6.034.
 * Ported from PRISM_SIMULATED_ANNEALING.js (monolith R2.3.1).
 *
 * @module SimulatedAnnealingEngine
 */

// ============================================================================
// TYPES
// ============================================================================

export interface Bounds { min: number; max: number; }

export interface SAConfig {
  initialTemp?: number;
  finalTemp?: number;
  coolingRate?: number;
  maxIterations?: number;
  iterationsPerTemp?: number;
  coolingSchedule?: "geometric" | "linear" | "logarithmic" | "adaptive";
  reheatEnabled?: boolean;
  reheatThreshold?: number;
  reheatFactor?: number;
  neighborSigma?: number;
  initialSolution?: number[];
}

export interface SAResult {
  success: boolean;
  bestSolution: number[];
  bestFitness: number;
  iterations: number;
  finalTemperature: number;
  acceptanceRate: number;
  reheats: number;
  fitnessHistory: number[];
  temperatureHistory: number[];
}

export interface BatchSAResult {
  best: SAResult;
  allResults: Array<{ fitness: number; iterations: number }>;
  numRuns: number;
}

export interface SequenceResult {
  success: boolean;
  sequence: number[];
  distance: number;
}

// ============================================================================
// ENGINE
// ============================================================================

const DEFAULTS = {
  initialTemp: 1000,
  finalTemp: 0.001,
  coolingRate: 0.95,
  maxIterations: 10000,
  iterationsPerTemp: 100,
  neighborSigma: 0.1,
  reheatThreshold: 200,
  reheatFactor: 2.0,
};

class SimulatedAnnealingEngineImpl {

  /** Generate neighbor via Gaussian perturbation with adaptive step size. */
  generateNeighbor(current: number[], bounds: Bounds[], temperature: number, initialTemp: number = DEFAULTS.initialTemp, sigma: number = DEFAULTS.neighborSigma): number[] {
    const adaptSigma = sigma * Math.sqrt(temperature / initialTemp);
    return current.map((val, i) => {
      const range = bounds[i].max - bounds[i].min;
      let nv = val + (Math.random() * 2 - 1) * adaptSigma * range;
      // Boundary reflection
      if (nv < bounds[i].min) nv = bounds[i].min + Math.abs(bounds[i].min - nv);
      if (nv > bounds[i].max) nv = bounds[i].max - Math.abs(nv - bounds[i].max);
      return Math.max(bounds[i].min, Math.min(bounds[i].max, nv));
    });
  }

  /** Metropolis acceptance: always accept improvements, probabilistically accept worse. */
  acceptanceProbability(currentEnergy: number, newEnergy: number, temperature: number): boolean {
    if (newEnergy < currentEnergy) return true;
    return Math.random() < Math.exp(-(newEnergy - currentEnergy) / temperature);
  }

  // ── Cooling schedules ──

  coolGeometric(temp: number, rate: number): number { return temp * rate; }
  coolLinear(initialTemp: number, iteration: number, maxIterations: number): number {
    return initialTemp * (1 - iteration / maxIterations);
  }
  coolLogarithmic(initialTemp: number, iteration: number): number {
    return initialTemp / Math.log(iteration + 2);
  }
  coolAdaptive(temp: number, acceptanceRate: number, target: number = 0.3): number {
    return temp * (acceptanceRate > target ? 0.9 : 0.99);
  }

  // ── Main optimizer ──

  optimize(fitnessFunction: (solution: number[]) => number, bounds: Bounds[], config: SAConfig = {}): SAResult {
    const initTemp = config.initialTemp ?? DEFAULTS.initialTemp;
    const finalTemp = config.finalTemp ?? DEFAULTS.finalTemp;
    const coolRate = config.coolingRate ?? DEFAULTS.coolingRate;
    const maxIter = config.maxIterations ?? DEFAULTS.maxIterations;
    const perTemp = config.iterationsPerTemp ?? DEFAULTS.iterationsPerTemp;
    const schedule = config.coolingSchedule ?? "geometric";
    const reheat = config.reheatEnabled !== false;
    const reheatThresh = config.reheatThreshold ?? DEFAULTS.reheatThreshold;
    const reheatFactor = config.reheatFactor ?? DEFAULTS.reheatFactor;
    const sigma = config.neighborSigma ?? DEFAULTS.neighborSigma;

    let current = config.initialSolution ?? bounds.map(b => b.min + Math.random() * (b.max - b.min));
    let curFit = fitnessFunction(current);
    let curE = -curFit;

    let best = [...current], bestFit = curFit;
    let temp = initTemp, iter = 0, stag = 0;
    let accepted = 0, rejected = 0, reheats = 0;

    const fitHist = [bestFit];
    const tempHist = [temp];

    while (temp > finalTemp && iter < maxIter) {
      let accThisT = 0;

      for (let i = 0; i < perTemp && iter < maxIter; i++) {
        iter++;
        const neighbor = this.generateNeighbor(current, bounds, temp, initTemp, sigma);
        const nFit = fitnessFunction(neighbor);
        const nE = -nFit;

        if (this.acceptanceProbability(curE, nE, temp)) {
          current = neighbor; curFit = nFit; curE = nE;
          accThisT++; accepted++;
          if (curFit > bestFit) { best = [...current]; bestFit = curFit; stag = 0; }
          else stag++;
        } else { rejected++; stag++; }
      }

      const accRate = accThisT / perTemp;

      switch (schedule) {
        case "linear": temp = this.coolLinear(initTemp, iter, maxIter); break;
        case "logarithmic": temp = this.coolLogarithmic(initTemp, iter); break;
        case "adaptive": temp = this.coolAdaptive(temp, accRate); break;
        default: temp = this.coolGeometric(temp, coolRate);
      }

      if (reheat && stag > reheatThresh) {
        temp = Math.min(temp * reheatFactor, initTemp * 0.5);
        stag = 0; reheats++;
      }

      fitHist.push(bestFit);
      tempHist.push(temp);
    }

    return {
      success: true,
      bestSolution: best,
      bestFitness: bestFit,
      iterations: iter,
      finalTemperature: temp,
      acceptanceRate: accepted / (accepted + rejected || 1),
      reheats,
      fitnessHistory: fitHist,
      temperatureHistory: tempHist,
    };
  }

  /** Multi-start batch optimization. */
  batchOptimize(fitnessFunction: (s: number[]) => number, bounds: Bounds[], numRuns: number = 5, config: SAConfig = {}): BatchSAResult {
    const results: SAResult[] = [];
    for (let i = 0; i < numRuns; i++) {
      results.push(this.optimize(fitnessFunction, bounds, { ...config, initialSolution: undefined }));
    }
    results.sort((a, b) => b.bestFitness - a.bestFitness);
    return {
      best: results[0],
      allResults: results.map(r => ({ fitness: r.bestFitness, iterations: r.iterations })),
      numRuns,
    };
  }

  /** Optimize operation sequence (TSP-like) using 2-opt SA. */
  optimizeSequence(positions: Array<{ x: number; y: number; z?: number }>, config: { maxIterations?: number; initialTemp?: number } = {}): SequenceResult {
    const n = positions.length;
    if (n < 2) return { success: true, sequence: [0], distance: 0 };

    const dist = (i: number, j: number) => {
      const a = positions[i], b = positions[j];
      return Math.sqrt((b.x - a.x) ** 2 + (b.y - a.y) ** 2 + ((b.z ?? 0) - (a.z ?? 0)) ** 2);
    };
    const routeDist = (r: number[]) => { let d = 0; for (let i = 0; i < r.length - 1; i++) d += dist(r[i], r[i + 1]); return d; };

    // Greedy nearest-neighbor init
    const route = [0];
    const rem = new Set(Array.from({ length: n - 1 }, (_, i) => i + 1));
    while (rem.size > 0) {
      let nearest = -1, nd = Infinity;
      for (const r of rem) { const d = dist(route[route.length - 1], r); if (d < nd) { nd = d; nearest = r; } }
      route.push(nearest); rem.delete(nearest);
    }

    let current = [...route], curD = routeDist(current);
    let best = [...current], bestD = curD;
    let temp = config.initialTemp ?? 100 * n;
    const maxI = config.maxIterations ?? 5000;

    for (let it = 0; it < maxI; it++) {
      const nRoute = [...current];
      let i = 1 + Math.floor(Math.random() * (n - 1));
      let j = i + Math.floor(Math.random() * (n - i));
      while (i < j) { [nRoute[i], nRoute[j]] = [nRoute[j], nRoute[i]]; i++; j--; }

      const nD = routeDist(nRoute);
      const delta = nD - curD;
      if (delta < 0 || Math.random() < Math.exp(-delta / temp)) {
        current = nRoute; curD = nD;
        if (curD < bestD) { best = [...current]; bestD = curD; }
      }
      temp *= 0.995;
      if (temp < 0.1) break;
    }

    return { success: true, sequence: best, distance: bestD };
  }
}

export const simulatedAnnealingEngine = new SimulatedAnnealingEngineImpl();
