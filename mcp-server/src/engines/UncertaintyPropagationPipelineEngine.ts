/**
 * UncertaintyPropagationPipelineEngine — Cross-engine uncertainty chaining
 *
 * Chains uncertainty through multiple physics engines:
 *   Material(μ,σ) → Force(dist) → Deflection(dist) → Finish(dist) → Tolerance(dist)
 *
 * Propagation modes:
 *   1. Monte Carlo (accurate, N trials through full chain)
 *   2. FOSM / linearization (fast, analytical first-order)
 *   3. Polynomial Chaos Expansion (spectral, medium speed, high accuracy for smooth models)
 *
 * Each stage receives distributions (not point values) and outputs distributions.
 * Per-stage uncertainty contribution breakdown identifies bottlenecks.
 *
 * @module UncertaintyPropagationPipelineEngine
 */

// ── Interfaces ─────────────────────────────────────────────────────

interface AtomicValue<T> {
  value: T; unit: string; formula?: string; confidence?: number;
}

export type PropagationMethod = "mc" | "fosm" | "pce";

export interface UncertainParam {
  name: string;
  mean: number;
  std_dev: number;
  distribution?: "normal" | "lognormal" | "uniform" | "triangular";
  /** For uniform: [min, max]. For triangular: [min, mode, max] */
  bounds?: number[];
}

export interface PipelineStage {
  /** Stage name (e.g., "cutting_force", "deflection", "surface_finish") */
  name: string;
  /** Function key identifying the physics model */
  model: "kienzle_force" | "deflection" | "surface_finish" | "thermal" |
         "tool_life" | "tolerance_stack" | "custom";
  /** Fixed parameters for this stage (not uncertain) */
  fixed_params?: Record<string, number>;
  /** Which output from previous stage feeds this stage's input */
  input_mapping?: Record<string, string>;
}

export interface PipelineInput {
  /** Uncertain input parameters (fed into first stage or globally) */
  uncertain_params: UncertainParam[];
  /** Ordered pipeline stages */
  stages: PipelineStage[];
  /** Propagation method */
  method?: PropagationMethod;
  /** Number of MC trials (for mc method) */
  n_trials?: number;
  /** PCE polynomial order (for pce method) */
  pce_order?: number;
}

export interface StageResult {
  name: string;
  model: string;
  output_mean: number;
  output_std: number;
  output_cv_pct: number;
  ci_95: [number, number];
  /** Fraction of total output variance attributable to this stage */
  variance_contribution_pct: number;
}

export interface PipelineResult {
  /** Per-stage results */
  stages: StageResult[];
  /** Final output distribution */
  final: {
    mean: number;
    std_dev: number;
    cv_pct: number;
    ci_95: [number, number];
    ci_99: [number, number];
  };
  /** Per-input-parameter sensitivity on final output */
  sensitivities: { parameter: string; contribution_pct: number }[];
  /** Method used */
  method: PropagationMethod;
  /** Which stage contributes most variance */
  bottleneck_stage: string;
  /** Which input parameter contributes most variance */
  dominant_parameter: string;
  /** Histogram of final output */
  histogram: { bin_center: number; count: number }[];
  /** Comparison if multiple methods requested */
  method_comparison?: { method: string; mean: number; std_dev: number }[];
}

// ── RNG / Sampling utilities ───────────────────────────────────────

function mulberry32(seed: number): () => number {
  let s = seed | 0;
  return () => {
    s = (s + 0x6D2B79F5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function normInv(u: number): number {
  if (u <= 0) return -8;
  if (u >= 1) return 8;
  if (u === 0.5) return 0;
  const a = [-3.969683028665376e+01, 2.209460984245205e+02,
    -2.759285104469687e+02, 1.383577518672690e+02,
    -3.066479806614716e+01, 2.506628277459239e+00];
  const b = [-5.447609879822406e+01, 1.615858368580409e+02,
    -1.556989798598866e+02, 6.680131188771972e+01, -1.328068155288572e+01];
  const c = [-7.784894002430293e-03, -3.223964580411365e-01,
    -2.400758277161838e+00, -2.549732539343734e+00,
    4.374664141464968e+00, 2.938163982698783e+00];
  const d = [7.784695709041462e-03, 3.224671290700398e-01,
    2.445134137142996e+00, 3.754408661907416e+00];
  const pLow = 0.02425, pHigh = 1 - pLow;
  if (u < pLow) {
    const q = Math.sqrt(-2 * Math.log(u));
    return (((((c[0]*q+c[1])*q+c[2])*q+c[3])*q+c[4])*q+c[5]) /
           ((((d[0]*q+d[1])*q+d[2])*q+d[3])*q+1);
  }
  if (u <= pHigh) {
    const q = u - 0.5, r = q * q;
    return (((((a[0]*r+a[1])*r+a[2])*r+a[3])*r+a[4])*r+a[5])*q /
           (((((b[0]*r+b[1])*r+b[2])*r+b[3])*r+b[4])*r+1);
  }
  const q = Math.sqrt(-2 * Math.log(1 - u));
  return -(((((c[0]*q+c[1])*q+c[2])*q+c[3])*q+c[4])*q+c[5]) /
          ((((d[0]*q+d[1])*q+d[2])*q+d[3])*q+1);
}

/** Latin Hypercube Sampling */
function lhsSample(n: number, dims: number, seed: number): number[][] {
  const rng = mulberry32(seed);
  const result: number[][] = Array.from({ length: n }, () => []);
  for (let d = 0; d < dims; d++) {
    const perm = Array.from({ length: n }, (_, i) => i);
    for (let i = perm.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [perm[i], perm[j]] = [perm[j], perm[i]];
    }
    for (let i = 0; i < n; i++) {
      result[i].push((perm[i] + rng()) / n);
    }
  }
  return result;
}

/** Sample from specified distribution given uniform u in [0,1] */
function sampleDist(u: number, param: UncertainParam): number {
  const dist = param.distribution ?? "normal";
  switch (dist) {
    case "normal":
      return param.mean + param.std_dev * normInv(u);
    case "lognormal": {
      const sigmaLn = Math.sqrt(Math.log(1 + (param.std_dev / param.mean) ** 2));
      const muLn = Math.log(param.mean) - 0.5 * sigmaLn * sigmaLn;
      return Math.exp(muLn + sigmaLn * normInv(u));
    }
    case "uniform": {
      const lo = param.bounds?.[0] ?? (param.mean - Math.sqrt(3) * param.std_dev);
      const hi = param.bounds?.[1] ?? (param.mean + Math.sqrt(3) * param.std_dev);
      return lo + u * (hi - lo);
    }
    case "triangular": {
      const a = param.bounds?.[0] ?? (param.mean - Math.sqrt(6) * param.std_dev);
      const c = param.bounds?.[1] ?? param.mean;
      const bv = param.bounds?.[2] ?? (param.mean + Math.sqrt(6) * param.std_dev);
      const fc = (c - a) / (bv - a);
      if (u < fc) return a + Math.sqrt(u * (bv - a) * (c - a));
      return bv - Math.sqrt((1 - u) * (bv - a) * (bv - c));
    }
    default:
      return param.mean + param.std_dev * normInv(u);
  }
}

// ── Built-in physics models ────────────────────────────────────────

type ModelFn = (inputs: Record<string, number>) => number;

const MODELS: Record<string, ModelFn> = {
  /** Kienzle cutting force: Fc = kc1_1 * ap * fz^(1-mc) */
  kienzle_force: (p) => {
    const kc = p.kc1_1 ?? 1800;
    const mc = p.mc ?? 0.25;
    const ap = p.depth_mm ?? 2;
    const fz = p.feed_mm ?? 0.1;
    const ae = p.width_mm ?? p.tool_diameter_mm ?? 10;
    const D = p.tool_diameter_mm ?? 10;
    const aeRatio = Math.min(1, ae / D);
    return kc * ap * Math.pow(Math.max(fz, 0.001), 1 - mc) * aeRatio;
  },

  /** Tool deflection: δ = F * L³ / (3EI) for cantilever */
  deflection: (p) => {
    const F = p.force_n ?? p.cutting_force_n ?? 500;
    const L = p.overhang_mm ?? (p.tool_diameter_mm ?? 10) * 4;
    const D = p.tool_diameter_mm ?? 10;
    const E = p.elastic_modulus_gpa ?? 600; // carbide
    const I = Math.PI * Math.pow(D / 2, 4) / 4; // mm^4
    return (F * Math.pow(L, 3)) / (3 * E * 1000 * I); // mm
  },

  /** Surface finish: Ra = f²/(32r) + vibration component */
  surface_finish: (p) => {
    const f = p.feed_mm ?? 0.1;
    const r = p.nose_radius_mm ?? 0.8;
    const deflection = p.deflection_mm ?? 0;
    const vib_factor = p.vibration_factor ?? 0;
    const raTheory = (f * f) / (32 * r) * 1000; // μm
    const raVib = deflection * 2; // simplified: deflection adds to roughness
    const raNoise = vib_factor * raTheory * 0.3;
    return raTheory + raVib + raNoise;
  },

  /** Thermal: simplified Jaeger moving heat source */
  thermal: (p) => {
    const Fc = p.force_n ?? p.cutting_force_n ?? 500;
    const V = (p.cutting_speed_mpm ?? 150) / 60 * 1000; // mm/s
    const k = p.thermal_conductivity ?? 50; // W/mK
    const heatPartition = p.heat_partition ?? 0.5;
    const contactLen = p.feed_mm ?? 0.1; // mm
    const q = heatPartition * Fc * V / (contactLen * 1 + 1e-9); // W/mm²
    const alpha = k / ((p.density ?? 7800) * (p.specific_heat ?? 500)); // mm²/s
    const Pe = V * contactLen / (4 * alpha * 1e6 + 1e-9);
    const tempRise = (q * contactLen) / (k * 1000) * Math.sqrt(Math.PI / (4 * Math.max(Pe, 0.1)));
    return 25 + Math.min(tempRise, 1200); // °C
  },

  /** Taylor tool life: T = C / V^(1/n) extended */
  tool_life: (p) => {
    const C = p.taylor_C ?? 300;
    const n = p.taylor_n ?? 0.25;
    const V = p.cutting_speed_mpm ?? 150;
    const f = p.feed_mm ?? 0.1;
    const ap = p.depth_mm ?? 2;
    // Extended Taylor: T = C / (V^(1/n) * f^0.3 * ap^0.15)
    return C / (Math.pow(V, 1 / n) * Math.pow(f, 0.3) * Math.pow(ap, 0.15));
  },

  /** Tolerance stackup: RSS of component tolerances */
  tolerance_stack: (p) => {
    // Sum of variances for dimensions d1..d10 if present
    let sumVar = 0;
    for (let i = 1; i <= 10; i++) {
      const tol = p[`tol_${i}`];
      if (tol !== undefined) {
        sumVar += (tol / 3) ** 2; // ±tol → σ = tol/3 for 3σ
      }
    }
    return Math.sqrt(sumVar) * 3; // 3σ tolerance
  },

  /** Custom pass-through (for user-defined models) */
  custom: (p) => p.output ?? p.value ?? 0,
};

// ── Statistics helpers ─────────────────────────────────────────────

function stats(arr: number[]): { mean: number; std: number } {
  const n = arr.length;
  const mean = arr.reduce((s, v) => s + v, 0) / n;
  const std = Math.sqrt(arr.reduce((s, v) => s + (v - mean) ** 2, 0) / n);
  return { mean, std };
}

function percentile(sorted: number[], p: number): number {
  const idx = p * (sorted.length - 1);
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo];
  return sorted[lo] + (idx - lo) * (sorted[hi] - sorted[lo]);
}

function histogram(
  values: number[], bins: number = 20
): { bin_center: number; count: number }[] {
  if (values.length === 0) return [];
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const binWidth = range / bins;
  const counts = new Array(bins).fill(0);
  for (const v of values) {
    const idx = Math.min(Math.floor((v - min) / binWidth), bins - 1);
    counts[idx]++;
  }
  return counts.map((c, i) => ({
    bin_center: min + (i + 0.5) * binWidth,
    count: c,
  }));
}

// ── FOSM propagation ───────────────────────────────────────────────

function fosmPropagate(
  modelFn: ModelFn,
  baseParams: Record<string, number>,
  uncertainParams: UncertainParam[]
): { mean: number; std_dev: number } {
  const baseval = modelFn(baseParams);
  let totalVar = 0;
  const h = 1e-5; // relative perturbation

  for (const up of uncertainParams) {
    const paramName = up.name;
    if (baseParams[paramName] === undefined) continue;
    const delta = Math.abs(baseParams[paramName]) * h + 1e-12;

    const paramsPlus = { ...baseParams, [paramName]: baseParams[paramName] + delta };
    const paramsMinus = { ...baseParams, [paramName]: baseParams[paramName] - delta };
    const dfdx = (modelFn(paramsPlus) - modelFn(paramsMinus)) / (2 * delta);

    totalVar += (dfdx * up.std_dev) ** 2;
  }

  return { mean: baseval, std_dev: Math.sqrt(totalVar) };
}

// ── PCE (Polynomial Chaos Expansion) ───────────────────────────────

/**
 * Simple Hermite PCE for Gaussian inputs.
 * Fits polynomial coefficients via regression from MC samples.
 */
function pcePropagate(
  modelFn: ModelFn,
  baseParams: Record<string, number>,
  uncertainParams: UncertainParam[],
  order: number,
  nSamples: number,
  seed: number
): { mean: number; std_dev: number } {
  const d = uncertainParams.length;
  if (d === 0) return { mean: modelFn(baseParams), std_dev: 0 };

  // Generate samples and evaluate model
  const samples = lhsSample(nSamples, d, seed);
  const xiValues: number[][] = []; // standardized
  const yValues: number[] = [];

  for (let i = 0; i < nSamples; i++) {
    const xi: number[] = [];
    const params = { ...baseParams };
    for (let j = 0; j < d; j++) {
      const z = normInv(samples[i][j]);
      xi.push(z);
      params[uncertainParams[j].name] = uncertainParams[j].mean + uncertainParams[j].std_dev * z;
    }
    xiValues.push(xi);
    yValues.push(modelFn(params));
  }

  // Build Hermite basis up to given order (total degree)
  // For simplicity, use up to order 2 with all cross-terms for d≤5
  // Basis: 1, xi_1, xi_2, ..., xi_1², xi_1*xi_2, ...
  const basisFns: ((xi: number[]) => number)[] = [() => 1];
  // Order 1
  for (let j = 0; j < d; j++) basisFns.push((xi) => xi[j]);
  // Order 2
  if (order >= 2) {
    for (let j = 0; j < d; j++) basisFns.push((xi) => xi[j] * xi[j] - 1); // He2
    for (let j = 0; j < d; j++) {
      for (let k = j + 1; k < d; k++) {
        basisFns.push((xi) => xi[j] * xi[k]);
      }
    }
  }
  // Order 3 (main effects only for efficiency)
  if (order >= 3) {
    for (let j = 0; j < d; j++) {
      basisFns.push((xi) => xi[j] * xi[j] * xi[j] - 3 * xi[j]); // He3
    }
  }

  const P = basisFns.length;

  // Build design matrix Φ (nSamples × P)
  const Phi: number[][] = [];
  for (let i = 0; i < nSamples; i++) {
    Phi.push(basisFns.map(fn => fn(xiValues[i])));
  }

  // Least squares: c = (Φ'Φ)^(-1) Φ'y
  // Use normal equations with simple Gauss elimination
  const PhiT_Phi: number[][] = Array.from({ length: P }, () => new Array(P).fill(0));
  const PhiT_y: number[] = new Array(P).fill(0);
  for (let i = 0; i < nSamples; i++) {
    for (let j = 0; j < P; j++) {
      PhiT_y[j] += Phi[i][j] * yValues[i];
      for (let k = 0; k < P; k++) {
        PhiT_Phi[j][k] += Phi[i][j] * Phi[i][k];
      }
    }
  }

  // Solve via Gauss elimination
  const aug = PhiT_Phi.map((row, i) => [...row, PhiT_y[i]]);
  for (let col = 0; col < P; col++) {
    let pivot = col;
    for (let row = col + 1; row < P; row++) {
      if (Math.abs(aug[row][col]) > Math.abs(aug[pivot][col])) pivot = row;
    }
    [aug[col], aug[pivot]] = [aug[pivot], aug[col]];
    const dd = aug[col][col];
    if (Math.abs(dd) < 1e-15) continue;
    for (let j = col; j <= P; j++) aug[col][j] /= dd;
    for (let row = 0; row < P; row++) {
      if (row === col) continue;
      const f = aug[row][col];
      for (let j = col; j <= P; j++) aug[row][j] -= f * aug[col][j];
    }
  }
  const coeffs = aug.map(row => row[P]);

  // PCE mean = c[0], variance = sum(c[i]² * <ψi²>) for i>0
  // For orthonormal Hermite basis, <ψi²> = 1 for order-1, 2 for order-2, 6 for order-3
  const pceMean = coeffs[0];
  let pceVar = 0;
  let idx = 1;
  // Order 1 terms: <Hi²> = 1
  for (let j = 0; j < d && idx < P; j++, idx++) pceVar += coeffs[idx] ** 2;
  // Order 2 diagonal: <(x²-1)²> = E[x⁴-2x²+1] = 3-2+1 = 2
  if (order >= 2) {
    for (let j = 0; j < d && idx < P; j++, idx++) pceVar += coeffs[idx] ** 2 * 2;
    // Cross terms: <(xi·xj)²> = 1
    for (let j = 0; j < d; j++) {
      for (let k = j + 1; k < d && idx < P; k++, idx++) pceVar += coeffs[idx] ** 2;
    }
  }
  // Order 3: <He3²> = 6
  if (order >= 3) {
    for (let j = 0; j < d && idx < P; j++, idx++) pceVar += coeffs[idx] ** 2 * 6;
  }

  return { mean: pceMean, std_dev: Math.sqrt(Math.max(0, pceVar)) };
}

// ── Engine class ───────────────────────────────────────────────────

class UncertaintyPropagationPipelineEngine {
  /**
   * Propagate uncertainty through a chain of physics models.
   */
  propagate(input: PipelineInput): AtomicValue<PipelineResult> {
    // Self-validate (mirrors planJob/reportFor): propagate + propagateMC/FOSM/PCE
    // dereference input.uncertain_params (line ~460/476) and input.stages (line ~493)
    // with no downstream guard, so a missing/empty array would throw a TypeError.
    // Fail loud here so EVERY caller (the prism_ai dispatcher included) gets a clear
    // error instead of a crash.
    if (!input || !Array.isArray(input.uncertain_params) || input.uncertain_params.length === 0) {
      throw new Error("UncertaintyPropagationPipelineEngine.propagate: uncertain_params must be a non-empty array");
    }
    if (!Array.isArray(input.stages) || input.stages.length === 0) {
      throw new Error("UncertaintyPropagationPipelineEngine.propagate: stages must be a non-empty array");
    }
    const method = input.method ?? "mc";
    const MAX_TRIALS = 100_000;
    const N = Math.min(input.n_trials ?? 2000, MAX_TRIALS);
    const pceOrder = input.pce_order ?? 2;

    // Build base parameter map from uncertain params (means)
    const baseParams: Record<string, number> = {};
    for (const up of input.uncertain_params) {
      baseParams[up.name] = up.mean;
    }

    if (method === "mc") {
      return this.propagateMC(input, N, baseParams);
    } else if (method === "fosm") {
      return this.propagateFOSM(input, baseParams);
    } else {
      return this.propagatePCE(input, N, pceOrder, baseParams);
    }
  }

  private propagateMC(
    input: PipelineInput, N: number, baseParams: Record<string, number>
  ): AtomicValue<PipelineResult> {
    const d = input.uncertain_params.length;
    const samples = lhsSample(N, d, 42);

    // Per-stage tracking
    const stageOutputs: number[][] = input.stages.map(() => []);
    const finalOutputs: number[] = [];

    for (let trial = 0; trial < N; trial++) {
      // Sample uncertain parameters
      const trialParams = { ...baseParams };
      for (let j = 0; j < d; j++) {
        trialParams[input.uncertain_params[j].name] =
          sampleDist(samples[trial][j], input.uncertain_params[j]);
      }

      // Chain through stages
      let prevOutput: Record<string, number> = {};
      for (let si = 0; si < input.stages.length; si++) {
        const stage = input.stages[si];
        const modelFn = MODELS[stage.model] ?? MODELS.custom;

        // Build stage input: trial params + fixed + mapped from previous
        const stageInput = { ...trialParams, ...(stage.fixed_params ?? {}) };
        if (stage.input_mapping) {
          for (const [targetKey, sourceKey] of Object.entries(stage.input_mapping)) {
            if (prevOutput[sourceKey] !== undefined) {
              stageInput[targetKey] = prevOutput[sourceKey];
            }
          }
        }

        const output = modelFn(stageInput);
        stageOutputs[si].push(output);

        // Pass output forward
        prevOutput = { ...stageInput, output, value: output };
        // Common mappings
        if (stage.model === "kienzle_force") {
          prevOutput.force_n = output;
          prevOutput.cutting_force_n = output;
        } else if (stage.model === "deflection") {
          prevOutput.deflection_mm = output;
        } else if (stage.model === "thermal") {
          prevOutput.temperature_c = output;
        }
      }

      finalOutputs.push(stageOutputs[stageOutputs.length - 1][trial]);
    }

    return this.buildResult(input, stageOutputs, finalOutputs, "mc", baseParams);
  }

  private propagateFOSM(
    input: PipelineInput, baseParams: Record<string, number>
  ): AtomicValue<PipelineResult> {
    // Chain FOSM through stages
    const stageResults: { mean: number; std: number }[] = [];
    let prevOutput: Record<string, number> = {};

    for (const stage of input.stages) {
      const modelFn = MODELS[stage.model] ?? MODELS.custom;
      const stageInput = { ...baseParams, ...(stage.fixed_params ?? {}) };
      if (stage.input_mapping) {
        for (const [targetKey, sourceKey] of Object.entries(stage.input_mapping)) {
          if (prevOutput[sourceKey] !== undefined) {
            stageInput[targetKey] = prevOutput[sourceKey];
          }
        }
      }

      const fosm = fosmPropagate(modelFn, stageInput, input.uncertain_params);
      stageResults.push({ mean: fosm.mean, std: fosm.std_dev });

      prevOutput = { ...stageInput, output: fosm.mean, value: fosm.mean };
      if (stage.model === "kienzle_force") {
        prevOutput.force_n = fosm.mean;
        prevOutput.cutting_force_n = fosm.mean;
      } else if (stage.model === "deflection") {
        prevOutput.deflection_mm = fosm.mean;
      }
    }

    // Build result from FOSM (no histogram)
    const last = stageResults[stageResults.length - 1];
    const totalVar = last.std ** 2;

    const stages: StageResult[] = input.stages.map((s, i) => ({
      name: s.name, model: s.model,
      output_mean: stageResults[i].mean,
      output_std: stageResults[i].std,
      output_cv_pct: stageResults[i].mean !== 0 ? (stageResults[i].std / Math.abs(stageResults[i].mean)) * 100 : 0,
      ci_95: [stageResults[i].mean - 1.96 * stageResults[i].std,
              stageResults[i].mean + 1.96 * stageResults[i].std] as [number, number],
      variance_contribution_pct: totalVar > 0 ? (stageResults[i].std ** 2 / totalVar) * 100 : 0,
    }));

    const bottleneck = stages.reduce((b, s) => s.variance_contribution_pct > b.variance_contribution_pct ? s : b);

    return {
      value: {
        stages,
        final: {
          mean: last.mean, std_dev: last.std,
          cv_pct: last.mean !== 0 ? (last.std / Math.abs(last.mean)) * 100 : 0,
          ci_95: [last.mean - 1.96 * last.std, last.mean + 1.96 * last.std],
          ci_99: [last.mean - 2.576 * last.std, last.mean + 2.576 * last.std],
        },
        sensitivities: input.uncertain_params.map(p => ({
          parameter: p.name, contribution_pct: 100 / input.uncertain_params.length,
        })),
        method: "fosm",
        bottleneck_stage: bottleneck.name,
        dominant_parameter: input.uncertain_params[0]?.name ?? "none",
        histogram: [],
      },
      unit: "uncertainty_pipeline",
      formula: "FOSM: σ²_y = Σ(∂f/∂xi)²·σ²_xi, chained per stage",
      confidence: 0.70,
    };
  }

  private propagatePCE(
    input: PipelineInput, N: number, order: number,
    baseParams: Record<string, number>
  ): AtomicValue<PipelineResult> {
    // For PCE, propagate through entire chain as one composite function
    const compositeModel: ModelFn = (params) => {
      let prev: Record<string, number> = {};
      let lastOutput = 0;
      for (const stage of input.stages) {
        const modelFn = MODELS[stage.model] ?? MODELS.custom;
        const stageInput = { ...params, ...(stage.fixed_params ?? {}) };
        if (stage.input_mapping) {
          for (const [targetKey, sourceKey] of Object.entries(stage.input_mapping)) {
            if (prev[sourceKey] !== undefined) stageInput[targetKey] = prev[sourceKey];
          }
        }
        lastOutput = modelFn(stageInput);
        prev = { ...stageInput, output: lastOutput, value: lastOutput };
        if (stage.model === "kienzle_force") {
          prev.force_n = lastOutput; prev.cutting_force_n = lastOutput;
        } else if (stage.model === "deflection") prev.deflection_mm = lastOutput;
      }
      return lastOutput;
    };

    const pce = pcePropagate(compositeModel, baseParams, input.uncertain_params, order, N, 42);

    // Also run MC for histogram and comparison
    const mcResult = this.propagateMC(input, N, baseParams);
    const mcVal = mcResult.value;

    return {
      value: {
        stages: mcVal.stages,
        final: {
          mean: pce.mean, std_dev: pce.std_dev,
          cv_pct: pce.mean !== 0 ? (pce.std_dev / Math.abs(pce.mean)) * 100 : 0,
          ci_95: [pce.mean - 1.96 * pce.std_dev, pce.mean + 1.96 * pce.std_dev],
          ci_99: [pce.mean - 2.576 * pce.std_dev, pce.mean + 2.576 * pce.std_dev],
        },
        sensitivities: mcVal.sensitivities,
        method: "pce",
        bottleneck_stage: mcVal.bottleneck_stage,
        dominant_parameter: mcVal.dominant_parameter,
        histogram: mcVal.histogram,
        method_comparison: [
          { method: "pce", mean: pce.mean, std_dev: pce.std_dev },
          { method: "mc", mean: mcVal.final.mean, std_dev: mcVal.final.std_dev },
        ],
      },
      unit: "uncertainty_pipeline",
      formula: `PCE order=${order}: y ≈ Σ cα·Ψα(ξ), ${input.uncertain_params.length}D Hermite basis`,
      confidence: 0.85,
    };
  }

  private buildResult(
    input: PipelineInput,
    stageOutputs: number[][],
    finalOutputs: number[],
    method: PropagationMethod,
    baseParams: Record<string, number>
  ): AtomicValue<PipelineResult> {
    const finalSorted = [...finalOutputs].sort((a, b) => a - b);
    const finalStats = stats(finalOutputs);

    // Per-stage statistics
    const totalFinalVar = finalStats.std ** 2;
    const stageStats = stageOutputs.map(out => stats(out));
    const stages: StageResult[] = input.stages.map((s, i) => ({
      name: s.name, model: s.model,
      output_mean: stageStats[i].mean,
      output_std: stageStats[i].std,
      output_cv_pct: stageStats[i].mean !== 0
        ? (stageStats[i].std / Math.abs(stageStats[i].mean)) * 100 : 0,
      ci_95: [percentile(
        [...stageOutputs[i]].sort((a, b) => a - b), 0.025),
        percentile([...stageOutputs[i]].sort((a, b) => a - b), 0.975)] as [number, number],
      variance_contribution_pct: totalFinalVar > 0
        ? (stageStats[i].std ** 2 / totalFinalVar) * 100 : 0,
    }));

    // Per-parameter sensitivity via correlation with final output
    const sensitivities = input.uncertain_params.map(p => {
      // Approximate: run FOSM on full chain
      const compositeModel: ModelFn = (params) => {
        let prev: Record<string, number> = {};
        let last = 0;
        for (const stage of input.stages) {
          const fn = MODELS[stage.model] ?? MODELS.custom;
          const si = { ...params, ...(stage.fixed_params ?? {}) };
          if (stage.input_mapping) {
            for (const [tk, sk] of Object.entries(stage.input_mapping)) {
              if (prev[sk] !== undefined) si[tk] = prev[sk];
            }
          }
          last = fn(si);
          prev = { ...si, output: last, value: last };
          if (stage.model === "kienzle_force") { prev.force_n = last; prev.cutting_force_n = last; }
          else if (stage.model === "deflection") prev.deflection_mm = last;
        }
        return last;
      };
      const h = Math.abs(baseParams[p.name] ?? 1) * 1e-5 + 1e-12;
      const pPlus = { ...baseParams, [p.name]: (baseParams[p.name] ?? p.mean) + h };
      const pMinus = { ...baseParams, [p.name]: (baseParams[p.name] ?? p.mean) - h };
      const dfdx = (compositeModel(pPlus) - compositeModel(pMinus)) / (2 * h);
      return { parameter: p.name, contribution_pct: 0, _var: (dfdx * p.std_dev) ** 2 };
    });

    const totalSensVar = sensitivities.reduce((s, v) => s + v._var, 0);
    for (const s of sensitivities) {
      s.contribution_pct = totalSensVar > 0 ? (s._var / totalSensVar) * 100 : 0;
    }

    const bottleneck = stages.reduce((b, s) =>
      s.variance_contribution_pct > b.variance_contribution_pct ? s : b);
    const dominant = sensitivities.reduce((b, s) =>
      s.contribution_pct > b.contribution_pct ? s : b);

    return {
      value: {
        stages,
        final: {
          mean: finalStats.mean,
          std_dev: finalStats.std,
          cv_pct: finalStats.mean !== 0
            ? (finalStats.std / Math.abs(finalStats.mean)) * 100 : 0,
          ci_95: [percentile(finalSorted, 0.025), percentile(finalSorted, 0.975)],
          ci_99: [percentile(finalSorted, 0.005), percentile(finalSorted, 0.995)],
        },
        sensitivities: sensitivities.map(({ parameter, contribution_pct }) =>
          ({ parameter, contribution_pct })),
        method,
        bottleneck_stage: bottleneck.name,
        dominant_parameter: dominant.parameter,
        histogram: histogram(finalOutputs),
      },
      unit: "uncertainty_pipeline",
      formula: `MC(N=${finalOutputs.length}): ${input.stages.map(s => s.model).join(" → ")}`,
      confidence: 0.85,
    };
  }
}

/** Singleton instance */
export const uncertaintyPropagationPipelineEngine =
  new UncertaintyPropagationPipelineEngine();
