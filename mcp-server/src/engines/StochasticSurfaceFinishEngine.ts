/**
 * StochasticSurfaceFinishEngine
 *
 * Stochastic surface finish prediction combining:
 * - Deterministic theoretical Ra (turning/milling geometry)
 * - Vibration-induced roughness (runout + chatter proximity)
 * - Built-Up Edge (BUE) Bernoulli model (material & speed dependent)
 * - Flank wear scatter (VB^1.5 power law)
 * - Correlated inputs via Cholesky decomposition
 * - Monte Carlo and FOSM uncertainty propagation
 * - Sobol sensitivity indices
 * - Process capability (Cpk, sigma level, PPM)
 *
 * Kienzle constants sourced from canonical physics DB (src/physics/constants.ts).
 *
 * @module StochasticSurfaceFinishEngine
 */

import { getKienzle } from "../physics/constants.js";

// ── AtomicValue wrapper ──────────────────────────────
interface AtomicValue<T> { value: T; unit: string; formula?: string; confidence?: number; }

// ── Input / Output interfaces ────────────────────────

/** Stochastic surface finish prediction input. */
export interface StochasticFinishInput {
  /** Material designation, e.g. "Ti-6Al-4V", "AISI 4140" */
  material: string;
  /** Feed per revolution (turning) or feed per tooth (milling), mm */
  feed_mm: number;
  /** Tool nose radius, mm */
  tool_nose_radius_mm: number;
  /** Cutting speed, m/min */
  cutting_speed_mpm: number;
  /** Operation type */
  operation?: 'turning' | 'milling';
  /** Tool diameter for milling, mm */
  tool_diameter_mm?: number;
  /** Number of flutes (milling) */
  flute_count?: number;
  /** Radial runout, μm (default 5) */
  runout_um?: number;
  /** Damping ratio ζ (default 0.03) */
  damping_ratio?: number;
  /** Natural frequency, Hz (default 800) */
  natural_freq_hz?: number;
  /** Depth of cut, mm */
  depth_mm?: number;
  /** Width of cut, mm */
  width_mm?: number;
  /** Current flank wear VB, mm (default 0) */
  vb_mm?: number;
  /** Target Ra for Cpk calculation, μm */
  target_ra_um?: number;
  /** Number of MC trials (default 2000) */
  n_trials?: number;
  /** Propagation method (default "both") */
  method?: 'mc' | 'fosm' | 'both';
}

/** Scatter breakdown entry. */
interface ScatterEntry {
  source: string;
  mean_contribution_um: number;
  pct_of_total: number;
}

/** Sobol index entry. */
interface SobolEntry {
  parameter: string;
  Si: number;
  STi: number;
}

/** Histogram bin. */
interface HistBin {
  bin_center: number;
  count: number;
}

/** Full stochastic surface finish result. */
export interface StochasticFinishResult {
  theoretical_ra_um: number;
  mean_ra_um: number;
  std_dev_um: number;
  ci_95: [number, number];
  ci_99: [number, number];
  cv_percent: number;
  scatter_breakdown: ScatterEntry[];
  p_exceed_target: number | null;
  cpk: number | null;
  sigma_level: number | null;
  ppm_defective: number | null;
  bue_probability: number;
  chatter_proximity: number;
  sobol_indices: SobolEntry[];
  fosm: { mean: number; std_dev: number } | null;
  mc: { mean: number; std_dev: number; histogram: HistBin[] } | null;
  dominant_uncertainty: string;
  recommendations: string[];
}

// ── Material database ──────────────────────────────────────────────

interface MaterialProps {
  /** Optimal cutting speed for BUE curve, m/min */
  optimal_speed_mpm: number;
  /** BUE susceptibility 0-1 (Al high, steel moderate, Ti moderate) */
  bue_susceptibility: number;
  /** Wear coefficient k_wear for ΔRa_wear = k·VB^1.5 */
  k_wear: number;
  /** Specific cutting force coefficient, N/mm² */
  kc: number;
  /** Force scatter coefficient (CV of cutting force) */
  force_cv: number;
}

/** Build surface-finish-specific material props, sourcing kc from canonical Kienzle DB. */
function buildSFProps(
  canonicalKey: string,
  overrides: Omit<MaterialProps, 'kc'> & { kc_override?: number },
): MaterialProps {
  const canonical = getKienzle(canonicalKey);
  return {
    ...overrides,
    kc: overrides.kc_override ?? canonical.kc1_1,
  };
}

const MATERIAL_DB: Record<string, MaterialProps> = {
  'Al 7075-T6': buildSFProps('aluminum_7075', {
    optimal_speed_mpm: 300, bue_susceptibility: 0.85, k_wear: 2.0, force_cv: 0.08,
  }),
  'Al 6061-T6': buildSFProps('aluminum_6061', {
    optimal_speed_mpm: 350, bue_susceptibility: 0.80, k_wear: 2.0, force_cv: 0.08,
    kc_override: 750,  // slightly lower than canonical 700 due to temper state measurement
  }),
  'AISI 4140': buildSFProps('alloy_steel', {
    optimal_speed_mpm: 180, bue_susceptibility: 0.35, k_wear: 3.0, force_cv: 0.12,
  }),
  'AISI 1045': buildSFProps('steel', {
    optimal_speed_mpm: 200, bue_susceptibility: 0.40, k_wear: 2.8, force_cv: 0.10,
    kc_override: 1900,  // per-alloy extension: C45 higher than generic C35 canonical
  }),
  'AISI 316L': buildSFProps('stainless_316', {
    optimal_speed_mpm: 120, bue_susceptibility: 0.30, k_wear: 3.5, force_cv: 0.14,
    kc_override: 2400,  // 316L austenitic grade — slightly above canonical 316 base
  }),
  'AISI 304': buildSFProps('stainless_304', {
    optimal_speed_mpm: 130, bue_susceptibility: 0.32, k_wear: 3.4, force_cv: 0.13,
    kc_override: 2300,  // 304 per-alloy extension
  }),
  'Ti-6Al-4V': buildSFProps('titanium_gr5', {
    optimal_speed_mpm: 60, bue_susceptibility: 0.45, k_wear: 3.8, force_cv: 0.15,
  }),
  'Inconel 718': buildSFProps('inconel_718', {
    optimal_speed_mpm: 30, bue_susceptibility: 0.20, k_wear: 4.0, force_cv: 0.18,
    kc_override: 2800,  // per-alloy: surface finish kc slightly below canonical 3000
  }),
  'Inconel 625': buildSFProps('inconel_718', {
    optimal_speed_mpm: 25, bue_susceptibility: 0.18, k_wear: 4.0, force_cv: 0.17,
    kc_override: 2700,  // Inconel 625 per-alloy extension (not in canonical DB)
  }),
  'S45C': buildSFProps('steel', {
    optimal_speed_mpm: 190, bue_susceptibility: 0.38, k_wear: 2.9, force_cv: 0.11,
    kc_override: 1950,  // JIS S45C per-alloy extension
  }),
  'NAK80': buildSFProps('alloy_steel', {
    optimal_speed_mpm: 100, bue_susceptibility: 0.25, k_wear: 3.2, force_cv: 0.13,
    kc_override: 2200,  // pre-hardened mold steel per-alloy extension
  }),
  'Copper C101': buildSFProps('brass', {
    optimal_speed_mpm: 250, bue_susceptibility: 0.70, k_wear: 2.2, force_cv: 0.09,
    kc_override: 1100,  // pure copper per-alloy extension (higher than brass)
  }),
};

/** Resolve material props — fuzzy match or sensible default. */
function getMaterial(name: string): MaterialProps {
  const key = Object.keys(MATERIAL_DB).find(k =>
    name.toLowerCase().includes(k.toLowerCase()) ||
    k.toLowerCase().includes(name.toLowerCase()),
  );
  if (key) return MATERIAL_DB[key];
  // Heuristic defaults for unknown materials — kc from canonical physics DB
  const canonicalKc = getKienzle(name).kc1_1;
  if (/al(um)?/i.test(name)) {
    return { optimal_speed_mpm: 300, bue_susceptibility: 0.75,
      k_wear: 2.0, kc: canonicalKc, force_cv: 0.08 };
  }
  if (/ti/i.test(name)) {
    return { optimal_speed_mpm: 60, bue_susceptibility: 0.45,
      k_wear: 3.8, kc: canonicalKc, force_cv: 0.15 };
  }
  if (/inconel|ni\s?alloy/i.test(name)) {
    return { optimal_speed_mpm: 30, bue_susceptibility: 0.20,
      k_wear: 4.0, kc: canonicalKc, force_cv: 0.18 };
  }
  // Generic fallback — use canonical resolution (defaults to steel)
  return {
    optimal_speed_mpm: 180, bue_susceptibility: 0.35,
    k_wear: 3.0, kc: canonicalKc, force_cv: 0.12,
  };
}

// ── Pseudorandom number generator (Mulberry32, seedable) ───────────

function mulberry32(seed: number): () => number {
  let s = seed | 0;
  return () => {
    s = (s + 0x6D2B79F5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Box-Muller transform: two independent U(0,1) → N(0,1). */
function boxMuller(rng: () => number): number {
  let u1 = rng();
  let u2 = rng();
  // Guard against log(0)
  while (u1 < 1e-15) u1 = rng();
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

// ── Statistics helpers ─────────────────────────────────────────────

function mean(arr: number[]): number {
  let s = 0; for (let i = 0; i < arr.length; i++) s += arr[i];
  return s / arr.length;
}

function stdDev(arr: number[], mu: number): number {
  let s = 0; for (let i = 0; i < arr.length; i++) s += (arr[i] - mu) ** 2;
  return Math.sqrt(s / (arr.length - 1));
}

function percentile(sorted: number[], p: number): number {
  const idx = p * (sorted.length - 1);
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo];
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
}

/** Standard normal CDF (Abramowitz & Stegun approximation). */
function normCdf(x: number): number {
  const a1 = 0.254829592, a2 = -0.284496736;
  const a3 = 1.421413741, a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;
  const sign = x < 0 ? -1 : 1;
  const t = 1 / (1 + p * Math.abs(x));
  const y = 1 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1)
    * t * Math.exp(-x * x / 2);
  return 0.5 * (1 + sign * y);
}

/** Inverse standard normal CDF (Beasley-Springer-Moro). */
function normInv(p: number): number {
  if (p <= 0) return -Infinity;
  if (p >= 1) return Infinity;
  if (p === 0.5) return 0;
  const a = [
    -3.969683028665376e1, 2.209460984245205e2,
    -2.759285104469687e2, 1.383577518672690e2,
    -3.066479806614716e1, 2.506628277459239e0,
  ];
  const b = [
    -5.447609879822406e1, 1.615858368580409e2,
    -1.556989798598866e2, 6.680131188771972e1,
    -1.328068155288572e1,
  ];
  const c = [
    -7.784894002430293e-3, -3.223964580411365e-1,
    -2.400758277161838, -2.549732539343734,
    4.374664141464968, 2.938163982698783,
  ];
  const d = [
    7.784695709041462e-3, 3.224671290700398e-1,
    2.445134137142996, 3.754408661907416,
  ];
  const pLow = 0.02425, pHigh = 1 - pLow;
  let q: number, r: number;
  if (p < pLow) {
    q = Math.sqrt(-2 * Math.log(p));
    const num = (((((c[0]*q+c[1])*q+c[2])*q+c[3])*q+c[4])*q+c[5]);
    const den = ((((d[0]*q+d[1])*q+d[2])*q+d[3])*q+1);
    return num / den;
  } else if (p <= pHigh) {
    q = p - 0.5; r = q * q;
    const num = (((((a[0]*r+a[1])*r+a[2])*r+a[3])*r+a[4])*r+a[5])*q;
    const den = (((((b[0]*r+b[1])*r+b[2])*r+b[3])*r+b[4])*r+1);
    return num / den;
  } else {
    q = Math.sqrt(-2 * Math.log(1 - p));
    const num = (((((c[0]*q+c[1])*q+c[2])*q+c[3])*q+c[4])*q+c[5]);
    const den = ((((d[0]*q+d[1])*q+d[2])*q+d[3])*q+1);
    return -(num / den);
  }
}

// ── Cholesky decomposition ─────────────────────────────────────────

/**
 * Cholesky decomposition of a symmetric positive-definite matrix.
 * Returns lower-triangular L such that L·Lᵀ = A.
 */
function cholesky(A: number[][]): number[][] {
  const n = A.length;
  const L: number[][] = Array.from({ length: n }, () => new Array(n).fill(0));
  for (let i = 0; i < n; i++) {
    for (let j = 0; j <= i; j++) {
      let sum = 0;
      for (let k = 0; k < j; k++) sum += L[i][k] * L[j][k];
      if (i === j) {
        L[i][j] = Math.sqrt(Math.max(0, A[i][i] - sum));
      } else {
        L[i][j] = L[j][j] > 1e-15 ? (A[i][j] - sum) / L[j][j] : 0;
      }
    }
  }
  return L;
}

/** Multiply lower-triangular L by vector z: returns L·z. */
function cholMul(L: number[][], z: number[]): number[] {
  const n = L.length;
  const out = new Array(n).fill(0);
  for (let i = 0; i < n; i++) {
    for (let j = 0; j <= i; j++) out[i] += L[i][j] * z[j];
  }
  return out;
}

// ── Core engine ────────────────────────────────────────────────────

/**
 * Stochastic surface finish prediction engine.
 *
 * Combines deterministic geometry-based Ra with stochastic vibration,
 * BUE, and wear scatter via Monte Carlo / FOSM propagation.
 */
export class StochasticSurfaceFinishEngine {
  readonly id = 'StochasticSurfaceFinishEngine';

  /**
   * Compute stochastic surface finish prediction.
   *
   * @param input - Process parameters and options
   * @returns AtomicValue wrapping StochasticFinishResult
   */
  compute(input: StochasticFinishInput): AtomicValue<StochasticFinishResult> {
    const op = input.operation ?? 'milling';
    const f = input.feed_mm;
    const r = input.tool_nose_radius_mm;
    const vc = input.cutting_speed_mpm;
    const runout = (input.runout_um ?? 5) / 1000; // convert to mm
    const zeta = input.damping_ratio ?? 0.03;
    const fn_hz = input.natural_freq_hz ?? 800;
    const vb = input.vb_mm ?? 0;
    const MAX_TRIALS = 100_000;
    const nTrials = Math.min(input.n_trials ?? 2000, MAX_TRIALS);
    const method = input.method ?? 'both';
    const mat = getMaterial(input.material);

    // ── 1. Theoretical Ra (deterministic baseline) ──────────────
    // Ra = f² / (32·r) in mm → convert to μm (×1000)
    const ra_theo_mm = (f * f) / (32 * r);
    let ra_theo_um = ra_theo_mm * 1000;

    // Milling correction: effective feed curvature differs
    if (op === 'milling' && input.tool_diameter_mm) {
      const D = input.tool_diameter_mm;
      const correction = 1 + (f * f) / (4 * D * r);
      ra_theo_um *= correction;
    }

    // ── 2. Vibration parameters ─────────────────────────────────
    const A_runout_um = (input.runout_um ?? 5) / 2;

    // Tooth passing frequency
    let omega_tooth = 0;
    if (op === 'milling' && input.tool_diameter_mm && input.flute_count) {
      const D = input.tool_diameter_mm;
      const z = input.flute_count;
      const rpm = (vc * 1000) / (Math.PI * D);
      omega_tooth = rpm * z / 60; // Hz
    } else if (op === 'turning') {
      // Spindle frequency for turning
      const D_wp = input.tool_diameter_mm ?? 50; // workpiece diameter estimate
      const rpm = (vc * 1000) / (Math.PI * D_wp);
      omega_tooth = rpm / 60;
    }

    const omega_n = fn_hz;
    const freq_ratio = omega_n > 0 ? omega_tooth / omega_n : 0;
    const chatter_proximity = Math.min(1, freq_ratio); // 0-1, 1 = at natural freq

    // Chatter amplitude magnification
    const denom = Math.sqrt((1 - freq_ratio * freq_ratio) ** 2 + (2 * zeta * freq_ratio) ** 2);
    const magnification = denom > 1e-10 ? 1 / denom : 1;
    const A0_base_um = 1.0; // base excitation amplitude, μm
    const A_chatter_um = A0_base_um * magnification;

    const A_total_um = Math.sqrt(A_runout_um ** 2 + A_chatter_um ** 2);

    // ── 3. BUE probability ──────────────────────────────────────
    const speed_ratio = vc / mat.optimal_speed_mpm;
    let p_bue: number;
    if (speed_ratio < 0.3) {
      p_bue = 0.6 + 0.3 * mat.bue_susceptibility;
    } else if (speed_ratio < 0.7) {
      p_bue = 0.1 + 0.2 * mat.bue_susceptibility;
    } else {
      p_bue = 0.01 + 0.04 * mat.bue_susceptibility;
    }

    // ── 4. Wear coefficient ─────────────────────────────────────
    const k_wear = mat.k_wear;

    // ── 5. Correlation matrix for [vibration_amp, force_scatter, wear_scatter] ──
    const corrMatrix: number[][] = [
      [1.0, 0.6, 0.2],
      [0.6, 1.0, 0.3],
      [0.2, 0.3, 1.0],
    ];
    const L = cholesky(corrMatrix);

    // ── 6. Monte Carlo simulation ───────────────────────────────
    let mcResult: { mean: number; std_dev: number; histogram: HistBin[] } | null = null;
    let mcSamples: number[] = [];
    let vibSamples: number[] = [];
    let bueSamples: number[] = [];
    let wearSamples: number[] = [];

    if (method === 'mc' || method === 'both') {
      const rng = mulberry32(42);
      mcSamples = new Array(nTrials);
      vibSamples = new Array(nTrials);
      bueSamples = new Array(nTrials);
      wearSamples = new Array(nTrials);

      for (let i = 0; i < nTrials; i++) {
        // Generate 3 independent standard normals
        const z = [boxMuller(rng), boxMuller(rng), boxMuller(rng)];
        // Correlate via Cholesky
        const corr = cholMul(L, z);

        // Vibration contribution: N(A_total/4, A_total/8)
        const dRa_vib = Math.max(0, (A_total_um / 4) + (A_total_um / 8) * corr[0]);

        // BUE contribution: Bernoulli(p_bue) × Uniform(0.2, 1.5)
        const u_bue = rng();
        let dRa_bue = 0;
        if (u_bue < p_bue) {
          dRa_bue = 0.2 + (1.5 - 0.2) * rng();
        }

        // Wear contribution: VB_actual ~ N(vb, 0.15·vb), ΔRa = k·VB^1.5
        let dRa_wear = 0;
        if (vb > 0) {
          const vb_actual = Math.max(0, vb + 0.15 * vb * corr[2]);
          dRa_wear = k_wear * Math.pow(vb_actual, 1.5) * 1000; // mm→μm
        }

        // Force-induced scatter adds small random roughness perturbation
        const force_scatter_um = mat.force_cv * ra_theo_um * corr[1];

        const ra_total = Math.max(0, ra_theo_um + dRa_vib + dRa_bue + dRa_wear + force_scatter_um);
        mcSamples[i] = ra_total;
        vibSamples[i] = dRa_vib;
        bueSamples[i] = dRa_bue;
        wearSamples[i] = dRa_wear;
      }

      const mu = mean(mcSamples);
      const sd = stdDev(mcSamples, mu);

      // Histogram (30 bins)
      const sorted = [...mcSamples].sort((a, b) => a - b);
      const lo = sorted[0];
      const hi = sorted[sorted.length - 1];
      const nBins = 30;
      const binW = (hi - lo) / nBins || 0.01;
      const histogram: HistBin[] = [];
      for (let b = 0; b < nBins; b++) {
        const center = lo + (b + 0.5) * binW;
        let cnt = 0;
        for (let j = 0; j < sorted.length; j++) {
          const bin = Math.min(Math.floor((sorted[j] - lo) / binW), nBins - 1);
          if (bin === b) cnt++;
        }
        histogram.push({ bin_center: round4(center), count: cnt });
      }

      mcResult = { mean: round4(mu), std_dev: round4(sd), histogram };
    }

    // ── 7. FOSM (First Order Second Moment) ─────────────────────
    let fosmResult: { mean: number; std_dev: number } | null = null;

    if (method === 'fosm' || method === 'both') {
      // FOSM: linearize Ra around mean inputs, propagate variance
      // Ra ≈ Ra_theo + E[ΔRa_vib] + P(BUE)·E[ΔRa_BUE] + E[ΔRa_wear]
      const mean_vib = A_total_um / 4;
      const var_vib = (A_total_um / 8) ** 2;

      const mean_bue = p_bue * (0.2 + 1.5) / 2; // E[Bernoulli·Uniform]
      // Var = p·E[X²] - (p·E[X])²  where X~U(0.2,1.5)
      const ex2_bue = (0.2 ** 2 + 0.2 * 1.5 + 1.5 ** 2) / 3;
      const var_bue = p_bue * ex2_bue - mean_bue ** 2;

      let mean_wear = 0, var_wear = 0;
      if (vb > 0) {
        // E[VB^1.5] ≈ vb^1.5 (first order), σ_VB = 0.15·vb
        mean_wear = k_wear * Math.pow(vb, 1.5) * 1000;
        // δ(Ra_wear)/δVB = 1.5·k·VB^0.5 · 1000
        const dRa_dVB = 1.5 * k_wear * Math.pow(vb, 0.5) * 1000;
        var_wear = (dRa_dVB * 0.15 * vb) ** 2;
      }

      const var_force = (mat.force_cv * ra_theo_um) ** 2;

      // Include correlations: total var includes 2·ρ·σ_i·σ_j terms
      const sigma_vib = Math.sqrt(var_vib);
      const sigma_wear_val = Math.sqrt(var_wear);
      const sigma_force = Math.sqrt(var_force);

      // Correlated variance: Σ = σᵀ·R·σ (for vibration, force, wear)
      const sigmas = [sigma_vib, sigma_force, sigma_wear_val];
      let total_var = var_bue; // BUE independent
      for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 3; j++) {
          total_var += sigmas[i] * sigmas[j] * corrMatrix[i][j];
        }
      }

      const fosm_mean = ra_theo_um + mean_vib + mean_bue + mean_wear;
      const fosm_std = Math.sqrt(Math.max(0, total_var));

      fosmResult = { mean: round4(fosm_mean), std_dev: round4(fosm_std) };
    }

    // ── 8. Consolidate statistics ───────────────────────────────
    // Prefer MC if available, else FOSM
    let mu_final: number, sd_final: number;
    let ci95: [number, number], ci99: [number, number];

    if (mcResult) {
      mu_final = mcResult.mean;
      sd_final = mcResult.std_dev;
      const sorted = [...mcSamples].sort((a, b) => a - b);
      ci95 = [round4(percentile(sorted, 0.025)), round4(percentile(sorted, 0.975))];
      ci99 = [round4(percentile(sorted, 0.005)), round4(percentile(sorted, 0.995))];
    } else {
      mu_final = fosmResult!.mean;
      sd_final = fosmResult!.std_dev;
      ci95 = [round4(mu_final - 1.96 * sd_final), round4(mu_final + 1.96 * sd_final)];
      ci99 = [round4(mu_final - 2.576 * sd_final), round4(mu_final + 2.576 * sd_final)];
    }

    const cv_pct = mu_final > 0 ? round4((sd_final / mu_final) * 100) : 0;

    // ── 9. Scatter breakdown ────────────────────────────────────
    const breakdown: ScatterEntry[] = [];
    const pushBreakdown = (
      m_vib: number, m_bue: number, m_wear: number,
    ) => {
      const total = m_vib + m_bue + m_wear;
      const safe = total > 0 ? total : 1;
      breakdown.push(
        { source: 'vibration',
          mean_contribution_um: round4(m_vib),
          pct_of_total: round2((m_vib / safe) * 100) },
        { source: 'BUE',
          mean_contribution_um: round4(m_bue),
          pct_of_total: round2((m_bue / safe) * 100) },
        { source: 'wear',
          mean_contribution_um: round4(m_wear),
          pct_of_total: round2((m_wear / safe) * 100) },
      );
    };

    if (mcSamples.length > 0) {
      pushBreakdown(
        mean(vibSamples), mean(bueSamples), mean(wearSamples),
      );
    } else {
      // FOSM-based breakdown
      const m_vib = A_total_um / 4;
      const m_bue = p_bue * 0.85;
      const m_wear = vb > 0
        ? k_wear * Math.pow(vb, 1.5) * 1000 : 0;
      pushBreakdown(m_vib, m_bue, m_wear);
    }

    // ── 10. Process capability ──────────────────────────────────
    let p_exceed: number | null = null;
    let cpk: number | null = null;
    let sigmaLevel: number | null = null;
    let ppmDef: number | null = null;

    if (input.target_ra_um !== undefined && input.target_ra_um > 0) {
      const target = input.target_ra_um;
      if (mcSamples.length > 0) {
        const exceedCount = mcSamples.filter(v => v > target).length;
        p_exceed = round4(exceedCount / mcSamples.length);
      } else {
        p_exceed = round4(1 - normCdf((target - mu_final) / sd_final));
      }

      // Cpk: USL = target, LSL = 0
      const usl = target;
      const lsl = 0;
      if (sd_final > 0) {
        const cpu = (usl - mu_final) / (3 * sd_final);
        const cpl = (mu_final - lsl) / (3 * sd_final);
        cpk = round4(Math.min(cpu, cpl));
        sigmaLevel = round4(3 * cpk);
        ppmDef = Math.round((1 - normCdf(sigmaLevel)) * 2 * 1e6); // two-tailed approximation
      }
    }

    // ── 11. Sobol sensitivity indices (variance-based) ──────────
    const sobol: SobolEntry[] = [];
    if (mcSamples.length > 0) {
      // Recompute with each source frozen to isolate its variance contribution
      const totalVar = sd_final ** 2;
      if (totalVar > 1e-15) {
        const var_vib_comp = variance(vibSamples);
        const var_bue_comp = variance(bueSamples);
        const var_wear_comp = variance(wearSamples);
        const sumVar = var_vib_comp + var_bue_comp + var_wear_comp;

        // First-order Sobol: Si ≈ Var_i / Var_total
        // Total-order includes interactions: STi ≈ Si + interactions
        // Approximate interactions via correlation residual
        const interactionPool = Math.max(0, totalVar - sumVar) / (totalVar > 0 ? totalVar : 1);

        const computeSobol = (vi: number, label: string) => {
          const si = totalVar > 0 ? vi / totalVar : 0;
          // STi ≈ Si + share of interactions proportional to first-order
          const sti = si + (sumVar > 0 ? (vi / sumVar) * interactionPool : 0);
          sobol.push({ parameter: label, Si: round4(si), STi: round4(Math.min(1, sti)) });
        };

        computeSobol(var_vib_comp, 'vibration');
        computeSobol(var_bue_comp, 'BUE');
        computeSobol(var_wear_comp, 'wear');

        // Force scatter (residual)
        const var_force_res = Math.max(0, totalVar - sumVar);
        if (var_force_res > 1e-10) {
          computeSobol(var_force_res, 'force_scatter');
        }
      }
    }

    // ── 12. Dominant uncertainty source ──────────────────────────
    let dominant = 'vibration';
    if (sobol.length > 0) {
      const maxSobol = sobol.reduce((a, b) => b.Si > a.Si ? b : a);
      dominant = maxSobol.parameter;
    } else if (breakdown.length > 0) {
      const maxBreak = breakdown.reduce((a, b) => b.pct_of_total > a.pct_of_total ? b : a);
      dominant = maxBreak.source;
    }

    // ── 13. Recommendations ─────────────────────────────────────
    const recs: string[] = [];

    if (chatter_proximity > 0.85) {
      recs.push(
        `Chatter proximity ${round2(chatter_proximity)} is dangerously ` +
        `high — change RPM to shift tooth-passing freq away from ` +
        `${fn_hz} Hz natural frequency.`,
      );
    } else if (chatter_proximity > 0.6) {
      recs.push(
        `Moderate chatter proximity (${round2(chatter_proximity)}) — ` +
        'consider adjusting spindle speed or adding damping.',
      );
    }

    if (p_bue > 0.3) {
      recs.push(
        `High BUE probability (${round2(p_bue * 100)}%) — increase ` +
        `cutting speed toward ${mat.optimal_speed_mpm} m/min or use ` +
        'coated insert.',
      );
    }

    if (vb > 0.2) {
      recs.push(
        `Flank wear VB=${vb} mm is significant — tool change ` +
        'recommended to maintain surface quality.',
      );
    } else if (vb > 0.1) {
      recs.push(
        `Moderate wear (VB=${vb} mm) contributing to roughness ` +
        'scatter — monitor closely.',
      );
    }

    if ((input.runout_um ?? 5) > 10) {
      recs.push(
        `Runout ${input.runout_um} um is high — rebalance holder ` +
        'or check collet to reduce vibration component.',
      );
    }

    if (cv_pct > 30) {
      recs.push(
        'High coefficient of variation (>30%) — process is highly ' +
        'variable. Address dominant scatter source first.',
      );
    }

    if (cpk !== null && cpk < 1.0) {
      recs.push(
        `Cpk=${cpk} is below 1.0 — process not capable of meeting ` +
        `target Ra=${input.target_ra_um} um consistently.`,
      );
    } else if (cpk !== null && cpk < 1.33) {
      recs.push(
        `Cpk=${cpk} is marginal (< 1.33) — reduce feed or ` +
        `address ${dominant} to improve capability.`,
      );
    }

    if (dominant === 'vibration') {
      recs.push(
        'Vibration is the dominant scatter source — improve ' +
        'fixturing rigidity, reduce runout, or adjust speed.',
      );
    } else if (dominant === 'BUE') {
      recs.push(
        'BUE is the dominant scatter source — increase speed, ' +
        'use sharper rake angle, or apply TiAlN coating.',
      );
    } else if (dominant === 'wear') {
      recs.push(
        'Wear is the dominant scatter source — implement ' +
        'tool-life management and timely replacement.',
      );
    }

    if (recs.length === 0) {
      recs.push('Process conditions appear well-controlled. Monitor periodically.');
    }

    // ── 14. Build result ────────────────────────────────────────
    const result: StochasticFinishResult = {
      theoretical_ra_um: round4(ra_theo_um),
      mean_ra_um: round4(mu_final),
      std_dev_um: round4(sd_final),
      ci_95: ci95,
      ci_99: ci99,
      cv_percent: cv_pct,
      scatter_breakdown: breakdown,
      p_exceed_target: p_exceed,
      cpk,
      sigma_level: sigmaLevel,
      ppm_defective: ppmDef,
      bue_probability: round4(p_bue),
      chatter_proximity: round4(chatter_proximity),
      sobol_indices: sobol,
      fosm: fosmResult,
      mc: mcResult,
      dominant_uncertainty: dominant,
      recommendations: recs,
    };

    return {
      value: result,
      unit: 'μm',
      formula: 'Ra = Ra_theo + ΔRa_vib + ΔRa_BUE + ΔRa_wear (stochastic)',
      confidence: mcResult ? 0.95 : 0.80,
    };
  }
}

// ── Utility rounding ───────────────────────────────────────────────

function round4(x: number): number {
  return Math.round(x * 10000) / 10000;
}

function round2(x: number): number {
  return Math.round(x * 100) / 100;
}

function variance(arr: number[]): number {
  const mu = mean(arr);
  let s = 0;
  for (let i = 0; i < arr.length; i++) s += (arr[i] - mu) ** 2;
  return s / (arr.length - 1);
}

// ── Singleton export ───────────────────────────────────────────────

/** Singleton stochastic surface finish prediction engine. */
export const stochasticSurfaceFinishEngine = new StochasticSurfaceFinishEngine();
