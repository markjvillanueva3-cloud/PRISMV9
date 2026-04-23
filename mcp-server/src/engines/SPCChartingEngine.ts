/**
 * SPCChartingEngine — Advanced SPC charting methods for manufacturing
 *
 * Charts: EWMA, CUSUM, Moving Average, Xbar-S
 * Analysis: ARL estimation, control limit calculation, shift detection
 *
 * References: MIT 2.830J Lecture #9 (Hardt), Montgomery Ch. 9,
 *   Lucas & Saccucci (1990), Page (1954)
 * Source: document:mit2830j — MIT OCW 2.830J/6.780J Spring 2008
 */

// ─── Types ─────────────────────────────────────────────────────────

export type ChartType = "ewma" | "cusum" | "moving_average" | "xbar_s";

/** Atomic Value configuration/data structure.
 */
export interface AtomicValue {
  value: number;
  unit: string;
  uncertainty: number;
  source: string;
  warning?: string;
}

/** E W M A Input configuration/data structure.
 */
export interface EWMAInput {
  data: number[];
  lambda: number;        // smoothing parameter r (0 < λ ≤ 1)
  target_mean?: number;  // μ₀ (default: sample mean)
  target_sigma?: number; // σ (default: sample std dev)
  subgroup_size?: number; // n (default: 1)
  L?: number;            // control limit width in σ (default: 3)
}

/** C U S U M Input configuration/data structure.
 */
export interface CUSUMInput {
  data: number[];
  target_mean?: number;  // μ₀
  target_sigma?: number; // σ
  k?: number;            // slack (allowance), default 0.5σ
  h?: number;            // decision interval, default 5σ
  subgroup_size?: number;
}

/** Moving Average Input configuration/data structure.
 */
export interface MovingAverageInput {
  data: number[];
  window_size: number;   // w (number of points)
  target_mean?: number;
  target_sigma?: number;
  L?: number;            // limit width (default: 3)
}

/** Xbar S Input configuration/data structure.
 */
export interface XbarSInput {
  subgroups: number[][]; // array of subgroup measurements
  target_mean?: number;
  target_sigma?: number;
  L?: number;
}

/** Chart Point configuration/data structure.
 */
export interface ChartPoint {
  index: number;
  value: number;
  ucl: number;
  lcl: number;
  out_of_control: boolean;
}

/** S P C Chart Result configuration/data structure.
 */
export interface SPCChartResult {
  chart_type: ChartType;
  points: ChartPoint[];
  center_line: AtomicValue;
  ucl: AtomicValue;
  lcl: AtomicValue;
  out_of_control_count: number;
  first_signal_index: number | null;
  estimated_arl: AtomicValue;
  recommendations: string[];
  is_in_control: boolean;
}

// ─── Constants ─────────────────────────────────────────────────────

const SOURCE = "SPCChartingEngine (MIT 2.830J Lecture #9)";

/** Unbiasing constant c4 for sample std dev, indexed by n */
const C4: Record<number, number> = {
  2: 0.7979, 3: 0.8862, 4: 0.9213, 5: 0.9400,
  6: 0.9515, 7: 0.9594, 8: 0.9650, 9: 0.9693,
  10: 0.9727, 15: 0.9823, 20: 0.9869, 25: 0.9896,
};

/** B3, B4 constants for S-chart limits */
const B3: Record<number, number> = {
  2: 0, 3: 0, 4: 0, 5: 0, 6: 0.030, 7: 0.118,
  8: 0.185, 9: 0.239, 10: 0.284,
};
const B4: Record<number, number> = {
  2: 3.267, 3: 2.568, 4: 2.266, 5: 2.089,
  6: 1.970, 7: 1.882, 8: 1.815, 9: 1.761, 10: 1.716,
};

// ─── Helper Functions ──────────────────────────────────────────────

function mean(arr: number[]): number {
  return arr.reduce((s, x) => s + x, 0) / arr.length;
}

function stdDev(arr: number[]): number {
  const m = mean(arr);
  const variance = arr.reduce((s, x) => s + (x - m) ** 2, 0)
    / (arr.length - 1);
  return Math.sqrt(variance);
}

function getC4(n: number): number {
  if (C4[n]) return C4[n];
  // Approximation for large n: c4 ≈ 1 - 1/(4n)
  return 1 - 1 / (4 * n);
}

// ─── EWMA Chart ────────────────────────────────────────────────────

/**
 * EWMA chart: A_i = λ·x_i + (1-λ)·A_{i-1}
 * UCL/LCL = μ₀ ± L·σ·√(λ/(2-λ)·(1-(1-λ)^{2i})) / √n
 *
 * From MIT 2.830J Lecture 9:
 * - Recursive: A_i = r·x_i + (1-r)·A_{i-1}
 * - σ_A = σ/√n · √(r/(2-r)) for large t
 * - Sensitive to small shifts (< 1.5σ)
  * @param input - input data
  * @returns s p c chart result
 */
export function computeEWMA(input: EWMAInput): SPCChartResult {
  const { data, lambda } = input;
  const n = input.subgroup_size ?? 1;
  const L = input.L ?? 3;
  const mu0 = input.target_mean ?? mean(data);
  const sigma = input.target_sigma ?? stdDev(data);
  const sigmaX = sigma / Math.sqrt(n);

  const points: ChartPoint[] = [];
  let ewma = mu0;
  let oocCount = 0;
  let firstSignal: number | null = null;

  for (let i = 0; i < data.length; i++) {
    ewma = lambda * data[i] + (1 - lambda) * ewma;

    // Time-varying control limits
    const factor = Math.sqrt(
      (lambda / (2 - lambda)) * (1 - (1 - lambda) ** (2 * (i + 1)))
    );
    const ucl = mu0 + L * sigmaX * factor;
    const lcl = mu0 - L * sigmaX * factor;

    const ooc = ewma > ucl || ewma < lcl;
    if (ooc) {
      oocCount++;
      if (firstSignal === null) firstSignal = i;
    }

    points.push({ index: i, value: ewma, ucl, lcl, out_of_control: ooc });
  }

  // Steady-state limits
  const steadyFactor = Math.sqrt(lambda / (2 - lambda));
  const uclSteady = mu0 + L * sigmaX * steadyFactor;
  const lclSteady = mu0 - L * sigmaX * steadyFactor;

  // ARL₀ approximation (in-control) — Markov chain, rough estimate
  const arl0 = Math.exp(L * L / 2) * 2 / lambda;

  const recommendations: string[] = [];
  if (oocCount > 0) {
    recommendations.push(
      `${oocCount} out-of-control signals detected. ` +
      "Investigate assignable causes starting at first signal."
    );
  }
  if (lambda < 0.1) {
    recommendations.push(
      "Very low λ: chart emphasizes long-term shifts. " +
      "Increase λ for faster detection of recent changes."
    );
  }
  if (lambda > 0.4) {
    recommendations.push(
      "High λ: chart acts nearly like individual chart. " +
      "Decrease λ for better small-shift sensitivity."
    );
  }

  // Playbook consultation for quality inspection rules
  try {
    const { machiningPlaybookEngine } = require("./MachiningPlaybookEngine.js");
    const pbResult = machiningPlaybookEngine.advise({
      categories: ["quality_inspection"],
    });
    for (const rule of pbResult.rules) {
      if (rule.severity === "critical" || rule.severity === "important") {
        recommendations.push(`[Playbook ${rule.id}] ${rule.title}`);
      }
    }
  } catch { /* playbook not available */ }

  return {
    chart_type: "ewma",
    points,
    center_line: { value: mu0, unit: "process_units", uncertainty: 0, source: SOURCE },
    ucl: { value: uclSteady, unit: "process_units", uncertainty: 0, source: SOURCE },
    lcl: { value: lclSteady, unit: "process_units", uncertainty: 0, source: SOURCE },
    out_of_control_count: oocCount,
    first_signal_index: firstSignal,
    estimated_arl: {
      value: arl0, unit: "samples", uncertainty: arl0 * 0.2,
      source: SOURCE + " (approximate)",
    },
    recommendations,
    is_in_control: oocCount === 0,
  };
}

// ─── CUSUM Chart ───────────────────────────────────────────────────

/**
 * Two-sided CUSUM: detect upward and downward shifts
 * C⁺_i = max(0, x_i - (μ₀ + k) + C⁺_{i-1})
 * C⁻_i = max(0, (μ₀ - k) - x_i + C⁻_{i-1})
 * Signal when C⁺ > h or C⁻ > h
  * @param input - input data
  * @returns s p c chart result
 */
export function computeCUSUM(input: CUSUMInput): SPCChartResult {
  const { data } = input;
  const mu0 = input.target_mean ?? mean(data);
  const sigma = input.target_sigma ?? stdDev(data);
  const n = input.subgroup_size ?? 1;
  const sigmaX = sigma / Math.sqrt(n);
  const k = (input.k ?? 0.5) * sigmaX;
  const h = (input.h ?? 5) * sigmaX;

  const points: ChartPoint[] = [];
  let cPlus = 0;
  let cMinus = 0;
  let oocCount = 0;
  let firstSignal: number | null = null;

  for (let i = 0; i < data.length; i++) {
    cPlus = Math.max(0, data[i] - (mu0 + k) + cPlus);
    cMinus = Math.max(0, (mu0 - k) - data[i] + cMinus);

    const statistic = Math.max(cPlus, cMinus);
    const ooc = cPlus > h || cMinus > h;
    if (ooc) {
      oocCount++;
      if (firstSignal === null) firstSignal = i;
    }

    points.push({
      index: i,
      value: statistic,
      ucl: h,
      lcl: 0,
      out_of_control: ooc,
    });
  }

  // ARL₀ approximation (Siegmund 1985)
  const hNorm = h / sigmaX;
  const kNorm = (input.k ?? 0.5);
  const arl0 = Math.exp(2 * hNorm * kNorm) / (2 * kNorm * kNorm);

  const recommendations: string[] = [];
  if (oocCount > 0) {
    recommendations.push(
      `CUSUM detected ${oocCount} shift signals. ` +
      "Investigate process for sustained mean shift."
    );
  }
  recommendations.push(
    `CUSUM is optimal for detecting sustained shifts of ~${kNorm.toFixed(1)}σ.`
  );

  // Playbook consultation for quality inspection rules
  try {
    const { machiningPlaybookEngine } = require("./MachiningPlaybookEngine.js");
    const pbResult = machiningPlaybookEngine.advise({
      categories: ["quality_inspection"],
    });
    for (const rule of pbResult.rules) {
      if (rule.severity === "critical" || rule.severity === "important") {
        recommendations.push(`[Playbook ${rule.id}] ${rule.title}`);
      }
    }
  } catch { /* playbook not available */ }

  return {
    chart_type: "cusum",
    points,
    center_line: { value: 0, unit: "process_units", uncertainty: 0, source: SOURCE },
    ucl: { value: h, unit: "process_units", uncertainty: 0, source: SOURCE },
    lcl: { value: 0, unit: "process_units", uncertainty: 0, source: SOURCE },
    out_of_control_count: oocCount,
    first_signal_index: firstSignal,
    estimated_arl: {
      value: arl0, unit: "samples", uncertainty: arl0 * 0.3,
      source: SOURCE + " (Siegmund approx)",
    },
    recommendations,
    is_in_control: oocCount === 0,
  };
}

// ─── Moving Average Chart ──────────────────────────────────────────

/**
 * Moving Average: MA_i = (1/w) Σ x_{i-j} for j=0..w-1
 * UCL/LCL = μ₀ ± L·σ/√(w·n)
  * @param input - input data
  * @returns s p c chart result
 */
export function computeMovingAverage(
  input: MovingAverageInput
): SPCChartResult {
  const { data, window_size: w } = input;
  const L = input.L ?? 3;
  const mu0 = input.target_mean ?? mean(data);
  const sigma = input.target_sigma ?? stdDev(data);
  const sigmaMA = sigma / Math.sqrt(w);
  const ucl = mu0 + L * sigmaMA;
  const lcl = mu0 - L * sigmaMA;

  const points: ChartPoint[] = [];
  let oocCount = 0;
  let firstSignal: number | null = null;

  for (let i = 0; i < data.length; i++) {
    const start = Math.max(0, i - w + 1);
    const windowData = data.slice(start, i + 1);
    const ma = mean(windowData);
    const currentW = windowData.length;
    const currentUcl = mu0 + L * sigma / Math.sqrt(currentW);
    const currentLcl = mu0 - L * sigma / Math.sqrt(currentW);

    const ooc = ma > currentUcl || ma < currentLcl;
    if (ooc) {
      oocCount++;
      if (firstSignal === null) firstSignal = i;
    }

    points.push({
      index: i, value: ma,
      ucl: currentUcl, lcl: currentLcl,
      out_of_control: ooc,
    });
  }

  const recommendations: string[] = [];
  if (oocCount > 0) {
    recommendations.push(
      `${oocCount} signals detected. Moving average with w=${w} ` +
      "smooths short-term variation."
    );
  }

  // Playbook consultation for quality inspection rules
  try {
    const { machiningPlaybookEngine } = require("./MachiningPlaybookEngine.js");
    const pbResult = machiningPlaybookEngine.advise({
      categories: ["quality_inspection"],
    });
    for (const rule of pbResult.rules) {
      if (rule.severity === "critical" || rule.severity === "important") {
        recommendations.push(`[Playbook ${rule.id}] ${rule.title}`);
      }
    }
  } catch { /* playbook not available */ }

  return {
    chart_type: "moving_average",
    points,
    center_line: {
      value: mu0, unit: "process_units", uncertainty: 0, source: SOURCE,
    },
    ucl: { value: ucl, unit: "process_units", uncertainty: 0, source: SOURCE },
    lcl: { value: lcl, unit: "process_units", uncertainty: 0, source: SOURCE },
    out_of_control_count: oocCount,
    first_signal_index: firstSignal,
    estimated_arl: {
      value: 370, unit: "samples", uncertainty: 50,
      source: SOURCE + " (standard 3-sigma ARL)",
    },
    recommendations,
    is_in_control: oocCount === 0,
  };
}

// ─── Xbar-S Chart ──────────────────────────────────────────────────

/**
 * Xbar-S chart for subgrouped data
 * Xbar: UCL/LCL = x̿ ± L·S̄/(c4·√n)
 * S:    UCL = B4·S̄, LCL = B3·S̄
  * @param input - input data
  * @returns s p c chart result
 */
export function computeXbarS(input: XbarSInput): SPCChartResult {
  const { subgroups } = input;
  const L = input.L ?? 3;
  const n = subgroups[0]?.length ?? 1;

  const xbars = subgroups.map(mean);
  const stds = subgroups.map(stdDev);

  const xDoubleBar = input.target_mean ?? mean(xbars);
  const sBar = input.target_sigma
    ? input.target_sigma * getC4(n)
    : mean(stds);

  const sigmaEst = sBar / getC4(n);
  const ucl = xDoubleBar + L * sigmaEst / Math.sqrt(n);
  const lcl = xDoubleBar - L * sigmaEst / Math.sqrt(n);

  const points: ChartPoint[] = [];
  let oocCount = 0;
  let firstSignal: number | null = null;

  for (let i = 0; i < xbars.length; i++) {
    const ooc = xbars[i] > ucl || xbars[i] < lcl;
    if (ooc) {
      oocCount++;
      if (firstSignal === null) firstSignal = i;
    }
    points.push({
      index: i, value: xbars[i], ucl, lcl, out_of_control: ooc,
    });
  }

  const recommendations: string[] = [];
  if (oocCount > 0) {
    recommendations.push(
      `${oocCount} Xbar points out of control. ` +
      "Check S-chart for concurrent variance changes."
    );
  }
  // Also check S-chart
  const b3 = B3[n] ?? 0;
  const b4 = B4[n] ?? (1 + 3 / Math.sqrt(2 * (n - 1)));
  const sOOC = stds.filter((s) => s > b4 * sBar || s < b3 * sBar).length;
  if (sOOC > 0) {
    recommendations.push(
      `${sOOC} S-chart points out of control. ` +
      "Process variance is unstable — address before interpreting Xbar."
    );
  }

  // Playbook consultation for quality inspection rules
  try {
    const { machiningPlaybookEngine } = require("./MachiningPlaybookEngine.js");
    const pbResult = machiningPlaybookEngine.advise({
      categories: ["quality_inspection"],
    });
    for (const rule of pbResult.rules) {
      if (rule.severity === "critical" || rule.severity === "important") {
        recommendations.push(`[Playbook ${rule.id}] ${rule.title}`);
      }
    }
  } catch { /* playbook not available */ }

  return {
    chart_type: "xbar_s",
    points,
    center_line: {
      value: xDoubleBar, unit: "process_units",
      uncertainty: 0, source: SOURCE,
    },
    ucl: { value: ucl, unit: "process_units", uncertainty: 0, source: SOURCE },
    lcl: { value: lcl, unit: "process_units", uncertainty: 0, source: SOURCE },
    out_of_control_count: oocCount,
    first_signal_index: firstSignal,
    estimated_arl: {
      value: 370, unit: "samples", uncertainty: 50,
      source: SOURCE + " (standard 3-sigma ARL)",
    },
    recommendations,
    is_in_control: oocCount === 0 && sOOC === 0,
  };
}
