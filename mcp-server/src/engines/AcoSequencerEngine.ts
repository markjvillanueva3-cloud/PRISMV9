/**
 * PRISM MCP Server -- ACO Sequencer Engine
 *
 * Ant Colony Optimization for CNC operation/feature sequencing:
 * - Pheromone-guided roulette selection with elitist update
 * - Distance + tool change + fixture change cost matrices
 * - Hole drilling sequence optimization
 * - Tool-grouped optimization (minimize tool changes)
 * - Convergence detection, time savings estimation
 *
 * Based on Dorigo (1992), PRISM_ACO_SEQUENCER.js (monolith R2.3.1).
 *
 * @module AcoSequencerEngine
 */

// ============================================================================
// TYPES
// ============================================================================

export interface Feature {
  x?: number; y?: number; z?: number;
  toolId?: string; tool?: string;
  fixtureId?: string;
  [key: string]: unknown;
}

export interface ACOSeqConfig {
  numAnts?: number;
  iterations?: number;
  alpha?: number;
  beta?: number;
  evaporation?: number;
  Q?: number;
  startNode?: number;
  toolChangePenalty?: number;
}

export interface SeqResult {
  success: boolean;
  sequence: number[];
  cost: number;
  baselineCost?: number;
  improvement?: string;
  improvementValue?: number;
  iterations?: number;
  toolChanges?: number;
  travelDistance?: number;
}

// ============================================================================
// CONFIG
// ============================================================================

const DEFAULTS = {
  numAnts: 20,
  iterations: 100,
  alpha: 1.0,
  beta: 2.0,
  evaporation: 0.5,
  Q: 100,
  initialPheromone: 1.0,
  elitistWeight: 2.0,
  convergenceThreshold: 0.001,
  stagnationLimit: 20,
  toolChangeTime: 15,
};

// ============================================================================
// ENGINE
// ============================================================================

class AcoSequencerEngineImpl {

  /** Initialize NxN pheromone matrix (zero diagonal). */
  initializePheromones(n: number, initial: number = DEFAULTS.initialPheromone): number[][] {
    return Array.from({ length: n }, (_, i) =>
      Array.from({ length: n }, (_, j) => i === j ? 0 : initial),
    );
  }

  /** Calculate Euclidean distance matrix from feature positions. */
  calculateDistanceMatrix(features: Feature[]): number[][] {
    const n = features.length;
    return Array.from({ length: n }, (_, i) =>
      Array.from({ length: n }, (_, j) => {
        if (i === j) return Infinity;
        const dx = (features[j].x ?? 0) - (features[i].x ?? 0);
        const dy = (features[j].y ?? 0) - (features[i].y ?? 0);
        const dz = (features[j].z ?? 0) - (features[i].z ?? 0);
        return Math.sqrt(dx * dx + dy * dy + dz * dz);
      }),
    );
  }

  /** Calculate tool change penalty matrix. */
  calculateToolChangeMatrix(features: Feature[], penalty: number = DEFAULTS.toolChangeTime): number[][] {
    const n = features.length;
    return Array.from({ length: n }, (_, i) =>
      Array.from({ length: n }, (_, j) => {
        if (i === j) return 0;
        const t1 = features[i].toolId ?? features[i].tool;
        const t2 = features[j].toolId ?? features[j].tool;
        return t1 !== t2 ? penalty : 0;
      }),
    );
  }

  /** Select next node via pheromone-guided roulette. */
  selectNextNode(current: number, unvisited: number[], pheromones: number[][], distances: number[][], alpha: number, beta: number): number {
    const probs: Array<{ node: number; p: number }> = [];
    let total = 0;

    for (const node of unvisited) {
      const tau = Math.pow(pheromones[current][node], alpha);
      const d = distances[current][node];
      const eta = d > 0 && d < Infinity ? Math.pow(1 / d, beta) : 1;
      const p = tau * eta;
      probs.push({ node, p });
      total += p;
    }

    if (total <= 0) return unvisited[Math.floor(Math.random() * unvisited.length)];

    let rand = Math.random() * total;
    for (const { node, p } of probs) {
      rand -= p;
      if (rand <= 0) return node;
    }
    return probs[probs.length - 1].node;
  }

  /** Construct a tour for one ant. */
  constructTour(startNode: number, n: number, pheromones: number[][], distances: number[][], alpha: number, beta: number): { path: number[]; cost: number } {
    const path: number[] = [];
    const unvisited = new Set(Array.from({ length: n }, (_, i) => i));

    let current = startNode >= 0 && startNode < n ? startNode : Math.floor(Math.random() * n);
    path.push(current);
    unvisited.delete(current);

    while (unvisited.size > 0) {
      const next = this.selectNextNode(current, Array.from(unvisited), pheromones, distances, alpha, beta);
      path.push(next);
      unvisited.delete(next);
      current = next;
    }

    return { path, cost: this.calculatePathCost(path, distances) };
  }

  /** Calculate total path cost. */
  calculatePathCost(path: number[], distances: number[][], toolChanges?: number[][]): number {
    let cost = 0;
    for (let i = 0; i < path.length - 1; i++) {
      const d = distances[path[i]][path[i + 1]];
      cost += d < Infinity ? d : 0;
      if (toolChanges) cost += toolChanges[path[i]][path[i + 1]];
    }
    return cost;
  }

  /** Update pheromone matrix with evaporation + deposit + elitist bonus. */
  updatePheromones(pheromones: number[][], tours: Array<{ path: number[]; cost: number }>, evaporation: number, Q: number, bestTour?: { path: number[]; cost: number }): void {
    const n = pheromones.length;
    for (let i = 0; i < n; i++)
      for (let j = 0; j < n; j++) {
        pheromones[i][j] = Math.max(0.001, pheromones[i][j] * (1 - evaporation));
      }

    for (const tour of tours) {
      const deposit = Q / tour.cost;
      for (let i = 0; i < tour.path.length - 1; i++) {
        pheromones[tour.path[i]][tour.path[i + 1]] += deposit;
        pheromones[tour.path[i + 1]][tour.path[i]] += deposit;
      }
    }

    if (bestTour?.path) {
      const ed = (Q / bestTour.cost) * DEFAULTS.elitistWeight;
      for (let i = 0; i < bestTour.path.length - 1; i++) {
        pheromones[bestTour.path[i]][bestTour.path[i + 1]] += ed;
        pheromones[bestTour.path[i + 1]][bestTour.path[i]] += ed;
      }
    }
  }

  /** Optimize a feature sequence (main ACO entry point). */
  optimizeSequence(features: Feature[], config: ACOSeqConfig = {}): SeqResult {
    const n = features.length;
    if (n < 2) return { success: true, sequence: n === 1 ? [0] : [], cost: 0, improvement: "0.0%" };

    const numAnts = config.numAnts ?? DEFAULTS.numAnts;
    const iterations = config.iterations ?? DEFAULTS.iterations;
    const alpha = config.alpha ?? DEFAULTS.alpha;
    const beta = config.beta ?? DEFAULTS.beta;
    const evap = config.evaporation ?? DEFAULTS.evaporation;
    const Q = config.Q ?? DEFAULTS.Q;
    const startNode = config.startNode ?? -1;

    const distances = this.calculateDistanceMatrix(features);
    const pheromones = this.initializePheromones(n);

    let bestTour: { path: number[]; cost: number } | null = null;
    let bestCost = Infinity;
    const baselineCost = this.calculatePathCost(Array.from({ length: n }, (_, i) => i), distances);

    let stag = 0, lastBest = Infinity;

    for (let iter = 0; iter < iterations; iter++) {
      const tours: Array<{ path: number[]; cost: number }> = [];
      for (let ant = 0; ant < numAnts; ant++) {
        const tour = this.constructTour(startNode, n, pheromones, distances, alpha, beta);
        tours.push(tour);
        if (tour.cost < bestCost) { bestCost = tour.cost; bestTour = { ...tour }; }
      }
      this.updatePheromones(pheromones, tours, evap, Q, bestTour ?? undefined);

      if (Math.abs(lastBest - bestCost) < DEFAULTS.convergenceThreshold) {
        if (++stag >= DEFAULTS.stagnationLimit) break;
      } else stag = 0;
      lastBest = bestCost;
    }

    const improvement = baselineCost > 0 ? ((baselineCost - bestCost) / baselineCost) * 100 : 0;
    return {
      success: true,
      sequence: bestTour!.path,
      cost: bestCost,
      baselineCost,
      improvement: improvement.toFixed(1) + "%",
      improvementValue: improvement,
    };
  }

  /** Optimize hole drilling sequence (beta=3 for distance priority). */
  optimizeHoleSequence(holes: Feature[], config: ACOSeqConfig = {}): SeqResult {
    return this.optimizeSequence(holes, { ...config, beta: config.beta ?? 3.0 });
  }

  /** Optimize with tool change penalties included in cost matrix. */
  optimizeWithToolChanges(features: Feature[], config: ACOSeqConfig = {}): SeqResult {
    const n = features.length;
    if (n < 2) return { success: true, sequence: n === 1 ? [0] : [], cost: 0, toolChanges: 0 };

    const penalty = config.toolChangePenalty ?? DEFAULTS.toolChangeTime;
    const distances = this.calculateDistanceMatrix(features);
    const toolChanges = this.calculateToolChangeMatrix(features, penalty);

    // Combined cost matrix
    const costMatrix = Array.from({ length: n }, (_, i) =>
      Array.from({ length: n }, (_, j) => {
        const d = distances[i][j];
        return (d < Infinity ? d : 0) + toolChanges[i][j];
      }),
    );

    const numAnts = config.numAnts ?? DEFAULTS.numAnts;
    const iterations = config.iterations ?? DEFAULTS.iterations;
    const pheromones = this.initializePheromones(n);
    let bestTour: { path: number[]; cost: number } | null = null;
    let bestCost = Infinity;

    for (let iter = 0; iter < iterations; iter++) {
      const tours: Array<{ path: number[]; cost: number }> = [];
      for (let ant = 0; ant < numAnts; ant++) {
        const tour = this.constructTour(-1, n, pheromones, costMatrix, config.alpha ?? 1, config.beta ?? 2);
        tours.push(tour);
        if (tour.cost < bestCost) { bestCost = tour.cost; bestTour = { ...tour }; }
      }
      this.updatePheromones(pheromones, tours, config.evaporation ?? 0.5, DEFAULTS.Q, bestTour ?? undefined);
    }

    let actualToolChanges = 0;
    for (let i = 0; i < bestTour!.path.length - 1; i++) {
      if (toolChanges[bestTour!.path[i]][bestTour!.path[i + 1]] > 0) actualToolChanges++;
    }
    const travelDist = this.calculatePathCost(bestTour!.path, distances);

    return {
      success: true,
      sequence: bestTour!.path,
      cost: bestCost,
      toolChanges: actualToolChanges,
      travelDistance: travelDist,
    };
  }

  /** Group features by tool, optimize within each group, concatenate. */
  optimizeByToolGroups(features: Feature[], config: ACOSeqConfig = {}): SeqResult {
    const groups: Record<string, Array<Feature & { _origIdx: number }>> = {};
    features.forEach((f, i) => {
      const tid = f.toolId ?? f.tool ?? "default";
      if (!groups[tid]) groups[tid] = [];
      groups[tid].push({ ...f, _origIdx: i });
    });

    const seq: number[] = [];
    let totalCost = 0;
    for (const gf of Object.values(groups)) {
      if (gf.length > 1) {
        const r = this.optimizeSequence(gf, config);
        seq.push(...r.sequence.map(i => gf[i]._origIdx));
        totalCost += r.cost;
      } else {
        seq.push(gf[0]._origIdx);
      }
    }
    return { success: true, sequence: seq, cost: totalCost };
  }

  /** Estimate time savings from optimization. */
  estimateTimeSavings(baselineCost: number, optimizedCost: number, rapidFeedrate: number = 10000): { distanceSaved: number; timeSavedSeconds: number; percentImprovement: string } {
    const saved = baselineCost - optimizedCost;
    return {
      distanceSaved: saved,
      timeSavedSeconds: (saved / rapidFeedrate) * 60,
      percentImprovement: baselineCost > 0 ? ((saved / baselineCost) * 100).toFixed(2) + "%" : "0.0%",
    };
  }
}

export const acoSequencerEngine = new AcoSequencerEngineImpl();
