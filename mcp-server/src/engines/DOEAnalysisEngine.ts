/**
 * DOEAnalysisEngine — Design of Experiments for manufacturing processes
 *
 * Designs: Full factorial 2^k, Fractional factorial 2^{k-p},
 *   Central Composite Design (CCD)
 * Analysis: Effects, ANOVA, model significance, residuals
 *
 * References: MIT 2.830J Lectures #13-14 (Hardt/Frey),
 *   Montgomery (2012) "Design and Analysis of Experiments"
 * Source: document:mit2830j — MIT OCW 2.830J/6.780J Spring 2008
 */

// ─── Types ─────────────────────────────────────────────────────────

export interface AtomicValue {
  value: number;
  unit: string;
  uncertainty: number;
  source: string;
  warning?: string;
}

/** Factor Def configuration/data structure.
 */
export interface FactorDef {
  name: string;
  low: number;
  high: number;
  unit: string;
}

/** Experiment Run configuration/data structure.
 */
export interface ExperimentRun {
  levels: number[];  // coded levels (-1 or +1, 0 for center)
  response: number;
  replicate?: number;
}

/** D O E Input configuration/data structure.
 */
export interface DOEInput {
  factors: FactorDef[];
  runs: ExperimentRun[];
  include_interactions?: boolean; // default true
  alpha?: number;                 // significance level (default 0.05)
}

/** Effect Estimate configuration/data structure.
 */
export interface EffectEstimate {
  term: string;
  coefficient: number;
  effect: number;        // = 2 * coefficient
  sum_of_squares: number;
  df: number;
  mean_square: number;
  f_value: number;
  is_significant: boolean;
}

/** A N O V A Table configuration/data structure.
 */
export interface ANOVATable {
  terms: EffectEstimate[];
  error_ss: number;
  error_df: number;
  error_ms: number;
  total_ss: number;
  total_df: number;
  r_squared: number;
  r_squared_adj: number;
}

/** D O E Result configuration/data structure.
 */
export interface DOEResult {
  model_equation: string;
  anova: ANOVATable;
  significant_factors: string[];
  residuals: number[];
  residual_normality_ok: boolean;
  recommendations: string[];
}

/** Design Matrix configuration/data structure.
 */
export interface DesignMatrix {
  runs: number[][];   // coded levels for each run
  labels: string[];   // treatment labels
  factor_names: string[];
}

/** Fractional Design Result configuration/data structure.
 */
export interface FractionalDesignResult {
  design: DesignMatrix;
  defining_relation: string;
  resolution: number;     // III, IV, or V
  aliases: string[][];    // pairs of aliased effects
  num_runs: number;
}

// ─── Constants ─────────────────────────────────────────────────────

const SOURCE = "DOEAnalysisEngine (MIT 2.830J Lectures #13-14)";

/**
 * F-distribution critical values at α=0.05 for (1, df_error)
 * For df_error > 30, approximate as 4.0
 */
const F_CRIT_005: Record<number, number> = {
  1: 161.45, 2: 18.51, 3: 10.13, 4: 7.71, 5: 6.61,
  6: 5.99, 7: 5.59, 8: 5.32, 9: 5.12, 10: 4.96,
  12: 4.75, 15: 4.54, 20: 4.35, 24: 4.26, 30: 4.17,
  40: 4.08, 60: 4.00, 120: 3.92,
};

function getFCrit(dfError: number): number {
  if (F_CRIT_005[dfError]) return F_CRIT_005[dfError];
  // Find closest
  const keys = Object.keys(F_CRIT_005)
    .map(Number)
    .sort((a, b) => a - b);
  for (const k of keys) {
    if (k >= dfError) return F_CRIT_005[k];
  }
  return 4.0; // large df
}

// ─── Helper Functions ──────────────────────────────────────────────

function mean(arr: number[]): number {
  return arr.reduce((s, x) => s + x, 0) / arr.length;
}

/**
 * Generate all main effect and interaction term names
 */
function generateTerms(
  factorNames: string[],
  includeInteractions: boolean
): string[] {
  const terms: string[] = [...factorNames]; // main effects
  if (includeInteractions) {
    // Two-factor interactions
    for (let i = 0; i < factorNames.length; i++) {
      for (let j = i + 1; j < factorNames.length; j++) {
        terms.push(`${factorNames[i]}*${factorNames[j]}`);
      }
    }
  }
  return terms;
}

/**
 * Calculate coded column for an interaction term
 */
function interactionColumn(
  runs: ExperimentRun[],
  indices: number[]
): number[] {
  return runs.map((r) =>
    indices.reduce((prod, idx) => prod * r.levels[idx], 1)
  );
}

// ─── Core Analysis ─────────────────────────────────────────────────

/**
 * Analyze a factorial experiment: compute effects, ANOVA, model
  * @param input - input data
  * @returns d o e result
 */
export function analyzeFactorial(input: DOEInput): DOEResult {
  const { factors, runs } = input;
  const alpha = input.alpha ?? 0.05;
  const includeInt = input.include_interactions ?? true;
  const k = factors.length;
  const n = runs.length;

  const factorNames = factors.map((f) => f.name);
  const terms = generateTerms(factorNames, includeInt);
  const responses = runs.map((r) => r.response);
  const grandMean = mean(responses);

  // Build X matrix (coded)
  const X: number[][] = runs.map((r) => {
    const row: number[] = [];
    // Main effects
    for (let i = 0; i < k; i++) row.push(r.levels[i]);
    // Two-factor interactions
    if (includeInt) {
      for (let i = 0; i < k; i++) {
        for (let j = i + 1; j < k; j++) {
          row.push(r.levels[i] * r.levels[j]);
        }
      }
    }
    return row;
  });

  // Calculate contrasts and effects
  const numTerms = terms.length;
  const effects: EffectEstimate[] = [];
  let ssModel = 0;
  const ssTotal = responses.reduce(
    (s, y) => s + (y - grandMean) ** 2, 0
  );

  // Count replicates per treatment
  const treatmentMap = new Map<string, number[]>();
  for (const run of runs) {
    const key = run.levels.join(",");
    const arr = treatmentMap.get(key) ?? [];
    arr.push(run.response);
    treatmentMap.set(key, arr);
  }

  // Pure error from replicates
  let ssError = 0;
  let dfError = 0;
  for (const [, reps] of treatmentMap) {
    if (reps.length > 1) {
      const m = mean(reps);
      ssError += reps.reduce((s, y) => s + (y - m) ** 2, 0);
      dfError += reps.length - 1;
    }
  }

  // If no replicates, use residual error
  const hasReplicates = dfError > 0;

  for (let t = 0; t < numTerms; t++) {
    const column = X.map((row) => row[t]);
    const contrast = responses.reduce(
      (s, y, i) => s + y * column[i], 0
    );
    const nPerLevel = n / 2; // for 2-level design
    const effect = contrast / nPerLevel;
    const coefficient = effect / 2;
    const ss = (contrast * contrast) / n;
    ssModel += ss;

    effects.push({
      term: terms[t],
      coefficient,
      effect,
      sum_of_squares: ss,
      df: 1,
      mean_square: ss,
      f_value: 0, // computed below
      is_significant: false,
    });
  }

  // If no replicates, pool insignificant terms for error
  if (!hasReplicates) {
    ssError = Math.max(ssTotal - ssModel, 0);
    dfError = Math.max(n - 1 - numTerms, 1);
  }

  const msError = dfError > 0 ? ssError / dfError : 1e-10;

  // F-tests
  const fCrit = getFCrit(dfError);
  for (const eff of effects) {
    eff.f_value = msError > 0 ? eff.mean_square / msError : 0;
    eff.is_significant = eff.f_value > fCrit;
  }

  const significantFactors = effects
    .filter((e) => e.is_significant)
    .map((e) => e.term);

  // Model equation
  let equation = `ŷ = ${grandMean.toFixed(4)}`;
  for (const eff of effects) {
    if (Math.abs(eff.coefficient) > 1e-10) {
      const sign = eff.coefficient > 0 ? "+" : "-";
      equation += ` ${sign} ${Math.abs(eff.coefficient).toFixed(4)}·${eff.term}`;
    }
  }

  // Residuals
  const predicted = runs.map((r, i) => {
    let yhat = grandMean;
    for (let t = 0; t < numTerms; t++) {
      yhat += effects[t].coefficient * X[i][t];
    }
    return yhat;
  });
  const residuals = responses.map((y, i) => y - predicted[i]);

  // Residual normality check (simplified: check skewness)
  const resMean = mean(residuals);
  const resStd = Math.sqrt(
    residuals.reduce((s, r) => s + (r - resMean) ** 2, 0)
      / Math.max(residuals.length - 1, 1)
  );
  const skewness = resStd > 0
    ? residuals.reduce(
        (s, r) => s + ((r - resMean) / resStd) ** 3, 0
      ) / residuals.length
    : 0;
  const normalityOk = Math.abs(skewness) < 1.0;

  // R²
  const rSquared = ssTotal > 0 ? ssModel / ssTotal : 0;
  const rSquaredAdj = ssTotal > 0
    ? 1 - (ssError / dfError) / (ssTotal / (n - 1))
    : 0;

  // Recommendations
  const recommendations: string[] = [];
  if (significantFactors.length === 0) {
    recommendations.push(
      "No significant factors found. " +
      "Consider wider factor ranges or more replicates."
    );
  }
  if (!normalityOk) {
    recommendations.push(
      "Residuals show non-normal distribution. " +
      "Consider data transformation (log, sqrt)."
    );
  }
  if (rSquared < 0.7) {
    recommendations.push(
      `Low R²=${(rSquared * 100).toFixed(1)}%. ` +
      "Model may be missing important factors or higher-order terms."
    );
  }
  if (!hasReplicates) {
    recommendations.push(
      "No replicates — error estimated from residuals. " +
      "Add replicates or center points for pure error estimate."
    );
  }

  return {
    model_equation: equation,
    anova: {
      terms: effects,
      error_ss: ssError,
      error_df: dfError,
      error_ms: msError,
      total_ss: ssTotal,
      total_df: n - 1,
      r_squared: rSquared,
      r_squared_adj: rSquaredAdj,
    },
    significant_factors: significantFactors,
    residuals,
    residual_normality_ok: normalityOk,
    recommendations,
  };
}

// ─── Design Generation ─────────────────────────────────────────────

/**
 * Generate a full factorial 2^k design matrix
  * @param factorNames - factor names
  * @returns design matrix
 */
export function generateFullFactorial(
  factorNames: string[]
): DesignMatrix {
  const k = factorNames.length;
  const numRuns = 2 ** k;
  const runs: number[][] = [];
  const labels: string[] = [];

  for (let i = 0; i < numRuns; i++) {
    const row: number[] = [];
    const labelParts: string[] = [];
    for (let j = 0; j < k; j++) {
      const level = (i >> j) & 1 ? 1 : -1;
      row.push(level);
      if (level === 1) labelParts.push(factorNames[j].charAt(0));
    }
    runs.push(row);
    labels.push(labelParts.length > 0 ? labelParts.join("") : "(1)");
  }

  return { runs, labels, factor_names: factorNames };
}

/**
 * Generate a half-fraction 2^{k-1} design with highest resolution
 * Defining relation: I = ±ABC...K (all factors)
  * @param factorNames - factor names
  * @returns fractional design result
 */
export function generateFractionalFactorial(
  factorNames: string[]
): FractionalDesignResult {
  const k = factorNames.length;
  if (k < 3) {
    return {
      design: generateFullFactorial(factorNames),
      defining_relation: "I (full factorial)",
      resolution: k + 1,
      aliases: [],
      num_runs: 2 ** k,
    };
  }

  // 2^{k-1} design: use first k-1 factors as base,
  // last factor = product of all base factors (Resolution III for k=3)
  const baseK = k - 1;
  const numRuns = 2 ** baseK;
  const runs: number[][] = [];
  const labels: string[] = [];

  for (let i = 0; i < numRuns; i++) {
    const row: number[] = [];
    for (let j = 0; j < baseK; j++) {
      row.push((i >> j) & 1 ? 1 : -1);
    }
    // Last factor = product of all base factors
    const lastLevel = row.reduce((p, l) => p * l, 1);
    row.push(lastLevel);
    runs.push(row);

    const labelParts = row
      .map((l, j) => (l === 1 ? factorNames[j].charAt(0) : ""))
      .filter(Boolean);
    labels.push(labelParts.length > 0 ? labelParts.join("") : "(1)");
  }

  // Defining relation
  const defRel = `I = ${factorNames.map((f) => f.charAt(0)).join("")}`;

  // Aliases: each main effect aliased with (k-2)-factor interaction
  const aliases: string[][] = [];
  for (let i = 0; i < k; i++) {
    const others = factorNames
      .filter((_, j) => j !== i)
      .map((f) => f.charAt(0))
      .join("*");
    aliases.push([factorNames[i], others]);
  }

  // Resolution: for 2^{k-1} with I=ABC...K, resolution = k
  const resolution = k;

  return {
    design: { runs, labels, factor_names: factorNames },
    defining_relation: defRel,
    resolution: Math.min(resolution, 5),
    aliases,
    num_runs: numRuns,
  };
}
