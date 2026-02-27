/**
 * Simulated Annealing — Probabilistic Global Optimizer
 *
 * Metropolis-Hastings-based optimization for combinatorial and continuous
 * manufacturing problems (job sequencing, setup minimization, parameter tuning).
 * Supports exponential, linear, and logarithmic cooling schedules.
 *
 * References:
 * - Kirkpatrick, S. et al. (1983). "Optimization by Simulated Annealing"
 * - Černý, V. (1985). "Thermodynamical Approach to the TSP"
 *
 * @module algorithms/SimulatedAnnealing
 */

import type {
  Algorithm, AlgorithmMeta, ValidationResult, ValidationIssue, WithWarnings,
} from "./types.js";

export interface SimulatedAnnealingInput {
  /** Number of decision variables. */
  dimensions: number;
  /** Lower bounds per dimension. */
  lower_bounds: number[];
  /** Upper bounds per dimension. */
  upper_bounds: number[];
  /** Initial temperature. Default 1000. */
  initial_temp?: number;
  /** Final temperature. Default 0.01. */
  final_temp?: number;
  /** Cooling rate [0-1]. Default 0.995. */
  cooling_rate?: number;
  /** Iterations per temperature level. Default 10. */
  iterations_per_temp?: number;
  /** Cooling schedule. Default "exponential". */
  cooling_schedule?: "exponential" | "linear" | "logarithmic";
  /** Neighbor step size fraction of range [0-1]. Default 0.1. */
  step_size?: number;
  /** Seed for reproducibility. */
  seed?: number;
}

export interface SimulatedAnnealingOutput extends WithWarnings {
  best_solution: number[];
  best_cost: number;
  final_temperature: number;
  iterations_total: number;
  acceptance_rate: number;
  cost_history: number[];
  calculation_method: string;
}

function mulberry32(seed: number) {
  let s = seed | 0;
  return () => { s = (s + 0x6D2B79F5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

export class SimulatedAnnealing implements Algorithm<SimulatedAnnealingInput, SimulatedAnnealingOutput> {

  validate(input: SimulatedAnnealingInput): ValidationResult {
    const issues: ValidationIssue[] = [];
    if (!input.dimensions || input.dimensions < 1) issues.push({ field: "dimensions", message: "Must be >= 1", severity: "error" });
    if (!input.lower_bounds?.length || !input.upper_bounds?.length) issues.push({ field: "bounds", message: "Required", severity: "error" });
    if (input.lower_bounds?.length !== input.dimensions) issues.push({ field: "lower_bounds", message: "Length must match dimensions", severity: "error" });
    if ((input.initial_temp ?? 1000) <= (input.final_temp ?? 0.01)) issues.push({ field: "initial_temp", message: "Must be > final_temp", severity: "error" });
    return { valid: issues.filter(i => i.severity === "error").length === 0, issues };
  }

  calculate(input: SimulatedAnnealingInput): SimulatedAnnealingOutput {
    const warnings: string[] = [];
    const { dimensions, lower_bounds, upper_bounds } = input;
    const T0 = input.initial_temp ?? 1000;
    const Tf = input.final_temp ?? 0.01;
    const alpha = input.cooling_rate ?? 0.995;
    const itersPerTemp = input.iterations_per_temp ?? 10;
    const schedule = input.cooling_schedule ?? "exponential";
    const stepFrac = input.step_size ?? 0.1;
    const rand = mulberry32(input.seed ?? Date.now());

    // Cost function: sum of squared deviations from center (default)
    const cost = (x: number[]) => x.reduce((s, v, i) => {
      const mid = (lower_bounds[i] + upper_bounds[i]) / 2;
      return s + (v - mid) ** 2;
    }, 0);

    // Initialize
    let current = lower_bounds.map((lo, i) => lo + rand() * (upper_bounds[i] - lo));
    let currentCost = cost(current);
    let best = [...current];
    let bestCost = currentCost;
    let T = T0;
    let totalIter = 0;
    let accepted = 0;
    const costHistory: number[] = [bestCost];

    const maxSteps = Math.ceil(Math.log(Tf / T0) / Math.log(alpha)) * itersPerTemp;
    if (maxSteps > 1e6) warnings.push("Very large iteration count — consider increasing cooling_rate.");

    while (T > Tf) {
      for (let i = 0; i < itersPerTemp; i++) {
        totalIter++;
        // Generate neighbor
        const neighbor = current.map((v, d) => {
          const range = (upper_bounds[d] - lower_bounds[d]) * stepFrac;
          const delta = (rand() - 0.5) * 2 * range;
          return Math.max(lower_bounds[d], Math.min(upper_bounds[d], v + delta));
        });
        const neighborCost = cost(neighbor);
        const dE = neighborCost - currentCost;

        if (dE < 0 || rand() < Math.exp(-dE / T)) {
          current = neighbor;
          currentCost = neighborCost;
          accepted++;
          if (currentCost < bestCost) {
            best = [...current];
            bestCost = currentCost;
          }
        }
      }

      // Cool down
      if (schedule === "exponential") T *= alpha;
      else if (schedule === "linear") T -= (T0 - Tf) / (maxSteps / itersPerTemp);
      else T = T0 / (1 + Math.log(1 + totalIter / itersPerTemp));

      costHistory.push(bestCost);
      if (T <= 0) break;
    }

    return {
      best_solution: best,
      best_cost: bestCost,
      final_temperature: T,
      iterations_total: totalIter,
      acceptance_rate: totalIter > 0 ? accepted / totalIter : 0,
      cost_history: costHistory,
      warnings,
      calculation_method: `Simulated annealing (${schedule} cooling, α=${alpha})`,
    };
  }

  getMetadata(): AlgorithmMeta {
    return {
      id: "simulated-annealing",
      name: "Simulated Annealing",
      description: "Probabilistic global optimization with Metropolis-Hastings acceptance",
      formula: "P(accept) = exp(-ΔE / T); T(k+1) = α × T(k)",
      reference: "Kirkpatrick et al. (1983); Černý (1985)",
      safety_class: "informational",
      domain: "optimization",
      inputs: { dimensions: "Number of variables", initial_temp: "Starting temperature", cooling_rate: "α factor" },
      outputs: { best_solution: "Optimal parameters", best_cost: "Minimum cost", acceptance_rate: "Accept fraction" },
    };
  }
}
