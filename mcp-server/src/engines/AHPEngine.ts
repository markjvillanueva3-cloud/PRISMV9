/**
 * AHPEngine — Analytic Hierarchy Process
 *
 * Models: Pairwise comparison, eigenvector priority weights,
 *         consistency ratio (CR), Saaty scale
 * References: Saaty 1980, Saaty & Vargas 2012
 */

export interface AHPInput {
  comparison_matrix: number[][];       // n×n pairwise comparisons (Saaty 1-9 scale)
  criteria_names?: string[];
}

export interface AtomicValue {
  value: number; unit: string; uncertainty: number;
  source: string; warning?: string;
}

export interface AHPResult {
  priority_weights: AtomicValue;
  max_eigenvalue: AtomicValue;
  consistency_index: AtomicValue;
  consistency_ratio: AtomicValue;
  is_consistent: AtomicValue;
  num_criteria: AtomicValue;
  most_important_index: AtomicValue;
  weight_spread: AtomicValue;
  is_safe: boolean;
  recommendations: string[];
}

// Random Index for n=1..15
const RI = [0, 0, 0, 0.58, 0.90, 1.12, 1.24, 1.32, 1.41, 1.45, 1.49, 1.51, 1.48, 1.56, 1.57, 1.59];

function mkAv(v: number, u: string, unc: number, s: string, w?: string): AtomicValue {
  return { value: v, unit: u, uncertainty: unc, source: s, warning: w };
}

export class AHPEngine {
  calculate(input: AHPInput): AHPResult {
    const { comparison_matrix: A } = input;
    const recs: string[] = [];
    const n = A.length;

    // Geometric mean method for priority weights (more robust than eigenvector)
    const weights: number[] = [];
    for (let i = 0; i < n; i++) {
      let prod = 1;
      for (let j = 0; j < n; j++) prod *= A[i][j];
      weights.push(Math.pow(prod, 1 / n));
    }
    const wSum = weights.reduce((s, w) => s + w, 0);
    const priority = weights.map(w => w / wSum);

    // Maximum eigenvalue (λmax)
    let lambdaMax = 0;
    for (let i = 0; i < n; i++) {
      let Aw_i = 0;
      for (let j = 0; j < n; j++) Aw_i += A[i][j] * priority[j];
      lambdaMax += Aw_i / priority[i];
    }
    lambdaMax /= n;

    // Consistency Index and Ratio
    const CI = (lambdaMax - n) / (n - 1 || 1);
    const ri = n < RI.length ? RI[n] : 1.6;
    const CR = ri > 0 ? CI / ri : 0;

    const isConsistent = CR < 0.10;

    // Most important criterion
    let bestIdx = 0;
    for (let i = 1; i < n; i++) {
      if (priority[i] > priority[bestIdx]) bestIdx = i;
    }

    // Weight spread
    const maxW = Math.max(...priority);
    const minW = Math.min(...priority);
    const spread = maxW - minW;

    const isSafe = n >= 2 && CR < 0.15;

    if (CR > 0.10) recs.push(`Inconsistent (CR=${CR.toFixed(3)} > 0.10) — revise pairwise comparisons`);
    if (CR > 0.20) recs.push(`Highly inconsistent (CR=${CR.toFixed(3)}) — judgments contradictory`);
    if (spread < 0.05) recs.push(`Criteria nearly equal weight — AHP adds little value`);
    if (n > 9) recs.push(`${n} criteria — consider hierarchical decomposition`);
    // Check reciprocal consistency
    let reciprocalOk = true;
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        if (Math.abs(A[i][j] * A[j][i] - 1) > 0.01) reciprocalOk = false;
      }
    }
    if (!reciprocalOk) recs.push(`Matrix not reciprocal — ensure A[i][j] = 1/A[j][i]`);
    if (recs.length === 0) recs.push(`AHP consistent — CR=${CR.toFixed(3)}, top criterion #${bestIdx + 1} (${(priority[bestIdx] * 100).toFixed(1)}%)`);

    return {
      priority_weights: mkAv(priority[bestIdx], "weight", priority[bestIdx] * 0.05, "geometric_mean"),
      max_eigenvalue: mkAv(Math.round(lambdaMax * 10000) / 10000, "value", lambdaMax * 0.02, "power_method"),
      consistency_index: mkAv(Math.round(CI * 10000) / 10000, "index", CI * 0.10, "saaty"),
      consistency_ratio: mkAv(Math.round(CR * 10000) / 10000, "ratio", CR * 0.10, "CI_RI"),
      is_consistent: mkAv(isConsistent ? 1 : 0, "boolean", 0, "CR_threshold"),
      num_criteria: mkAv(n, "count", 0, "input"),
      most_important_index: mkAv(bestIdx + 1, "index", 0, "max_weight"),
      weight_spread: mkAv(Math.round(spread * 10000) / 10000, "range", spread * 0.05, "max_min"),
      is_safe: isSafe,
      recommendations: recs,
    };
  }
}

export const ahpEngine = new AHPEngine();
