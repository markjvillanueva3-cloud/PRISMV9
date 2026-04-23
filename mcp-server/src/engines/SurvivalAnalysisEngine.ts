/**
 * SurvivalAnalysisEngine — Reliability & Time-to-Event Analysis
 *
 * Implements survival analysis methods:
 * - Kaplan-Meier estimator
 * - Weibull distribution fitting
 * - Exponential distribution
 * - Hazard rate estimation
 * - Mean time to failure (MTTF/MTBF)
 * - Reliability function
 *
 * Manufacturing use: tool life prediction, machine reliability,
 * bearing failure analysis, maintenance planning, warranty estimation.
 *
 * @module SurvivalAnalysisEngine
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SurvivalData {
  time: number;
  event: boolean;  // true = failure, false = censored
}

export interface KaplanMeierResult {
  times: number[];
  survival: number[];
  ci_lower: number[];
  ci_upper: number[];
  medianSurvival: number;
  events: number;
  censored: number;
}

export interface WeibullFit {
  shape: number;    // β (beta)
  scale: number;    // η (eta)
  mttf: number;
  reliability: (t: number) => number;
  hazard: (t: number) => number;
  b10Life: number;  // 10% failure life
  rSquared: number;
}

export interface HazardResult {
  times: number[];
  hazardRate: number[];
  cumulativeHazard: number[];
  bathtubPhase: string;  // "infant" | "useful" | "wearout"
}

// ---------------------------------------------------------------------------
// Engine
// ---------------------------------------------------------------------------

class SurvivalAnalysisEngineImpl {

  /**
   * Kaplan-Meier survival curve estimator.
   */
  kaplanMeier(data: SurvivalData[], confidence: number = 0.95): KaplanMeierResult {
    const sorted = [...data].sort((a, b) => a.time - b.time);
    const n = sorted.length;
    const z = confidence === 0.95 ? 1.96 : 1.645;

    const times: number[] = [0];
    const survival: number[] = [1.0];
    const ciLower: number[] = [1.0];
    const ciUpper: number[] = [1.0];

    let atRisk = n;
    let events = 0;
    let censored = 0;
    let S = 1.0;
    let varSum = 0;

    let i = 0;
    while (i < n) {
      const t = sorted[i].time;
      let d = 0; // events at time t
      let c = 0; // censored at time t

      while (i < n && sorted[i].time === t) {
        if (sorted[i].event) d++;
        else c++;
        i++;
      }

      if (d > 0) {
        S *= (1 - d / atRisk);
        varSum += d / (atRisk * (atRisk - d) || 1);
        events += d;

        times.push(t);
        survival.push(S);

        const se = S * Math.sqrt(varSum);
        ciLower.push(Math.max(0, S - z * se));
        ciUpper.push(Math.min(1, S + z * se));
      }

      censored += c;
      atRisk -= (d + c);
    }

    // Median survival
    let medianSurvival = Infinity;
    for (let j = 0; j < survival.length; j++) {
      if (survival[j] <= 0.5) {
        medianSurvival = times[j];
        break;
      }
    }

    return {
      times, survival, ci_lower: ciLower, ci_upper: ciUpper,
      medianSurvival, events, censored,
    };
  }

  /**
   * Fit Weibull distribution to failure time data.
   * Uses linearized regression: ln(-ln(1-F)) = β*ln(t) - β*ln(η)
   */
  weibullFit(failureTimes: number[]): WeibullFit {
    const sorted = [...failureTimes].sort((a, b) => a - b);
    const n = sorted.length;

    // Median rank approximation for F(t)
    const x: number[] = [];  // ln(t)
    const y: number[] = [];  // ln(-ln(1-F))
    for (let i = 0; i < n; i++) {
      const F = (i + 0.3) / (n + 0.4); // Bernard's approximation
      if (sorted[i] > 0 && F > 0 && F < 1) {
        x.push(Math.log(sorted[i]));
        y.push(Math.log(-Math.log(1 - F)));
      }
    }

    // Linear regression: y = β*x - β*ln(η)
    const nPts = x.length;
    if (nPts < 2) {
      const mean = sorted.reduce((s, v) => s + v, 0) / n;
      return {
        shape: 1, scale: mean, mttf: mean,
        reliability: (t) => Math.exp(-t / mean),
        hazard: () => 1 / mean,
        b10Life: mean * 0.105,
        rSquared: 0,
      };
    }

    const sumX = x.reduce((s, v) => s + v, 0);
    const sumY = y.reduce((s, v) => s + v, 0);
    const sumXY = x.reduce((s, v, i) => s + v * y[i], 0);
    const sumX2 = x.reduce((s, v) => s + v * v, 0);

    const beta = (nPts * sumXY - sumX * sumY) / (nPts * sumX2 - sumX * sumX || 1);
    const intercept = (sumY - beta * sumX) / nPts;
    const eta = Math.exp(-intercept / (beta || 1));

    // R-squared
    const meanY = sumY / nPts;
    const ssTot = y.reduce((s, yi) => s + (yi - meanY) ** 2, 0);
    const ssRes = y.reduce((s, yi, i) => s + (yi - (beta * x[i] + intercept)) ** 2, 0);
    const rSquared = ssTot > 0 ? 1 - ssRes / ssTot : 0;

    // MTTF = η * Γ(1 + 1/β)
    const mttf = eta * this._gamma(1 + 1 / beta);

    // B10 life: R(t) = 0.9 → t = η * (-ln(0.9))^(1/β)
    const b10Life = eta * Math.pow(-Math.log(0.9), 1 / beta);

    return {
      shape: beta,
      scale: eta,
      mttf,
      reliability: (t) => Math.exp(-Math.pow(t / eta, beta)),
      hazard: (t) => (beta / eta) * Math.pow(t / eta, beta - 1),
      b10Life,
      rSquared,
    };
  }

  /**
   * Exponential reliability model (constant hazard rate).
   */
  exponentialModel(mttf: number): {
    reliability: (t: number) => number;
    hazardRate: number;
    failureProb: (t: number) => number;
    percentile: (p: number) => number;
  } {
    const lambda = 1 / mttf;
    return {
      reliability: (t) => Math.exp(-lambda * t),
      hazardRate: lambda,
      failureProb: (t) => 1 - Math.exp(-lambda * t),
      percentile: (p) => -mttf * Math.log(1 - p),
    };
  }

  /**
   * Hazard rate estimation (Nelson-Aalen cumulative hazard).
   */
  hazardEstimate(data: SurvivalData[], windowSize: number = 5): HazardResult {
    const sorted = [...data].sort((a, b) => a.time - b.time);
    const n = sorted.length;

    const times: number[] = [];
    const cumHazard: number[] = [];
    let atRisk = n;
    let H = 0;

    let i = 0;
    while (i < n) {
      const t = sorted[i].time;
      let d = 0, c = 0;
      while (i < n && sorted[i].time === t) {
        if (sorted[i].event) d++;
        else c++;
        i++;
      }

      if (d > 0) {
        H += d / atRisk;
        times.push(t);
        cumHazard.push(H);
      }
      atRisk -= (d + c);
    }

    // Hazard rate as finite difference of cumulative hazard
    const hazardRate: number[] = [];
    for (let j = 0; j < times.length; j++) {
      if (j === 0) {
        hazardRate.push(cumHazard[0] / (times[0] || 1));
      } else {
        const dt = times[j] - times[j - 1];
        hazardRate.push(dt > 0 ? (cumHazard[j] - cumHazard[j - 1]) / dt : 0);
      }
    }

    // Detect bathtub phase
    let phase = "useful";
    if (hazardRate.length >= 3) {
      const first = hazardRate.slice(0, Math.ceil(hazardRate.length / 3));
      const last = hazardRate.slice(-Math.ceil(hazardRate.length / 3));
      const firstAvg = first.reduce((s, v) => s + v, 0) / first.length;
      const lastAvg = last.reduce((s, v) => s + v, 0) / last.length;
      const midAvg = hazardRate.reduce((s, v) => s + v, 0) / hazardRate.length;

      if (firstAvg > midAvg * 1.5) phase = "infant";
      else if (lastAvg > midAvg * 1.5) phase = "wearout";
    }

    return {
      times, hazardRate, cumulativeHazard: cumHazard,
      bathtubPhase: phase,
    };
  }

  /**
   * Compute MTBF from a series of failure times.
   */
  mtbf(failureTimes: number[]): {
    mtbf: number;
    availability: number;
    failureRate: number;
    ci95: [number, number];
  } {
    const sorted = [...failureTimes].sort((a, b) => a - b);
    const n = sorted.length;
    if (n === 0) return { mtbf: Infinity, availability: 1, failureRate: 0, ci95: [0, Infinity] };

    const intervals: number[] = [sorted[0]];
    for (let i = 1; i < n; i++) {
      intervals.push(sorted[i] - sorted[i - 1]);
    }

    const mtbfVal = intervals.reduce((s, v) => s + v, 0) / intervals.length;
    const failureRate = 1 / mtbfVal;

    // Chi-squared confidence interval approximation
    const lower = 2 * n * mtbfVal / (2 * n + 3.84); // ~χ²(0.975, 2n)
    const upper = 2 * n * mtbfVal / Math.max(1, 2 * n - 3.84);

    return {
      mtbf: mtbfVal,
      availability: mtbfVal / (mtbfVal + 1), // Assume MTTR = 1 (placeholder)
      failureRate,
      ci95: [lower, upper],
    };
  }

  // Gamma function approximation (Stirling)
  private _gamma(z: number): number {
    if (z < 0.5) return Math.PI / (Math.sin(Math.PI * z) * this._gamma(1 - z));
    z -= 1;
    const g = 7;
    const c = [
      0.99999999999980993, 676.5203681218851, -1259.1392167224028,
      771.32342877765313, -176.61502916214059, 12.507343278686905,
      -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7,
    ];
    let x = c[0];
    for (let i = 1; i < g + 2; i++) x += c[i] / (z + i);
    const t = z + g + 0.5;
    return Math.sqrt(2 * Math.PI) * Math.pow(t, z + 0.5) * Math.exp(-t) * x;
  }
}

export const survivalAnalysisEngine = new SurvivalAnalysisEngineImpl();
