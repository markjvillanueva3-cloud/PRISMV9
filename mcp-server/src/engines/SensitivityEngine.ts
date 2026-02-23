/**
 * PRISM Manufacturing Intelligence — Sensitivity Engine
 * R16-MS4: What-If Parameter Sensitivity Analysis
 *
 * Performs parametric sweeps over cutting parameters to identify
 * sensitivity, optimal operating windows, and Pareto-optimal
 * trade-off frontiers (e.g., productivity vs surface quality).
 *
 * MCP actions:
 *   sensitivity_1d         — Single-parameter sweep (e.g., feed vs Ra)
 *   sensitivity_2d         — Two-parameter heat map (e.g., speed × feed → Ra)
 *   sensitivity_pareto     — Multi-objective Pareto front (e.g., MRR vs Ra)
 *   sensitivity_montecarlo — Monte Carlo uncertainty propagation
 *
 * @version 1.0.0  R16-MS4
 */

import { log } from "../utils/Logger.js";

// ============================================================================
// TYPES
// ============================================================================

export interface Sensitivity1DInput {
  parameter: string;           // Parameter to sweep: 'feed', 'speed', 'depth', 'nose_radius'
  range: [number, number];     // [min, max]
  steps?: number;              // Number of steps (default: 20)
  base_conditions: BaseConditions;
  output_metric: string;       // 'Ra', 'Rz', 'MRR', 'force', 'power', 'temperature', 'tool_life'
}

export interface Sensitivity2DInput {
  param_x: string;
  range_x: [number, number];
  param_y: string;
  range_y: [number, number];
  steps_x?: number;
  steps_y?: number;
  base_conditions: BaseConditions;
  output_metric: string;
}

export interface ParetoInput {
  objectives: string[];        // 2-3 objectives: ['MRR', 'Ra', 'tool_life']
  constraints?: Record<string, number>;  // Max/min constraints: { Ra_max: 1.6, force_max: 2000 }
  population_size?: number;    // Default: 100
  base_conditions: BaseConditions;
}

export interface MonteCarloInput {
  parameters: Record<string, { mean: number; std_dev: number }>;
  samples?: number;            // Default: 1000
  base_conditions: BaseConditions;
  output_metrics: string[];
}

export interface BaseConditions {
  material?: string;
  tool_diameter_mm?: number;
  tool_nose_radius_mm?: number;
  feed_mmrev?: number;
  cutting_speed_mpm?: number;
  depth_of_cut_mm?: number;
  number_of_flutes?: number;
  spindle_rpm?: number;
}

export interface Sensitivity1DResult {
  parameter: string;
  metric: string;
  values: number[];
  results: number[];
  optimal_value: number;
  optimal_result: number;
  sensitivity_gradient: number;  // d(metric)/d(param) at midpoint
  monotonic: boolean;
}

export interface Sensitivity2DResult {
  param_x: string;
  param_y: string;
  metric: string;
  x_values: number[];
  y_values: number[];
  z_matrix: number[][];        // z_matrix[y_idx][x_idx]
  optimal: { x: number; y: number; z: number };
}

export interface ParetoResult {
  objectives: string[];
  pareto_front: Array<Record<string, number>>;  // Each point has param values + objective values
  utopia_point: Record<string, number>;
  nadir_point: Record<string, number>;
  recommended: Record<string, number>;  // Balanced point
}

export interface MonteCarloResult {
  samples: number;
  metrics: Record<string, {
    mean: number;
    std_dev: number;
    p5: number;
    p50: number;
    p95: number;
    distribution: number[];    // Histogram bins (20 bins)
  }>;
  correlations: Record<string, Record<string, number>>;
}

// ============================================================================
// METRIC EVALUATORS
// ============================================================================

function evaluateMetric(metric: string, conds: BaseConditions): number {
  const f = conds.feed_mmrev ?? 0.2;
  const vc = conds.cutting_speed_mpm ?? 150;
  const ap = conds.depth_of_cut_mm ?? 2;
  const re = conds.tool_nose_radius_mm ?? 0.8;
  const D = conds.tool_diameter_mm ?? 12;
  const z = conds.number_of_flutes ?? 4;

  switch (metric.toLowerCase()) {
    case 'ra':
      // Kinematic Ra [μm]
      return +(Math.max(0.1, (f * f / (32 * re)) * 1000)).toFixed(3);
    case 'rz':
      return +(Math.max(0.4, (f * f / (32 * re)) * 1000 * 4)).toFixed(3);
    case 'mrr':
      // Material removal rate [cm³/min]
      return +(vc * f * ap * 1000 / 1e3).toFixed(2);
    case 'force':
      // Approximate cutting force [N] (Kienzle simplified)
      return +(1500 * f * ap * (1 - 0.26 * Math.log10(f * Math.sin(Math.PI / 4)))).toFixed(1);
    case 'power':
      // Cutting power [kW]
      return +(1500 * f * ap * vc / 60000).toFixed(3);
    case 'temperature':
      // Tool tip temperature [°C] (empirical)
      return +(200 * Math.pow(vc / 100, 0.4) * Math.pow(f, 0.2) * Math.pow(ap, 0.1)).toFixed(1);
    case 'tool_life':
      // Taylor tool life [min] (simplified: T = C / (Vc^n * f^m))
      return +(Math.max(1, 3e8 / (Math.pow(vc, 3) * Math.pow(f, 1.5) * Math.pow(ap, 0.5)))).toFixed(1);
    case 'torque':
      // Torque [Nm]
      return +(1500 * f * ap * D / 2000).toFixed(2);
    case 'deflection':
      // Tool deflection [μm]
      return +((1500 * f * ap * Math.pow(60, 3)) / (3 * 620e3 * Math.PI * Math.pow(D, 4) / 64) * 1000).toFixed(2);
    default:
      return evaluateMetric('ra', conds); // Default to Ra
  }
}

function applyParam(base: BaseConditions, param: string, value: number): BaseConditions {
  const conds = { ...base };
  switch (param.toLowerCase()) {
    case 'feed':
    case 'feed_mmrev': conds.feed_mmrev = value; break;
    case 'speed':
    case 'cutting_speed':
    case 'cutting_speed_mpm': conds.cutting_speed_mpm = value; break;
    case 'depth':
    case 'depth_of_cut':
    case 'depth_of_cut_mm': conds.depth_of_cut_mm = value; break;
    case 'nose_radius':
    case 'tool_nose_radius_mm': conds.tool_nose_radius_mm = value; break;
    case 'diameter':
    case 'tool_diameter_mm': conds.tool_diameter_mm = value; break;
  }
  return conds;
}

// ============================================================================
// sensitivity_1d
// ============================================================================

export function sensitivity1D(input: Sensitivity1DInput): Sensitivity1DResult {
  const steps = input.steps ?? 20;
  const [min, max] = input.range;
  const dx = (max - min) / (steps - 1);

  const values: number[] = [];
  const results: number[] = [];

  let optVal = min, optRes = Infinity;
  let isLowerBetter = true;
  if (['mrr', 'tool_life'].includes(input.output_metric.toLowerCase())) {
    isLowerBetter = false;
    optRes = -Infinity;
  }

  for (let i = 0; i < steps; i++) {
    const v = +(min + i * dx).toFixed(4);
    const conds = applyParam(input.base_conditions, input.parameter, v);
    const r = evaluateMetric(input.output_metric, conds);
    values.push(v);
    results.push(r);
    if ((isLowerBetter && r < optRes) || (!isLowerBetter && r > optRes)) {
      optRes = r;
      optVal = v;
    }
  }

  // Gradient at midpoint
  const midIdx = Math.floor(steps / 2);
  const gradient = midIdx > 0 && midIdx < steps - 1
    ? (results[midIdx + 1]! - results[midIdx - 1]!) / (values[midIdx + 1]! - values[midIdx - 1]!)
    : 0;

  // Monotonicity check
  let monotonic = true;
  for (let i = 2; i < results.length; i++) {
    const d1 = results[i]! - results[i - 1]!;
    const d0 = results[i - 1]! - results[i - 2]!;
    if (d1 * d0 < 0) { monotonic = false; break; }
  }

  return {
    parameter: input.parameter,
    metric: input.output_metric,
    values,
    results,
    optimal_value: optVal,
    optimal_result: optRes,
    sensitivity_gradient: +gradient.toFixed(4),
    monotonic,
  };
}

// ============================================================================
// sensitivity_2d
// ============================================================================

export function sensitivity2D(input: Sensitivity2DInput): Sensitivity2DResult {
  const stepsX = input.steps_x ?? 15;
  const stepsY = input.steps_y ?? 15;
  const [minX, maxX] = input.range_x;
  const [minY, maxY] = input.range_y;
  const dxStep = (maxX - minX) / (stepsX - 1);
  const dyStep = (maxY - minY) / (stepsY - 1);

  const xVals: number[] = [];
  const yVals: number[] = [];
  const zMatrix: number[][] = [];

  for (let i = 0; i < stepsX; i++) xVals.push(+(minX + i * dxStep).toFixed(4));
  for (let j = 0; j < stepsY; j++) yVals.push(+(minY + j * dyStep).toFixed(4));

  let optX = minX, optY = minY, optZ = Infinity;
  const isLowerBetter = !['mrr', 'tool_life'].includes(input.output_metric.toLowerCase());
  if (!isLowerBetter) optZ = -Infinity;

  for (let j = 0; j < stepsY; j++) {
    const row: number[] = [];
    for (let i = 0; i < stepsX; i++) {
      let conds = applyParam(input.base_conditions, input.param_x, xVals[i]!);
      conds = applyParam(conds, input.param_y, yVals[j]!);
      const z = evaluateMetric(input.output_metric, conds);
      row.push(z);
      if ((isLowerBetter && z < optZ) || (!isLowerBetter && z > optZ)) {
        optZ = z; optX = xVals[i]!; optY = yVals[j]!;
      }
    }
    zMatrix.push(row);
  }

  return {
    param_x: input.param_x,
    param_y: input.param_y,
    metric: input.output_metric,
    x_values: xVals,
    y_values: yVals,
    z_matrix: zMatrix,
    optimal: { x: optX, y: optY, z: optZ },
  };
}

// ============================================================================
// sensitivity_pareto
// ============================================================================

export function sensitivityPareto(input: ParetoInput): ParetoResult {
  const popSize = input.population_size ?? 100;
  const objectives = input.objectives;

  // Generate random parameter combinations
  const base = input.base_conditions;
  const candidates: Array<Record<string, number>> = [];

  for (let i = 0; i < popSize; i++) {
    const feed = (base.feed_mmrev ?? 0.2) * (0.3 + Math.random() * 2.0);
    const speed = (base.cutting_speed_mpm ?? 150) * (0.4 + Math.random() * 1.5);
    const depth = (base.depth_of_cut_mm ?? 2) * (0.3 + Math.random() * 2.0);

    const conds = { ...base, feed_mmrev: feed, cutting_speed_mpm: speed, depth_of_cut_mm: depth };

    const point: Record<string, number> = {
      feed_mmrev: +feed.toFixed(3),
      cutting_speed_mpm: +speed.toFixed(1),
      depth_of_cut_mm: +depth.toFixed(2),
    };

    // Evaluate all objectives
    let feasible = true;
    for (const obj of objectives) {
      point[obj] = evaluateMetric(obj, conds);
    }

    // Check constraints
    if (input.constraints) {
      for (const [key, limit] of Object.entries(input.constraints)) {
        const metricName = key.replace(/_max$/, '').replace(/_min$/, '');
        const val = evaluateMetric(metricName, conds);
        if (key.endsWith('_max') && val > limit) feasible = false;
        if (key.endsWith('_min') && val < limit) feasible = false;
      }
    }

    if (feasible) candidates.push(point);
  }

  // Non-dominated sorting (Pareto front extraction)
  const isLowerBetter: Record<string, boolean> = {};
  for (const obj of objectives) {
    isLowerBetter[obj] = !['mrr', 'tool_life'].includes(obj.toLowerCase());
  }

  const front: Array<Record<string, number>> = [];
  for (const a of candidates) {
    let dominated = false;
    for (const b of candidates) {
      if (a === b) continue;
      let bDominates = true;
      let bStrictlyBetter = false;
      for (const obj of objectives) {
        const better = isLowerBetter[obj] ? b[obj]! <= a[obj]! : b[obj]! >= a[obj]!;
        const strictlyBetter = isLowerBetter[obj] ? b[obj]! < a[obj]! : b[obj]! > a[obj]!;
        if (!better) { bDominates = false; break; }
        if (strictlyBetter) bStrictlyBetter = true;
      }
      if (bDominates && bStrictlyBetter) { dominated = true; break; }
    }
    if (!dominated) front.push(a);
  }

  // Utopia and nadir
  const utopia: Record<string, number> = {};
  const nadir: Record<string, number> = {};
  for (const obj of objectives) {
    const vals = front.map(p => p[obj]!);
    utopia[obj] = isLowerBetter[obj] ? Math.min(...vals) : Math.max(...vals);
    nadir[obj] = isLowerBetter[obj] ? Math.max(...vals) : Math.min(...vals);
  }

  // Recommended: closest to utopia (normalized)
  let bestDist = Infinity;
  let recommended = front[0] ?? {};
  for (const p of front) {
    let dist = 0;
    for (const obj of objectives) {
      const range = Math.abs(nadir[obj]! - utopia[obj]!) || 1;
      const norm = (p[obj]! - utopia[obj]!) / range;
      dist += norm * norm;
    }
    if (dist < bestDist) { bestDist = dist; recommended = p; }
  }

  return {
    objectives,
    pareto_front: front.slice(0, 50), // Cap at 50 points
    utopia_point: utopia,
    nadir_point: nadir,
    recommended,
  };
}

// ============================================================================
// sensitivity_montecarlo
// ============================================================================

export function sensitivityMonteCarlo(input: MonteCarloInput): MonteCarloResult {
  const N = input.samples ?? 1000;
  const metrics = input.output_metrics;

  // Collect samples
  const metricSamples: Record<string, number[]> = {};
  for (const m of metrics) metricSamples[m] = [];

  for (let i = 0; i < N; i++) {
    // Generate random parameters from distributions
    const conds = { ...input.base_conditions };
    const paramVals: Record<string, number> = {};

    for (const [param, dist] of Object.entries(input.parameters)) {
      // Box-Muller transform for normal distribution
      const u1 = Math.random();
      const u2 = Math.random();
      const z = Math.sqrt(-2 * Math.log(u1 + 1e-10)) * Math.cos(2 * Math.PI * u2);
      const val = Math.max(0.001, dist.mean + z * dist.std_dev);
      paramVals[param] = val;
      applyParamInPlace(conds, param, val);
    }

    for (const m of metrics) {
      metricSamples[m]!.push(evaluateMetric(m, conds));
    }
  }

  // Statistics
  const results: MonteCarloResult['metrics'] = {};
  for (const m of metrics) {
    const samples = metricSamples[m]!.sort((a, b) => a - b);
    const mean = samples.reduce((a, b) => a + b, 0) / N;
    const variance = samples.reduce((a, b) => a + (b - mean) ** 2, 0) / (N - 1);
    const stdDev = Math.sqrt(variance);

    // Histogram (20 bins)
    const min = samples[0]!;
    const max = samples[samples.length - 1]!;
    const binWidth = (max - min) / 20 || 1;
    const hist = new Array(20).fill(0);
    for (const s of samples) {
      const bin = Math.min(19, Math.floor((s - min) / binWidth));
      hist[bin]++;
    }

    results[m] = {
      mean: +mean.toFixed(3),
      std_dev: +stdDev.toFixed(3),
      p5: +samples[Math.floor(N * 0.05)]!.toFixed(3),
      p50: +samples[Math.floor(N * 0.50)]!.toFixed(3),
      p95: +samples[Math.floor(N * 0.95)]!.toFixed(3),
      distribution: hist,
    };
  }

  // Correlations
  const corr: Record<string, Record<string, number>> = {};
  for (const m1 of metrics) {
    corr[m1] = {};
    for (const m2 of metrics) {
      const s1 = metricSamples[m1]!;
      const s2 = metricSamples[m2]!;
      const mean1 = results[m1]!.mean;
      const mean2 = results[m2]!.mean;
      const std1 = results[m1]!.std_dev;
      const std2 = results[m2]!.std_dev;
      if (std1 === 0 || std2 === 0) { corr[m1]![m2] = 0; continue; }
      let cov = 0;
      for (let i = 0; i < N; i++) cov += (s1[i]! - mean1) * (s2[i]! - mean2);
      corr[m1]![m2] = +(cov / ((N - 1) * std1 * std2)).toFixed(3);
    }
  }

  return { samples: N, metrics: results, correlations: corr };
}

function applyParamInPlace(conds: BaseConditions, param: string, value: number): void {
  switch (param.toLowerCase()) {
    case 'feed':
    case 'feed_mmrev': conds.feed_mmrev = value; break;
    case 'speed':
    case 'cutting_speed_mpm': conds.cutting_speed_mpm = value; break;
    case 'depth':
    case 'depth_of_cut_mm': conds.depth_of_cut_mm = value; break;
    case 'nose_radius':
    case 'tool_nose_radius_mm': conds.tool_nose_radius_mm = value; break;
    case 'diameter':
    case 'tool_diameter_mm': conds.tool_diameter_mm = value; break;
  }
}

// ============================================================================
// DISPATCHER
// ============================================================================

export function executeSensitivityAction(action: string, params: Record<string, unknown>): unknown {
  log.info(`[Sensitivity] action=${action}`);

  switch (action) {
    case 'sensitivity_1d':
      return sensitivity1D(params as unknown as Sensitivity1DInput);
    case 'sensitivity_2d':
      return sensitivity2D(params as unknown as Sensitivity2DInput);
    case 'sensitivity_pareto':
      return sensitivityPareto(params as unknown as ParetoInput);
    case 'sensitivity_montecarlo':
      return sensitivityMonteCarlo(params as unknown as MonteCarloInput);
    default:
      throw new Error(`Unknown Sensitivity action: ${action}`);
  }
}
