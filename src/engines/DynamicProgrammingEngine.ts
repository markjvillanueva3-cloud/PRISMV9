/**
 * DynamicProgrammingEngine — Dynamic Programming Solvers
 *
 * General-purpose DP solvers for optimization problems:
 * - Knapsack (0/1 and unbounded)
 * - Shortest path (Bellman-Ford)
 * - Sequence alignment / edit distance
 * - Optimal cutting stock / bar cutting
 * - Resource allocation
 *
 * Manufacturing use: optimal cutting stock selection, nesting bar
 * cuts, job scheduling, tool change minimization, material usage
 * optimization, process sequence optimization.
 *
 * @module DynamicProgrammingEngine
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface KnapsackItem {
  value: number;
  weight: number;
  name?: string;
}

export interface KnapsackResult {
  maxValue: number;
  selectedItems: number[];
  totalWeight: number;
  utilization: number;
}

export interface CuttingStockConfig {
  stockLength: number;
  pieces: { length: number; demand: number }[];
  kerf?: number;  // Saw blade width
}

export interface CuttingStockResult {
  patterns: { cuts: number[]; waste: number; count: number }[];
  totalBars: number;
  totalWaste: number;
  utilization: number;
}

export interface ResourceAllocationConfig {
  budget: number;
  resources: {
    name: string;
    costs: number[];    // Cost at each level
    values: number[];   // Value at each level
  }[];
}

export interface ResourceAllocationResult {
  allocations: { resource: string; level: number; cost: number; value: number }[];
  totalValue: number;
  totalCost: number;
}

// ---------------------------------------------------------------------------
// Engine
// ---------------------------------------------------------------------------

class DynamicProgrammingEngineImpl {

  /**
   * 0/1 Knapsack problem.
   */
  knapsack01(items: KnapsackItem[], capacity: number): KnapsackResult {
    const n = items.length;
    const W = Math.ceil(capacity);
    const dp: number[][] = Array.from({ length: n + 1 }, () =>
      new Array(W + 1).fill(0)
    );

    for (let i = 1; i <= n; i++) {
      for (let w = 0; w <= W; w++) {
        dp[i][w] = dp[i - 1][w];
        const wi = Math.ceil(items[i - 1].weight);
        if (wi <= w) {
          dp[i][w] = Math.max(dp[i][w], dp[i - 1][w - wi] + items[i - 1].value);
        }
      }
    }

    // Traceback
    const selected: number[] = [];
    let w = W;
    for (let i = n; i > 0; i--) {
      if (dp[i][w] !== dp[i - 1][w]) {
        selected.push(i - 1);
        w -= Math.ceil(items[i - 1].weight);
      }
    }

    const totalWeight = selected.reduce((s, i) => s + items[i].weight, 0);
    return {
      maxValue: dp[n][W],
      selectedItems: selected.reverse(),
      totalWeight,
      utilization: capacity > 0 ? totalWeight / capacity : 0,
    };
  }

  /**
   * Unbounded knapsack (items can be repeated).
   */
  knapsackUnbounded(items: KnapsackItem[], capacity: number): KnapsackResult {
    const W = Math.ceil(capacity);
    const dp = new Array(W + 1).fill(0);
    const choice = new Array(W + 1).fill(-1);

    for (let w = 1; w <= W; w++) {
      for (let i = 0; i < items.length; i++) {
        const wi = Math.ceil(items[i].weight);
        if (wi <= w && dp[w - wi] + items[i].value > dp[w]) {
          dp[w] = dp[w - wi] + items[i].value;
          choice[w] = i;
        }
      }
    }

    // Traceback
    const selected: number[] = [];
    let w = W;
    while (w > 0 && choice[w] >= 0) {
      selected.push(choice[w]);
      w -= Math.ceil(items[choice[w]].weight);
    }

    const totalWeight = selected.reduce((s, i) => s + items[i].weight, 0);
    return {
      maxValue: dp[W],
      selectedItems: selected,
      totalWeight,
      utilization: capacity > 0 ? totalWeight / capacity : 0,
    };
  }

  /**
   * Edit distance (Levenshtein).
   */
  editDistance(a: string, b: string): {
    distance: number;
    operations: string[];
  } {
    const m = a.length, n = b.length;
    const dp: number[][] = Array.from({ length: m + 1 }, () =>
      new Array(n + 1).fill(0)
    );

    for (let i = 0; i <= m; i++) dp[i][0] = i;
    for (let j = 0; j <= n; j++) dp[0][j] = j;

    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        if (a[i - 1] === b[j - 1]) {
          dp[i][j] = dp[i - 1][j - 1];
        } else {
          dp[i][j] = 1 + Math.min(
            dp[i - 1][j],     // delete
            dp[i][j - 1],     // insert
            dp[i - 1][j - 1]  // replace
          );
        }
      }
    }

    // Traceback
    const ops: string[] = [];
    let i = m, j = n;
    while (i > 0 || j > 0) {
      if (i > 0 && j > 0 && a[i - 1] === b[j - 1]) {
        ops.unshift("keep");
        i--; j--;
      } else if (i > 0 && j > 0 && dp[i][j] === dp[i - 1][j - 1] + 1) {
        ops.unshift(`replace '${a[i - 1]}' with '${b[j - 1]}'`);
        i--; j--;
      } else if (j > 0 && dp[i][j] === dp[i][j - 1] + 1) {
        ops.unshift(`insert '${b[j - 1]}'`);
        j--;
      } else {
        ops.unshift(`delete '${a[i - 1]}'`);
        i--;
      }
    }

    return { distance: dp[m][n], operations: ops };
  }

  /**
   * Cutting stock: minimize waste when cutting pieces from stock bars.
   */
  cuttingStock(config: CuttingStockConfig): CuttingStockResult {
    const { stockLength, pieces, kerf = 0 } = config;

    // Generate feasible cutting patterns via first-fit decreasing
    const patterns: { cuts: number[]; waste: number; count: number }[] = [];
    const demand = pieces.map(p => p.demand);

    while (demand.some(d => d > 0)) {
      const cuts: number[] = new Array(pieces.length).fill(0);
      let remaining = stockLength;

      // Greedy: largest first
      const sorted = pieces
        .map((p, i) => ({ ...p, idx: i }))
        .filter((_, i) => demand[i] > 0)
        .sort((a, b) => b.length - a.length);

      for (const piece of sorted) {
        while (demand[piece.idx] > 0 && remaining >= piece.length + kerf) {
          cuts[piece.idx]++;
          demand[piece.idx]--;
          remaining -= piece.length + kerf;
        }
      }

      if (cuts.some(c => c > 0)) {
        // Check if this pattern already exists
        const existing = patterns.find(p =>
          p.cuts.every((c, i) => c === cuts[i])
        );
        if (existing) {
          existing.count++;
        } else {
          patterns.push({ cuts, waste: remaining, count: 1 });
        }
      } else {
        break; // No more feasible cuts
      }
    }

    const totalBars = patterns.reduce((s, p) => s + p.count, 0);
    const totalWaste = patterns.reduce((s, p) => s + p.waste * p.count, 0);
    const totalStock = totalBars * stockLength;

    return {
      patterns,
      totalBars,
      totalWaste,
      utilization: totalStock > 0 ? 1 - totalWaste / totalStock : 0,
    };
  }

  /**
   * Optimal resource allocation across multiple resources with budget.
   */
  resourceAllocation(config: ResourceAllocationConfig): ResourceAllocationResult {
    const { budget, resources } = config;
    const n = resources.length;
    const B = Math.ceil(budget);

    // dp[i][b] = max value using resources 0..i-1 with budget b
    const dp: number[][] = Array.from({ length: n + 1 }, () =>
      new Array(B + 1).fill(0)
    );
    const decisions: number[][] = Array.from({ length: n + 1 }, () =>
      new Array(B + 1).fill(0)
    );

    for (let i = 1; i <= n; i++) {
      const res = resources[i - 1];
      for (let b = 0; b <= B; b++) {
        dp[i][b] = dp[i - 1][b]; // Level 0 (no allocation)
        decisions[i][b] = 0;

        for (let lvl = 0; lvl < res.costs.length; lvl++) {
          const cost = Math.ceil(res.costs[lvl]);
          if (cost <= b) {
            const val = dp[i - 1][b - cost] + res.values[lvl];
            if (val > dp[i][b]) {
              dp[i][b] = val;
              decisions[i][b] = lvl + 1;
            }
          }
        }
      }
    }

    // Traceback
    const allocations: ResourceAllocationResult["allocations"] = [];
    let rem = B;
    let totalCost = 0;
    for (let i = n; i > 0; i--) {
      const lvl = decisions[i][rem];
      const res = resources[i - 1];
      if (lvl > 0) {
        const cost = res.costs[lvl - 1];
        allocations.unshift({
          resource: res.name,
          level: lvl,
          cost,
          value: res.values[lvl - 1],
        });
        rem -= Math.ceil(cost);
        totalCost += cost;
      } else {
        allocations.unshift({
          resource: res.name, level: 0, cost: 0, value: 0,
        });
      }
    }

    return { allocations, totalValue: dp[n][B], totalCost };
  }

  /**
   * Longest Common Subsequence.
   */
  lcs(a: string, b: string): { length: number; subsequence: string } {
    const m = a.length, n = b.length;
    const dp: number[][] = Array.from({ length: m + 1 }, () =>
      new Array(n + 1).fill(0)
    );

    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        if (a[i - 1] === b[j - 1]) {
          dp[i][j] = dp[i - 1][j - 1] + 1;
        } else {
          dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
        }
      }
    }

    // Traceback
    let subseq = "";
    let i = m, j = n;
    while (i > 0 && j > 0) {
      if (a[i - 1] === b[j - 1]) {
        subseq = a[i - 1] + subseq;
        i--; j--;
      } else if (dp[i - 1][j] > dp[i][j - 1]) {
        i--;
      } else {
        j--;
      }
    }

    return { length: dp[m][n], subsequence: subseq };
  }
}

export const dynamicProgrammingEngine = new DynamicProgrammingEngineImpl();
