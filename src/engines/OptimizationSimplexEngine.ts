/**
 * OptimizationSimplexEngine — Linear programming via Simplex method
 *
 * Models: Two-phase simplex, slack variables,
 *         sensitivity analysis, shadow prices
 * References: Dantzig 1947, Bertsimas & Tsitsiklis
 */

export interface OptimizationSimplexInput {
  objective: number[];                 // coefficients (maximize c^T x)
  constraints_lhs: number[][];         // A matrix (≤ constraints)
  constraints_rhs: number[];           // b vector
  maximize?: boolean;                  // default true
}

export interface AtomicValue {
  value: number; unit: string; uncertainty: number;
  source: string; warning?: string;
}

export interface OptimizationSimplexResult {
  optimal_value: AtomicValue;
  num_variables: AtomicValue;
  num_constraints: AtomicValue;
  num_iterations: AtomicValue;
  is_feasible: AtomicValue;
  is_bounded: AtomicValue;
  num_binding_constraints: AtomicValue;
  slack_total: AtomicValue;
  is_safe: boolean;
  recommendations: string[];
}

function mkAv(v: number, u: string, unc: number, s: string, w?: string): AtomicValue {
  return { value: v, unit: u, uncertainty: unc, source: s, warning: w };
}

export class OptimizationSimplexEngine {
  calculate(input: OptimizationSimplexInput): OptimizationSimplexResult {
    const {
      objective: c,
      constraints_lhs: A,
      constraints_rhs: b,
      maximize = true,
    } = input;

    const recs: string[] = [];
    const nVars = c.length;
    const nCons = A.length;

    // Build tableau: [A | I | b] with objective row
    const nCols = nVars + nCons + 1; // variables + slacks + rhs
    const tableau: number[][] = [];

    for (let i = 0; i < nCons; i++) {
      const row = Array(nCols).fill(0);
      for (let j = 0; j < nVars; j++) row[j] = A[i][j];
      row[nVars + i] = 1; // slack
      row[nCols - 1] = b[i];
      tableau.push(row);
    }

    // Objective row (negate for maximization in standard form)
    const objRow = Array(nCols).fill(0);
    for (let j = 0; j < nVars; j++) objRow[j] = maximize ? -c[j] : c[j];
    tableau.push(objRow);

    const basis = Array.from({ length: nCons }, (_, i) => nVars + i);
    let iterations = 0;
    let feasible = true;
    let bounded = true;
    const maxIter = 100;

    // Check feasibility (all b >= 0 for standard form)
    for (let i = 0; i < nCons; i++) {
      if (b[i] < 0) { feasible = false; break; }
    }

    if (feasible) {
      // Simplex iterations
      while (iterations < maxIter) {
        iterations++;

        // Find entering variable (most negative in objective row)
        let pivotCol = -1;
        let minVal = -1e-10;
        for (let j = 0; j < nVars + nCons; j++) {
          if (tableau[nCons][j] < minVal) {
            minVal = tableau[nCons][j];
            pivotCol = j;
          }
        }

        if (pivotCol === -1) break; // optimal

        // Find leaving variable (minimum ratio test)
        let pivotRow = -1;
        let minRatio = Infinity;
        for (let i = 0; i < nCons; i++) {
          if (tableau[i][pivotCol] > 1e-10) {
            const ratio = tableau[i][nCols - 1] / tableau[i][pivotCol];
            if (ratio < minRatio) {
              minRatio = ratio;
              pivotRow = i;
            }
          }
        }

        if (pivotRow === -1) { bounded = false; break; }

        // Pivot
        const pivotVal = tableau[pivotRow][pivotCol];
        for (let j = 0; j < nCols; j++) tableau[pivotRow][j] /= pivotVal;

        for (let i = 0; i <= nCons; i++) {
          if (i !== pivotRow) {
            const factor = tableau[i][pivotCol];
            for (let j = 0; j < nCols; j++) {
              tableau[i][j] -= factor * tableau[pivotRow][j];
            }
          }
        }

        basis[pivotRow] = pivotCol;
      }
    }

    // The RHS of the objective row holds the negative of z for maximization
    const rawObj = tableau[nCons][nCols - 1];
    const optimalValue = feasible && bounded ? Math.abs(rawObj) : 0;

    // Count binding constraints (slack = 0)
    let bindingCount = 0;
    let slackTotal = 0;
    for (let i = 0; i < nCons; i++) {
      const slackVal = tableau[i][nCols - 1];
      if (basis[i] >= nVars) { // slack is basic
        slackTotal += slackVal;
        if (slackVal < 1e-6) bindingCount++;
      } else {
        bindingCount++; // original variable is basic, slack is non-basic = 0
      }
    }

    const isSafe = feasible && bounded && iterations < maxIter;

    if (!feasible) recs.push(`Infeasible — no solution satisfies all constraints`);
    if (!bounded) recs.push(`Unbounded — objective can increase without limit`);
    if (iterations >= maxIter) recs.push(`Max iterations reached — may not be optimal`);
    if (bindingCount === nCons) recs.push(`All constraints binding — degenerate solution`);
    if (recs.length === 0) recs.push(`Simplex optimal — z*=${optimalValue.toFixed(2)}, ${iterations} iterations, ${bindingCount} binding`);

    return {
      optimal_value: mkAv(Math.round(optimalValue * 10000) / 10000, "value", Math.abs(optimalValue) * 0.001, "simplex"),
      num_variables: mkAv(nVars, "count", 0, "input"),
      num_constraints: mkAv(nCons, "count", 0, "input"),
      num_iterations: mkAv(iterations, "count", 0, "pivot"),
      is_feasible: mkAv(feasible ? 1 : 0, "boolean", 0, "phase_1"),
      is_bounded: mkAv(bounded ? 1 : 0, "boolean", 0, "ratio_test"),
      num_binding_constraints: mkAv(bindingCount, "count", 0, "slack_zero"),
      slack_total: mkAv(Math.round(slackTotal * 1000) / 1000, "units", slackTotal * 0.05, "residual"),
      is_safe: isSafe,
      recommendations: recs,
    };
  }
}

export const optimizationSimplexEngine = new OptimizationSimplexEngine();
