/**
 * DimensionalAnalysisCrossValidationEngine — Dimensional Analysis (Buckingham Pi)
 * and Cross-Validation Methods for Manufacturing Model Evaluation
 *
 * Two fundamental scientific tools:
 *   - Buckingham Pi theorem: derive dimensionless groups from physical variables
 *   - Cross-validation: unbiased model performance estimation (k-fold, LOO, nested)
 *   - Model comparison: AIC, BIC, AICc, learning curves
 *
 * References:
 *   - Buckingham, E. (1914). On physically similar systems. Physical Review, 4(4), 345.
 *   - Stone, M. (1974). Cross-validatory choice and assessment of statistical predictions. JRSS-B, 36(2), 111–147.
 *   - Akaike, H. (1974). A new look at the statistical model identification. IEEE Trans. Auto. Control, 19(6), 716–723.
 *   - Schwarz, G. (1978). Estimating the dimension of a model. Annals of Statistics, 6(2), 461–464.
 *
 * @module engines/DimensionalAnalysisCrossValidationEngine
 */

import { log } from "../utils/Logger.js";

// ============================================================================
// TYPES
// ============================================================================

export interface VariableSpec {
  name: string;
  dimensions: Record<string, number>; // M, L, T, Θ, etc.
}

export interface BuckinghamPiInput {
  variables: VariableSpec[];
}

export interface PiGroup {
  expression: string;
  variables: string[];
  exponents: number[];
}

export interface BuckinghamPiResult {
  n_pi_groups: number;
  pi_groups: PiGroup[];
  dimension_matrix: number[][];
  rank: number;
  repeating_variables: string[];
}

export interface MachiningDimAnalysisInput {
  variable_set: "cutting_force" | "surface_roughness" | "tool_life" | "custom";
  custom_vars?: VariableSpec[];
}

export interface MachiningDimAnalysisResult {
  pi_groups: PiGroup[];
  physical_interpretation: string[];
  empirical_correlation_form: string;
  known_correlations: { name: string; equation: string }[];
}

export interface EquationTerm {
  coefficient: number;
  variables: string[];
  exponents: number[];
}

export interface DimConsistencyInput {
  equation_terms: EquationTerm[];
  variable_dimensions: Record<string, Record<string, number>>;
}

export interface DimConsistencyResult {
  consistent: boolean;
  lhs_dimensions: Record<string, number>;
  rhs_dimensions: Record<string, number>;
  inconsistencies: string[];
}

export interface KFoldInput {
  X: number[][];
  y: number[];
  model_type: "linear" | "polynomial" | "ridge";
  k?: number;
  model_params?: Record<string, number>;
  seed?: number;
}

export interface KFoldResult {
  fold_scores: number[];
  mean_score: number;
  std_score: number;
  mean_mse: number;
  mean_r_squared: number;
  bias_variance_decomposition?: { bias_squared: number; variance: number };
}

export interface LOOInput {
  X: number[][];
  y: number[];
  model_type: "linear" | "polynomial" | "ridge";
  model_params?: Record<string, number>;
}

export interface LOOResult {
  press_statistic: number;
  loo_mse: number;
  loo_r_squared: number;
  influential_points: number[];
}

export interface RepeatedKFoldInput {
  X: number[][];
  y: number[];
  model_type: "linear" | "polynomial" | "ridge";
  k?: number;
  n_repeats: number;
  model_params?: Record<string, number>;
  seed?: number;
}

export interface RepeatedKFoldResult {
  overall_mean: number;
  overall_std: number;
  repeat_means: number[];
  confidence_interval_95: [number, number];
  robust: boolean;
}

export interface NestedCVInput {
  X: number[][];
  y: number[];
  model_types: string[];
  hyperparams: Record<string, number[]>;
  k_outer?: number;
  k_inner?: number;
  seed?: number;
}

export interface NestedCVResult {
  best_model: string;
  best_hyperparams: Record<string, number>;
  generalization_score: number;
  model_comparison: Record<string, number>;
  selection_stability: number;
}

export interface ModelSpec {
  name: string;
  type: string;
  params?: Record<string, number>;
}

export interface CompareModelsInput {
  X: number[][];
  y: number[];
  models: ModelSpec[];
}

export interface ModelComparisonRow {
  name: string;
  aic: number;
  bic: number;
  aicc: number;
  cv_mse: number;
  rank: number;
}

export interface CompareModelsResult {
  comparison_table: ModelComparisonRow[];
  best_by_aic: string;
  best_by_bic: string;
  best_by_cv: string;
  recommendation: string;
}

export interface LearningCurveInput {
  X: number[][];
  y: number[];
  model_type: "linear" | "polynomial" | "ridge";
  train_sizes: number[];
  n_repeats?: number;
  model_params?: Record<string, number>;
  seed?: number;
}

export interface LearningCurveResult {
  train_sizes_abs: number[];
  train_scores: number[];
  test_scores: number[];
  train_stds: number[];
  test_stds: number[];
  converged: boolean;
  recommended_min_samples: number;
}

// ============================================================================
// HELPERS — Linear Algebra
// ============================================================================

/** Transpose a matrix */
function transpose(A: number[][]): number[][] {
  if (A.length === 0) return [];
  const rows = A.length, cols = A[0].length;
  const T: number[][] = Array.from({ length: cols }, () => new Array(rows).fill(0));
  for (let i = 0; i < rows; i++)
    for (let j = 0; j < cols; j++)
      T[j][i] = A[i][j];
  return T;
}

/** Matrix multiply */
function matMul(A: number[][], B: number[][]): number[][] {
  const m = A.length, n = B[0].length, p = B.length;
  const C: number[][] = Array.from({ length: m }, () => new Array(n).fill(0));
  for (let i = 0; i < m; i++)
    for (let j = 0; j < n; j++)
      for (let k = 0; k < p; k++)
        C[i][j] += A[i][k] * B[k][j];
  return C;
}

/** Invert a square matrix via Gauss-Jordan */
function invertMatrix(M: number[][]): number[][] {
  const n = M.length;
  // Augment with identity
  const aug: number[][] = M.map((row, i) => {
    const id = new Array(n).fill(0);
    id[i] = 1;
    return [...row, ...id];
  });
  for (let col = 0; col < n; col++) {
    // Partial pivot
    let maxRow = col;
    for (let r = col + 1; r < n; r++) {
      if (Math.abs(aug[r][col]) > Math.abs(aug[maxRow][col])) maxRow = r;
    }
    [aug[col], aug[maxRow]] = [aug[maxRow], aug[col]];
    const pivot = aug[col][col];
    if (Math.abs(pivot) < 1e-14) throw new Error("Singular matrix");
    for (let j = 0; j < 2 * n; j++) aug[col][j] /= pivot;
    for (let r = 0; r < n; r++) {
      if (r === col) continue;
      const f = aug[r][col];
      for (let j = 0; j < 2 * n; j++) aug[r][j] -= f * aug[col][j];
    }
  }
  return aug.map(row => row.slice(n));
}

/** Compute rank of a matrix via row echelon form (Gaussian elimination) */
function matrixRank(M: number[][]): number {
  const rows = M.length;
  if (rows === 0) return 0;
  const cols = M[0].length;
  // Deep copy
  const A = M.map(r => [...r]);
  let rank = 0;
  for (let col = 0; col < cols && rank < rows; col++) {
    // Find pivot
    let pivotRow = -1;
    for (let r = rank; r < rows; r++) {
      if (Math.abs(A[r][col]) > 1e-10) { pivotRow = r; break; }
    }
    if (pivotRow < 0) continue;
    [A[rank], A[pivotRow]] = [A[pivotRow], A[rank]];
    const pv = A[rank][col];
    for (let j = col; j < cols; j++) A[rank][j] /= pv;
    for (let r = 0; r < rows; r++) {
      if (r === rank) continue;
      const f = A[r][col];
      for (let j = col; j < cols; j++) A[r][j] -= f * A[rank][j];
    }
    rank++;
  }
  return rank;
}

/** Solve Ax = b via Gaussian elimination */
function solve(A: number[][], b: number[]): number[] {
  const n = A.length;
  const aug: number[][] = A.map((row, i) => [...row, b[i]]);
  for (let col = 0; col < n; col++) {
    let maxRow = col;
    for (let r = col + 1; r < n; r++) {
      if (Math.abs(aug[r][col]) > Math.abs(aug[maxRow][col])) maxRow = r;
    }
    [aug[col], aug[maxRow]] = [aug[maxRow], aug[col]];
    const pivot = aug[col][col];
    if (Math.abs(pivot) < 1e-14) throw new Error("Singular system");
    for (let j = col; j <= n; j++) aug[col][j] /= pivot;
    for (let r = 0; r < n; r++) {
      if (r === col) continue;
      const f = aug[r][col];
      for (let j = col; j <= n; j++) aug[r][j] -= f * aug[col][j];
    }
  }
  return aug.map(row => row[n]);
}

/** Find null space vectors of dimension matrix (for Pi groups) */
function nullSpace(M: number[][]): number[][] {
  const rows = M.length;
  if (rows === 0) return [];
  const cols = M[0].length;
  // Row reduce augmented with identity of cols
  const A: number[][] = [];
  for (let i = 0; i < rows; i++) {
    A.push([...M[i]]);
  }
  // Gaussian elimination to RREF
  const pivotCols: number[] = [];
  let r = 0;
  for (let c = 0; c < cols && r < rows; c++) {
    let pivotRow = -1;
    for (let i = r; i < rows; i++) {
      if (Math.abs(A[i][c]) > 1e-10) { pivotRow = i; break; }
    }
    if (pivotRow < 0) continue;
    [A[r], A[pivotRow]] = [A[pivotRow], A[r]];
    const pv = A[r][c];
    for (let j = 0; j < cols; j++) A[r][j] /= pv;
    for (let i = 0; i < rows; i++) {
      if (i === r) continue;
      const f = A[i][c];
      for (let j = 0; j < cols; j++) A[i][j] -= f * A[r][j];
    }
    pivotCols.push(c);
    r++;
  }
  const rank = pivotCols.length;
  const freeCols: number[] = [];
  for (let c = 0; c < cols; c++) {
    if (!pivotCols.includes(c)) freeCols.push(c);
  }
  // Build null vectors
  const nullVecs: number[][] = [];
  for (const fc of freeCols) {
    const vec = new Array(cols).fill(0);
    vec[fc] = 1;
    for (let i = 0; i < rank; i++) {
      vec[pivotCols[i]] = -A[i][fc];
    }
    nullVecs.push(vec);
  }
  return nullVecs;
}

// ============================================================================
// HELPERS — Regression
// ============================================================================

/** Build design matrix. linear: [1, x1, x2, ...], polynomial: add x^2, ridge: same + regularization */
function buildDesignMatrix(X: number[][], type: string, params?: Record<string, number>): number[][] {
  const n = X.length;
  const p = X[0].length;
  if (type === "polynomial") {
    const degree = params?.degree ?? 2;
    // For single feature, expand to [1, x, x^2, ..., x^degree]
    // For multi-feature, just add squared terms (interaction-free)
    return X.map(row => {
      const terms = [1, ...row];
      if (degree >= 2) {
        for (const v of row) terms.push(v * v);
      }
      if (degree >= 3) {
        for (const v of row) terms.push(v * v * v);
      }
      return terms;
    });
  }
  // linear or ridge: [1, x1, x2, ...]
  return X.map(row => [1, ...row]);
}

/** Fit linear regression via normal equations, return coefficients */
function fitLinearModel(
  X: number[][], y: number[], type: string, params?: Record<string, number>
): number[] {
  const Xd = buildDesignMatrix(X, type, params);
  const Xt = transpose(Xd);
  let XtX = matMul(Xt, Xd);
  // Ridge regularization
  if (type === "ridge") {
    const lambda = params?.lambda ?? 1.0;
    for (let i = 1; i < XtX.length; i++) XtX[i][i] += lambda;
  }
  const Xty = matMul(Xt, y.map(v => [v])).map(r => r[0]);
  return solve(XtX, Xty);
}

/** Predict y from X using fitted coefficients */
function predict(X: number[][], beta: number[], type: string, params?: Record<string, number>): number[] {
  const Xd = buildDesignMatrix(X, type, params);
  return Xd.map(row => row.reduce((s, v, i) => s + v * beta[i], 0));
}

/** Mean Squared Error */
function mse(actual: number[], predicted: number[]): number {
  const n = actual.length;
  return actual.reduce((s, a, i) => s + (a - predicted[i]) ** 2, 0) / n;
}

/** R-squared */
function rSquared(actual: number[], predicted: number[]): number {
  const mean = actual.reduce((s, v) => s + v, 0) / actual.length;
  const ssTot = actual.reduce((s, v) => s + (v - mean) ** 2, 0);
  const ssRes = actual.reduce((s, v, i) => s + (v - predicted[i]) ** 2, 0);
  if (ssTot === 0) return 1;
  return 1 - ssRes / ssTot;
}

/** Hat matrix diagonal: h_ii for leverage */
function hatDiagonal(X: number[][], type: string, params?: Record<string, number>): number[] {
  const Xd = buildDesignMatrix(X, type, params);
  const Xt = transpose(Xd);
  let XtX = matMul(Xt, Xd);
  if (type === "ridge") {
    const lambda = params?.lambda ?? 1.0;
    for (let i = 1; i < XtX.length; i++) XtX[i][i] += lambda;
  }
  const XtXinv = invertMatrix(XtX);
  // H = X (X'X)^-1 X'  → diagonal h_ii
  const H = matMul(matMul(Xd, XtXinv), Xt);
  return H.map((row, i) => row[i]);
}

/** Simple seeded PRNG (xorshift32) */
function createRng(seed: number): () => number {
  let s = seed | 0 || 1;
  return () => {
    s ^= s << 13;
    s ^= s >> 17;
    s ^= s << 5;
    return (s >>> 0) / 4294967296;
  };
}

/** Shuffle array indices with seeded RNG */
function shuffleIndices(n: number, rng: () => number): number[] {
  const idx = Array.from({ length: n }, (_, i) => i);
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [idx[i], idx[j]] = [idx[j], idx[i]];
  }
  return idx;
}

/** Partition indices into k folds */
function createFolds(n: number, k: number, rng: () => number): number[][] {
  const shuffled = shuffleIndices(n, rng);
  const folds: number[][] = Array.from({ length: k }, () => []);
  for (let i = 0; i < n; i++) {
    folds[i % k].push(shuffled[i]);
  }
  return folds;
}

/** Subset rows from data */
function subset(X: number[][], y: number[], indices: number[]): { X: number[][]; y: number[] } {
  return { X: indices.map(i => X[i]), y: indices.map(i => y[i]) };
}

/** Number of parameters for a model type */
function countParams(X: number[][], type: string, params?: Record<string, number>): number {
  const p = X[0].length;
  if (type === "polynomial") {
    const degree = params?.degree ?? 2;
    let k = 1 + p; // intercept + linear
    if (degree >= 2) k += p;
    if (degree >= 3) k += p;
    return k;
  }
  return 1 + p; // intercept + features
}

// ============================================================================
// ENGINE
// ============================================================================

export class DimensionalAnalysisCrossValidationEngine {
  // ==========================================================================
  // 1a. Buckingham Pi Theorem
  // ==========================================================================

  /**
   * Derive dimensionless Pi groups from a set of physical variables using
   * the Buckingham Pi theorem.
   *
   * Given n variables expressed in m fundamental dimensions, finds n-r
   * dimensionless groups (where r = rank of the dimension matrix).
   *
   * @ref Buckingham, E. (1914). On physically similar systems.
   */
  buckinghamPi(params: BuckinghamPiInput): BuckinghamPiResult {
    const { variables } = params;
    const n = variables.length;

    // Collect all unique dimensions
    const dimSet = new Set<string>();
    for (const v of variables) {
      for (const d of Object.keys(v.dimensions)) dimSet.add(d);
    }
    const dims = Array.from(dimSet).sort();
    const m = dims.length;

    // Build dimension matrix [m × n]
    const dimMatrix: number[][] = [];
    for (let i = 0; i < m; i++) {
      const row: number[] = [];
      for (let j = 0; j < n; j++) {
        row.push(variables[j].dimensions[dims[i]] ?? 0);
      }
      dimMatrix.push(row);
    }

    const rank = matrixRank(dimMatrix);
    const nPi = n - rank;

    log.info(`[DimensionalAnalysisCV] Buckingham Pi: ${n} vars, ${m} dims, rank=${rank}, ${nPi} Pi groups`);

    // Select repeating variables: first 'rank' variables whose columns are linearly independent
    const repeatingIndices = this._selectRepeatingVars(dimMatrix, rank);
    const repeatingNames = repeatingIndices.map(i => variables[i].name);

    // Find null space of the dimension matrix to get Pi group exponents
    const piGroups = this._computePiGroups(dimMatrix, variables, repeatingIndices, rank);

    // Also return dimension matrix in [n × m] form for readability
    const dimMatrixTransposed = transpose(dimMatrix);

    return {
      n_pi_groups: nPi,
      pi_groups: piGroups,
      dimension_matrix: dimMatrixTransposed,
      rank,
      repeating_variables: repeatingNames,
    };
  }

  private _selectRepeatingVars(dimMatrix: number[][], rank: number): number[] {
    const m = dimMatrix.length;
    const n = dimMatrix[0].length;
    // Try combinations: pick 'rank' columns that have full rank
    const indices: number[] = [];
    const cols = Array.from({ length: n }, (_, i) => i);

    // Greedy selection
    for (const c of cols) {
      const trial = [...indices, c];
      const subMatrix = dimMatrix.map(row => trial.map(j => row[j]));
      if (matrixRank(subMatrix) === trial.length) {
        indices.push(c);
        if (indices.length === rank) break;
      }
    }
    return indices;
  }

  private _computePiGroups(
    dimMatrix: number[][], variables: VariableSpec[],
    repeatingIndices: number[], rank: number
  ): PiGroup[] {
    const n = variables.length;
    const m = dimMatrix.length;

    // Use null space approach on the dimension matrix
    const nullVecs = nullSpace(dimMatrix);

    const piGroups: PiGroup[] = [];
    for (let g = 0; g < nullVecs.length; g++) {
      const exponents = nullVecs[g];
      const varNames: string[] = [];
      const nonZeroExp: number[] = [];
      const allExp: number[] = [];

      for (let j = 0; j < n; j++) {
        allExp.push(Math.abs(exponents[j]) < 1e-10 ? 0 : exponents[j]);
        if (Math.abs(exponents[j]) > 1e-10) {
          varNames.push(variables[j].name);
          nonZeroExp.push(exponents[j]);
        }
      }

      // Build expression string
      const parts: string[] = [];
      for (let i = 0; i < varNames.length; i++) {
        const exp = nonZeroExp[i];
        const rounded = Math.round(exp * 1000) / 1000;
        if (rounded === 1) parts.push(varNames[i]);
        else parts.push(`${varNames[i]}^${rounded}`);
      }
      const expression = parts.join(" · ") || "1";

      piGroups.push({
        expression,
        variables: variables.map(v => v.name),
        exponents: allExp.map(e => Math.round(e * 1000) / 1000),
      });
    }

    return piGroups;
  }

  // ==========================================================================
  // 1b. Machining Dimensional Analysis
  // ==========================================================================

  /**
   * Pre-configured dimensional analysis for common machining variable sets.
   */
  machiningDimensionalAnalysis(params: MachiningDimAnalysisInput): MachiningDimAnalysisResult {
    let variables: VariableSpec[];
    let interpretations: string[];
    let correlationForm: string;
    let knownCorrelations: { name: string; equation: string }[];

    switch (params.variable_set) {
      case "cutting_force":
        variables = [
          { name: "Fc", dimensions: { M: 1, L: 1, T: -2 } },        // Force [N]
          { name: "Vc", dimensions: { L: 1, T: -1 } },              // Cutting speed [m/s]
          { name: "f", dimensions: { L: 1 } },                       // Feed [m]
          { name: "ap", dimensions: { L: 1 } },                      // Depth of cut [m]
          { name: "kc", dimensions: { M: 1, L: -1, T: -2 } },       // Specific cutting force [Pa]
          { name: "rho", dimensions: { M: 1, L: -3 } },             // Density [kg/m³]
        ];
        interpretations = [
          "Π₁ = Fc / (kc · f · ap): normalized cutting force",
          "Π₂ = Vc · √(ρ/kc): speed ratio (inertia vs cutting resistance)",
          "Π₃ = f / ap: feed-to-depth ratio (chip geometry)",
        ];
        correlationForm = "Fc/(kc·f·ap) = C · (Vc·√(ρ/kc))^a · (f/ap)^b";
        knownCorrelations = [
          { name: "Kienzle", equation: "Fc = kc1.1 · f^(1-mc) · ap" },
          { name: "Kronenberg", equation: "Fc = C · f^x · ap^y · Vc^z" },
        ];
        break;

      case "surface_roughness":
        variables = [
          { name: "Ra", dimensions: { L: 1 } },                      // Surface roughness [m]
          { name: "f", dimensions: { L: 1 } },                       // Feed [m/rev]
          { name: "r_nose", dimensions: { L: 1 } },                  // Nose radius [m]
          { name: "Vc", dimensions: { L: 1, T: -1 } },              // Cutting speed [m/s]
          { name: "HB", dimensions: { M: 1, L: -1, T: -2 } },       // Hardness [Pa]
        ];
        interpretations = [
          "Π₁ = Ra / f: roughness-to-feed ratio",
          "Π₂ = f / r_nose: feed-to-nose-radius ratio (geometric roughness driver)",
          "Π₃ = Vc · √(ρ/HB): speed-hardness interaction (with density implicit)",
        ];
        correlationForm = "Ra/f = C · (f/r_nose)^a · (Vc/f·HB^0.5)^b";
        knownCorrelations = [
          { name: "Ideal roughness", equation: "Ra = f² / (32 · r_nose)" },
          { name: "Benardos-Vosniakos", equation: "Ra = C · Vc^a · f^b · ap^c" },
        ];
        break;

      case "tool_life":
        variables = [
          { name: "T", dimensions: { T: 1 } },                       // Tool life [s]
          { name: "Vc", dimensions: { L: 1, T: -1 } },              // Cutting speed [m/s]
          { name: "f", dimensions: { L: 1 } },                       // Feed [m]
          { name: "ap", dimensions: { L: 1 } },                      // Depth of cut [m]
          { name: "HB", dimensions: { M: 1, L: -1, T: -2 } },       // Hardness [Pa]
          { name: "kc", dimensions: { M: 1, L: -1, T: -2 } },       // Specific cutting force [Pa]
        ];
        interpretations = [
          "Π₁ = T · Vc / f: dimensionless life (distance traveled / feed)",
          "Π₂ = ap / f: depth-to-feed ratio",
          "Π₃ = HB / kc: hardness-to-cutting-resistance ratio (machinability index)",
        ];
        correlationForm = "T·Vc/f = C · (ap/f)^a · (HB/kc)^b";
        knownCorrelations = [
          { name: "Taylor", equation: "V · T^n = C" },
          { name: "Extended Taylor", equation: "V · T^n · f^a · ap^b = C" },
        ];
        break;

      case "custom":
        if (!params.custom_vars || params.custom_vars.length === 0) {
          throw new Error("custom_vars required for variable_set='custom'");
        }
        variables = params.custom_vars;
        interpretations = ["Custom variable set — interpret Pi groups based on physical context"];
        correlationForm = "Π₁ = f(Π₂, Π₃, ...)";
        knownCorrelations = [];
        break;

      default:
        throw new Error(`Unknown variable_set: ${params.variable_set}`);
    }

    const piResult = this.buckinghamPi({ variables });

    return {
      pi_groups: piResult.pi_groups,
      physical_interpretation: interpretations,
      empirical_correlation_form: correlationForm,
      known_correlations: knownCorrelations,
    };
  }

  // ==========================================================================
  // 1c. Dimensional Consistency Check
  // ==========================================================================

  /**
   * Verify that an equation is dimensionally consistent.
   * Checks that all additive terms share the same dimensions.
   */
  dimensionalConsistencyCheck(params: DimConsistencyInput): DimConsistencyResult {
    const { equation_terms, variable_dimensions } = params;
    const inconsistencies: string[] = [];

    // Compute dimensions of each term
    const termDimensions: Record<string, number>[] = equation_terms.map((term, idx) => {
      const dims: Record<string, number> = {};
      for (let i = 0; i < term.variables.length; i++) {
        const varName = term.variables[i];
        const exp = term.exponents[i];
        const varDims = variable_dimensions[varName];
        if (!varDims) {
          inconsistencies.push(`Unknown variable '${varName}' in term ${idx}`);
          continue;
        }
        for (const [d, power] of Object.entries(varDims)) {
          dims[d] = (dims[d] ?? 0) + power * exp;
        }
      }
      // Clean near-zero
      for (const d of Object.keys(dims)) {
        if (Math.abs(dims[d]) < 1e-10) delete dims[d];
      }
      return dims;
    });

    // LHS = first term, RHS = remaining terms
    const lhsDims = termDimensions[0] || {};
    // All RHS terms should match LHS
    for (let i = 1; i < termDimensions.length; i++) {
      const rhsDims = termDimensions[i];
      const allDims = new Set([...Object.keys(lhsDims), ...Object.keys(rhsDims)]);
      for (const d of allDims) {
        const lv = lhsDims[d] ?? 0;
        const rv = rhsDims[d] ?? 0;
        if (Math.abs(lv - rv) > 1e-10) {
          inconsistencies.push(
            `Dimension '${d}' mismatch: term 0 has ${lv}, term ${i} has ${rv}`
          );
        }
      }
    }

    // Aggregate RHS as the second term's dimensions (for output)
    const rhsDims = termDimensions.length > 1 ? termDimensions[1] : lhsDims;

    return {
      consistent: inconsistencies.length === 0,
      lhs_dimensions: lhsDims,
      rhs_dimensions: rhsDims,
      inconsistencies,
    };
  }

  // ==========================================================================
  // 2a. k-Fold Cross-Validation
  // ==========================================================================

  /**
   * k-fold cross-validation for model evaluation.
   *
   * @ref Stone, M. (1974). Cross-validatory choice and assessment of statistical predictions.
   */
  kFoldCrossValidation(params: KFoldInput): KFoldResult {
    const { X, y, model_type, k = 10, model_params, seed = 42 } = params;
    const n = X.length;
    const rng = createRng(seed);

    // Handle k=1 edge case: train on all data, test on all data
    if (k === 1) {
      const beta = fitLinearModel(X, y, model_type, model_params);
      const pred = predict(X, beta, model_type, model_params);
      const score = rSquared(y, pred);
      return {
        fold_scores: [score],
        mean_score: score,
        std_score: 0,
        mean_mse: mse(y, pred),
        mean_r_squared: score,
      };
    }

    const folds = createFolds(n, k, rng);
    const foldScores: number[] = [];
    const foldMses: number[] = [];

    for (let i = 0; i < k; i++) {
      const testIdx = folds[i];
      const trainIdx: number[] = [];
      for (let j = 0; j < k; j++) {
        if (j !== i) trainIdx.push(...folds[j]);
      }

      const train = subset(X, y, trainIdx);
      const test = subset(X, y, testIdx);

      try {
        const beta = fitLinearModel(train.X, train.y, model_type, model_params);
        const pred = predict(test.X, beta, model_type, model_params);
        foldScores.push(rSquared(test.y, pred));
        foldMses.push(mse(test.y, pred));
      } catch {
        // Singular fold — skip
        foldScores.push(0);
        foldMses.push(Infinity);
      }
    }

    const meanScore = foldScores.reduce((s, v) => s + v, 0) / k;
    const stdScore = Math.sqrt(
      foldScores.reduce((s, v) => s + (v - meanScore) ** 2, 0) / k
    );
    const meanMse = foldMses.filter(v => isFinite(v)).reduce((s, v) => s + v, 0) /
      foldMses.filter(v => isFinite(v)).length;

    return {
      fold_scores: foldScores,
      mean_score: meanScore,
      std_score: stdScore,
      mean_mse: meanMse,
      mean_r_squared: meanScore,
    };
  }

  // ==========================================================================
  // 2b. Leave-One-Out Cross-Validation
  // ==========================================================================

  /**
   * Leave-one-out CV using the PRESS statistic for efficiency.
   * PRESS = Σ(e_i / (1 - h_ii))²
   *
   * @ref Allen, D.M. (1974). The relationship between variable selection and data augmentation.
   */
  leaveOneOutCV(params: LOOInput): LOOResult {
    const { X, y, model_type, model_params } = params;
    const n = X.length;

    // Fit on full data
    const beta = fitLinearModel(X, y, model_type, model_params);
    const pred = predict(X, beta, model_type, model_params);
    const residuals = y.map((v, i) => v - pred[i]);

    // Hat matrix diagonal
    const hii = hatDiagonal(X, model_type, model_params);

    // PRESS statistic
    let press = 0;
    const looResiduals: number[] = [];
    for (let i = 0; i < n; i++) {
      const looRes = residuals[i] / (1 - hii[i]);
      looResiduals.push(looRes);
      press += looRes * looRes;
    }

    const looMse = press / n;
    const yMean = y.reduce((s, v) => s + v, 0) / n;
    const ssTot = y.reduce((s, v) => s + (v - yMean) ** 2, 0);
    const looR2 = 1 - press / ssTot;

    // Influential points: high leverage (h_ii > 2p/n) AND high standardized residual
    const p = countParams(X, model_type, model_params);
    const threshold = 2 * p / n;
    const sigmaHat = Math.sqrt(residuals.reduce((s, r) => s + r * r, 0) / (n - p));
    const influential: number[] = [];
    for (let i = 0; i < n; i++) {
      const stdRes = Math.abs(residuals[i]) / (sigmaHat * Math.sqrt(1 - hii[i]));
      if (hii[i] > threshold && stdRes > 2) {
        influential.push(i);
      }
    }

    return {
      press_statistic: press,
      loo_mse: looMse,
      loo_r_squared: looR2,
      influential_points: influential,
    };
  }

  // ==========================================================================
  // 2c. Repeated k-Fold Cross-Validation
  // ==========================================================================

  /**
   * Repeat k-fold CV multiple times with different random splits.
   */
  repeatedKFoldCV(params: RepeatedKFoldInput): RepeatedKFoldResult {
    const { X, y, model_type, k = 10, n_repeats, model_params, seed = 42 } = params;
    const repeatMeans: number[] = [];

    for (let rep = 0; rep < n_repeats; rep++) {
      const result = this.kFoldCrossValidation({
        X, y, model_type, k, model_params,
        seed: seed + rep * 1000,
      });
      repeatMeans.push(result.mean_score);
    }

    const overallMean = repeatMeans.reduce((s, v) => s + v, 0) / n_repeats;
    const overallStd = Math.sqrt(
      repeatMeans.reduce((s, v) => s + (v - overallMean) ** 2, 0) / n_repeats
    );
    const se = overallStd / Math.sqrt(n_repeats);
    const ci95: [number, number] = [overallMean - 1.96 * se, overallMean + 1.96 * se];

    return {
      overall_mean: overallMean,
      overall_std: overallStd,
      repeat_means: repeatMeans,
      confidence_interval_95: ci95,
      robust: overallStd < 0.05,
    };
  }

  // ==========================================================================
  // 2d. Nested Cross-Validation
  // ==========================================================================

  /**
   * Nested CV for simultaneous model selection and performance estimation.
   * Outer loop: unbiased performance. Inner loop: hyperparameter tuning.
   */
  nestedCrossValidation(params: NestedCVInput): NestedCVResult {
    const { X, y, model_types, hyperparams, k_outer = 5, k_inner = 3, seed = 42 } = params;
    const n = X.length;
    const rng = createRng(seed);
    const outerFolds = createFolds(n, k_outer, rng);

    const outerScores: number[] = [];
    const bestModels: string[] = [];
    const bestHPs: Record<string, number>[] = [];
    const modelScoreAccum: Record<string, number[]> = {};
    for (const mt of model_types) modelScoreAccum[mt] = [];

    for (let o = 0; o < k_outer; o++) {
      const testIdx = outerFolds[o];
      const trainIdx: number[] = [];
      for (let j = 0; j < k_outer; j++) {
        if (j !== o) trainIdx.push(...outerFolds[j]);
      }

      const outerTrain = subset(X, y, trainIdx);
      const outerTest = subset(X, y, testIdx);

      // Inner loop: try all model types × hyperparams
      let bestInnerScore = -Infinity;
      let bestInnerModel = model_types[0];
      let bestInnerHP: Record<string, number> = {};

      for (const mt of model_types) {
        // Get hyperparam values for this model type
        const hpKeys = Object.keys(hyperparams);
        const hpValues = hpKeys.map(k => hyperparams[k]);

        // Simple grid: try each combination
        const combos = this._gridCombos(hpKeys, hpValues);

        for (const combo of combos) {
          const innerResult = this.kFoldCrossValidation({
            X: outerTrain.X,
            y: outerTrain.y,
            model_type: mt as "linear" | "polynomial" | "ridge",
            k: k_inner,
            model_params: combo,
            seed: seed + o * 100,
          });

          if (innerResult.mean_score > bestInnerScore) {
            bestInnerScore = innerResult.mean_score;
            bestInnerModel = mt;
            bestInnerHP = combo;
          }
        }
      }

      bestModels.push(bestInnerModel);
      bestHPs.push(bestInnerHP);

      // Evaluate best model on outer test fold
      try {
        const beta = fitLinearModel(
          outerTrain.X, outerTrain.y,
          bestInnerModel as "linear" | "polynomial" | "ridge",
          bestInnerHP
        );
        const pred = predict(outerTest.X, beta, bestInnerModel, bestInnerHP);
        const score = rSquared(outerTest.y, pred);
        outerScores.push(score);
        modelScoreAccum[bestInnerModel].push(score);
      } catch {
        outerScores.push(0);
      }
    }

    // Aggregate
    const genScore = outerScores.reduce((s, v) => s + v, 0) / outerScores.length;

    // Model comparison: average score per model type
    const modelComparison: Record<string, number> = {};
    for (const mt of model_types) {
      const scores = modelScoreAccum[mt];
      modelComparison[mt] = scores.length > 0
        ? scores.reduce((s, v) => s + v, 0) / scores.length
        : 0;
    }

    // Selection stability: fraction of outer folds selecting the most common model
    const modelCounts: Record<string, number> = {};
    for (const m of bestModels) modelCounts[m] = (modelCounts[m] ?? 0) + 1;
    const maxCount = Math.max(...Object.values(modelCounts));
    const stability = maxCount / k_outer;

    // Most frequently selected model
    const bestModel = Object.entries(modelCounts).sort((a, b) => b[1] - a[1])[0][0];

    // Most common hyperparams for best model
    const bestHP = bestHPs[bestModels.indexOf(bestModel)] || {};

    return {
      best_model: bestModel,
      best_hyperparams: bestHP,
      generalization_score: genScore,
      model_comparison: modelComparison,
      selection_stability: stability,
    };
  }

  private _gridCombos(keys: string[], values: number[][]): Record<string, number>[] {
    if (keys.length === 0) return [{}];
    const combos: Record<string, number>[] = [];
    const recurse = (idx: number, current: Record<string, number>) => {
      if (idx === keys.length) {
        combos.push({ ...current });
        return;
      }
      for (const v of values[idx]) {
        current[keys[idx]] = v;
        recurse(idx + 1, current);
      }
    };
    recurse(0, {});
    return combos;
  }

  // ==========================================================================
  // 3a. Compare Models
  // ==========================================================================

  /**
   * Compare multiple models using information criteria (AIC, BIC, AICc) and CV.
   *
   * @ref Akaike, H. (1974). A new look at the statistical model identification.
   * @ref Schwarz, G. (1978). Estimating the dimension of a model.
   */
  compareModels(params: CompareModelsInput): CompareModelsResult {
    const { X, y, models } = params;
    const n = y.length;

    const rows: ModelComparisonRow[] = [];

    for (const model of models) {
      const type = model.type as "linear" | "polynomial" | "ridge";
      const mp = model.params;
      const k = countParams(X, type, mp);

      // Fit model
      let modelMse: number;
      try {
        const beta = fitLinearModel(X, y, type, mp);
        const pred = predict(X, beta, type, mp);
        modelMse = mse(y, pred);
      } catch {
        modelMse = Infinity;
      }

      // Log-likelihood (assuming Gaussian errors)
      const logL = isFinite(modelMse) && modelMse > 0
        ? -n / 2 * (Math.log(2 * Math.PI) + Math.log(modelMse) + 1)
        : -Infinity;

      // AIC = -2·logL + 2k
      const aic = -2 * logL + 2 * k;
      // BIC = -2·logL + k·ln(n)
      const bic = -2 * logL + k * Math.log(n);
      // AICc = AIC + 2k(k+1)/(n-k-1)
      const aicc = n - k - 1 > 0 ? aic + 2 * k * (k + 1) / (n - k - 1) : aic;

      // CV MSE
      let cvMse: number;
      try {
        const cvResult = this.kFoldCrossValidation({
          X, y, model_type: type, k: Math.min(10, n), model_params: mp,
        });
        cvMse = cvResult.mean_mse;
      } catch {
        cvMse = Infinity;
      }

      rows.push({ name: model.name, aic, bic, aicc, cv_mse: cvMse, rank: 0 });
    }

    // Rank by AIC
    const byAic = [...rows].sort((a, b) => a.aic - b.aic);
    const byBic = [...rows].sort((a, b) => a.bic - b.bic);
    const byCv = [...rows].sort((a, b) => a.cv_mse - b.cv_mse);

    // Assign composite rank (average of AIC, BIC, CV ranks)
    for (const row of rows) {
      const aicRank = byAic.findIndex(r => r.name === row.name) + 1;
      const bicRank = byBic.findIndex(r => r.name === row.name) + 1;
      const cvRank = byCv.findIndex(r => r.name === row.name) + 1;
      row.rank = Math.round((aicRank + bicRank + cvRank) / 3);
    }
    rows.sort((a, b) => a.rank - b.rank);

    const bestByAic = byAic[0].name;
    const bestByBic = byBic[0].name;
    const bestByCv = byCv[0].name;

    let recommendation: string;
    if (bestByAic === bestByBic && bestByBic === bestByCv) {
      recommendation = `All criteria agree: ${bestByAic} is the best model.`;
    } else if (bestByBic === bestByCv) {
      recommendation = `BIC and CV agree on ${bestByBic}; prefer this for generalization.`;
    } else {
      recommendation = `Mixed results: AIC→${bestByAic}, BIC→${bestByBic}, CV→${bestByCv}. Prefer BIC for parsimony or CV for prediction.`;
    }

    return {
      comparison_table: rows,
      best_by_aic: bestByAic,
      best_by_bic: bestByBic,
      best_by_cv: bestByCv,
      recommendation,
    };
  }

  // ==========================================================================
  // 3b. Learning Curve
  // ==========================================================================

  /**
   * Compute learning curve: how model performance changes with training set size.
   */
  learningCurve(params: LearningCurveInput): LearningCurveResult {
    const { X, y, model_type, train_sizes, n_repeats = 5, model_params, seed = 42 } = params;
    const n = X.length;

    const trainSizesAbs: number[] = [];
    const trainScores: number[] = [];
    const testScores: number[] = [];
    const trainStds: number[] = [];
    const testStds: number[] = [];

    for (const frac of train_sizes) {
      const size = Math.max(2, Math.round(frac * n));
      trainSizesAbs.push(size);

      const repTrainScores: number[] = [];
      const repTestScores: number[] = [];

      for (let rep = 0; rep < n_repeats; rep++) {
        const rng = createRng(seed + rep * 1000 + Math.round(frac * 10000));
        const shuffled = shuffleIndices(n, rng);
        const trainIdx = shuffled.slice(0, size);
        const testIdx = shuffled.slice(size);

        if (testIdx.length === 0) {
          // Use training data as test when no holdout
          const train = subset(X, y, trainIdx);
          try {
            const beta = fitLinearModel(train.X, train.y, model_type, model_params);
            const predTrain = predict(train.X, beta, model_type, model_params);
            repTrainScores.push(rSquared(train.y, predTrain));
            repTestScores.push(rSquared(train.y, predTrain));
          } catch {
            repTrainScores.push(0);
            repTestScores.push(0);
          }
          continue;
        }

        const train = subset(X, y, trainIdx);
        const test = subset(X, y, testIdx);

        try {
          const beta = fitLinearModel(train.X, train.y, model_type, model_params);
          const predTrain = predict(train.X, beta, model_type, model_params);
          const predTest = predict(test.X, beta, model_type, model_params);
          repTrainScores.push(rSquared(train.y, predTrain));
          repTestScores.push(rSquared(test.y, predTest));
        } catch {
          repTrainScores.push(0);
          repTestScores.push(0);
        }
      }

      const meanTrain = repTrainScores.reduce((s, v) => s + v, 0) / n_repeats;
      const meanTest = repTestScores.reduce((s, v) => s + v, 0) / n_repeats;
      const stdTrain = Math.sqrt(repTrainScores.reduce((s, v) => s + (v - meanTrain) ** 2, 0) / n_repeats);
      const stdTest = Math.sqrt(repTestScores.reduce((s, v) => s + (v - meanTest) ** 2, 0) / n_repeats);

      trainScores.push(meanTrain);
      testScores.push(meanTest);
      trainStds.push(stdTrain);
      testStds.push(stdTest);
    }

    // Check convergence: test score plateau (last 2 points within 0.02)
    const converged = testScores.length >= 2 &&
      Math.abs(testScores[testScores.length - 1] - testScores[testScores.length - 2]) < 0.02;

    // Recommended min samples: first size where test score > 90% of final test score
    const finalScore = testScores[testScores.length - 1];
    let recommendedMin = trainSizesAbs[trainSizesAbs.length - 1];
    for (let i = 0; i < testScores.length; i++) {
      if (testScores[i] >= 0.9 * finalScore && finalScore > 0) {
        recommendedMin = trainSizesAbs[i];
        break;
      }
    }

    return {
      train_sizes_abs: trainSizesAbs,
      train_scores: trainScores,
      test_scores: testScores,
      train_stds: trainStds,
      test_stds: testStds,
      converged,
      recommended_min_samples: recommendedMin,
    };
  }
}

export const dimensionalAnalysisCrossValidationEngine = new DimensionalAnalysisCrossValidationEngine();
