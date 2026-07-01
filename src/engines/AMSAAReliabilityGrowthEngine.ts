/**
 * PRISM MCP Server — AMSAA/Crow Reliability Growth Engine
 *
 * Implements the AMSAA (Army Materiel Systems Analysis Activity) / Crow
 * reliability growth model per MIL-HDBK-189 and IEC 61164.
 * Uses a Non-Homogeneous Poisson Process (NHPP) with power law intensity
 * to track manufacturing process improvement over time.
 *
 * @module AMSAAReliabilityGrowthEngine
 */

// ============================================================================
// TYPES
// ============================================================================

interface AtomicValue<T> { value: T; unit: string; formula?: string; confidence?: number; }

export interface AMSAAInput {
  failure_times: number[];
  total_time: number;
  grouped_data?: { interval_start: number; interval_end: number; failures: number }[];
  target_mtbf?: number;
  confidence_level?: number;
  projection_time?: number;
}

export interface AMSAAResult {
  lambda: AtomicValue<number>;
  beta: AtomicValue<number>;
  growth_trend: 'improving' | 'stable' | 'deteriorating';
  cumulative_mtbf: AtomicValue<number>;
  instantaneous_mtbf: AtomicValue<number>;
  goodness_of_fit: { cvm_statistic: number; p_value_approx: number; adequate: boolean };
  growth_curve: { time: number; cum_mtbf: number; inst_mtbf: number }[];
  projection?: { target_mtbf_time: number | null; expected_failures: number; mtbf_at_projection: number };
  confidence_bounds: { lower_beta: number; upper_beta: number; lower_mtbf: number; upper_mtbf: number };
  recommendations: string[];
}

// ============================================================================
// ENGINE
// ============================================================================

export class AMSAAReliabilityGrowthEngine {
  /**
   * Compute AMSAA/Crow reliability growth model from failure data.
   */
  compute(input: AMSAAInput): AMSAAResult {
    const { total_time, confidence_level = 0.9, projection_time, target_mtbf } = input;
    const times = this.resolveFailureTimes(input);
    if (times.length < 2) throw new Error('At least 2 failure events required for MLE estimation');
    if (total_time <= 0) throw new Error('total_time must be positive');

    const n = times.length;
    const T = total_time;

    // --- MLE estimation (Crow, 1975) ---
    const betaHat = this.estimateBeta(times, T, n);
    const lambdaHat = n / Math.pow(T, betaHat);

    // --- Growth trend classification ---
    const growth_trend: AMSAAResult['growth_trend'] =
      betaHat < 0.95 ? 'improving' : betaHat > 1.05 ? 'deteriorating' : 'stable';

    // --- MTBF calculations ---
    const cumMTBF = Math.pow(T, 1 - betaHat) / lambdaHat;
    const instMTBF = 1 / (lambdaHat * betaHat * Math.pow(T, betaHat - 1));

    // --- Cramer-von Mises goodness-of-fit ---
    const gof = this.cramerVonMises(times, T, betaHat);

    // --- Growth curve (20 points) ---
    const growth_curve = this.buildGrowthCurve(lambdaHat, betaHat, T, 20);

    // --- Confidence bounds via Fisher information ---
    const bounds = this.fisherConfidenceBounds(lambdaHat, betaHat, T, n, confidence_level);

    // --- Projection ---
    let projection: AMSAAResult['projection'] | undefined;
    if (projection_time !== undefined || target_mtbf !== undefined) {
      projection = this.computeProjection(lambdaHat, betaHat, T, projection_time, target_mtbf);
    }

    // --- Recommendations ---
    const recommendations = this.generateRecommendations(betaHat, gof, instMTBF, target_mtbf);

    return {
      lambda: { value: lambdaHat, unit: 'failures/hr^beta', formula: 'n / T^beta' },
      beta: { value: betaHat, unit: 'dimensionless', formula: 'n / sum(ln(T/ti))' },
      growth_trend,
      cumulative_mtbf: { value: cumMTBF, unit: 'hours', formula: 'T^(1-beta) / lambda' },
      instantaneous_mtbf: { value: instMTBF, unit: 'hours', formula: '1 / (lambda * beta * T^(beta-1))' },
      goodness_of_fit: gof,
      growth_curve,
      projection,
      confidence_bounds: bounds,
      recommendations,
    };
  }

  /** Resolve failure times from either explicit array or grouped interval data. */
  private resolveFailureTimes(input: AMSAAInput): number[] {
    if (input.failure_times.length > 0) {
      return [...input.failure_times].sort((a, b) => a - b);
    }
    if (input.grouped_data && input.grouped_data.length > 0) {
      const times: number[] = [];
      for (const g of input.grouped_data) {
        const span = g.interval_end - g.interval_start;
        for (let j = 0; j < g.failures; j++) {
          times.push(g.interval_start + (span * (j + 1)) / (g.failures + 1));
        }
      }
      return times.sort((a, b) => a - b);
    }
    return [];
  }

  /** MLE for beta: beta_hat = n / sum(ln(T / ti)). */
  private estimateBeta(times: number[], T: number, n: number): number {
    let sumLog = 0;
    for (const ti of times) {
      if (ti <= 0 || ti > T) continue;
      sumLog += Math.log(T / ti);
    }
    if (sumLog <= 0) return 1;
    return n / sumLog;
  }

  /** Cramer-von Mises test for NHPP power law (MIL-HDBK-189 Appendix). */
  private cramerVonMises(
    times: number[], T: number, beta: number,
  ): { cvm_statistic: number; p_value_approx: number; adequate: boolean } {
    const n = times.length;
    const ui = times.map(t => Math.pow(t / T, beta));
    let C2 = 1 / (12 * n);
    for (let i = 0; i < n; i++) {
      const diff = ui[i] - (2 * i + 1) / (2 * n);
      C2 += diff * diff;
    }
    // Approximate p-value using asymptotic distribution (Anderson-Darling table approx)
    const p_value_approx = Math.max(0, Math.min(1, Math.exp(-1.37 * C2 * n)));
    return { cvm_statistic: C2, p_value_approx, adequate: p_value_approx > 0.05 };
  }

  /** Build growth curve data points. */
  private buildGrowthCurve(
    lambda: number, beta: number, T: number, points: number,
  ): { time: number; cum_mtbf: number; inst_mtbf: number }[] {
    const curve: { time: number; cum_mtbf: number; inst_mtbf: number }[] = [];
    const tMin = T * 0.05;
    for (let i = 0; i < points; i++) {
      const t = tMin + ((T - tMin) * i) / (points - 1);
      const cumMTBF = Math.pow(t, 1 - beta) / lambda;
      const instMTBF = 1 / (lambda * beta * Math.pow(t, beta - 1));
      curve.push({ time: Math.round(t * 100) / 100, cum_mtbf: round4(cumMTBF), inst_mtbf: round4(instMTBF) });
    }
    return curve;
  }

  /** Fisher information confidence bounds for beta and instantaneous MTBF. */
  private fisherConfidenceBounds(
    lambda: number, beta: number, T: number, n: number, cl: number,
  ): { lower_beta: number; upper_beta: number; lower_mtbf: number; upper_mtbf: number } {
    // Var(beta_hat) ~ beta^2 / n (asymptotic)
    const seBeta = beta / Math.sqrt(n);
    const z = this.zScore(cl);
    const lowerBeta = Math.max(0.01, beta - z * seBeta);
    const upperBeta = beta + z * seBeta;
    // Propagate to instantaneous MTBF bounds
    const instUpper = 1 / (lambda * lowerBeta * Math.pow(T, lowerBeta - 1));
    const instLower = 1 / (lambda * upperBeta * Math.pow(T, upperBeta - 1));
    return {
      lower_beta: round4(lowerBeta), upper_beta: round4(upperBeta),
      lower_mtbf: round4(Math.min(instLower, instUpper)),
      upper_mtbf: round4(Math.max(instLower, instUpper)),
    };
  }

  /** Projection: expected failures, time to target MTBF, MTBF at projection time. */
  private computeProjection(
    lambda: number, beta: number, T: number,
    projTime?: number, targetMTBF?: number,
  ): { target_mtbf_time: number | null; expected_failures: number; mtbf_at_projection: number } {
    const Tp = projTime ?? T * 1.5;
    // Expected failures in [T, Tp]: E[N] = lambda * (Tp^beta - T^beta)
    const expectedFailures = lambda * (Math.pow(Tp, beta) - Math.pow(T, beta));
    const mtbfAtProj = 1 / (lambda * beta * Math.pow(Tp, beta - 1));

    let targetTime: number | null = null;
    if (targetMTBF !== undefined && beta < 1) {
      // Solve: 1 / (lambda * beta * t^(beta-1)) = targetMTBF  =>  t = (1 / (lambda * beta * targetMTBF))^(1/(beta-1))
      const base = 1 / (lambda * beta * targetMTBF);
      targetTime = Math.pow(base, 1 / (beta - 1));
      if (!isFinite(targetTime) || targetTime < 0) targetTime = null;
    }

    return {
      target_mtbf_time: targetTime !== null ? round4(targetTime) : null,
      expected_failures: round4(expectedFailures),
      mtbf_at_projection: round4(mtbfAtProj),
    };
  }

  /** Approximate z-score for two-sided confidence level. */
  private zScore(cl: number): number {
    const alpha = (1 - cl) / 2;
    // Rational approximation (Abramowitz & Stegun 26.2.23)
    const p = alpha < 0.5 ? alpha : 1 - alpha;
    const t = Math.sqrt(-2 * Math.log(p));
    const z = t - (2.515517 + 0.802853 * t + 0.010328 * t * t) /
      (1 + 1.432788 * t + 0.189269 * t * t + 0.001308 * t * t * t);
    return alpha < 0.5 ? -z : z;
  }

  /** Generate actionable recommendations. */
  private generateRecommendations(
    beta: number, gof: { adequate: boolean }, instMTBF: number, targetMTBF?: number,
  ): string[] {
    const recs: string[] = [];
    if (beta < 0.7) recs.push('Strong reliability growth observed (beta=' + beta.toFixed(3) + '). Continue current improvement program.');
    else if (beta < 0.95) recs.push('Moderate reliability growth (beta=' + beta.toFixed(3) + '). Identify remaining failure modes for targeted corrective action.');
    else if (beta <= 1.05) recs.push('No significant growth trend (beta=' + beta.toFixed(3) + '). Process is stable; introduce deliberate improvements to drive growth.');
    else recs.push('Reliability deterioration detected (beta=' + beta.toFixed(3) + '). Investigate root cause — possible tooling wear, material variation, or process drift.');

    if (!gof.adequate) recs.push('Cramer-von Mises test indicates poor fit. Consider segmented analysis or alternative model (log-linear).');
    if (targetMTBF !== undefined && instMTBF < targetMTBF) {
      const gap = ((targetMTBF - instMTBF) / targetMTBF * 100).toFixed(1);
      recs.push(`Current instantaneous MTBF (${instMTBF.toFixed(1)}h) is ${gap}% below target (${targetMTBF}h). Prioritize FRACAS-driven corrective actions.`);
    }
    if (targetMTBF !== undefined && instMTBF >= targetMTBF) recs.push('Target MTBF achieved. Transition to reliability sustainment monitoring (SPC control charts).');
    return recs;
  }
}

function round4(v: number): number { return Math.round(v * 10000) / 10000; }

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const amsaaReliabilityGrowthEngine = new AMSAAReliabilityGrowthEngine();
