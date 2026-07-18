/**
 * PRISM MCP Server -- Lean Six Sigma Engine
 *
 * Statistical process control and capability:
 * - Process capability indices (Cp, Cpk, Ppk)
 * - Bootstrap Cpk confidence intervals
 * - X-bar & R control chart
 * - I-MR (individuals & moving range) chart
 * - Sigma level / PPM estimation
 *
 * Based on AIAG SPC Manual, Montgomery (2012).
 * Ported from PRISM_LEAN_SIX_SIGMA_KAIZEN.js (monolith R2.3.1).
 *
 * @module LeanSixSigmaEngine
 */

// ============================================================================
// TYPES
// ============================================================================

export interface CpkResult {
  value: number;
  cpkUpper: number;
  cpkLower: number;
  interpretation: string;
  ppm: number;
  sigmaLevel: number;
}

export interface ControlChartResult {
  chartType: string;
  centerline: number;
  UCL: number;
  LCL: number;
  values: number[];
  outOfControl: Array<{ index: number; type: string; value: number }>;
  inControl: boolean;
  estimatedSigma: number;
}

export interface XBarRResult {
  chartType: string;
  subgroupSize: number;
  numSubgroups: number;
  xBar: { centerline: number; UCL: number; LCL: number; values: number[] };
  range: { centerline: number; UCL: number; LCL: number; values: number[] };
  estimatedSigma: number;
  outOfControl: Array<{ index: number; type: string; value: number }>;
  inControl: boolean;
}

// ============================================================================
// ENGINE
// ============================================================================

const CHART_FACTORS: Record<number, { A2: number; D3: number; D4: number; d2: number }> = {
  2: { A2: 1.880, D3: 0, D4: 3.267, d2: 1.128 },
  3: { A2: 1.023, D3: 0, D4: 2.574, d2: 1.693 },
  4: { A2: 0.729, D3: 0, D4: 2.282, d2: 2.059 },
  5: { A2: 0.577, D3: 0, D4: 2.114, d2: 2.326 },
  6: { A2: 0.483, D3: 0, D4: 2.004, d2: 2.534 },
  7: { A2: 0.419, D3: 0.076, D4: 1.924, d2: 2.704 },
  8: { A2: 0.373, D3: 0.136, D4: 1.864, d2: 2.847 },
  9: { A2: 0.337, D3: 0.184, D4: 1.816, d2: 2.970 },
  10: { A2: 0.308, D3: 0.223, D4: 1.777, d2: 3.078 },
};

class LeanSixSigmaEngineImpl {

  /** Process capability Cp = (USL - LSL) / 6σ. */
  calculateCp(USL: number, LSL: number, sigma: number): number {
    if (sigma <= 0) return 0;
    return (USL - LSL) / (6 * sigma);
  }

  /** Process capability index Cpk = min((USL-μ)/3σ, (μ-LSL)/3σ). */
  calculateCpk(USL: number, LSL: number, mean: number, sigma: number): CpkResult {
    if (sigma <= 0) return { value: 0, cpkUpper: 0, cpkLower: 0, interpretation: "Invalid sigma", ppm: 1000000, sigmaLevel: 0 };

    const cpkUpper = (USL - mean) / (3 * sigma);
    const cpkLower = (mean - LSL) / (3 * sigma);
    const cpk = Math.min(cpkUpper, cpkLower);

    let interpretation: string;
    if (cpk >= 2.0) interpretation = "World Class (6σ)";
    else if (cpk >= 1.67) interpretation = "Excellent (5σ)";
    else if (cpk >= 1.33) interpretation = "Good (4σ)";
    else if (cpk >= 1.0) interpretation = "Capable (3σ)";
    else if (cpk >= 0.67) interpretation = "Marginal";
    else interpretation = "Not Capable - Action Required";

    return {
      value: cpk,
      cpkUpper,
      cpkLower,
      interpretation,
      ppm: this._cpkToPPM(cpk),
      sigmaLevel: Math.round(cpk * 3 * 10) / 10,
    };
  }

  /** Cpk with bootstrap confidence intervals. */
  calculateCpkWithUncertainty(measurements: number[], USL: number, LSL: number): CpkResult & { confidence95: { lower: number; upper: number }; sampleSize: number } {
    const n = measurements.length;
    const mean = measurements.reduce((a, b) => a + b, 0) / n;
    const sigma = Math.sqrt(measurements.reduce((sum, x) => sum + Math.pow(x - mean, 2), 0) / (n - 1));
    const cpk = this.calculateCpk(USL, LSL, mean, sigma);

    const boots: number[] = [];
    for (let i = 0; i < 1000; i++) {
      const sample: number[] = [];
      for (let j = 0; j < n; j++) sample.push(measurements[Math.floor(Math.random() * n)]);
      const sm = sample.reduce((a, b) => a + b, 0) / n;
      const ss = Math.sqrt(sample.reduce((sum, x) => sum + Math.pow(x - sm, 2), 0) / (n - 1));
      if (ss > 0) boots.push(Math.min((USL - sm) / (3 * ss), (sm - LSL) / (3 * ss)));
    }
    boots.sort((a, b) => a - b);

    return {
      ...cpk,
      confidence95: {
        lower: boots[Math.floor(boots.length * 0.025)] ?? cpk.value,
        upper: boots[Math.floor(boots.length * 0.975)] ?? cpk.value,
      },
      sampleSize: n,
    };
  }

  /** X-bar and R control chart. */
  xBarRChart(subgroups: number[][]): XBarRResult {
    const n = subgroups[0].length;
    const k = subgroups.length;
    const f = CHART_FACTORS[n] ?? CHART_FACTORS[5];

    const xBars = subgroups.map(sg => sg.reduce((a, b) => a + b, 0) / n);
    const ranges = subgroups.map(sg => Math.max(...sg) - Math.min(...sg));

    const xBarBar = xBars.reduce((a, b) => a + b, 0) / k;
    const rBar = ranges.reduce((a, b) => a + b, 0) / k;

    const xBarUCL = xBarBar + f.A2 * rBar;
    const xBarLCL = xBarBar - f.A2 * rBar;
    const rUCL = f.D4 * rBar;
    const rLCL = f.D3 * rBar;

    const outOfControl: Array<{ index: number; type: string; value: number }> = [];
    xBars.forEach((xBar, i) => {
      if (xBar > xBarUCL || xBar < xBarLCL) outOfControl.push({ index: i, type: "X-bar", value: xBar });
    });
    ranges.forEach((r, i) => {
      if (r > rUCL || r < rLCL) outOfControl.push({ index: i, type: "Range", value: r });
    });

    return {
      chartType: "X-bar and R",
      subgroupSize: n,
      numSubgroups: k,
      xBar: { centerline: xBarBar, UCL: xBarUCL, LCL: xBarLCL, values: xBars },
      range: { centerline: rBar, UCL: rUCL, LCL: rLCL, values: ranges },
      estimatedSigma: rBar / f.d2,
      outOfControl,
      inControl: outOfControl.length === 0,
    };
  }

  /** Individuals and Moving Range (I-MR) chart. */
  iMRChart(individuals: number[]): ControlChartResult {
    const n = individuals.length;
    const movingRanges: number[] = [];
    for (let i = 1; i < n; i++) movingRanges.push(Math.abs(individuals[i] - individuals[i - 1]));

    const xBar = individuals.reduce((a, b) => a + b, 0) / n;
    const mRBar = movingRanges.reduce((a, b) => a + b, 0) / movingRanges.length;
    const sigma = mRBar / 1.128;

    const UCL = xBar + 3 * sigma;
    const LCL = xBar - 3 * sigma;

    const outOfControl: Array<{ index: number; type: string; value: number }> = [];
    individuals.forEach((v, i) => {
      if (v > UCL || v < LCL) outOfControl.push({ index: i, type: "Individual", value: v });
    });

    return {
      chartType: "I-MR",
      centerline: xBar,
      UCL, LCL,
      values: individuals,
      outOfControl,
      inControl: outOfControl.length === 0,
      estimatedSigma: sigma,
    };
  }

  private _cpkToPPM(cpk: number): number {
    if (cpk <= 0) return 1000000;
    const z = cpk * 3;
    return Math.round(2 * 1000000 * (1 - this._normalCDF(z)));
  }

  private _normalCDF(z: number): number {
    const a1 = 0.254829592, a2 = -0.284496736, a3 = 1.421413741;
    const a4 = -1.453152027, a5 = 1.061405429, p = 0.3275911;
    const sign = z < 0 ? -1 : 1;
    const x = Math.abs(z) / Math.sqrt(2);
    const t = 1 / (1 + p * x);
    const y = 1 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);
    return 0.5 * (1 + sign * y);
  }
}

export const leanSixSigmaEngine = new LeanSixSigmaEngineImpl();
