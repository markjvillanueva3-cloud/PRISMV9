/**
 * LocalSearchEngine — Reverse-engineered from PRISM v8.89 monolith
 *
 * Metaheuristic optimization: hill climbing, simulated annealing,
 * beam search, and TSP local search (2-opt, 3-opt).
 *
 * Manufacturing applications: toolpath optimization, job scheduling,
 * fixture layout, nesting, parameter tuning.
 *
 * Source: PRISM_LOCAL_SEARCH (MIT 6.034, MIT 18.453)
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SearchProblem<S> {
  initial: S;
  evaluate: (state: S) => number;
  getNeighbors: (state: S) => S[];
  maximize?: boolean;
  maxIterations?: number;
  randomState?: () => S;
  isGoal?: (state: S) => boolean;
}

export interface SearchResult<S> {
  solution: S;
  value: number;
  iterations: number;
  localOptimum: boolean;
}

export interface SAConfig<S> {
  problem: SearchProblem<S>;
  initialTemp?: number;
  coolingRate?: number;
  minTemp?: number;
  maxIterations?: number;
}

export interface SAResult<S> {
  solution: S;
  energy: number;
  finalTemp: number;
  iterations: number;
  history: Array<{ iteration: number; temperature: number; currentEnergy: number; bestEnergy: number }>;
}

export interface TwoOptResult {
  tour: number[];
  length: number;
  iterations: number;
  improved: boolean;
}

// ---------------------------------------------------------------------------
// Engine
// ---------------------------------------------------------------------------

class LocalSearchEngineImpl {

  /**
   * Hill climbing (steepest ascent/descent).
   */
  hillClimbing<S>(problem: SearchProblem<S>): SearchResult<S> {
    let current = problem.initial;
    let currentValue = problem.evaluate(current);
    let iterations = 0;
    const maxIter = problem.maxIterations ?? 10000;

    while (iterations < maxIter) {
      iterations++;
      const neighbors = problem.getNeighbors(current);
      if (neighbors.length === 0) break;

      let bestNeighbor: S | null = null;
      let bestValue = currentValue;

      for (const neighbor of neighbors) {
        const value = problem.evaluate(neighbor);
        if (problem.maximize ? value > bestValue : value < bestValue) {
          bestValue = value;
          bestNeighbor = neighbor;
        }
      }

      if (bestNeighbor === null) {
        return { solution: current, value: currentValue, iterations, localOptimum: true };
      }

      current = bestNeighbor;
      currentValue = bestValue;
    }

    return { solution: current, value: currentValue, iterations, localOptimum: iterations < maxIter };
  }

  /**
   * Hill climbing with random restarts.
   */
  hillClimbingRestarts<S>(problem: SearchProblem<S>, numRestarts: number = 10): {
    solution: S; value: number; restarts: number;
  } {
    let bestSolution = problem.initial;
    let bestValue = problem.maximize ? -Infinity : Infinity;

    for (let i = 0; i < numRestarts; i++) {
      const initial = problem.randomState ? problem.randomState() : problem.initial;
      const result = this.hillClimbing({ ...problem, initial });

      const isBetter = problem.maximize
        ? result.value > bestValue
        : result.value < bestValue;

      if (isBetter) {
        bestValue = result.value;
        bestSolution = result.solution;
      }
    }

    return { solution: bestSolution, value: bestValue, restarts: numRestarts };
  }

  /**
   * Simulated annealing — escapes local optima via temperature-based acceptance.
   */
  simulatedAnnealing<S>(config: SAConfig<S>): SAResult<S> {
    const {
      problem,
      initialTemp = 1000,
      coolingRate = 0.995,
      minTemp = 0.01,
      maxIterations = 100000,
    } = config;

    let current = problem.initial;
    let currentEnergy = problem.evaluate(current);
    let best = current;
    let bestEnergy = currentEnergy;
    let temperature = initialTemp;
    let iterations = 0;
    const history: SAResult<S>["history"] = [];

    while (temperature > minTemp && iterations < maxIterations) {
      iterations++;

      const neighbors = problem.getNeighbors(current);
      if (neighbors.length === 0) break;

      const neighbor = neighbors[Math.floor(Math.random() * neighbors.length)];
      const neighborEnergy = problem.evaluate(neighbor);
      const deltaE = neighborEnergy - currentEnergy;

      // Accept better, or probabilistically accept worse (minimization)
      const acceptProb = deltaE < 0 ? 1 : Math.exp(-deltaE / temperature);

      if (Math.random() < acceptProb) {
        current = neighbor;
        currentEnergy = neighborEnergy;

        if (currentEnergy < bestEnergy) {
          best = current;
          bestEnergy = currentEnergy;
        }
      }

      temperature *= coolingRate;

      if (iterations % 100 === 0) {
        history.push({ iteration: iterations, temperature, currentEnergy, bestEnergy });
      }
    }

    return { solution: best, energy: bestEnergy, finalTemp: temperature, iterations, history };
  }

  /**
   * Local beam search — maintains k states in parallel.
   */
  localBeamSearch<S>(problem: SearchProblem<S>, k: number = 5): {
    solution: S; value: number; iterations: number;
  } {
    let states = Array.from({ length: k }, () => {
      const state = problem.randomState ? problem.randomState() : problem.initial;
      return { state, value: problem.evaluate(state) };
    });

    const maxIter = problem.maxIterations ?? 1000;

    for (let iter = 0; iter < maxIter; iter++) {
      if (problem.isGoal) {
        for (const s of states) {
          if (problem.isGoal(s.state)) {
            return { solution: s.state, value: s.value, iterations: iter };
          }
        }
      }

      const allSuccessors: Array<{ state: S; value: number }> = [];
      for (const s of states) {
        for (const neighbor of problem.getNeighbors(s.state)) {
          allSuccessors.push({ state: neighbor, value: problem.evaluate(neighbor) });
        }
      }

      if (allSuccessors.length === 0) break;

      allSuccessors.sort((a, b) =>
        problem.maximize ? b.value - a.value : a.value - b.value
      );
      states = allSuccessors.slice(0, k);
    }

    states.sort((a, b) => problem.maximize ? b.value - a.value : a.value - b.value);
    return { solution: states[0].state, value: states[0].value, iterations: maxIter };
  }

  /**
   * 2-opt local search for TSP improvement.
   * Iteratively swaps edges to reduce tour length.
   */
  twoOpt(tour: number[], distanceMatrix: number[][]): TwoOptResult {
    let currentTour = [...tour];
    let improved = true;
    let iterations = 0;
    const maxIter = 10000;

    const tourLen = (t: number[]) => {
      let len = 0;
      for (let i = 0; i < t.length - 1; i++) len += distanceMatrix[t[i]][t[i + 1]];
      len += distanceMatrix[t[t.length - 1]][t[0]];
      return len;
    };

    let currentLength = tourLen(currentTour);

    while (improved && iterations < maxIter) {
      improved = false;
      iterations++;

      for (let i = 0; i < currentTour.length - 1; i++) {
        for (let j = i + 2; j < currentTour.length; j++) {
          const a = currentTour[i];
          const b = currentTour[i + 1];
          const c = currentTour[j];
          const d = currentTour[(j + 1) % currentTour.length];

          const currentDist = distanceMatrix[a][b] + distanceMatrix[c][d];
          const newDist = distanceMatrix[a][c] + distanceMatrix[b][d];

          if (newDist < currentDist - 1e-10) {
            currentTour = [
              ...currentTour.slice(0, i + 1),
              ...currentTour.slice(i + 1, j + 1).reverse(),
              ...currentTour.slice(j + 1),
            ];
            currentLength = tourLen(currentTour);
            improved = true;
          }
        }
      }
    }

    return { tour: currentTour, length: currentLength, iterations, improved: iterations > 1 };
  }

  /**
   * 3-opt local search for TSP (more powerful than 2-opt).
   */
  threeOpt(tour: number[], distanceMatrix: number[][], maxIterations: number = 1000): TwoOptResult {
    let currentTour = [...tour];
    let improved = true;
    let iterations = 0;

    const tourLen = (t: number[]) => {
      let len = 0;
      for (let i = 0; i < t.length; i++) len += distanceMatrix[t[i]][t[(i + 1) % t.length]];
      return len;
    };

    let currentLength = tourLen(currentTour);

    while (improved && iterations < maxIterations) {
      improved = false;
      iterations++;

      for (let i = 0; i < currentTour.length - 2 && !improved; i++) {
        for (let j = i + 2; j < currentTour.length - 1 && !improved; j++) {
          for (let k = j + 2; k < currentTour.length + (i > 0 ? 1 : 0) && !improved; k++) {
            const kMod = k % currentTour.length;
            const segments = this._get3OptSegments(currentTour, i, j, kMod);

            for (const newTour of segments) {
              const newLength = tourLen(newTour);
              if (newLength < currentLength - 1e-10) {
                currentTour = newTour;
                currentLength = newLength;
                improved = true;
                break;
              }
            }
          }
        }
      }
    }

    return { tour: currentTour, length: currentLength, iterations, improved: iterations > 1 };
  }

  // -------------------------------------------------------------------------
  // Internal helpers
  // -------------------------------------------------------------------------

  private _get3OptSegments(tour: number[], i: number, j: number, k: number): number[][] {
    const n = tour.length;
    const A = tour.slice(0, i + 1);
    const B = tour.slice(i + 1, j + 1);
    const C = tour.slice(j + 1, k + 1);
    const D = k + 1 < n ? tour.slice(k + 1) : [];

    return [
      [...A, ...B.slice().reverse(), ...C, ...D],
      [...A, ...B, ...C.slice().reverse(), ...D],
      [...A, ...B.slice().reverse(), ...C.slice().reverse(), ...D],
      [...A, ...C, ...B, ...D],
      [...A, ...C.slice().reverse(), ...B, ...D],
      [...A, ...C, ...B.slice().reverse(), ...D],
      [...A, ...C.slice().reverse(), ...B.slice().reverse(), ...D],
    ].filter(s => s.length === n);
  }
}

export const localSearchEngine = new LocalSearchEngineImpl();
