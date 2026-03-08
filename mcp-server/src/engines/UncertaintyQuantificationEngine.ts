/**
 * UncertaintyQuantificationEngine
 *
 * Prediction confidence bounds via Monte Carlo propagation and Sobol
 * sensitivity analysis (Saltelli sampling scheme).
 *
 * Capabilities:
 * - Monte Carlo uncertainty propagation across arbitrary models
 * - First-order (Si) and total-order (STi) Sobol sensitivity indices
 * - Prediction intervals at configurable confidence levels
 * - Model-form uncertainty (systematic bias from simplified physics)
 */

// ── Interfaces ──────────────────────────────────────────────────────

export interface UncertaintyParameter {
  name: string;
  nominal: number;
  distribution: 'normal' | 'uniform' | 'triangular' | 'lognormal';
  std?: number;
  min?: number;
  max?: number;
  mode?: number;
  unit: string;
}

export interface UncertaintyInput {
  parameters: UncertaintyParameter[];
  model: (params: Record<string, number>) => Record<string, number>;
  n_samples?: number;
  confidence_level?: number;
  compute_sobol?: boolean;
  model_bias_pct?: number;
  output_names?: string[];
}

export interface SobolIndex {
  parameter: string;
  first_order: number;
  total_order: number;
  interaction: number;
}

export interface OutputUncertainty {
  name: string;
  mean: number;
  std: number;
  cv_pct: number;
  percentile_5: number;
  percentile_25: number;
  median: number;
  percentile_75: number;
  percentile_95: number;
  prediction_interval: [number, number];
  model_form_uncertainty: number;
  total_uncertainty: number;
}

export interface UncertaintyResult {
  outputs: OutputUncertainty[];
  sobol_indices: SobolIndex[];
  most_influential_parameter: string;
  n_samples_actual: number;
  convergence_achieved: boolean;
  warnings: string[];
  formula: string;
}

// ── Engine ──────────────────────────────────────────────────────────

export class UncertaintyQuantificationEngine {
  private readonly DEFAULT_N = 1000;
  private readonly DEFAULT_CONFIDENCE = 0.95;
  private readonly DEFAULT_BIAS_PCT = 5;
  private readonly CONVERGENCE_THRESHOLD = 0.02; // 2% relative change

  /**
   * Sample a single value from a parameter's distribution.
   * Uses Box-Muller for normal/lognormal, inverse CDF for triangular.
   */
  sampleDistribution(param: UncertaintyParameter): number {
    switch (param.distribution) {
      case 'normal': {
        const std = param.std ?? param.nominal * 0.05;
        return param.nominal + std * this.boxMullerSample();
      }
      case 'lognormal': {
        const mu = Math.log(Math.max(param.nominal, 1e-15));
        const sigma = param.std ?? 0.1;
        return Math.exp(mu + sigma * this.boxMullerSample());
      }
      case 'uniform': {
        const lo = param.min ?? param.nominal * 0.9;
        const hi = param.max ?? param.nominal * 1.1;
        return lo + (hi - lo) * Math.random();
      }
      case 'triangular': {
        const a = param.min ?? param.nominal * 0.8;
        const b = param.max ?? param.nominal * 1.2;
        const c = param.mode ?? param.nominal;
        return this.triangularSample(a, b, c);
      }
      default:
        return param.nominal;
    }
  }

  /**
   * Generate N Monte Carlo sample sets for the given parameters.
   */
  monteCarloSample(
    params: UncertaintyParameter[],
    n: number
  ): Array<Record<string, number>> {
    const samples: Array<Record<string, number>> = [];
    for (let i = 0; i < n; i++) {
      const record: Record<string, number> = {};
      for (const p of params) {
        record[p.name] = this.sampleDistribution(p);
      }
      samples.push(record);
    }
    return samples;
  }

  /**
   * Compute Sobol first-order and total-order sensitivity indices
   * using Saltelli's sampling scheme.
   */
  sobolIndices(
    params: UncertaintyParameter[],
    model: (p: Record<string, number>) => Record<string, number>,
    n: number,
    outputName: string
  ): SobolIndex[] {
    const k = params.length;
    if (k === 0) return [];

    // Generate base matrices A and B (each N×k)
    const matA = this.generateMatrix(params, n);
    const matB = this.generateMatrix(params, n);

    // Evaluate model on A and B
    const yA = matA.map((row) => model(row)[outputName] ?? 0);
    const yB = matB.map((row) => model(row)[outputName] ?? 0);

    const meanA = this.mean(yA);
    const varA = this.variance(yA, meanA);
    if (varA < 1e-30) {
      return params.map((p) => ({
        parameter: p.name,
        first_order: 0,
        total_order: 0,
        interaction: 0,
      }));
    }

    const indices: SobolIndex[] = [];

    for (let i = 0; i < k; i++) {
      // AB_i = A with column i replaced by B's column i
      const matABi = matA.map((rowA, r) => {
        const mixed: Record<string, number> = { ...rowA };
        mixed[params[i].name] = matB[r][params[i].name];
        return mixed;
      });
      const yABi = matABi.map((row) => model(row)[outputName] ?? 0);

      // First-order (Jansen 1999): Si = 1 - (1/2N) * sum((yB - yABi)^2) / var(yA)
      // More numerically stable than the Saltelli covariance estimator
      let siNum = 0;
      for (let j = 0; j < n; j++) {
        siNum += (yB[j] - yABi[j]) ** 2;
      }
      const si = Math.max(0, Math.min(1, 1 - siNum / (2 * n * varA)));

      // Total-order: STi = (1/2N) * sum((yA - yABi)^2) / var(yA)
      let stiNum = 0;
      for (let j = 0; j < n; j++) {
        stiNum += (yA[j] - yABi[j]) ** 2;
      }
      const sti = Math.max(0, Math.min(1, stiNum / (2 * n * varA)));

      indices.push({
        parameter: params[i].name,
        first_order: this.round6(si),
        total_order: this.round6(Math.max(sti, si)),
        interaction: this.round6(Math.max(0, Math.max(sti, si) - si)),
      });
    }

    return indices;
  }

  /**
   * Main method — run full uncertainty quantification.
   */
  quantify(input: UncertaintyInput): UncertaintyResult {
    const n = input.n_samples ?? this.DEFAULT_N;
    const confidence = input.confidence_level ?? this.DEFAULT_CONFIDENCE;
    const biasPct = input.model_bias_pct ?? this.DEFAULT_BIAS_PCT;
    const computeSobol = input.compute_sobol ?? true;
    const warnings: string[] = [];

    if (input.parameters.length === 0) {
      warnings.push('No input parameters provided');
      return this.emptyResult(warnings);
    }
    if (n < 64) {
      warnings.push('Sample count below 64 — results may be unreliable');
    }

    // Monte Carlo propagation
    const samples = this.monteCarloSample(input.parameters, n);
    const results = samples.map((s) => input.model(s));

    // Determine output names
    const outputNames =
      input.output_names && input.output_names.length > 0
        ? input.output_names
        : results.length > 0
          ? Object.keys(results[0])
          : [];

    if (outputNames.length === 0) {
      warnings.push('Model returned no outputs');
      return this.emptyResult(warnings);
    }

    // Analyze each output
    const outputs: OutputUncertainty[] = outputNames.map((name) => {
      const values = results.map((r) => r[name] ?? 0).sort((a, b) => a - b);
      return this.analyzeOutput(name, values, confidence, biasPct);
    });

    // Convergence check: split-half comparison
    const halfN = Math.floor(n / 2);
    const samplesHalf = this.monteCarloSample(input.parameters, halfN);
    const resultsHalf = samplesHalf.map((s) => input.model(s));
    let convergenceAchieved = true;
    for (const name of outputNames) {
      const fullMean = outputs.find((o) => o.name === name)?.mean ?? 0;
      const halfValues = resultsHalf.map((r) => r[name] ?? 0);
      const halfMean = this.mean(halfValues);
      const denom = Math.abs(fullMean) || 1;
      if (Math.abs(fullMean - halfMean) / denom > this.CONVERGENCE_THRESHOLD) {
        convergenceAchieved = false;
        warnings.push(
          `Output "${name}" may not have converged — consider increasing n_samples`
        );
      }
    }

    // Sobol indices (use first output for "most influential")
    let sobolIndices: SobolIndex[] = [];
    if (computeSobol && input.parameters.length >= 2) {
      const sobolN = Math.min(n, 512); // cap Sobol samples for performance
      sobolIndices = this.sobolIndices(
        input.parameters,
        input.model,
        sobolN,
        outputNames[0]
      );
    } else if (computeSobol && input.parameters.length === 1) {
      sobolIndices = [
        {
          parameter: input.parameters[0].name,
          first_order: 1,
          total_order: 1,
          interaction: 0,
        },
      ];
    }

    const mostInfluential =
      sobolIndices.length > 0
        ? sobolIndices.reduce((best, cur) =>
            cur.total_order > best.total_order ? cur : best
          ).parameter
        : input.parameters[0].name;

    const alpha = 1 - confidence;
    const formula =
      `MC propagation: N=${n} samples, ` +
      `PI=[${this.round2(alpha / 2 * 100)}th, ${this.round2((1 - alpha / 2) * 100)}th], ` +
      `Sobol (Saltelli): Si=Cov(Y_B,Y_ABi)/Var(Y_A), ` +
      `STi=E[(Y_A-Y_ABi)²]/(2·Var(Y_A)), ` +
      `total_unc=√(σ² + (bias·μ)²)`;

    return {
      outputs,
      sobol_indices: sobolIndices,
      most_influential_parameter: mostInfluential,
      n_samples_actual: n,
      convergence_achieved: convergenceAchieved,
      warnings,
      formula,
    };
  }

  // ── Private helpers ─────────────────────────────────────────────

  private analyzeOutput(
    name: string,
    sorted: number[],
    confidence: number,
    biasPct: number
  ): OutputUncertainty {
    const n = sorted.length;
    const m = this.mean(sorted);
    const s = Math.sqrt(this.variance(sorted, m));
    const cv = m !== 0 ? (s / Math.abs(m)) * 100 : 0;

    const alpha = 1 - confidence;
    const lo = this.percentile(sorted, alpha / 2);
    const hi = this.percentile(sorted, 1 - alpha / 2);

    const modelFormUnc = Math.abs(m) * (biasPct / 100);
    const totalUnc = Math.sqrt(s * s + modelFormUnc * modelFormUnc);

    return {
      name,
      mean: this.round6(m),
      std: this.round6(s),
      cv_pct: this.round2(cv),
      percentile_5: this.round6(this.percentile(sorted, 0.05)),
      percentile_25: this.round6(this.percentile(sorted, 0.25)),
      median: this.round6(this.percentile(sorted, 0.5)),
      percentile_75: this.round6(this.percentile(sorted, 0.75)),
      percentile_95: this.round6(this.percentile(sorted, 0.95)),
      prediction_interval: [this.round6(lo), this.round6(hi)],
      model_form_uncertainty: this.round6(modelFormUnc),
      total_uncertainty: this.round6(totalUnc),
    };
  }

  private generateMatrix(
    params: UncertaintyParameter[],
    n: number
  ): Array<Record<string, number>> {
    return this.monteCarloSample(params, n);
  }

  private boxMullerSample(): number {
    let u1 = 0;
    let u2 = 0;
    while (u1 === 0) u1 = Math.random();
    while (u2 === 0) u2 = Math.random();
    return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  }

  private triangularSample(a: number, b: number, c: number): number {
    const u = Math.random();
    const fc = (c - a) / (b - a);
    if (u < fc) {
      return a + Math.sqrt(u * (b - a) * (c - a));
    }
    return b - Math.sqrt((1 - u) * (b - a) * (b - c));
  }

  private mean(arr: number[]): number {
    if (arr.length === 0) return 0;
    let sum = 0;
    for (const v of arr) sum += v;
    return sum / arr.length;
  }

  private variance(arr: number[], m: number): number {
    if (arr.length < 2) return 0;
    let sum = 0;
    for (const v of arr) sum += (v - m) ** 2;
    return sum / (arr.length - 1);
  }

  private percentile(sorted: number[], p: number): number {
    if (sorted.length === 0) return 0;
    const idx = p * (sorted.length - 1);
    const lo = Math.floor(idx);
    const hi = Math.ceil(idx);
    if (lo === hi) return sorted[lo];
    const frac = idx - lo;
    return sorted[lo] * (1 - frac) + sorted[hi] * frac;
  }

  private round6(v: number): number {
    return Math.round(v * 1e6) / 1e6;
  }

  private round2(v: number): number {
    return Math.round(v * 100) / 100;
  }

  private emptyResult(warnings: string[]): UncertaintyResult {
    return {
      outputs: [],
      sobol_indices: [],
      most_influential_parameter: '',
      n_samples_actual: 0,
      convergence_achieved: false,
      warnings,
      formula: 'N/A — no valid inputs',
    };
  }
}

export const uncertaintyQuantificationEngine =
  new UncertaintyQuantificationEngine();
