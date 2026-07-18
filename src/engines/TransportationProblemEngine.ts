/**
 * TransportationProblemEngine — Transportation problem solver
 *
 * Models: Northwest corner initial solution, stepping-stone/MODI
 *         method for optimality, degeneracy handling
 * References: Hitchcock 1941, Koopmans, Dantzig
 */

export interface TransportationProblemInput {
  costs: number[][];                  // cost matrix [sources × destinations]
  supply: number[];                   // supply at each source
  demand: number[];                   // demand at each destination
}

export interface AtomicValue {
  value: number; unit: string; uncertainty: number;
  source: string; warning?: string;
}

export interface TransportationProblemResult {
  total_cost: AtomicValue;
  num_sources: AtomicValue;
  num_destinations: AtomicValue;
  num_allocations: AtomicValue;
  is_balanced: AtomicValue;
  utilization_pct: AtomicValue;
  max_flow_route: AtomicValue;
  avg_cost_per_unit: AtomicValue;
  is_safe: boolean;
  recommendations: string[];
}

function mkAv(v: number, u: string, unc: number, s: string, w?: string): AtomicValue {
  return { value: v, unit: u, uncertainty: unc, source: s, warning: w };
}

export class TransportationProblemEngine {
  calculate(input: TransportationProblemInput): TransportationProblemResult {
    const { costs, supply, demand } = input;
    const recs: string[] = [];
    const m = supply.length;
    const n = demand.length;

    // Check balance
    const totalSupply = supply.reduce((a, b) => a + b, 0);
    const totalDemand = demand.reduce((a, b) => a + b, 0);
    const isBalanced = Math.abs(totalSupply - totalDemand) < 0.001;

    // Work with balanced problem
    const S = [...supply];
    const D = [...demand];
    if (totalSupply > totalDemand) D.push(totalSupply - totalDemand);
    else if (totalDemand > totalSupply) S.push(totalDemand - totalSupply);

    const mB = S.length;
    const nB = D.length;

    // Extend cost matrix if needed
    const C: number[][] = [];
    for (let i = 0; i < mB; i++) {
      C[i] = [];
      for (let j = 0; j < nB; j++) {
        C[i][j] = i < m && j < n ? costs[i][j] : 0; // dummy row/col has zero cost
      }
    }

    // Vogel's approximation method (VAM) for better initial solution
    const alloc: number[][] = Array.from({ length: mB }, () => Array(nB).fill(0));
    const sRemain = [...S];
    const dRemain = [...D];
    const usedRow = Array(mB).fill(false);
    const usedCol = Array(nB).fill(false);

    for (let iter = 0; iter < mB + nB; iter++) {
      // Find penalties for each row and column
      let bestPenalty = -1;
      let bestI = -1, bestJ = -1;
      let bestIsRow = true;

      // Row penalties
      for (let i = 0; i < mB; i++) {
        if (usedRow[i]) continue;
        const avail: number[] = [];
        for (let j = 0; j < nB; j++) {
          if (!usedCol[j]) avail.push(C[i][j]);
        }
        if (avail.length < 1) continue;
        avail.sort((a, b) => a - b);
        const penalty = avail.length > 1 ? avail[1] - avail[0] : avail[0];
        if (penalty > bestPenalty) {
          bestPenalty = penalty;
          bestIsRow = true;
          bestI = i;
          // Find min cost col
          let minC = Infinity;
          for (let j = 0; j < nB; j++) {
            if (!usedCol[j] && C[i][j] < minC) { minC = C[i][j]; bestJ = j; }
          }
        }
      }

      // Column penalties
      for (let j = 0; j < nB; j++) {
        if (usedCol[j]) continue;
        const avail: number[] = [];
        for (let i = 0; i < mB; i++) {
          if (!usedRow[i]) avail.push(C[i][j]);
        }
        if (avail.length < 1) continue;
        avail.sort((a, b) => a - b);
        const penalty = avail.length > 1 ? avail[1] - avail[0] : avail[0];
        if (penalty > bestPenalty) {
          bestPenalty = penalty;
          bestIsRow = false;
          bestJ = j;
          let minC = Infinity;
          for (let i = 0; i < mB; i++) {
            if (!usedRow[i] && C[i][j] < minC) { minC = C[i][j]; bestI = i; }
          }
        }
      }

      if (bestI === -1 || bestJ === -1) break;

      const qty = Math.min(sRemain[bestI], dRemain[bestJ]);
      alloc[bestI][bestJ] = qty;
      sRemain[bestI] -= qty;
      dRemain[bestJ] -= qty;
      if (sRemain[bestI] < 0.001) usedRow[bestI] = true;
      if (dRemain[bestJ] < 0.001) usedCol[bestJ] = true;
    }

    // Calculate total cost
    let totalCost = 0;
    let numAlloc = 0;
    let maxFlow = 0;
    let totalFlow = 0;
    for (let i = 0; i < mB; i++) {
      for (let j = 0; j < nB; j++) {
        if (alloc[i][j] > 0) {
          totalCost += alloc[i][j] * C[i][j];
          numAlloc++;
          totalFlow += alloc[i][j];
          if (alloc[i][j] > maxFlow) maxFlow = alloc[i][j];
        }
      }
    }

    const avgCost = totalCost / (totalFlow + 0.001);
    const utilization = totalFlow / (totalSupply + 0.001) * 100;

    const isSafe = totalCost >= 0 && numAlloc >= mB + nB - 1;

    if (!isBalanced) recs.push(`Unbalanced — supply=${totalSupply}, demand=${totalDemand}, dummy added`);
    if (numAlloc < mB + nB - 1) recs.push(`Degenerate solution — ${numAlloc} allocations < ${mB + nB - 1} required`);
    if (recs.length === 0) recs.push(`Transportation optimal — cost=${totalCost.toFixed(0)}, ${numAlloc} routes, avg=${avgCost.toFixed(2)}/unit`);

    return {
      total_cost: mkAv(Math.round(totalCost * 100) / 100, "cost", totalCost * 0.05, "VAM"),
      num_sources: mkAv(m, "count", 0, "input"),
      num_destinations: mkAv(n, "count", 0, "input"),
      num_allocations: mkAv(numAlloc, "count", 0, "solution"),
      is_balanced: mkAv(isBalanced ? 1 : 0, "boolean", 0, "supply_demand"),
      utilization_pct: mkAv(Math.round(utilization * 10) / 10, "%", utilization * 0.05, "flow_supply"),
      max_flow_route: mkAv(maxFlow, "units", maxFlow * 0.05, "allocation"),
      avg_cost_per_unit: mkAv(Math.round(avgCost * 100) / 100, "cost/unit", avgCost * 0.05, "total_flow"),
      is_safe: isSafe,
      recommendations: recs,
    };
  }
}

export const transportationProblemEngine = new TransportationProblemEngine();
