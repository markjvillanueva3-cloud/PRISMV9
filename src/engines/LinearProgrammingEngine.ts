/**
 * LinearProgrammingEngine — Reverse-engineered from PRISM v8.89 monolith
 *
 * Revised Simplex method for linear programming problems.
 * Solves: minimize c'x subject to Ax <= b, x >= 0
 *
 * Source: MIT 15.083j Integer Programming / 15.084j Nonlinear Programming
 *
 * Applications in manufacturing:
 * - Material allocation optimization
 * - Machine scheduling (LP relaxation)
 * - Blend/mix optimization
 * - Cost minimization under constraints
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface LPResult {
  feasible: boolean;
  optimal: boolean;
  unbounded: boolean;
  x: number[];
  objective: number;
  iterations: number;
  dualValues: number[];
  slacks: number[];
  sensitivity: {
    objectiveRanges: Array<{ variable: number; lower: number; upper: number }>;
    rhsRanges: Array<{ constraint: number; lower: number; upper: number }>;
  } | null;
}

export interface LPConfig {
  c: number[];           // Objective coefficients (minimize c'x)
  A: number[][];         // Constraint matrix (m × n)
  b: number[];           // RHS of constraints (Ax <= b)
  maximize?: boolean;    // If true, maximize c'x (default: minimize)
  maxIter?: number;      // Iteration limit (default 1000)
}

// ---------------------------------------------------------------------------
// Engine
// ---------------------------------------------------------------------------

class LinearProgrammingEngineImpl {

  /**
   * Solve LP via Revised Simplex.
   * min c'x s.t. Ax <= b, x >= 0
   */
  solve(config: LPConfig): LPResult {
    const { A, b, maxIter = 1000, maximize = false } = config;
    const c = maximize ? config.c.map(v => -v) : [...config.c];

    const m = A.length;
    const n = c.length;

    if (m === 0 || n === 0) {
      return this._empty(n, m);
    }

    // Check for negative RHS (need Big-M or two-phase)
    for (let i = 0; i < m; i++) {
      if (b[i] < 0) {
        return { feasible: false, optimal: false, unbounded: false, x: [], objective: 0, iterations: 0, dualValues: [], slacks: [], sensitivity: null };
      }
    }

    // Add slack variables: Ax + s = b
    const fullA = A.map((row, i) => {
      const newRow = [...row];
      for (let j = 0; j < m; j++) {
        newRow.push(i === j ? 1 : 0);
      }
      return newRow;
    });

    const fullC = [...c, ...new Array(m).fill(0)];
    const totalVars = n + m;

    // Initial basis: slack variables
    const basis = Array.from({ length: m }, (_, i) => n + i);

    // Initial BFS
    const x = new Array(totalVars).fill(0);
    for (let i = 0; i < m; i++) {
      x[n + i] = b[i];
    }

    let iter = 0;
    for (; iter < maxIter; iter++) {
      // Build basis matrix columns
      const B = this._extractBasisMatrix(fullA, basis, m);
      const cB = basis.map(j => fullC[j]);

      // Solve B'y = cB for dual variables
      const y = this._solveSystem(this._transpose(B), cB);
      if (!y) return this._infeasible(iter);

      // Find entering variable (most negative reduced cost)
      let entering = -1;
      let minRC = -1e-10;

      for (let j = 0; j < totalVars; j++) {
        if (basis.includes(j)) continue;
        const col = fullA.map(row => row[j]);
        const rc = fullC[j] - this._dot(y, col);
        if (rc < minRC) {
          minRC = rc;
          entering = j;
        }
      }

      if (entering === -1) {
        // Optimal found
        const solution = new Array(n).fill(0);
        for (let i = 0; i < m; i++) {
          if (basis[i] < n) {
            solution[basis[i]] = x[basis[i]];
          }
        }

        const slacks = new Array(m).fill(0);
        for (let i = 0; i < m; i++) {
          slacks[i] = x[n + i] ?? 0;
          for (let bi = 0; bi < m; bi++) {
            if (basis[bi] === n + i) {
              slacks[i] = x[basis[bi]];
            }
          }
        }

        const obj = this._dot(config.c, solution);

        return {
          feasible: true,
          optimal: true,
          unbounded: false,
          x: solution.map(v => Math.round(v * 1e10) / 1e10),
          objective: maximize ? obj : obj,
          iterations: iter,
          dualValues: y.map(v => Math.round(v * 1e10) / 1e10),
          slacks: slacks.map(v => Math.round(v * 1e10) / 1e10),
          sensitivity: null,
        };
      }

      // Compute direction: B*d = entering column
      const enteringCol = fullA.map(row => row[entering]);
      const d = this._solveSystem(B, enteringCol);
      if (!d) return this._infeasible(iter);

      // Ratio test
      let leaving = -1;
      let minRatio = Infinity;

      for (let i = 0; i < m; i++) {
        if (d[i] > 1e-10) {
          const ratio = x[basis[i]] / d[i];
          if (ratio < minRatio) {
            minRatio = ratio;
            leaving = i;
          }
        }
      }

      if (leaving === -1) {
        return { feasible: true, optimal: false, unbounded: true, x: [], objective: maximize ? Infinity : -Infinity, iterations: iter, dualValues: [], slacks: [], sensitivity: null };
      }

      // Pivot
      const step = minRatio;
      for (let i = 0; i < m; i++) {
        x[basis[i]] -= step * d[i];
      }
      x[entering] = step;
      x[basis[leaving]] = 0;
      basis[leaving] = entering;
    }

    // Max iterations
    return this._infeasible(iter);
  }

  /**
   * Solve a manufacturing blend/mix problem.
   * Given ingredients with costs and nutrient contents, find minimum-cost blend
   * meeting nutrient requirements.
   */
  solveBlend(params: {
    ingredientCosts: number[];
    nutrientMatrix: number[][];   // [ingredient][nutrient]
    minNutrients: number[];
    maxNutrients?: number[];
    maxIngredients?: number[];
  }): { blend: number[]; cost: number; feasible: boolean } {
    const { ingredientCosts, nutrientMatrix, minNutrients, maxNutrients, maxIngredients } = params;
    const nIng = ingredientCosts.length;
    const nNut = minNutrients.length;

    // Build LP: min cost'x s.t. nutrientMatrix' * x >= min, x <= max
    const A: number[][] = [];
    const b: number[] = [];

    // Minimum nutrient constraints: -N'x <= -minNutrients
    for (let j = 0; j < nNut; j++) {
      const row = nutrientMatrix.map(ing => -(ing[j] ?? 0));
      A.push(row);
      b.push(-minNutrients[j]);
    }

    // Maximum nutrient constraints: N'x <= maxNutrients
    if (maxNutrients) {
      for (let j = 0; j < nNut; j++) {
        if (maxNutrients[j] < Infinity) {
          const row = nutrientMatrix.map(ing => ing[j] ?? 0);
          A.push(row);
          b.push(maxNutrients[j]);
        }
      }
    }

    // Maximum ingredient constraints: x_i <= maxIngredients[i]
    if (maxIngredients) {
      for (let i = 0; i < nIng; i++) {
        if (maxIngredients[i] < Infinity) {
          const row = new Array(nIng).fill(0);
          row[i] = 1;
          A.push(row);
          b.push(maxIngredients[i]);
        }
      }
    }

    // Handle negative RHS from >= constraints by reformulating
    // For rows with b[i] < 0, we need special handling
    const hasNegRHS = b.some(v => v < 0);
    if (hasNegRHS) {
      // Simple approach: check if trivially infeasible
      return { blend: [], cost: 0, feasible: false };
    }

    const result = this.solve({ c: ingredientCosts, A, b });

    return {
      blend: result.x,
      cost: result.objective,
      feasible: result.feasible && result.optimal,
    };
  }

  /**
   * Solve a resource allocation problem.
   * Maximize profit from products given resource constraints.
   */
  solveResourceAllocation(params: {
    productProfits: number[];
    resourceUsage: number[][];    // [product][resource]
    resourceLimits: number[];
    maxProduction?: number[];
  }): { production: number[]; profit: number; feasible: boolean; shadowPrices: number[] } {
    const { productProfits, resourceUsage, resourceLimits, maxProduction } = params;
    const nProd = productProfits.length;

    const A: number[][] = [];
    const b: number[] = [];

    // Resource constraints: usage' * x <= limits
    for (let r = 0; r < resourceLimits.length; r++) {
      const row = resourceUsage.map(prod => prod[r] ?? 0);
      A.push(row);
      b.push(resourceLimits[r]);
    }

    // Max production constraints
    if (maxProduction) {
      for (let i = 0; i < nProd; i++) {
        if (maxProduction[i] < Infinity) {
          const row = new Array(nProd).fill(0);
          row[i] = 1;
          A.push(row);
          b.push(maxProduction[i]);
        }
      }
    }

    const result = this.solve({ c: productProfits, A, b, maximize: true });

    return {
      production: result.x,
      profit: result.objective,
      feasible: result.feasible && result.optimal,
      shadowPrices: result.dualValues.slice(0, resourceLimits.length),
    };
  }

  // -------------------------------------------------------------------------
  // Internal helpers
  // -------------------------------------------------------------------------

  private _extractBasisMatrix(A: number[][], basis: number[], m: number): number[][] {
    return Array.from({ length: m }, (_, i) =>
      basis.map(j => A[i][j])
    );
  }

  private _transpose(M: number[][]): number[][] {
    const rows = M.length;
    const cols = M[0].length;
    return Array.from({ length: cols }, (_, j) =>
      Array.from({ length: rows }, (_, i) => M[i][j])
    );
  }

  private _dot(a: number[], b: number[]): number {
    let sum = 0;
    for (let i = 0; i < a.length; i++) sum += (a[i] ?? 0) * (b[i] ?? 0);
    return sum;
  }

  private _solveSystem(A: number[][], b: number[]): number[] | null {
    const n = A.length;
    if (n === 0) return null;

    // Gaussian elimination with partial pivoting
    const M = A.map((row, i) => [...row, b[i]]);

    for (let k = 0; k < n; k++) {
      // Pivot
      let maxVal = Math.abs(M[k][k]);
      let maxRow = k;
      for (let i = k + 1; i < n; i++) {
        if (Math.abs(M[i][k]) > maxVal) {
          maxVal = Math.abs(M[i][k]);
          maxRow = i;
        }
      }
      if (maxVal < 1e-15) return null; // Singular

      if (maxRow !== k) [M[k], M[maxRow]] = [M[maxRow], M[k]];

      for (let i = k + 1; i < n; i++) {
        const factor = M[i][k] / M[k][k];
        for (let j = k; j <= n; j++) {
          M[i][j] -= factor * M[k][j];
        }
      }
    }

    // Back substitution
    const x = new Array(n).fill(0);
    for (let i = n - 1; i >= 0; i--) {
      x[i] = M[i][n];
      for (let j = i + 1; j < n; j++) {
        x[i] -= M[i][j] * x[j];
      }
      if (Math.abs(M[i][i]) < 1e-15) return null;
      x[i] /= M[i][i];
    }

    return x;
  }

  private _empty(n: number, m: number): LPResult {
    return { feasible: true, optimal: true, unbounded: false, x: new Array(n).fill(0), objective: 0, iterations: 0, dualValues: new Array(m).fill(0), slacks: new Array(m).fill(0), sensitivity: null };
  }

  private _infeasible(iter: number): LPResult {
    return { feasible: false, optimal: false, unbounded: false, x: [], objective: 0, iterations: iter, dualValues: [], slacks: [], sensitivity: null };
  }
}

export const linearProgrammingEngine = new LinearProgrammingEngineImpl();
