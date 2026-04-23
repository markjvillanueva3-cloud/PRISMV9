/**
 * StochasticWrapperEngine — Unified uncertainty quantification wrapper
 *
 * Adds Monte Carlo, FOSM, or PCE analysis to ANY deterministic PRISM engine
 * without modifying the original engine. Solves the fragmentation problem where
 * users must manually choose between e.g. CuttingForceEngine (deterministic) and
 * StochasticCuttingForceEngine (stochastic).
 *
 * Usage: pass any deterministic function as `engine_fn` and specify input
 * distributions — the wrapper produces confidence intervals, sensitivity
 * indices, distribution fits, and structured reports.
 *
 * Methods:
 *   - Monte Carlo (random / LHS / Sobol quasi-MC) — general-purpose
 *   - FOSM (First-Order Second Moment) — analytical, fast, exact for linear
 *   - PCE (Polynomial Chaos Expansion) — spectral surrogate with Sobol indices
 *   - OAT Sensitivity Analysis — tornado chart data
 *   - Chain Propagation — multi-engine uncertainty pipeline
 *   - Distribution Fitting — MLE/MoM with KS goodness-of-fit
 *
 * References:
 *   Haldar & Mahadevan "Probability, Reliability and Statistical Methods" Ch. 14 (FOSM),
 *   Saltelli et al. (2010) "Variance based sensitivity analysis" (Sobol),
 *   Xiu & Karniadakis (2002) "The Wiener-Askey polynomial chaos" (PCE),
 *   McKay et al. (1979) "A comparison of three methods" (LHS),
 *   Marsaglia & Bray (1964) Box-Muller transform
 *
 * @module StochasticWrapperEngine
 * @milestone SCIMATH-WIRE-MS0
 * @unit P6-U01
 */

import { SVDEngine } from "./SVDEngine.js";

// ── Interfaces ─────────────────────────────────────────────────────

interface AtomicValue<T> {
  value: T; unit: string; formula?: string; confidence?: number;
}

export type SamplingMethod = "random" | "lhs" | "sobol";

export interface InputDistribution {
  type: "normal" | "uniform" | "lognormal" | "triangular" | "weibull";
  /** Distribution parameters:
   *  normal: [mean, std_dev]
   *  uniform: [min, max]
   *  lognormal: [mu, sigma] (of the underlying normal)
   *  triangular: [min, mode, max]
   *  weibull: [shape, scale]
   */
  params: number[];
}

export interface MonteCarloInput {
  engine_fn: (inputs: Record<string, number>) => Record<string, number>;
  nominal_inputs: Record<string, number>;
  input_distributions: Record<string, InputDistribution>;
  n_samples?: number;
  sampling_method?: SamplingMethod;
  seed?: number;
}

export interface OutputStatistics {
  mean: number;
  std_dev: number;
  cv_percent: number;
  ci_95: [number, number];
  ci_99: [number, number];
  p5: number;
  p25: number;
  p50: number;
  p75: number;
  p95: number;
  histogram: { bins: number[]; counts: number[] };
  distribution_fit: { type: string; params: number[]; ks_statistic: number };
}

export interface MonteCarloResult {
  method: "monte_carlo";
  sampling: SamplingMethod;
  n_samples: number;
  outputs: Record<string, OutputStatistics>;
  raw_samples?: Record<string, number[]>;
}

export interface FOSMInput {
  engine_fn: (inputs: Record<string, number>) => Record<string, number>;
  nominal_inputs: Record<string, number>;
  input_distributions: Record<string, InputDistribution>;
  correlation_matrix?: number[][];
  step_fraction?: number;
}

export interface FOSMOutputStats {
  mean: number;
  std_dev: number;
  ci_95: [number, number];
  sensitivity_coefficients: Record<string, number>;
}

export interface FOSMResult {
  method: "fosm";
  outputs: Record<string, FOSMOutputStats>;
}

export interface PCEInput {
  engine_fn: (inputs: Record<string, number>) => Record<string, number>;
  nominal_inputs: Record<string, number>;
  input_distributions: Record<string, InputDistribution>;
  pce_order?: number;
  n_eval_points?: number;
  seed?: number;
}

export interface PCEOutputStats {
  mean: number;
  std_dev: number;
  sobol_first_order: Record<string, number>;
  sobol_total: Record<string, number>;
  pce_coefficients: number[];
}

export interface PCEResult {
  method: "pce";
  outputs: Record<string, PCEOutputStats>;
}

export interface SensitivityInput {
  engine_fn: (inputs: Record<string, number>) => Record<string, number>;
  nominal_inputs: Record<string, number>;
  perturbation_pcts?: number[];
}

export interface SensitivityEntry {
  parameter: string;
  nominal: number;
  perturbation_pct: number;
  output_name: string;
  output_change_pct: number;
}

export interface TornadoBar {
  parameter: string;
  output_name: string;
  low_pct: number;
  high_pct: number;
  range_pct: number;
}

export interface SensitivityResult {
  entries: SensitivityEntry[];
  ranking: { parameter: string; total_influence: number }[];
  tornado: TornadoBar[];
}

export interface ChainStage {
  engine_fn: (inputs: Record<string, number>) => Record<string, number>;
  input_mapping?: Record<string, string>;
  fixed_inputs?: Record<string, number>;
}

export interface ChainInput {
  stages: ChainStage[];
  initial_inputs: Record<string, number>;
  input_distributions: Record<string, InputDistribution>;
  n_samples?: number;
  seed?: number;
}

export interface ChainStageResult {
  stage_index: number;
  outputs: Record<string, OutputStatistics>;
  variance_contribution_pct: Record<string, number>;
}

export interface ChainResult {
  stages: ChainStageResult[];
  final_outputs: Record<string, OutputStatistics>;
  dominant_input: { name: string; variance_contribution_pct: number };
}

export interface DistributionFit {
  type: string;
  params: number[];
  ks_statistic: number;
  p_value: number;
}

export interface FitResult {
  fits: DistributionFit[];
  best: DistributionFit;
}

export interface ReportInput {
  input_distributions: Record<string, InputDistribution>;
  outputs: Record<string, OutputStatistics>;
  sensitivity?: SensitivityResult;
  limits?: Record<string, number>;
}

export interface Report {
  input_summary: { name: string; distribution: string; params: number[] }[];
  output_summary: { name: string; mean: number; std_dev: number; cv_pct: number; ci_95: [number, number] }[];
  sensitivity_ranking?: { parameter: string; total_influence: number }[];
  risk_assessment?: { output: string; limit: number; p_exceed: number }[];
  recommendations: string[];
}

// ── Engine ──────────────────────────────────────────────────────────

class StochasticWrapperEngine {

  // ── Public API ──────────────────────────────────────────────────

  /**
   * Wrap a deterministic engine function with Monte Carlo uncertainty analysis.
   * Draws N samples from input distributions, evaluates engine_fn for each,
   * and returns full output statistics including CIs, percentiles, histogram,
   * and distribution fit.
   */
  wrapWithMonteCarlo(params: MonteCarloInput): AtomicValue<MonteCarloResult> {
    const n = params.n_samples ?? 10000;
    const method = params.sampling_method ?? "random";
    const rng = this._seededRandom(params.seed ?? Date.now());
    const distKeys = Object.keys(params.input_distributions);

    // Generate input samples
    let inputSamples: Record<string, number[]>;
    if (method === "lhs") {
      inputSamples = this._latinHypercubeSample(params.input_distributions, n, rng);
    } else if (method === "sobol") {
      inputSamples = this._sobolSample(params.input_distributions, n, rng);
    } else {
      inputSamples = this._randomSample(params.input_distributions, n, rng);
    }

    // Evaluate engine_fn for each sample
    const outputSamples: Record<string, number[]> = {};
    for (let i = 0; i < n; i++) {
      const sampleInput: Record<string, number> = { ...params.nominal_inputs };
      for (const key of distKeys) {
        sampleInput[key] = inputSamples[key][i];
      }
      const result = params.engine_fn(sampleInput);
      for (const oKey of Object.keys(result)) {
        if (!outputSamples[oKey]) outputSamples[oKey] = [];
        outputSamples[oKey].push(result[oKey]);
      }
    }

    // Compute statistics for each output
    const outputs: Record<string, OutputStatistics> = {};
    for (const [oKey, samples] of Object.entries(outputSamples)) {
      outputs[oKey] = this._computeOutputStats(samples);
    }

    return {
      value: { method: "monte_carlo", sampling: method, n_samples: n, outputs },
      unit: "stochastic_result",
      formula: `MC(${method}, N=${n})`,
      confidence: 0.95,
    };
  }

  /**
   * First-Order Second-Moment analytical uncertainty propagation.
   * Uses central difference for partial derivatives. Exact for linear functions.
   * Supports correlated inputs via correlation matrix.
   *
   * μ_Y ≈ f(μ_X), σ²_Y ≈ J × Σ_X × J^T
   */
  wrapWithFOSM(params: FOSMInput): AtomicValue<FOSMResult> {
    const step = params.step_fraction ?? 1e-4;
    const distKeys = Object.keys(params.input_distributions);

    // Compute nominal output
    const nominalOut = params.engine_fn(params.nominal_inputs);
    const outKeys = Object.keys(nominalOut);

    // Get standard deviations for each input
    const inputStds: Record<string, number> = {};
    for (const key of distKeys) {
      inputStds[key] = this._distStdDev(params.input_distributions[key]);
    }

    // Compute Jacobian via central difference
    // J[outIdx][inIdx] = ∂f_out / ∂x_in
    const jacobian: number[][] = [];
    for (const oKey of outKeys) {
      const row: number[] = [];
      for (const iKey of distKeys) {
        const h = Math.abs(params.nominal_inputs[iKey]) * step || step;
        const inputPlus = { ...params.nominal_inputs, [iKey]: params.nominal_inputs[iKey] + h };
        const inputMinus = { ...params.nominal_inputs, [iKey]: params.nominal_inputs[iKey] - h };
        const fPlus = params.engine_fn(inputPlus)[oKey];
        const fMinus = params.engine_fn(inputMinus)[oKey];
        row.push((fPlus - fMinus) / (2 * h));
      }
      jacobian.push(row);
    }

    // Build covariance matrix Σ_X
    const nIn = distKeys.length;
    const sigmaX: number[][] = Array.from({ length: nIn }, () => new Array(nIn).fill(0));
    for (let i = 0; i < nIn; i++) {
      for (let j = 0; j < nIn; j++) {
        if (i === j) {
          sigmaX[i][j] = inputStds[distKeys[i]] ** 2;
        } else if (params.correlation_matrix) {
          sigmaX[i][j] = params.correlation_matrix[i][j] *
            inputStds[distKeys[i]] * inputStds[distKeys[j]];
        }
      }
    }

    // σ²_Y = J × Σ_X × J^T
    const outputs: Record<string, FOSMOutputStats> = {};
    for (let oi = 0; oi < outKeys.length; oi++) {
      const J_row = jacobian[oi];
      // J_row × Σ_X × J_row^T (scalar for single output)
      let variance = 0;
      for (let i = 0; i < nIn; i++) {
        for (let j = 0; j < nIn; j++) {
          variance += J_row[i] * sigmaX[i][j] * J_row[j];
        }
      }
      const std = Math.sqrt(Math.max(0, variance));
      const mean = nominalOut[outKeys[oi]];

      // Sensitivity coefficients (normalized)
      const sensCoeffs: Record<string, number> = {};
      for (let i = 0; i < nIn; i++) {
        sensCoeffs[distKeys[i]] = variance > 0
          ? (J_row[i] ** 2 * inputStds[distKeys[i]] ** 2) / variance
          : 0;
      }

      outputs[outKeys[oi]] = {
        mean,
        std_dev: std,
        ci_95: [mean - 1.96 * std, mean + 1.96 * std],
        sensitivity_coefficients: sensCoeffs,
      };
    }

    return {
      value: { method: "fosm", outputs },
      unit: "fosm_result",
      formula: "FOSM: σ²_Y = J × Σ_X × J^T",
      confidence: 0.95,
    };
  }

  /**
   * Polynomial Chaos Expansion — spectral surrogate for UQ.
   * Fits polynomial from evaluation points, extracts Sobol indices from
   * PCE coefficients. Efficient for smooth input-output mappings.
   */
  wrapWithPCE(params: PCEInput): AtomicValue<PCEResult> {
    const order = params.pce_order ?? 3;
    const distKeys = Object.keys(params.input_distributions);
    const nIn = distKeys.length;
    const rng = this._seededRandom(params.seed ?? 42);

    // Number of PCE terms for total-order expansion: (n+p)! / (n! p!)
    const nTerms = this._binomial(nIn + order, order);
    const nEval = params.n_eval_points ?? Math.max(2 * nTerms, 50);

    // Generate evaluation points via LHS
    const inputSamples = this._latinHypercubeSample(params.input_distributions, nEval, rng);

    // Build multi-index set (total order <= `order`)
    const multiIndices = this._generateMultiIndices(nIn, order);

    // Evaluate engine at all sample points
    const evalResults: Record<string, number>[] = [];
    for (let i = 0; i < nEval; i++) {
      const inp: Record<string, number> = { ...params.nominal_inputs };
      for (const key of distKeys) {
        inp[key] = inputSamples[key][i];
      }
      evalResults.push(params.engine_fn(inp));
    }

    const outKeys = Object.keys(evalResults[0]);
    const outputs: Record<string, PCEOutputStats> = {};

    for (const oKey of outKeys) {
      const y = evalResults.map(r => r[oKey]);

      // Build Vandermonde-like matrix of orthogonal polynomial evaluations
      // For simplicity, use normalized Hermite polynomials (standard normal space)
      const Phi: number[][] = [];
      for (let i = 0; i < nEval; i++) {
        const row: number[] = [];
        // Transform samples to standard normal space
        const xi: number[] = distKeys.map(key => {
          const dist = params.input_distributions[key];
          const val = inputSamples[key][i];
          const mean = this._distMean(dist);
          const std = this._distStdDev(dist);
          return std > 0 ? (val - mean) / std : 0;
        });
        for (const mi of multiIndices) {
          let basis = 1;
          for (let d = 0; d < nIn; d++) {
            basis *= this._hermiteNorm(mi[d], xi[d]);
          }
          row.push(basis);
        }
        Phi.push(row);
      }

      // Solve least-squares: Phi * c = y  →  c = (Phi^T Phi)^-1 Phi^T y
      const coeffs = this._leastSquares(Phi, y);

      // PCE statistics: mean = c_0, variance = Σ c_k² (k>0)
      const mean = coeffs[0];
      const variance = coeffs.slice(1).reduce((s, c) => s + c * c, 0);
      const std = Math.sqrt(Math.max(0, variance));

      // Sobol indices from PCE coefficients
      const sobolFirst: Record<string, number> = {};
      const sobolTotal: Record<string, number> = {};
      for (let d = 0; d < nIn; d++) {
        let firstVar = 0;
        let totalVar = 0;
        for (let k = 1; k < multiIndices.length; k++) {
          const mi = multiIndices[k];
          const c2 = coeffs[k] ** 2;
          // First-order: only dimension d is active
          if (mi[d] > 0 && mi.every((v, j) => j === d || v === 0)) {
            firstVar += c2;
          }
          // Total: dimension d participates
          if (mi[d] > 0) {
            totalVar += c2;
          }
        }
        sobolFirst[distKeys[d]] = variance > 0 ? firstVar / variance : 0;
        sobolTotal[distKeys[d]] = variance > 0 ? totalVar / variance : 0;
      }

      outputs[oKey] = {
        mean,
        std_dev: std,
        sobol_first_order: sobolFirst,
        sobol_total: sobolTotal,
        pce_coefficients: coeffs,
      };
    }

    return {
      value: { method: "pce", outputs },
      unit: "pce_result",
      formula: `PCE(order=${order}, terms=${nTerms})`,
      confidence: 0.95,
    };
  }

  /**
   * One-at-a-time sensitivity analysis with tornado chart data.
   * Varies each input +-10%, +-20%, +-50% from nominal and measures output change.
   */
  sensitivityAnalysis(params: SensitivityInput): AtomicValue<SensitivityResult> {
    const pcts = params.perturbation_pcts ?? [10, 20, 50];
    const nominalOut = params.engine_fn(params.nominal_inputs);
    const outKeys = Object.keys(nominalOut);
    const inKeys = Object.keys(params.nominal_inputs);

    const entries: SensitivityEntry[] = [];
    const tornadoMap: Record<string, Record<string, { low: number; high: number }>> = {};
    const influenceAccum: Record<string, number> = {};

    for (const iKey of inKeys) {
      influenceAccum[iKey] = 0;
      for (const pct of pcts) {
        const nominal = params.nominal_inputs[iKey];
        const delta = nominal * pct / 100;
        const inputHigh = { ...params.nominal_inputs, [iKey]: nominal + delta };
        const inputLow = { ...params.nominal_inputs, [iKey]: nominal - delta };
        const outHigh = params.engine_fn(inputHigh);
        const outLow = params.engine_fn(inputLow);

        for (const oKey of outKeys) {
          const nomVal = nominalOut[oKey];
          const changePctHigh = nomVal !== 0 ? ((outHigh[oKey] - nomVal) / Math.abs(nomVal)) * 100 : 0;
          const changePctLow = nomVal !== 0 ? ((outLow[oKey] - nomVal) / Math.abs(nomVal)) * 100 : 0;

          entries.push({ parameter: iKey, nominal, perturbation_pct: pct, output_name: oKey, output_change_pct: changePctHigh });
          entries.push({ parameter: iKey, nominal, perturbation_pct: -pct, output_name: oKey, output_change_pct: changePctLow });

          influenceAccum[iKey] += Math.abs(changePctHigh) + Math.abs(changePctLow);

          // Tornado: use the largest perturbation
          if (pct === Math.max(...pcts)) {
            const tKey = `${iKey}::${oKey}`;
            tornadoMap[tKey] = tornadoMap[tKey] || {};
            tornadoMap[tKey][oKey] = { low: changePctLow, high: changePctHigh };
          }
        }
      }
    }

    const ranking = Object.entries(influenceAccum)
      .map(([parameter, total_influence]) => ({ parameter, total_influence }))
      .sort((a, b) => b.total_influence - a.total_influence);

    // Build tornado bars from max perturbation
    const maxPct = Math.max(...pcts);
    const tornado: TornadoBar[] = [];
    for (const iKey of inKeys) {
      for (const oKey of outKeys) {
        const nominal = params.nominal_inputs[iKey];
        const delta = nominal * maxPct / 100;
        const outHigh = params.engine_fn({ ...params.nominal_inputs, [iKey]: nominal + delta });
        const outLow = params.engine_fn({ ...params.nominal_inputs, [iKey]: nominal - delta });
        const nomVal = nominalOut[oKey];
        const highPct = nomVal !== 0 ? ((outHigh[oKey] - nomVal) / Math.abs(nomVal)) * 100 : 0;
        const lowPct = nomVal !== 0 ? ((outLow[oKey] - nomVal) / Math.abs(nomVal)) * 100 : 0;
        tornado.push({
          parameter: iKey,
          output_name: oKey,
          low_pct: lowPct,
          high_pct: highPct,
          range_pct: Math.abs(highPct - lowPct),
        });
      }
    }
    tornado.sort((a, b) => b.range_pct - a.range_pct);

    return {
      value: { entries, ranking, tornado },
      unit: "sensitivity_result",
      formula: `OAT(perturbations=[${pcts.join(",")}]%)`,
      confidence: 1.0,
    };
  }

  /**
   * Chain multiple engines with Monte Carlo uncertainty propagation.
   * Outputs of stage N feed inputs of stage N+1 via input_mapping.
   * Returns per-stage distributions and variance contribution decomposition.
   */
  propagateChain(params: ChainInput): AtomicValue<ChainResult> {
    const n = params.n_samples ?? 5000;
    const rng = this._seededRandom(params.seed ?? Date.now());
    const distKeys = Object.keys(params.input_distributions);

    // Draw input samples
    const inputSamples = this._latinHypercubeSample(params.input_distributions, n, rng);

    // Run all samples through the chain
    const stageOutputSamples: Record<string, number[]>[] = params.stages.map(() => ({}));
    const allFinalSamples: Record<string, number[]> = {};

    for (let s = 0; s < n; s++) {
      let currentValues: Record<string, number> = { ...params.initial_inputs };
      // Set stochastic input values
      for (const key of distKeys) {
        currentValues[key] = inputSamples[key][s];
      }

      for (let si = 0; si < params.stages.length; si++) {
        const stage = params.stages[si];
        const stageInput: Record<string, number> = { ...(stage.fixed_inputs || {}) };

        // Map from current values using input_mapping
        if (stage.input_mapping) {
          for (const [stageKey, sourceKey] of Object.entries(stage.input_mapping)) {
            if (currentValues[sourceKey] !== undefined) {
              stageInput[stageKey] = currentValues[sourceKey];
            }
          }
        }

        // Also pass through any current values not explicitly mapped
        for (const [k, v] of Object.entries(currentValues)) {
          if (stageInput[k] === undefined) stageInput[k] = v;
        }

        const result = stage.engine_fn(stageInput);

        // Collect stage output samples
        for (const oKey of Object.keys(result)) {
          if (!stageOutputSamples[si][oKey]) stageOutputSamples[si][oKey] = [];
          stageOutputSamples[si][oKey].push(result[oKey]);
        }

        // Update current values with stage outputs
        currentValues = { ...currentValues, ...result };

        // Final stage: collect
        if (si === params.stages.length - 1) {
          for (const oKey of Object.keys(result)) {
            if (!allFinalSamples[oKey]) allFinalSamples[oKey] = [];
            allFinalSamples[oKey].push(result[oKey]);
          }
        }
      }
    }

    // Compute per-stage statistics
    const stageResults: ChainStageResult[] = [];
    for (let si = 0; si < params.stages.length; si++) {
      // Get output keys by running once
      const testInput: Record<string, number> = { ...params.initial_inputs, ...(params.stages[si].fixed_inputs || {}) };
      for (const key of distKeys) testInput[key] = inputSamples[key][0];
      const testOut = params.stages[si].engine_fn(testInput);
      const oKeys = Object.keys(testOut);

      const outputs: Record<string, OutputStatistics> = {};
      for (const oKey of oKeys) {
        const samples = stageOutputSamples[si][oKey] || [];
        if (samples.length > 0) {
          outputs[oKey] = this._computeOutputStats(samples);
        }
      }

      stageResults.push({
        stage_index: si,
        outputs,
        variance_contribution_pct: {}, // filled below
      });
    }

    // Final output stats
    const finalOutputs: Record<string, OutputStatistics> = {};
    for (const [k, samples] of Object.entries(allFinalSamples)) {
      finalOutputs[k] = this._computeOutputStats(samples);
    }

    // Variance contribution: correlate each input with final outputs
    const finalKeys = Object.keys(finalOutputs);
    let dominantInput = { name: "", variance_contribution_pct: 0 };

    if (finalKeys.length > 0) {
      const firstFinalKey = finalKeys[0];
      const finalSamples = allFinalSamples[firstFinalKey];
      const finalVar = this._variance(finalSamples);

      for (const iKey of distKeys) {
        const corr = this._correlation(inputSamples[iKey], finalSamples);
        const contrib = corr * corr * 100;
        // Store contribution in first stage result
        if (stageResults.length > 0) {
          stageResults[0].variance_contribution_pct[iKey] = contrib;
        }
        if (contrib > dominantInput.variance_contribution_pct) {
          dominantInput = { name: iKey, variance_contribution_pct: contrib };
        }
      }
    }

    return {
      value: { stages: stageResults, final_outputs: finalOutputs, dominant_input: dominantInput },
      unit: "chain_result",
      formula: `ChainMC(stages=${params.stages.length}, N=${n})`,
      confidence: 0.95,
    };
  }

  /**
   * Fit candidate distributions to observed data using MLE / Method of Moments.
   * Returns ranked fits with Kolmogorov-Smirnov test statistic and p-value.
   */
  fitDistribution(data: number[]): AtomicValue<FitResult> {
    const sorted = [...data].sort((a, b) => a - b);
    const n = sorted.length;
    const mean = this._mean(sorted);
    const std = Math.sqrt(this._variance(sorted));
    const fits: DistributionFit[] = [];

    // Normal fit (MoM)
    {
      const ks = this._ksStatistic(sorted, (x) => this._normalCDF((x - mean) / (std || 1e-15)));
      fits.push({ type: "normal", params: [mean, std], ks_statistic: ks, p_value: this._ksApproxPValue(ks, n) });
    }

    // Lognormal fit (only if all values positive)
    if (sorted[0] > 0) {
      const logData = sorted.map(x => Math.log(x));
      const logMean = this._mean(logData);
      const logStd = Math.sqrt(this._variance(logData));
      const ks = this._ksStatistic(sorted, (x) => this._normalCDF((Math.log(x) - logMean) / (logStd || 1e-15)));
      fits.push({ type: "lognormal", params: [logMean, logStd], ks_statistic: ks, p_value: this._ksApproxPValue(ks, n) });
    }

    // Weibull fit (only positive data)
    if (sorted[0] > 0) {
      // MLE approximation using median-rank regression
      const { shape, scale } = this._weibullFit(sorted);
      const ks = this._ksStatistic(sorted, (x) => 1 - Math.exp(-Math.pow(x / scale, shape)));
      fits.push({ type: "weibull", params: [shape, scale], ks_statistic: ks, p_value: this._ksApproxPValue(ks, n) });
    }

    // Gamma fit (only positive data, MoM)
    if (sorted[0] > 0) {
      const alpha = mean * mean / (std * std || 1e-15);
      const beta = (std * std || 1e-15) / mean;
      const ks = this._ksStatistic(sorted, (x) => this._gammaCDF(x, alpha, beta));
      fits.push({ type: "gamma", params: [alpha, beta], ks_statistic: ks, p_value: this._ksApproxPValue(ks, n) });
    }

    // Uniform fit
    {
      const a = sorted[0];
      const b = sorted[n - 1];
      const ks = this._ksStatistic(sorted, (x) => (x - a) / ((b - a) || 1e-15));
      fits.push({ type: "uniform", params: [a, b], ks_statistic: ks, p_value: this._ksApproxPValue(ks, n) });
    }

    // Triangular fit (MoM)
    {
      const a = sorted[0];
      const b = sorted[n - 1];
      const mode = 3 * mean - a - b;
      const c = Math.max(a, Math.min(b, mode));
      const ks = this._ksStatistic(sorted, (x) => this._triangularCDF(x, a, c, b));
      fits.push({ type: "triangular", params: [a, c, b], ks_statistic: ks, p_value: this._ksApproxPValue(ks, n) });
    }

    fits.sort((a, b) => a.ks_statistic - b.ks_statistic);

    return {
      value: { fits, best: fits[0] },
      unit: "distribution_fit",
      formula: "KS goodness-of-fit",
      confidence: fits[0].p_value,
    };
  }

  /**
   * Generate a structured report from uncertainty analysis results.
   * Includes input/output summaries, sensitivity ranking, risk assessment,
   * and actionable recommendations.
   */
  generateReport(params: ReportInput): AtomicValue<Report> {
    const inputSummary = Object.entries(params.input_distributions).map(([name, dist]) => ({
      name,
      distribution: dist.type,
      params: dist.params,
    }));

    const outputSummary = Object.entries(params.outputs).map(([name, stats]) => ({
      name,
      mean: stats.mean,
      std_dev: stats.std_dev,
      cv_pct: stats.cv_percent,
      ci_95: stats.ci_95,
    }));

    // Risk assessment
    let riskAssessment: { output: string; limit: number; p_exceed: number }[] | undefined;
    if (params.limits) {
      riskAssessment = [];
      for (const [oKey, limit] of Object.entries(params.limits)) {
        const stats = params.outputs[oKey];
        if (stats) {
          // Approximate P(exceed) from normal assumption
          const z = (limit - stats.mean) / (stats.std_dev || 1e-15);
          const pExceed = 1 - this._normalCDF(z);
          riskAssessment.push({ output: oKey, limit, p_exceed: pExceed });
        }
      }
    }

    // Recommendations
    const recommendations: string[] = [];
    for (const [name, stats] of Object.entries(params.outputs)) {
      if (stats.cv_percent > 20) {
        recommendations.push(`Output '${name}' has high variability (CV=${stats.cv_percent.toFixed(1)}%). Consider tightening input tolerances.`);
      }
      if (stats.cv_percent < 1) {
        recommendations.push(`Output '${name}' is very stable (CV=${stats.cv_percent.toFixed(2)}%). Current input control is adequate.`);
      }
    }

    if (params.sensitivity) {
      const top = params.sensitivity.ranking[0];
      if (top) {
        recommendations.push(`Parameter '${top.parameter}' is the dominant source of variation. Prioritize its control for maximum variance reduction.`);
      }
    }

    if (riskAssessment) {
      for (const ra of riskAssessment) {
        if (ra.p_exceed > 0.05) {
          recommendations.push(`Risk: ${(ra.p_exceed * 100).toFixed(1)}% probability of '${ra.output}' exceeding limit ${ra.limit}. Consider process adjustment.`);
        }
      }
    }

    if (recommendations.length === 0) {
      recommendations.push("Process uncertainty is within acceptable bounds. No immediate action needed.");
    }

    return {
      value: {
        input_summary: inputSummary,
        output_summary: outputSummary,
        sensitivity_ranking: params.sensitivity?.ranking,
        risk_assessment: riskAssessment,
        recommendations,
      },
      unit: "report",
      formula: "UQ Report",
      confidence: 0.95,
    };
  }

  // ── Private: Sampling ───────────────────────────────────────────

  /** Mulberry32 — 32-bit seeded PRNG returning [0, 1) */
  private _seededRandom(seed: number): () => number {
    let s = seed | 0;
    return () => {
      s = (s + 0x6D2B79F5) | 0;
      let t = Math.imul(s ^ (s >>> 15), 1 | s);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /** Box-Muller transform for normal samples */
  private _sampleNormal(mean: number, std: number, n: number, rng: () => number): number[] {
    const out: number[] = [];
    for (let i = 0; i < n; i += 2) {
      const u1 = rng() || 1e-15;
      const u2 = rng();
      const r = Math.sqrt(-2 * Math.log(u1));
      const theta = 2 * Math.PI * u2;
      out.push(mean + std * r * Math.cos(theta));
      if (i + 1 < n) out.push(mean + std * r * Math.sin(theta));
    }
    return out.slice(0, n);
  }

  private _sampleLognormal(mu: number, sigma: number, n: number, rng: () => number): number[] {
    return this._sampleNormal(mu, sigma, n, rng).map(x => Math.exp(x));
  }

  private _sampleUniform(min: number, max: number, n: number, rng: () => number): number[] {
    return Array.from({ length: n }, () => min + rng() * (max - min));
  }

  private _sampleTriangular(min: number, mode: number, max: number, n: number, rng: () => number): number[] {
    const fc = (mode - min) / ((max - min) || 1e-15);
    return Array.from({ length: n }, () => {
      const u = rng();
      if (u < fc) {
        return min + Math.sqrt(u * (max - min) * (mode - min));
      } else {
        return max - Math.sqrt((1 - u) * (max - min) * (max - mode));
      }
    });
  }

  private _sampleWeibull(shape: number, scale: number, n: number, rng: () => number): number[] {
    return Array.from({ length: n }, () => {
      const u = rng() || 1e-15;
      return scale * Math.pow(-Math.log(u), 1 / shape);
    });
  }

  /** Draw samples from a single InputDistribution */
  private _sampleDist(dist: InputDistribution, n: number, rng: () => number): number[] {
    switch (dist.type) {
      case "normal": return this._sampleNormal(dist.params[0], dist.params[1], n, rng);
      case "uniform": return this._sampleUniform(dist.params[0], dist.params[1], n, rng);
      case "lognormal": return this._sampleLognormal(dist.params[0], dist.params[1], n, rng);
      case "triangular": return this._sampleTriangular(dist.params[0], dist.params[1], dist.params[2], n, rng);
      case "weibull": return this._sampleWeibull(dist.params[0], dist.params[1], n, rng);
      default: return this._sampleNormal(dist.params[0], dist.params[1], n, rng);
    }
  }

  /** Random (iid) sampling from all distributions */
  private _randomSample(dists: Record<string, InputDistribution>, n: number, rng: () => number): Record<string, number[]> {
    const out: Record<string, number[]> = {};
    for (const [key, dist] of Object.entries(dists)) {
      out[key] = this._sampleDist(dist, n, rng);
    }
    return out;
  }

  /** Latin Hypercube Sampling — stratified sampling for better coverage */
  private _latinHypercubeSample(dists: Record<string, InputDistribution>, n: number, rng: () => number): Record<string, number[]> {
    const out: Record<string, number[]> = {};
    for (const [key, dist] of Object.entries(dists)) {
      // Create stratified uniform samples in [0,1]
      const strata: number[] = [];
      for (let i = 0; i < n; i++) {
        strata.push((i + rng()) / n);
      }
      // Shuffle
      for (let i = n - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        [strata[i], strata[j]] = [strata[j], strata[i]];
      }
      // Inverse CDF transform
      out[key] = strata.map(u => this._inverseCDF(dist, u));
    }
    return out;
  }

  /** Sobol-like quasi-Monte Carlo using Van der Corput sequence */
  private _sobolSample(dists: Record<string, InputDistribution>, n: number, rng: () => number): Record<string, number[]> {
    const keys = Object.keys(dists);
    const out: Record<string, number[]> = {};
    for (let d = 0; d < keys.length; d++) {
      const base = this._primes[d % this._primes.length];
      const seq: number[] = [];
      for (let i = 1; i <= n; i++) {
        seq.push(this._vanDerCorput(i, base));
      }
      out[keys[d]] = seq.map(u => this._inverseCDF(dists[keys[d]], u));
    }
    return out;
  }

  private readonly _primes = [2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47];

  /** Van der Corput sequence in given base */
  private _vanDerCorput(index: number, base: number): number {
    let result = 0;
    let denom = 1;
    let n = index;
    while (n > 0) {
      denom *= base;
      result += (n % base) / denom;
      n = Math.floor(n / base);
    }
    return result;
  }

  /** Inverse CDF for distribution types */
  private _inverseCDF(dist: InputDistribution, u: number): number {
    const clampU = Math.max(1e-10, Math.min(1 - 1e-10, u));
    switch (dist.type) {
      case "normal":
        return dist.params[0] + dist.params[1] * this._probit(clampU);
      case "uniform":
        return dist.params[0] + clampU * (dist.params[1] - dist.params[0]);
      case "lognormal":
        return Math.exp(dist.params[0] + dist.params[1] * this._probit(clampU));
      case "triangular": {
        const [a, c, b] = dist.params;
        const fc = (c - a) / ((b - a) || 1e-15);
        if (clampU < fc) {
          return a + Math.sqrt(clampU * (b - a) * (c - a));
        } else {
          return b - Math.sqrt((1 - clampU) * (b - a) * (b - c));
        }
      }
      case "weibull": {
        const [shape, scale] = dist.params;
        return scale * Math.pow(-Math.log(1 - clampU), 1 / shape);
      }
      default:
        return dist.params[0] + dist.params[1] * this._probit(clampU);
    }
  }

  /** Rational approximation of the probit (inverse normal CDF) — Abramowitz & Stegun */
  private _probit(p: number): number {
    if (p <= 0) return -Infinity;
    if (p >= 1) return Infinity;
    if (p === 0.5) return 0;
    const sign = p < 0.5 ? -1 : 1;
    const pp = p < 0.5 ? p : 1 - p;
    const t = Math.sqrt(-2 * Math.log(pp));
    const c0 = 2.515517, c1 = 0.802853, c2 = 0.010328;
    const d1 = 1.432788, d2 = 0.189269, d3 = 0.001308;
    return sign * (t - (c0 + c1 * t + c2 * t * t) / (1 + d1 * t + d2 * t * t + d3 * t * t * t));
  }

  // ── Private: Statistics ─────────────────────────────────────────

  private _mean(data: number[]): number {
    return data.reduce((s, v) => s + v, 0) / data.length;
  }

  private _variance(data: number[]): number {
    const m = this._mean(data);
    return data.reduce((s, v) => s + (v - m) ** 2, 0) / (data.length - 1 || 1);
  }

  private _percentile(sorted: number[], p: number): number {
    const idx = (p / 100) * (sorted.length - 1);
    const lo = Math.floor(idx);
    const hi = Math.ceil(idx);
    if (lo === hi) return sorted[lo];
    return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
  }

  private _correlation(x: number[], y: number[]): number {
    const n = x.length;
    const mx = this._mean(x);
    const my = this._mean(y);
    let cov = 0, sx2 = 0, sy2 = 0;
    for (let i = 0; i < n; i++) {
      const dx = x[i] - mx;
      const dy = y[i] - my;
      cov += dx * dy;
      sx2 += dx * dx;
      sy2 += dy * dy;
    }
    const denom = Math.sqrt(sx2 * sy2);
    return denom > 0 ? cov / denom : 0;
  }

  /** Compute full output statistics from samples */
  private _computeOutputStats(samples: number[]): OutputStatistics {
    const n = samples.length;
    if (n === 0) {
      return {
        mean: 0, std_dev: 0, cv_percent: 0,
        ci_95: [0, 0], ci_99: [0, 0],
        p5: 0, p25: 0, p50: 0, p75: 0, p95: 0,
        histogram: { bins: [], counts: [] },
        distribution_fit: { type: "degenerate", params: [0], ks_statistic: 0 },
      };
    }

    const mean = this._mean(samples);
    const variance = n > 1 ? this._variance(samples) : 0;
    const std = Math.sqrt(variance);
    const cv = mean !== 0 ? (std / Math.abs(mean)) * 100 : 0;

    const sorted = [...samples].sort((a, b) => a - b);

    const ci95: [number, number] = [this._percentile(sorted, 2.5), this._percentile(sorted, 97.5)];
    const ci99: [number, number] = [this._percentile(sorted, 0.5), this._percentile(sorted, 99.5)];

    // Histogram (Sturges' rule for bin count)
    const nBins = Math.max(1, Math.ceil(Math.log2(n) + 1));
    const minV = sorted[0];
    const maxV = sorted[n - 1];
    const binWidth = (maxV - minV) / nBins || 1;
    const bins: number[] = [];
    const counts: number[] = new Array(nBins).fill(0);
    for (let i = 0; i < nBins; i++) {
      bins.push(minV + binWidth * (i + 0.5));
    }
    for (const v of sorted) {
      let idx = Math.floor((v - minV) / binWidth);
      if (idx >= nBins) idx = nBins - 1;
      counts[idx]++;
    }

    // Quick distribution fit (best of normal/lognormal)
    const fitResult = n >= 5 ? this.fitDistribution(samples).value.best : { type: "normal", params: [mean, std], ks_statistic: 0, p_value: 1 };

    return {
      mean, std_dev: std, cv_percent: cv,
      ci_95: ci95, ci_99: ci99,
      p5: this._percentile(sorted, 5),
      p25: this._percentile(sorted, 25),
      p50: this._percentile(sorted, 50),
      p75: this._percentile(sorted, 75),
      p95: this._percentile(sorted, 95),
      histogram: { bins, counts },
      distribution_fit: { type: fitResult.type, params: fitResult.params, ks_statistic: fitResult.ks_statistic },
    };
  }

  /** Standard normal CDF via Abramowitz & Stegun approximation */
  private _normalCDF(x: number): number {
    if (x < -8) return 0;
    if (x > 8) return 1;
    const sign = x < 0 ? -1 : 1;
    const t = 1 / (1 + 0.2316419 * Math.abs(x));
    const d = 0.3989422804014327; // 1/sqrt(2*pi)
    const poly = t * (0.319381530 + t * (-0.356563782 + t * (1.781477937 + t * (-1.821255978 + t * 1.330274429))));
    return 0.5 + sign * (0.5 - d * Math.exp(-x * x / 2) * poly);
  }

  /** KS statistic: max |F_emp(x) - F_theo(x)| */
  private _ksStatistic(sorted: number[], cdf: (x: number) => number): number {
    const n = sorted.length;
    let maxD = 0;
    for (let i = 0; i < n; i++) {
      const fTheo = cdf(sorted[i]);
      const fEmpAbove = (i + 1) / n;
      const fEmpBelow = i / n;
      maxD = Math.max(maxD, Math.abs(fEmpAbove - fTheo), Math.abs(fEmpBelow - fTheo));
    }
    return maxD;
  }

  /** Approximate KS p-value (Marsaglia et al., 2003) */
  private _ksApproxPValue(d: number, n: number): number {
    const sqrtN = Math.sqrt(n);
    const lambda = (sqrtN + 0.12 + 0.11 / sqrtN) * d;
    if (lambda < 0.4) return 1.0;
    const exp = Math.exp(-2 * lambda * lambda);
    return Math.max(0, Math.min(1, 2 * exp));
  }

  /** Regularized incomplete gamma function (series expansion) for gamma CDF */
  private _gammaCDF(x: number, alpha: number, beta: number): number {
    if (x <= 0) return 0;
    const z = x / beta;
    // Series expansion of regularized lower incomplete gamma
    let sum = 0;
    let term = 1 / alpha;
    sum = term;
    for (let n = 1; n < 200; n++) {
      term *= z / (alpha + n);
      sum += term;
      if (Math.abs(term) < 1e-12 * Math.abs(sum)) break;
    }
    const logGamma = this._logGamma(alpha);
    return Math.min(1, sum * Math.exp(-z + alpha * Math.log(z) - logGamma));
  }

  /** Stirling's log-gamma approximation */
  private _logGamma(x: number): number {
    if (x <= 0) return 0;
    // Lanczos approximation
    const g = 7;
    const c = [
      0.99999999999980993, 676.5203681218851, -1259.1392167224028,
      771.32342877765313, -176.61502916214059, 12.507343278686905,
      -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7,
    ];
    let sum = c[0];
    for (let i = 1; i < g + 2; i++) {
      sum += c[i] / (x + i - 1);
    }
    const t = x + g - 0.5;
    return 0.5 * Math.log(2 * Math.PI) + (x - 0.5) * Math.log(t) - t + Math.log(sum);
  }

  /** Triangular CDF */
  private _triangularCDF(x: number, a: number, c: number, b: number): number {
    if (x <= a) return 0;
    if (x >= b) return 1;
    if (x <= c) return ((x - a) ** 2) / ((b - a) * (c - a) || 1e-15);
    return 1 - ((b - x) ** 2) / ((b - a) * (b - c) || 1e-15);
  }

  /** Weibull parameter estimation via median rank regression */
  private _weibullFit(sorted: number[]): { shape: number; scale: number } {
    const n = sorted.length;
    const x: number[] = [];
    const y: number[] = [];
    for (let i = 0; i < n; i++) {
      const medianRank = (i + 0.3) / (n + 0.4);
      if (sorted[i] > 0 && medianRank > 0 && medianRank < 1) {
        x.push(Math.log(sorted[i]));
        y.push(Math.log(-Math.log(1 - medianRank)));
      }
    }
    if (x.length < 2) return { shape: 1, scale: this._mean(sorted) };
    // Linear regression y = shape * x - shape * ln(scale)
    const mx = this._mean(x);
    const my = this._mean(y);
    let num = 0, den = 0;
    for (let i = 0; i < x.length; i++) {
      num += (x[i] - mx) * (y[i] - my);
      den += (x[i] - mx) ** 2;
    }
    const shape = Math.max(0.1, den > 0 ? num / den : 1);
    const scale = Math.exp(mx - my / shape);
    return { shape, scale: Math.max(1e-10, scale) };
  }

  /** Distribution mean */
  private _distMean(dist: InputDistribution): number {
    switch (dist.type) {
      case "normal": return dist.params[0];
      case "uniform": return (dist.params[0] + dist.params[1]) / 2;
      case "lognormal": return Math.exp(dist.params[0] + dist.params[1] ** 2 / 2);
      case "triangular": return (dist.params[0] + dist.params[1] + dist.params[2]) / 3;
      case "weibull": {
        const [k, lam] = dist.params;
        // Γ(1 + 1/k) * λ — approximate
        return lam * Math.exp(this._logGamma(1 + 1 / k));
      }
      default: return dist.params[0];
    }
  }

  /** Distribution standard deviation */
  private _distStdDev(dist: InputDistribution): number {
    switch (dist.type) {
      case "normal": return dist.params[1];
      case "uniform": return (dist.params[1] - dist.params[0]) / Math.sqrt(12);
      case "lognormal": {
        const [mu, sig] = dist.params;
        return Math.sqrt((Math.exp(sig ** 2) - 1) * Math.exp(2 * mu + sig ** 2));
      }
      case "triangular": {
        const [a, c, b] = dist.params;
        return Math.sqrt((a * a + b * b + c * c - a * b - a * c - b * c) / 18);
      }
      case "weibull": {
        const [k, lam] = dist.params;
        const g1 = Math.exp(this._logGamma(1 + 1 / k));
        const g2 = Math.exp(this._logGamma(1 + 2 / k));
        return lam * Math.sqrt(g2 - g1 * g1);
      }
      default: return dist.params[1] ?? 0;
    }
  }

  // ── Private: PCE helpers ────────────────────────────────────────

  /** Generate multi-index set with total order <= maxOrder for nDim dimensions */
  private _generateMultiIndices(nDim: number, maxOrder: number): number[][] {
    const indices: number[][] = [];
    const current = new Array(nDim).fill(0);

    const generate = (dim: number, remaining: number) => {
      if (dim === nDim) {
        indices.push([...current]);
        return;
      }
      for (let i = 0; i <= remaining; i++) {
        current[dim] = i;
        generate(dim + 1, remaining - i);
      }
    };
    generate(0, maxOrder);
    return indices;
  }

  /** Binomial coefficient C(n, k) */
  private _binomial(n: number, k: number): number {
    if (k < 0 || k > n) return 0;
    if (k === 0 || k === n) return 1;
    let result = 1;
    for (let i = 0; i < Math.min(k, n - k); i++) {
      result = result * (n - i) / (i + 1);
    }
    return Math.round(result);
  }

  /** Normalized probabilist's Hermite polynomial He_n(x) / sqrt(n!) */
  private _hermiteNorm(n: number, x: number): number {
    if (n === 0) return 1;
    if (n === 1) return x;
    let h0 = 1, h1 = x;
    for (let k = 2; k <= n; k++) {
      const h2 = x * h1 - (k - 1) * h0;
      h0 = h1;
      h1 = h2;
    }
    // Normalize by 1/sqrt(n!)
    let nFact = 1;
    for (let k = 2; k <= n; k++) nFact *= k;
    return h1 / Math.sqrt(nFact);
  }

  /**
   * Solve least squares Ax=b via SVD (numerically stable for high-order PCE).
   * Replaces ad-hoc normal equations + Gaussian elimination with SVDEngine.
   * @milestone SCIMATH-WIRE-MS0 P6-U01
   */
  private _leastSquares(A: number[][], b: number[]): number[] {
    return SVDEngine.leastSquares(A, b).x;
  }
}

export const stochasticWrapperEngine = new StochasticWrapperEngine();
