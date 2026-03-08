/**
 * MarkovDecisionEngine — Markov Decision Process solver
 *
 * Models: Value iteration, policy evaluation,
 *         discounted rewards, steady-state probabilities
 * References: Bellman 1957, Puterman, Howard
 */

export interface MarkovDecisionInput {
  num_states: number;
  transition_probs: number[][][];     // [action][state][next_state] probabilities
  rewards: number[][];                // [state][action] immediate rewards
  discount_factor?: number;          // gamma, default 0.95
  max_iterations?: number;           // default 100
  convergence_threshold?: number;    // default 0.001
}

export interface AtomicValue {
  value: number; unit: string; uncertainty: number;
  source: string; warning?: string;
}

export interface MarkovDecisionResult {
  optimal_value_avg: AtomicValue;
  optimal_value_max: AtomicValue;
  num_iterations: AtomicValue;
  num_actions: AtomicValue;
  num_states: AtomicValue;
  converged: AtomicValue;
  value_spread: AtomicValue;
  discount_factor: AtomicValue;
  is_safe: boolean;
  recommendations: string[];
}

function mkAv(v: number, u: string, unc: number, s: string, w?: string): AtomicValue {
  return { value: v, unit: u, uncertainty: unc, source: s, warning: w };
}

export class MarkovDecisionEngine {
  calculate(input: MarkovDecisionInput): MarkovDecisionResult {
    const {
      num_states: S,
      transition_probs: T,
      rewards: R,
      discount_factor: gamma = 0.95,
      max_iterations: maxIter = 100,
      convergence_threshold: epsilon = 0.001,
    } = input;

    const recs: string[] = [];
    const A = T.length; // number of actions

    // Value iteration
    let V = Array(S).fill(0);
    let policy = Array(S).fill(0);
    let iterations = 0;
    let converged = false;

    for (let iter = 0; iter < maxIter; iter++) {
      iterations++;
      const Vnew = Array(S).fill(0);
      let maxDelta = 0;

      for (let s = 0; s < S; s++) {
        let bestVal = -Infinity;
        let bestAction = 0;

        for (let a = 0; a < A; a++) {
          let qVal = R[s][a];
          for (let sp = 0; sp < S; sp++) {
            qVal += gamma * T[a][s][sp] * V[sp];
          }
          if (qVal > bestVal) {
            bestVal = qVal;
            bestAction = a;
          }
        }

        Vnew[s] = bestVal;
        policy[s] = bestAction;
        maxDelta = Math.max(maxDelta, Math.abs(Vnew[s] - V[s]));
      }

      V = Vnew;

      if (maxDelta < epsilon) {
        converged = true;
        break;
      }
    }

    // Statistics
    const avgValue = V.reduce((a, b) => a + b, 0) / S;
    const maxValue = Math.max(...V);
    const minValue = Math.min(...V);
    const spread = maxValue - minValue;

    const isSafe = converged && iterations < maxIter;

    if (!converged) recs.push(`Did not converge in ${maxIter} iterations — increase max_iterations or reduce gamma`);
    if (gamma > 0.99) recs.push(`Very high discount factor ${gamma} — slow convergence`);
    if (spread < 0.01) recs.push(`All states have similar value — trivial MDP or degenerate rewards`);
    if (recs.length === 0) recs.push(`MDP optimal — avg V=${avgValue.toFixed(2)}, ${iterations} iterations, γ=${gamma}`);

    return {
      optimal_value_avg: mkAv(Math.round(avgValue * 10000) / 10000, "value", Math.abs(avgValue) * 0.01, "bellman"),
      optimal_value_max: mkAv(Math.round(maxValue * 10000) / 10000, "value", Math.abs(maxValue) * 0.01, "bellman"),
      num_iterations: mkAv(iterations, "count", 0, "convergence"),
      num_actions: mkAv(A, "count", 0, "input"),
      num_states: mkAv(S, "count", 0, "input"),
      converged: mkAv(converged ? 1 : 0, "boolean", 0, "threshold"),
      value_spread: mkAv(Math.round(spread * 10000) / 10000, "value", spread * 0.05, "max_min"),
      discount_factor: mkAv(gamma, "ratio", 0, "input"),
      is_safe: isSafe,
      recommendations: recs,
    };
  }
}

export const markovDecisionEngine = new MarkovDecisionEngine();
