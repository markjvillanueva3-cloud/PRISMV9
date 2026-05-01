/**
 * TOPSISEngine — Technique for Order of Preference by Similarity to Ideal Solution
 *
 * Models: Vector normalization, weighted distance to ideal/anti-ideal,
 *         closeness coefficient ranking
 * References: Hwang & Yoon 1981, Opricovic & Tzeng 2004
 */

export interface TOPSISInput {
  decision_matrix: number[][];         // rows=alternatives, cols=criteria
  weights: number[];                   // criteria weights (sum to 1)
  is_benefit: boolean[];               // true=benefit, false=cost for each criterion
  alternative_names?: string[];
}

export interface AtomicValue {
  value: number; unit: string; uncertainty: number;
  source: string; warning?: string;
}

export interface TOPSISResult {
  best_alternative_index: AtomicValue;
  best_closeness: AtomicValue;
  worst_closeness: AtomicValue;
  spread_ratio: AtomicValue;
  num_alternatives: AtomicValue;
  num_criteria: AtomicValue;
  discrimination_power: AtomicValue;
  consistency_score: AtomicValue;
  is_safe: boolean;
  recommendations: string[];
}

function mkAv(v: number, u: string, unc: number, s: string, w?: string): AtomicValue {
  return { value: v, unit: u, uncertainty: unc, source: s, warning: w };
}

export class TOPSISEngine {
  calculate(input: TOPSISInput): TOPSISResult {
    const {
      decision_matrix: M,
      weights: w,
      is_benefit: benefit,
    } = input;

    const recs: string[] = [];
    const m = M.length;     // alternatives
    const n = M[0]?.length ?? 0; // criteria

    // Normalize weights
    const wSum = w.reduce((s, x) => s + x, 0);
    const wn = w.map(x => x / wSum);

    // Vector normalization
    const norms: number[] = Array(n).fill(0);
    for (let j = 0; j < n; j++) {
      for (let i = 0; i < m; i++) norms[j] += M[i][j] ** 2;
      norms[j] = Math.sqrt(norms[j]) || 1;
    }

    const R: number[][] = M.map(row => row.map((v, j) => v / norms[j]));

    // Weighted normalized matrix
    const V: number[][] = R.map(row => row.map((v, j) => v * wn[j]));

    // Ideal and anti-ideal solutions
    const ideal: number[] = Array(n).fill(0);
    const antiIdeal: number[] = Array(n).fill(0);
    for (let j = 0; j < n; j++) {
      const col = V.map(row => row[j]);
      if (benefit[j]) {
        ideal[j] = Math.max(...col);
        antiIdeal[j] = Math.min(...col);
      } else {
        ideal[j] = Math.min(...col);
        antiIdeal[j] = Math.max(...col);
      }
    }

    // Distance to ideal and anti-ideal
    const dPlus: number[] = [];
    const dMinus: number[] = [];
    for (let i = 0; i < m; i++) {
      let dp = 0, dm = 0;
      for (let j = 0; j < n; j++) {
        dp += (V[i][j] - ideal[j]) ** 2;
        dm += (V[i][j] - antiIdeal[j]) ** 2;
      }
      dPlus.push(Math.sqrt(dp));
      dMinus.push(Math.sqrt(dm));
    }

    // Closeness coefficient
    const closeness = dPlus.map((dp, i) => {
      const sum = dp + dMinus[i];
      return sum > 0 ? dMinus[i] / sum : 0;
    });

    // Find best
    let bestIdx = 0;
    for (let i = 1; i < m; i++) {
      if (closeness[i] > closeness[bestIdx]) bestIdx = i;
    }

    const bestC = closeness[bestIdx];
    const worstC = Math.min(...closeness);
    const spread = bestC > 0 ? (bestC - worstC) / bestC : 0;

    // Discrimination power (std dev of closeness scores)
    const meanC = closeness.reduce((s, c) => s + c, 0) / m;
    const stdC = Math.sqrt(closeness.reduce((s, c) => s + (c - meanC) ** 2, 0) / m);
    const discPower = meanC > 0 ? stdC / meanC : 0;

    // Weight consistency (check if weights sum to ~1)
    const wConsistency = Math.abs(wSum - 1) < 0.01 ? 1 : 1 - Math.abs(wSum - 1);

    const isSafe = m >= 2 && n >= 2 && wSum > 0;

    if (spread < 0.1) recs.push(`Low discrimination — alternatives very similar (spread ${(spread * 100).toFixed(0)}%)`);
    if (Math.abs(wSum - 1) > 0.05) recs.push(`Weights sum to ${wSum.toFixed(2)} ≠ 1 — check weight assignment`);
    if (m < 3) recs.push(`Only ${m} alternatives — limited comparison value`);
    if (closeness[bestIdx] - (closeness.sort((a, b) => b - a)[1] ?? 0) < 0.05) recs.push(`Top two alternatives very close — sensitivity analysis recommended`);
    if (recs.length === 0) recs.push(`TOPSIS — best=#${bestIdx + 1} (C=${bestC.toFixed(3)}), spread=${(spread * 100).toFixed(0)}%`);

    return {
      best_alternative_index: mkAv(bestIdx + 1, "index", 0, "closeness_max"),
      best_closeness: mkAv(Math.round(bestC * 10000) / 10000, "score", bestC * 0.05, "topsis"),
      worst_closeness: mkAv(Math.round(worstC * 10000) / 10000, "score", worstC * 0.05, "topsis"),
      spread_ratio: mkAv(Math.round(spread * 1000) / 1000, "ratio", spread * 0.10, "range"),
      num_alternatives: mkAv(m, "count", 0, "input"),
      num_criteria: mkAv(n, "count", 0, "input"),
      discrimination_power: mkAv(Math.round(discPower * 1000) / 1000, "cv", discPower * 0.10, "std_mean"),
      consistency_score: mkAv(Math.round(wConsistency * 1000) / 1000, "score", 0, "weight_sum"),
      is_safe: isSafe,
      recommendations: recs,
    };
  }
}

export const topsisEngine = new TOPSISEngine();
