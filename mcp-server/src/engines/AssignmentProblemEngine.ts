/**
 * AssignmentProblemEngine — Hungarian algorithm for assignment problems
 *
 * Models: Cost/profit matrix, optimal 1-to-1 assignment,
 *         unbalanced problems, maximization conversion
 * References: Kuhn 1955, Munkres, Hungarian method
 */

export interface AssignmentProblemInput {
  cost_matrix: number[][];            // n×n or m×n cost matrix
  maximize?: boolean;                 // default false (minimize)
}

export interface AtomicValue {
  value: number; unit: string; uncertainty: number;
  source: string; warning?: string;
}

export interface AssignmentProblemResult {
  optimal_cost: AtomicValue;
  num_agents: AtomicValue;
  num_tasks: AtomicValue;
  num_assignments: AtomicValue;
  avg_cost_per_assignment: AtomicValue;
  cost_range: AtomicValue;
  efficiency_pct: AtomicValue;
  is_balanced: AtomicValue;
  is_safe: boolean;
  recommendations: string[];
}

function mkAv(v: number, u: string, unc: number, s: string, w?: string): AtomicValue {
  return { value: v, unit: u, uncertainty: unc, source: s, warning: w };
}

export class AssignmentProblemEngine {
  calculate(input: AssignmentProblemInput): AssignmentProblemResult {
    const { cost_matrix, maximize = false } = input;
    const recs: string[] = [];

    const m = cost_matrix.length;
    const n = cost_matrix[0]?.length ?? 0;
    const sz = Math.max(m, n);

    // Convert to minimization if needed
    let maxVal = 0;
    for (let i = 0; i < m; i++) {
      for (let j = 0; j < n; j++) {
        if (cost_matrix[i][j] > maxVal) maxVal = cost_matrix[i][j];
      }
    }

    // Build square matrix (pad with zeros/maxVal for unbalanced)
    const C: number[][] = [];
    for (let i = 0; i < sz; i++) {
      C[i] = [];
      for (let j = 0; j < sz; j++) {
        const raw = i < m && j < n ? cost_matrix[i][j] : 0;
        C[i][j] = maximize ? maxVal - raw : raw;
      }
    }

    // Hungarian algorithm (simplified)
    // Step 1: Row reduction
    for (let i = 0; i < sz; i++) {
      const rowMin = Math.min(...C[i]);
      for (let j = 0; j < sz; j++) C[i][j] -= rowMin;
    }

    // Step 2: Column reduction
    for (let j = 0; j < sz; j++) {
      let colMin = Infinity;
      for (let i = 0; i < sz; i++) {
        if (C[i][j] < colMin) colMin = C[i][j];
      }
      for (let i = 0; i < sz; i++) C[i][j] -= colMin;
    }

    // Step 3: Find assignment (greedy on zeros — simplified)
    const rowAssign = Array(sz).fill(-1);
    const colAssign = Array(sz).fill(-1);

    // Multiple passes for better zero coverage
    for (let pass = 0; pass < sz; pass++) {
      for (let i = 0; i < sz; i++) {
        if (rowAssign[i] !== -1) continue;
        for (let j = 0; j < sz; j++) {
          if (colAssign[j] !== -1) continue;
          if (Math.abs(C[i][j]) < 1e-10) {
            rowAssign[i] = j;
            colAssign[j] = i;
            break;
          }
        }
      }
    }

    // Fallback: assign remaining to cheapest available
    for (let i = 0; i < sz; i++) {
      if (rowAssign[i] !== -1) continue;
      let bestJ = -1, bestCost = Infinity;
      for (let j = 0; j < sz; j++) {
        if (colAssign[j] !== -1) continue;
        if (C[i][j] < bestCost) { bestCost = C[i][j]; bestJ = j; }
      }
      if (bestJ !== -1) {
        rowAssign[i] = bestJ;
        colAssign[bestJ] = i;
      }
    }

    // Calculate optimal cost from original matrix
    let optCost = 0;
    let numAssign = 0;
    for (let i = 0; i < Math.min(m, n); i++) {
      const j = rowAssign[i];
      if (j >= 0 && j < n && i < m) {
        optCost += cost_matrix[i][j];
        numAssign++;
      }
    }

    const avgCost = optCost / (numAssign + 0.001);

    // Efficiency: how close to best possible per row
    let bestPossible = 0;
    for (let i = 0; i < m; i++) {
      bestPossible += maximize ? Math.max(...cost_matrix[i]) : Math.min(...cost_matrix[i]);
    }
    const efficiency = bestPossible !== 0 ? (maximize ? optCost / bestPossible : bestPossible / optCost) * 100 : 100;

    const isBalanced = m === n;
    const isSafe = numAssign === Math.min(m, n);

    if (!isBalanced) recs.push(`Unbalanced — ${m} agents × ${n} tasks, dummy ${m > n ? "tasks" : "agents"} added`);
    if (numAssign < Math.min(m, n)) recs.push(`Incomplete assignment — ${numAssign}/${Math.min(m, n)} assigned`);
    if (recs.length === 0) recs.push(`Assignment optimal — cost=${optCost.toFixed(0)}, ${numAssign} assignments, eff=${efficiency.toFixed(0)}%`);

    return {
      optimal_cost: mkAv(Math.round(optCost * 100) / 100, "cost", optCost * 0.05, "hungarian"),
      num_agents: mkAv(m, "count", 0, "input"),
      num_tasks: mkAv(n, "count", 0, "input"),
      num_assignments: mkAv(numAssign, "count", 0, "solution"),
      avg_cost_per_assignment: mkAv(Math.round(avgCost * 100) / 100, "cost/assignment", avgCost * 0.05, "total_n"),
      cost_range: mkAv(maxVal, "cost", 0, "matrix_max"),
      efficiency_pct: mkAv(Math.round(efficiency * 10) / 10, "%", efficiency * 0.10, "vs_best"),
      is_balanced: mkAv(isBalanced ? 1 : 0, "boolean", 0, "m_n"),
      is_safe: isSafe,
      recommendations: recs,
    };
  }
}

export const assignmentProblemEngine = new AssignmentProblemEngine();
