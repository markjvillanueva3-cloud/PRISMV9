/**
 * Ant Colony Tool Sequencing — ACO for Optimal Tool Change Order
 *
 * Implements Ant Colony Optimization (ACO) to find the optimal sequence of
 * tool changes that minimizes total non-cutting time. Models the tool
 * sequencing problem as a Traveling Salesman Problem (TSP).
 *
 * Manufacturing uses: minimize tool change time in multi-tool operations,
 * turret indexing optimization, tool magazine positioning, ATC sequencing.
 *
 * References:
 * - Dorigo, M. & Gambardella, L.M. (1997). "Ant Colony System"
 * - Grieco, A. et al. (2001). "Scheduling of Tool Changes in Flexible Manufacturing"
 *
 * @module algorithms/AntColonyTSP
 */

import type {
  Algorithm, AlgorithmMeta, ValidationResult, ValidationIssue, WithWarnings,
} from "./types.js";

export interface ToolChangeTime {
  /** Source tool index. */
  from: number;
  /** Destination tool index. */
  to: number;
  /** Time to change [s]. */
  time: number;
}

export interface AntColonyTSPInput {
  /** Number of tools in sequence. */
  n_tools: number;
  /** Tool change time matrix (sparse — provide non-trivial entries). */
  change_times: ToolChangeTime[];
  /** Default tool change time [s] (for unspecified pairs). Default 5. */
  default_change_time?: number;
  /** Number of ants per iteration. Default n_tools. */
  n_ants?: number;
  /** Number of iterations. Default 100. */
  n_iterations?: number;
  /** Pheromone importance (alpha). Default 1.0. */
  alpha?: number;
  /** Heuristic importance (beta). Default 2.0. */
  beta?: number;
  /** Pheromone evaporation rate (rho). Default 0.1. */
  rho?: number;
  /** Random seed for reproducibility. Default 42. */
  seed?: number;
  /** Required operations for each tool (constrains visiting order if set). */
  tool_operations?: Array<{ tool_index: number; operation_order?: number }>;
}

export interface AntColonyTSPOutput extends WithWarnings {
  /** Best tool sequence found (tool indices). */
  best_sequence: number[];
  /** Total change time for best sequence [s]. */
  best_time: number;
  /** Worst sequence time found [s] (for comparison). */
  worst_time: number;
  /** Improvement over naive sequential order [%]. */
  improvement_pct: number;
  /** Convergence history (best time per iteration). */
  convergence: number[];
  /** Number of unique solutions explored. */
  solutions_explored: number;
  /** Iteration where best was found. */
  best_iteration: number;
  calculation_method: string;
}

export class AntColonyTSP implements Algorithm<AntColonyTSPInput, AntColonyTSPOutput> {

  validate(input: AntColonyTSPInput): ValidationResult {
    const issues: ValidationIssue[] = [];
    if (!input.n_tools || input.n_tools < 2) {
      issues.push({ field: "n_tools", message: "At least 2 tools required", severity: "error" });
    }
    if (input.n_tools > 100) {
      issues.push({ field: "n_tools", message: "Max 100 tools for this solver", severity: "warning" });
    }
    if ((input.n_iterations ?? 100) > 1000) {
      issues.push({ field: "n_iterations", message: "High iteration count — may be slow", severity: "warning" });
    }
    return { valid: issues.filter(i => i.severity === "error").length === 0, issues };
  }

  calculate(input: AntColonyTSPInput): AntColonyTSPOutput {
    const warnings: string[] = [];
    const n = input.n_tools;
    const nAnts = input.n_ants ?? n;
    const nIter = input.n_iterations ?? 100;
    const alpha = input.alpha ?? 1.0;
    const beta = input.beta ?? 2.0;
    const rho = input.rho ?? 0.1;
    const defaultTime = input.default_change_time ?? 5;
    let seed = input.seed ?? 42;

    // PRNG
    const random = () => {
      seed = (seed * 1664525 + 1013904223) & 0x7fffffff;
      return seed / 0x7fffffff;
    };

    // Build distance matrix
    const dist: number[][] = Array.from({ length: n }, () => new Array(n).fill(defaultTime));
    for (let i = 0; i < n; i++) dist[i][i] = 0;
    for (const ct of input.change_times ?? []) {
      if (ct.from >= 0 && ct.from < n && ct.to >= 0 && ct.to < n) {
        dist[ct.from][ct.to] = ct.time;
      }
    }

    // Pheromone matrix
    const tau0 = 1.0 / (n * defaultTime);
    const tau: number[][] = Array.from({ length: n }, () => new Array(n).fill(tau0));

    // Heuristic: eta[i][j] = 1/dist[i][j]
    const eta: number[][] = Array.from({ length: n }, (_, i) =>
      Array.from({ length: n }, (_, j) => dist[i][j] > 0 ? 1 / dist[i][j] : 100)
    );

    let bestSequence: number[] = [];
    let bestTime = Infinity;
    let worstTime = 0;
    let bestIteration = 0;
    const convergence: number[] = [];
    let totalSolutions = 0;

    // Naive sequential baseline
    const naiveSeq = Array.from({ length: n }, (_, i) => i);
    const naiveTime = this.sequenceTime(naiveSeq, dist);

    for (let iter = 0; iter < nIter; iter++) {
      const iterBestSeqs: number[][] = [];
      const iterBestTimes: number[] = [];

      for (let ant = 0; ant < nAnts; ant++) {
        const visited = new Set<number>();
        const sequence: number[] = [];

        // Start from random tool
        let current = Math.floor(random() * n);
        sequence.push(current);
        visited.add(current);

        while (sequence.length < n) {
          // Probability distribution for next tool
          const probs: number[] = [];
          let probSum = 0;
          const candidates: number[] = [];

          for (let j = 0; j < n; j++) {
            if (visited.has(j)) continue;
            candidates.push(j);
            const p = Math.pow(tau[current][j], alpha) * Math.pow(eta[current][j], beta);
            probs.push(p);
            probSum += p;
          }

          // Roulette wheel selection
          if (probSum <= 0 || candidates.length === 0) break;
          let r = random() * probSum;
          let next = candidates[0];
          for (let k = 0; k < candidates.length; k++) {
            r -= probs[k];
            if (r <= 0) { next = candidates[k]; break; }
          }

          sequence.push(next);
          visited.add(next);
          current = next;
        }

        const time = this.sequenceTime(sequence, dist);
        totalSolutions++;

        iterBestSeqs.push(sequence);
        iterBestTimes.push(time);

        if (time < bestTime) {
          bestTime = time;
          bestSequence = [...sequence];
          bestIteration = iter;
        }
        worstTime = Math.max(worstTime, time);
      }

      // Pheromone evaporation
      for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
          tau[i][j] *= (1 - rho);
        }
      }

      // Pheromone deposit (best ant of iteration)
      let iterBest = 0;
      for (let k = 1; k < iterBestTimes.length; k++) {
        if (iterBestTimes[k] < iterBestTimes[iterBest]) iterBest = k;
      }
      const deposit = 1 / iterBestTimes[iterBest];
      const seq = iterBestSeqs[iterBest];
      for (let k = 0; k < seq.length - 1; k++) {
        tau[seq[k]][seq[k + 1]] += deposit;
      }

      convergence.push(bestTime);
    }

    const improvement = naiveTime > 0 ? ((naiveTime - bestTime) / naiveTime) * 100 : 0;

    if (improvement < 1) {
      warnings.push("Minimal improvement over sequential — may already be near-optimal");
    }

    return {
      best_sequence: bestSequence,
      best_time: bestTime,
      worst_time: worstTime,
      improvement_pct: improvement,
      convergence,
      solutions_explored: totalSolutions,
      best_iteration: bestIteration,
      warnings,
      calculation_method: `ACO-TSP (n=${n}, ants=${nAnts}, iter=${nIter}, α=${alpha}, β=${beta}, ρ=${rho})`,
    };
  }

  private sequenceTime(seq: number[], dist: number[][]): number {
    let time = 0;
    for (let i = 0; i < seq.length - 1; i++) {
      time += dist[seq[i]][seq[i + 1]];
    }
    return time;
  }

  getMetadata(): AlgorithmMeta {
    return {
      id: "ant-colony-tsp",
      name: "Ant Colony Tool Sequencing",
      description: "ACO optimization for minimum tool change time sequencing",
      formula: "P(j|i) = [τ(i,j)]^α × [η(i,j)]^β / Σ; τ(i,j) ← (1-ρ)τ + Δτ",
      reference: "Dorigo & Gambardella (1997); Grieco et al. (2001)",
      safety_class: "standard",
      domain: "planning",
      inputs: { n_tools: "Number of tools", change_times: "Tool change time matrix [s]" },
      outputs: { best_sequence: "Optimal tool order", best_time: "Minimum total change time [s]", improvement_pct: "vs sequential [%]" },
    };
  }
}
