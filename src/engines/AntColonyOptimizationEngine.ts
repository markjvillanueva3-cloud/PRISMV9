/**
 * AntColonyOptimizationEngine — Ant Colony Optimization (ACO)
 *
 * Swarm intelligence metaheuristic for combinatorial optimization.
 * Implements Ant System (AS) and Max-Min Ant System (MMAS).
 *
 * Primary use: TSP-like problems (tool change sequencing, fixture ordering,
 * machine routing, operation sequencing).
 *
 * @module AntColonyOptimizationEngine
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ACOConfig {
  nodeCount: number;
  distanceMatrix: number[][];       // Symmetric or asymmetric
  antCount?: number;                // Default nodeCount
  maxIterations?: number;           // Default 100
  alpha?: number;                   // Pheromone importance. Default 1.0
  beta?: number;                    // Heuristic importance. Default 2.0
  evaporationRate?: number;         // ρ, default 0.1
  q?: number;                      // Pheromone deposit amount. Default 100
  variant?: "AS" | "MMAS";         // Default "MMAS"
  seed?: number;
}

export interface ACOResult {
  bestTour: number[];
  bestDistance: number;
  iterations: number;
  convergenceHistory: number[];
  pheromoneRange: { min: number; max: number };
}

// ---------------------------------------------------------------------------
// Engine
// ---------------------------------------------------------------------------

class AntColonyOptimizationEngineImpl {

  /**
   * Solve a TSP-like problem using ACO.
   * Returns the best tour (node indices) and total distance.
   */
  solve(config: ACOConfig): ACOResult {
    const {
      nodeCount, distanceMatrix,
      antCount = nodeCount,
      maxIterations = 100,
      alpha = 1.0,
      beta = 2.0,
      evaporationRate = 0.1,
      q = 100,
      variant = "MMAS",
      seed,
    } = config;

    const rng = seed != null ? this._seededRng(seed) : Math.random;

    // Initialize pheromone matrix
    const tau0 = 1 / (nodeCount * this._nearestNeighborDistance(distanceMatrix, nodeCount));
    const pheromone: number[][] = Array.from({ length: nodeCount }, () =>
      new Array(nodeCount).fill(tau0)
    );

    // Heuristic matrix (1/distance)
    const eta: number[][] = distanceMatrix.map(row =>
      row.map(d => d > 0 ? 1 / d : 0)
    );

    let bestTour: number[] = [];
    let bestDistance = Infinity;
    const history: number[] = [];

    // MMAS bounds
    const tauMax = () => 1 / (evaporationRate * (bestDistance || 1));
    const tauMin = () => tauMax() / (2 * nodeCount);

    for (let iter = 0; iter < maxIterations; iter++) {
      const tours: number[][] = [];
      const distances: number[] = [];

      // Construct solutions
      for (let a = 0; a < antCount; a++) {
        const tour = this._constructTour(nodeCount, pheromone, eta, alpha, beta, rng);
        const dist = this._tourDistance(tour, distanceMatrix);
        tours.push(tour);
        distances.push(dist);

        if (dist < bestDistance) {
          bestDistance = dist;
          bestTour = [...tour];
        }
      }

      // Evaporate pheromone
      for (let i = 0; i < nodeCount; i++) {
        for (let j = 0; j < nodeCount; j++) {
          pheromone[i][j] *= (1 - evaporationRate);
        }
      }

      // Deposit pheromone
      if (variant === "MMAS") {
        // Only best ant deposits
        for (let k = 0; k < bestTour.length - 1; k++) {
          const i = bestTour[k];
          const j = bestTour[k + 1];
          pheromone[i][j] += q / bestDistance;
          pheromone[j][i] += q / bestDistance;
        }

        // Clamp to bounds
        const tMax = tauMax();
        const tMin = tauMin();
        for (let i = 0; i < nodeCount; i++) {
          for (let j = 0; j < nodeCount; j++) {
            pheromone[i][j] = Math.max(tMin, Math.min(tMax, pheromone[i][j]));
          }
        }
      } else {
        // AS: all ants deposit proportional to tour quality
        for (let a = 0; a < antCount; a++) {
          const deposit = q / distances[a];
          for (let k = 0; k < tours[a].length - 1; k++) {
            const i = tours[a][k];
            const j = tours[a][k + 1];
            pheromone[i][j] += deposit;
            pheromone[j][i] += deposit;
          }
        }
      }

      history.push(bestDistance);
    }

    // Flatten pheromone for range
    const allPher = pheromone.flat();
    return {
      bestTour,
      bestDistance,
      iterations: maxIterations,
      convergenceHistory: history,
      pheromoneRange: {
        min: Math.min(...allPher.filter(v => v > 0)),
        max: Math.max(...allPher),
      },
    };
  }

  /**
   * Solve a general assignment problem (nodes to resources).
   * Each node is assigned to exactly one resource to minimize total cost.
   */
  solveAssignment(
    costMatrix: number[][],
    config?: Partial<ACOConfig>
  ): { assignment: number[]; totalCost: number } {
    const n = costMatrix.length;
    const m = costMatrix[0].length;

    // Convert to TSP-like via dummy distance matrix
    const dMatrix: number[][] = Array.from({ length: n }, (_, i) =>
      Array.from({ length: n }, (_, j) =>
        i === j ? Infinity : costMatrix[i]?.[j] ?? Infinity
      )
    );

    // Use greedy assignment as fallback for non-square
    if (n !== m) {
      return this._greedyAssignment(costMatrix);
    }

    const result = this.solve({
      nodeCount: n,
      distanceMatrix: dMatrix,
      maxIterations: config?.maxIterations ?? 50,
      antCount: config?.antCount ?? n,
      seed: config?.seed,
    });

    // Extract assignment from best tour
    const assignment = result.bestTour.slice(0, n);
    const totalCost = assignment.reduce((sum, node, idx) =>
      sum + (costMatrix[idx]?.[node] ?? 0), 0);

    return { assignment, totalCost };
  }

  private _constructTour(
    n: number, pheromone: number[][], eta: number[][],
    alpha: number, beta: number, rng: () => number
  ): number[] {
    const visited = new Set<number>();
    const start = Math.floor(rng() * n);
    const tour = [start];
    visited.add(start);

    while (visited.size < n) {
      const current = tour[tour.length - 1];
      const probabilities: { node: number; prob: number }[] = [];
      let total = 0;

      for (let j = 0; j < n; j++) {
        if (!visited.has(j)) {
          const p = Math.pow(pheromone[current][j], alpha) * Math.pow(eta[current][j], beta);
          probabilities.push({ node: j, prob: p });
          total += p;
        }
      }

      // Roulette wheel selection
      if (total === 0) {
        // Pick random unvisited
        const unvisited = [...Array(n).keys()].filter(j => !visited.has(j));
        const next = unvisited[Math.floor(rng() * unvisited.length)];
        tour.push(next);
        visited.add(next);
      } else {
        let r = rng() * total;
        for (const { node, prob } of probabilities) {
          r -= prob;
          if (r <= 0) {
            tour.push(node);
            visited.add(node);
            break;
          }
        }
        if (tour.length === visited.size) {
          // Fallback if rounding error
          const last = probabilities[probabilities.length - 1].node;
          if (!visited.has(last)) {
            tour.push(last);
            visited.add(last);
          }
        }
      }
    }

    // Return to start
    tour.push(start);
    return tour;
  }

  private _tourDistance(tour: number[], dist: number[][]): number {
    let total = 0;
    for (let i = 0; i < tour.length - 1; i++) {
      total += dist[tour[i]][tour[i + 1]];
    }
    return total;
  }

  private _nearestNeighborDistance(dist: number[][], n: number): number {
    const visited = new Set<number>([0]);
    let current = 0;
    let total = 0;

    while (visited.size < n) {
      let nearest = -1;
      let nearestDist = Infinity;
      for (let j = 0; j < n; j++) {
        if (!visited.has(j) && dist[current][j] < nearestDist) {
          nearest = j;
          nearestDist = dist[current][j];
        }
      }
      if (nearest < 0) break;
      total += nearestDist;
      visited.add(nearest);
      current = nearest;
    }
    total += dist[current][0];
    return total || 1;
  }

  private _greedyAssignment(cost: number[][]): { assignment: number[]; totalCost: number } {
    const n = cost.length;
    const m = cost[0].length;
    const assignment = new Array(n).fill(-1);
    const used = new Set<number>();
    let totalCost = 0;

    // Greedy: for each row, pick cheapest unused column
    const order = [...Array(n).keys()].sort((a, b) => {
      const minA = Math.min(...cost[a]);
      const minB = Math.min(...cost[b]);
      return minA - minB;
    });

    for (const i of order) {
      let bestJ = -1;
      let bestCost = Infinity;
      for (let j = 0; j < m; j++) {
        if (!used.has(j) && cost[i][j] < bestCost) {
          bestCost = cost[i][j];
          bestJ = j;
        }
      }
      if (bestJ >= 0) {
        assignment[i] = bestJ;
        used.add(bestJ);
        totalCost += bestCost;
      }
    }

    return { assignment, totalCost };
  }

  private _seededRng(seed: number): () => number {
    let s = seed;
    return () => {
      s = (s * 1664525 + 1013904223) & 0x7fffffff;
      return s / 0x7fffffff;
    };
  }
}

export const antColonyOptimizationEngine = new AntColonyOptimizationEngineImpl();
