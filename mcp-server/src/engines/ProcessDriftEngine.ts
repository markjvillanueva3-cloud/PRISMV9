/**
 * PRISM Manufacturing Intelligence - Process Drift Engine
 * R17-MS2: Statistical Process Control & Drift Detection
 *
 * Implements SPC charts and process capability analysis for monitoring
 * manufacturing process stability over time. Detects drift, shifts,
 * and out-of-control conditions using Western Electric rules.
 *
 * Charts:
 *   X-bar/R: Mean and range charts for subgroup data
 *   CUSUM:   Cumulative sum for detecting small persistent shifts
 *   EWMA:    Exponentially weighted moving average for trend detection
 *
 * Actions:
 *   spc_xbar_r    — Generate X-bar and R chart with control limits
 *   spc_cusum     — CUSUM chart for small shift detection
 *   spc_ewma      — EWMA chart with adjustable smoothing
 *   spc_capability— Process capability analysis (Cp, Cpk, Pp, Ppk)
 *
 * @version 1.0.0  R17-MS2
 */

import { log } from "../utils/Logger.js";

// ============================================================================
// TYPES
// ============================================================================

interface DataPoint {
  value: number;
  timestamp?: number;
  subgroup?: number;
}

interface ControlLimit {
  ucl: number;  // Upper control limit
  cl: number;   // Center line
  lcl: number;  // Lower control limit
}

interface OutOfControlPoint {
  index: number;
  value: number;
  rule: string;  // Western Electric rule violated
}

interface XBarRResult {
  xbar: {
    values: number[];
    limits: ControlLimit;
    out_of_control: OutOfControlPoint[];
  };
  r_chart: {
    values: number[];
    limits: ControlLimit;
    out_of_control: OutOfControlPoint[];
  };
  subgroup_size: number;
  subgroup_count: number;
  overall_mean: number;
  overall_range: number;
  in_control: boolean;
  western_electric_violations: string[];
}

interface CUSUMResult {
  cusum_high: number[];
  cusum_low: number[];
  target_mean: number;
  k: number;            // Allowance (slack) value
  h: number;            // Decision interval
  signals: Array<{ index: number; direction: "high" | "low"; cusum: number }>;
  in_control: boolean;
}

interface EWMAResult {
  ewma_values: number[];
  limits: { ucl: number[]; cl: number; lcl: number[] };
  lambda: number;
  out_of_control: OutOfControlPoint[];
  in_control: boolean;
  trend: "stable" | "increasing" | "decreasing" | "oscillating";
}

interface CapabilityResult {
  cp: number;
  cpk: number;
  pp: number;
  ppk: number;
  mean: number;
  std_dev_within: number;
  std_dev_overall: number;
  usl: number;
  lsl: number;
  target: number;
  ppm_above: number;
  ppm_below: number;
  ppm_total: number;
  capability_rating: "excellent" | "good" | "marginal" | "inadequate";
  sigma_level: number;
}

// ============================================================================
// CONTROL CHART CONSTANTS (A2, D3, D4 for subgroup sizes 2-10)
// ============================================================================

const A2: Record<number, number> = { 2: 1.880, 3: 1.023, 4: 0.729, 5: 0.577, 6: 0.483, 7: 0.419, 8: 0.373, 9: 0.337, 10: 0.308 };
const D3: Record<number, number> = { 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0.076, 8: 0.136, 9: 0.184, 10: 0.223 };
const D4: Record<number, number> = { 2: 3.267, 3: 2.575, 4: 2.282, 5: 2.115, 6: 2.004, 7: 1.924, 8: 1.864, 9: 1.816, 10: 1.777 };
const d2: Record<number, number> = { 2: 1.128, 3: 1.693, 4: 2.059, 5: 2.326, 6: 2.534, 7: 2.704, 8: 2.847, 9: 2.970, 10: 3.078 };

// ============================================================================
// X-BAR / R CHART
// ============================================================================

function xbarRChart(params: Record<string, unknown>): XBarRResult {
  const data = (params.data as number[]) ?? [];
  const subgroupSize = Math.min(10, Math.max(2, Number(params.subgroup_size ?? 5)));

  if (data.length < subgroupSize * 3) {
    throw new Error(`Need at least ${subgroupSize * 3} data points for X-bar/R chart (got ${data.length})`);
  }

  // Split into subgroups
  const subgroups: number[][] = [];
  for (let i = 0; i + subgroupSize <= data.length; i += subgroupSize) {
    subgroups.push(data.slice(i, i + subgroupSize));
  }

  // Compute subgroup means and ranges
  const xbars = subgroups.map(sg => sg.reduce((s, v) => s + v, 0) / sg.length);
  const ranges = subgroups.map(sg => Math.max(...sg) - Math.min(...sg));

  // Overall statistics
  const xBarBar = xbars.reduce((s, v) => s + v, 0) / xbars.length;
  const rBar = ranges.reduce((s, v) => s + v, 0) / ranges.length;

  // Control limits
  const a2 = A2[subgroupSize] ?? 0.577;
  const d3 = D3[subgroupSize] ?? 0;
  const d4 = D4[subgroupSize] ?? 2.115;

  const xbarLimits: ControlLimit = {
    ucl: round4(xBarBar + a2 * rBar),
    cl: round4(xBarBar),
    lcl: round4(xBarBar - a2 * rBar),
  };

  const rLimits: ControlLimit = {
    ucl: round4(d4 * rBar),
    cl: round4(rBar),
    lcl: round4(d3 * rBar),
  };

  // Check for out-of-control points (Western Electric rules)
  const xbarOOC = checkWesternElectric(xbars, xbarLimits);
  const rOOC = checkWesternElectric(ranges, rLimits);

  const violations: string[] = [];
  if (xbarOOC.length > 0) violations.push(`X-bar: ${xbarOOC.length} out-of-control points`);
  if (rOOC.length > 0) violations.push(`R: ${rOOC.length} out-of-control points`);

  return {
    xbar: {
      values: xbars.map(round4),
      limits: xbarLimits,
      out_of_control: xbarOOC,
    },
    r_chart: {
      values: ranges.map(round4),
      limits: rLimits,
      out_of_control: rOOC,
    },
    subgroup_size: subgroupSize,
    subgroup_count: subgroups.length,
    overall_mean: round4(xBarBar),
    overall_range: round4(rBar),
    in_control: xbarOOC.length === 0 && rOOC.length === 0,
    western_electric_violations: violations,
  };
}

// ============================================================================
// CUSUM CHART
// ============================================================================

function cusumChart(params: Record<string, unknown>): CUSUMResult {
  const data = (params.data as number[]) ?? [];
  const targetMean = Number(params.target_mean ?? (data.reduce((s, v) => s + v, 0) / data.length));
  const std = params.std_dev != null
    ? Number(params.std_dev)
    : Math.sqrt(data.reduce((s, v) => s + (v - targetMean) ** 2, 0) / (data.length - 1));

  // Default: k = 0.5σ (detect 1σ shift), h = 5σ (ARL₀ ≈ 370)
  const k = Number(params.k ?? 0.5) * std;
  const h = Number(params.h ?? 5.0) * std;

  const cusumHigh: number[] = [];
  const cusumLow: number[] = [];
  const signals: CUSUMResult["signals"] = [];

  let sHigh = 0;
  let sLow = 0;

  for (let i = 0; i < data.length; i++) {
    const xi = data[i] - targetMean;
    sHigh = Math.max(0, sHigh + xi - k);
    sLow = Math.min(0, sLow + xi + k);

    cusumHigh.push(round4(sHigh));
    cusumLow.push(round4(sLow));

    if (sHigh > h) {
      signals.push({ index: i, direction: "high", cusum: round4(sHigh) });
      sHigh = 0; // Reset after signal
    }
    if (sLow < -h) {
      signals.push({ index: i, direction: "low", cusum: round4(sLow) });
      sLow = 0;
    }
  }

  return {
    cusum_high: cusumHigh,
    cusum_low: cusumLow,
    target_mean: round4(targetMean),
    k: round4(k),
    h: round4(h),
    signals,
    in_control: signals.length === 0,
  };
}

// ============================================================================
// EWMA CHART
// ============================================================================

function ewmaChart(params: Record<string, unknown>): EWMAResult {
  const data = (params.data as number[]) ?? [];
  const lambda = Math.min(1, Math.max(0.01, Number(params.lambda ?? 0.2)));
  const L = Number(params.L ?? 3.0); // Control limit width in sigma

  const mean = data.reduce((s, v) => s + v, 0) / data.length;
  const std = Math.sqrt(data.reduce((s, v) => s + (v - mean) ** 2, 0) / (data.length - 1));

  const ewma: number[] = [];
  const ucl: number[] = [];
  const lcl: number[] = [];
  const ooc: OutOfControlPoint[] = [];

  let z = mean; // Start at process mean

  for (let i = 0; i < data.length; i++) {
    z = lambda * data[i] + (1 - lambda) * z;
    ewma.push(round4(z));

    // Time-varying control limits (exact)
    const factor = Math.sqrt((lambda / (2 - lambda)) * (1 - (1 - lambda) ** (2 * (i + 1))));
    const uclI = mean + L * std * factor;
    const lclI = mean - L * std * factor;
    ucl.push(round4(uclI));
    lcl.push(round4(lclI));

    if (z > uclI || z < lclI) {
      ooc.push({ index: i, value: round4(z), rule: z > uclI ? "above_UCL" : "below_LCL" });
    }
  }

  // Trend detection from last 10 EWMA values
  const trend = detectTrend(ewma.slice(-Math.min(10, ewma.length)));

  return {
    ewma_values: ewma,
    limits: { ucl, cl: round4(mean), lcl },
    lambda,
    out_of_control: ooc,
    in_control: ooc.length === 0,
    trend,
  };
}

// ============================================================================
// PROCESS CAPABILITY
// ============================================================================

function processCapability(params: Record<string, unknown>): CapabilityResult {
  const data = (params.data as number[]) ?? [];
  const usl = Number(params.usl ?? params.upper_spec_limit);
  const lsl = Number(params.lsl ?? params.lower_spec_limit);
  const target = Number(params.target ?? (usl + lsl) / 2);
  const subgroupSize = Math.min(10, Math.max(2, Number(params.subgroup_size ?? 5)));

  if (data.length < 10) {
    throw new Error(`Need at least 10 data points for capability analysis (got ${data.length})`);
  }
  if (isNaN(usl) || isNaN(lsl) || usl <= lsl) {
    throw new Error("Valid USL and LSL required (USL > LSL)");
  }

  const mean = data.reduce((s, v) => s + v, 0) / data.length;
  const n = data.length;

  // Overall standard deviation (Pp, Ppk)
  const stdOverall = Math.sqrt(data.reduce((s, v) => s + (v - mean) ** 2, 0) / (n - 1));

  // Within-subgroup standard deviation (Cp, Cpk) using R-bar/d2
  const subgroups: number[][] = [];
  for (let i = 0; i + subgroupSize <= data.length; i += subgroupSize) {
    subgroups.push(data.slice(i, i + subgroupSize));
  }
  const ranges = subgroups.map(sg => Math.max(...sg) - Math.min(...sg));
  const rBar = ranges.length > 0
    ? ranges.reduce((s, v) => s + v, 0) / ranges.length
    : stdOverall * (d2[subgroupSize] ?? 2.326);
  const stdWithin = rBar / (d2[subgroupSize] ?? 2.326);

  // Capability indices
  const cp = (usl - lsl) / (6 * stdWithin);
  const cpk = Math.min(
    (usl - mean) / (3 * stdWithin),
    (mean - lsl) / (3 * stdWithin),
  );

  const pp = (usl - lsl) / (6 * stdOverall);
  const ppk = Math.min(
    (usl - mean) / (3 * stdOverall),
    (mean - lsl) / (3 * stdOverall),
  );

  // PPM estimation (normal distribution approximation)
  const zUpper = (usl - mean) / stdOverall;
  const zLower = (mean - lsl) / stdOverall;
  const ppmAbove = Math.round(normalCDF(-zUpper) * 1_000_000);
  const ppmBelow = Math.round(normalCDF(-zLower) * 1_000_000);

  // Sigma level
  const sigmaLevel = Math.min(zUpper, zLower) + 1.5; // With 1.5σ shift assumption

  // Rating
  let rating: CapabilityResult["capability_rating"];
  if (cpk >= 1.67) rating = "excellent";
  else if (cpk >= 1.33) rating = "good";
  else if (cpk >= 1.0) rating = "marginal";
  else rating = "inadequate";

  return {
    cp: round4(cp),
    cpk: round4(cpk),
    pp: round4(pp),
    ppk: round4(ppk),
    mean: round4(mean),
    std_dev_within: round4(stdWithin),
    std_dev_overall: round4(stdOverall),
    usl,
    lsl,
    target,
    ppm_above: ppmAbove,
    ppm_below: ppmBelow,
    ppm_total: ppmAbove + ppmBelow,
    capability_rating: rating,
    sigma_level: round4(sigmaLevel),
  };
}

// ============================================================================
// WESTERN ELECTRIC RULES
// ============================================================================

function checkWesternElectric(values: number[], limits: ControlLimit): OutOfControlPoint[] {
  const ooc: OutOfControlPoint[] = [];
  const sigma = (limits.ucl - limits.cl) / 3;
  const zone1 = limits.cl + 2 * sigma;     // 2σ
  const zone1Low = limits.cl - 2 * sigma;
  const zone2 = limits.cl + sigma;          // 1σ
  const zone2Low = limits.cl - sigma;

  for (let i = 0; i < values.length; i++) {
    const v = values[i];

    // Rule 1: Point beyond 3σ (beyond UCL or LCL)
    if (v > limits.ucl || v < limits.lcl) {
      ooc.push({ index: i, value: round4(v), rule: "Rule 1: beyond 3σ" });
      continue;
    }

    // Rule 2: 9 points in a row on same side of center line
    if (i >= 8) {
      const last9 = values.slice(i - 8, i + 1);
      if (last9.every(x => x > limits.cl) || last9.every(x => x < limits.cl)) {
        ooc.push({ index: i, value: round4(v), rule: "Rule 2: 9 consecutive same side" });
        continue;
      }
    }

    // Rule 3: 6 points in a row steadily increasing or decreasing
    if (i >= 5) {
      const last6 = values.slice(i - 5, i + 1);
      let increasing = true, decreasing = true;
      for (let j = 1; j < last6.length; j++) {
        if (last6[j] <= last6[j - 1]) increasing = false;
        if (last6[j] >= last6[j - 1]) decreasing = false;
      }
      if (increasing || decreasing) {
        ooc.push({ index: i, value: round4(v), rule: `Rule 3: 6 ${increasing ? "increasing" : "decreasing"}` });
        continue;
      }
    }

    // Rule 4: 2 of 3 points beyond 2σ on same side
    if (i >= 2) {
      const last3 = values.slice(i - 2, i + 1);
      const aboveZone1 = last3.filter(x => x > zone1).length;
      const belowZone1Low = last3.filter(x => x < zone1Low).length;
      if (aboveZone1 >= 2 || belowZone1Low >= 2) {
        ooc.push({ index: i, value: round4(v), rule: "Rule 4: 2 of 3 beyond 2σ" });
        continue;
      }
    }
  }

  return ooc;
}

// ============================================================================
// HELPERS
// ============================================================================

function detectTrend(values: number[]): EWMAResult["trend"] {
  if (values.length < 3) return "stable";

  let increasing = 0;
  let decreasing = 0;
  for (let i = 1; i < values.length; i++) {
    if (values[i] > values[i - 1]) increasing++;
    else if (values[i] < values[i - 1]) decreasing++;
  }

  const total = values.length - 1;
  if (increasing > total * 0.7) return "increasing";
  if (decreasing > total * 0.7) return "decreasing";

  // Check for oscillation: alternating up/down
  let alternations = 0;
  for (let i = 2; i < values.length; i++) {
    const prev = values[i - 1] - values[i - 2];
    const curr = values[i] - values[i - 1];
    if (prev * curr < 0) alternations++;
  }
  if (alternations > (values.length - 2) * 0.7) return "oscillating";

  return "stable";
}

/** Standard normal CDF approximation (Abramowitz & Stegun) */
function normalCDF(z: number): number {
  if (z < -8) return 0;
  if (z > 8) return 1;
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;
  const sign = z < 0 ? -1 : 1;
  const x = Math.abs(z) / Math.sqrt(2);
  const t = 1.0 / (1.0 + p * x);
  const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);
  return 0.5 * (1.0 + sign * y);
}

function round4(v: number): number {
  return Math.round(v * 10000) / 10000;
}

// ============================================================================
// PUBLIC DISPATCHER
// ============================================================================

export function executeProcessDriftAction(
  action: string,
  params: Record<string, unknown>,
): unknown {
  log.info(`[ProcessDriftEngine] action=${action}`);

  switch (action) {
    case "spc_xbar_r":
      return xbarRChart(params);
    case "spc_cusum":
      return cusumChart(params);
    case "spc_ewma":
      return ewmaChart(params);
    case "spc_capability":
      return processCapability(params);
    default:
      throw new Error(`ProcessDriftEngine: unknown action '${action}'`);
  }
}
