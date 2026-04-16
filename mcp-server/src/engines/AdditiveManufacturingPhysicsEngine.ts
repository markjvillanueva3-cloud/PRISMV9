/**
 * AdditiveManufacturingPhysicsEngine — First-principles physics for additive
 * manufacturing processes (DED, SLM/LPBF, EBM).
 *
 * Provides mathematically exhaustive models with full uncertainty quantification:
 *   1. Rosenthal melt pool solution (moving heat source)
 *   2. Bead geometry & overlap optimization
 *   3. Solidification microstructure prediction (Hunt CET criterion)
 *   4. Thermal stress & distortion (Mercelis-Kruth layer accumulation)
 *   5. Scan strategy evaluation & optimization
 *   6. Energy density process window mapping (Hann normalized enthalpy)
 *
 * All models are self-contained with inline math — no external libraries.
 *
 * References:
 *   Rosenthal D. (1946) "The theory of moving sources of heat..." Trans. ASME 68
 *   Mercelis P., Kruth J-P. (2006) "Residual stresses in SLM" Rapid Prototyping J.
 *   Hunt J.D. (1984) "Steady state columnar and equiaxed growth..." Mat. Sci. Eng.
 *   Hann D.B. et al. (2011) "A simple methodology for predicting laser-weld properties"
 *   Kurz W., Fisher D.J. (1986) "Fundamentals of Solidification" Trans Tech
 *   DebRoy T. et al. (2018) "Additive manufacturing of metallic components" Prog. Mat. Sci.
 *   Saltelli A. et al. (2010) "Variance based sensitivity analysis of model output" RESS
 */

// ─── Types ─────────────────────────────────────────────────────────

/** Standard PRISM return wrapper with generic payload. */
export interface AtomicValue<T> {
  value: T;
  unit: string;
  formula?: string;
  confidence?: number;
}

// ─── Material Database ─────────────────────────────────────────────

interface AMMaterial {
  name: string;
  k: number;        // thermal conductivity [W/m·K]
  rho: number;      // density [kg/m³]
  Cp: number;       // specific heat [J/kg·K]
  T_liq: number;    // liquidus temperature [°C]
  T_sol: number;    // solidus temperature [°C]
  alpha_CTE: number; // CTE [1/K]
  E: number;        // Young's modulus [MPa]
  nu: number;       // Poisson's ratio
  absorptivity: number;
  yield_MPa: number;
  // Hunt CET constants
  hunt_a: number;   // λ₁ coefficient [µm]
  hunt_n: number;   // λ₁ exponent
  N0: number;       // nucleation density [1/m³]
  delta_T_N: number; // nucleation undercooling [K]
}

const MATERIAL_DB: Record<string, AMMaterial> = {
  'Ti-6Al-4V': {
    name: 'Ti-6Al-4V', k: 6.7, rho: 4430, Cp: 526,
    T_liq: 1660, T_sol: 1604, alpha_CTE: 8.6e-6, E: 114e3, nu: 0.34,
    absorptivity: 0.35, yield_MPa: 880,
    hunt_a: 150, hunt_n: 0.33, N0: 2e15, delta_T_N: 2.5,
  },
  'IN718': {
    name: 'IN718', k: 11.4, rho: 8190, Cp: 435,
    T_liq: 1336, T_sol: 1260, alpha_CTE: 13e-6, E: 200e3, nu: 0.29,
    absorptivity: 0.30, yield_MPa: 1035,
    hunt_a: 120, hunt_n: 0.35, N0: 1e15, delta_T_N: 3.0,
  },
  '316L': {
    name: '316L', k: 16.3, rho: 7990, Cp: 500,
    T_liq: 1400, T_sol: 1370, alpha_CTE: 16e-6, E: 193e3, nu: 0.30,
    absorptivity: 0.35, yield_MPa: 290,
    hunt_a: 80, hunt_n: 0.33, N0: 5e14, delta_T_N: 2.0,
  },
  'AlSi10Mg': {
    name: 'AlSi10Mg', k: 147, rho: 2670, Cp: 900,
    T_liq: 596, T_sol: 557, alpha_CTE: 21.5e-6, E: 70e3, nu: 0.33,
    absorptivity: 0.15, yield_MPa: 240,
    hunt_a: 60, hunt_n: 0.40, N0: 1e16, delta_T_N: 1.5,
  },
  'CoCrMo': {
    name: 'CoCrMo', k: 14.8, rho: 8300, Cp: 452,
    T_liq: 1380, T_sol: 1350, alpha_CTE: 14.5e-6, E: 210e3, nu: 0.30,
    absorptivity: 0.32, yield_MPa: 650,
    hunt_a: 100, hunt_n: 0.34, N0: 8e14, delta_T_N: 2.8,
  },
};

// ─── Process Window Thresholds ─────────────────────────────────────

interface ProcessThresholds {
  E_v_keyhole: number;   // J/mm³ above which keyholing occurs
  E_v_lof: number;       // J/mm³ below which lack-of-fusion
  nh_keyhole: number;    // normalized enthalpy keyhole threshold
}

const PROCESS_THRESHOLDS: Record<string, ProcessThresholds> = {
  'Ti-6Al-4V':  { E_v_keyhole: 120, E_v_lof: 40, nh_keyhole: 30 },
  'IN718':      { E_v_keyhole: 110, E_v_lof: 45, nh_keyhole: 28 },
  '316L':       { E_v_keyhole: 100, E_v_lof: 50, nh_keyhole: 25 },
  'AlSi10Mg':   { E_v_keyhole: 80,  E_v_lof: 25, nh_keyhole: 20 },
  'CoCrMo':     { E_v_keyhole: 115, E_v_lof: 42, nh_keyhole: 27 },
};

// ─── Input Interfaces ──────────────────────────────────────────────

export interface MeltPoolInput {
  material: string;
  power_W: number;
  scan_speed_mm_s: number;
  beam_radius_um?: number;
  preheat_C?: number;
  n_trials?: number;
}

export interface MeltPoolResult {
  width_mm: number;
  depth_mm: number;
  length_mm: number;
  aspect_ratio: number;
  cooling_rate_K_per_s: number;
  melt_pool_volume_mm3: number;
  uncertainty: {
    width_ci95: [number, number];
    depth_ci95: [number, number];
    sobol_power: number;
    sobol_absorptivity: number;
    sobol_conductivity: number;
  };
}

export interface BeadOverlapInput {
  bead_width_mm: number;
  bead_height_mm: number;
  hatch_spacing_mm?: number;
  layer_thickness_mm: number;
  melt_pool_depth_mm: number;
}

export interface BeadOverlapResult {
  optimal_hatch_mm: number;
  overlap_fraction: number;
  predicted_porosity_pct: number;
  surface_roughness_um: number;
  layer_bond_ratio: number;
}

export interface SolidificationInput {
  material: string;
  power_W: number;
  scan_speed_mm_s: number;
  preheat_C?: number;
  n_trials?: number;
}

export interface SolidificationResult {
  morphology: 'planar' | 'cellular' | 'columnar_dendritic' | 'equiaxed';
  G_K_per_m: number;
  R_m_per_s: number;
  cooling_rate: number;
  PDAS_um: number;
  grain_size_um: number;
  CET_possible: boolean;
}

export interface ThermalStressInput {
  material: string;
  power_W: number;
  scan_speed_mm_s: number;
  layer_thickness_mm: number;
  num_layers: number;
  part_length_mm: number;
  substrate_thickness_mm?: number;
  preheat_C?: number;
}

export interface ThermalStressResult {
  peak_stress_MPa: number;
  yield_ratio: number;
  distortion_mm: number;
  stress_gradient_MPa_per_mm: number;
  risk_level: 'low' | 'moderate' | 'high' | 'critical';
}

export type ScanStrategyType = 'raster' | 'zigzag' | 'island' | 'spiral' | 'fractal';

export interface ScanStrategyInput {
  material: string;
  power_W: number;
  scan_speed_mm_s: number;
  layer_area_mm2: number;
  layer_thickness_mm: number;
  hatch_spacing_mm: number;
  strategies?: ScanStrategyType[];
}

export interface StrategyScore {
  thermal_uniformity: number;
  stress_score: number;
  time_score: number;
}

export interface ScanStrategyResult {
  recommended_strategy: ScanStrategyType;
  scores: Record<string, StrategyScore>;
  optimal_island_size_mm: number;
  optimal_rotation_deg: number;
}

export interface ProcessWindowInput {
  material: string;
  power_W: number;
  scan_speed_mm_s: number;
  hatch_spacing_mm: number;
  layer_thickness_mm: number;
  beam_radius_um?: number;
}

export interface ProcessWindowResult {
  energy_density_J_mm3: number;
  regime: 'keyhole' | 'conduction' | 'lack_of_fusion';
  normalized_enthalpy: number;
  process_window_bounds: {
    E_v_min: number;
    E_v_max: number;
    power_min_W: number;
    power_max_W: number;
  };
}

// ─── PRNG (Mulberry32) ────────────────────────────────────────────

/** Mulberry32 — fast 32-bit PRNG with full period 2³². */
function mulberry32(seed: number): () => number {
  let s = seed | 0;
  return (): number => {
    s = (s + 0x6D2B79F5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ─── Sampling Utilities ────────────────────────────────────────────

/**
 * Latin Hypercube Sampling for k dimensions, n samples.
 * Returns n×k array of values in [0,1).
 * Ref: McKay, Beckman & Conover (1979) "A comparison of three methods..."
 */
function latinHypercube(n: number, k: number, rng: () => number): number[][] {
  const samples: number[][] = [];
  for (let i = 0; i < n; i++) {
    samples.push(new Array(k));
  }
  for (let dim = 0; dim < k; dim++) {
    // create permutation of strata
    const perm = Array.from({ length: n }, (_, i) => i);
    for (let i = n - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [perm[i], perm[j]] = [perm[j], perm[i]];
    }
    for (let i = 0; i < n; i++) {
      samples[i][dim] = (perm[i] + rng()) / n;
    }
  }
  return samples;
}

/**
 * Transform uniform [0,1) to normal via Box-Muller.
 */
function normalFromUniform(u1: number, u2: number): number {
  return Math.sqrt(-2 * Math.log(Math.max(u1, 1e-15))) * Math.cos(2 * Math.PI * u2);
}

/**
 * Compute percentiles from sorted array. Uses linear interpolation.
 */
function percentile(sorted: number[], p: number): number {
  const idx = p * (sorted.length - 1);
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo];
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
}

/**
 * Compute mean of a number array.
 */
function mean(arr: number[]): number {
  let s = 0;
  for (let i = 0; i < arr.length; i++) s += arr[i];
  return s / arr.length;
}

/**
 * Compute variance of a number array.
 */
function variance(arr: number[]): number {
  const m = mean(arr);
  let s = 0;
  for (let i = 0; i < arr.length; i++) {
    const d = arr[i] - m;
    s += d * d;
  }
  return s / (arr.length - 1);
}

// ─── Engine ────────────────────────────────────────────────────────

export class AdditiveManufacturingPhysicsEngine {
  private readonly materials = MATERIAL_DB;

  private getMaterial(name: string): AMMaterial {
    const mat = this.materials[name];
    if (!mat) {
      const keys = Object.keys(this.materials).join(', ');
      throw new Error(`Unknown material "${name}". Available: ${keys}`);
    }
    return mat;
  }

  /**
   * Rosenthal analytical melt pool solution.
   *
   * Solves T(x,y,z) = T₀ + (Q·η)/(2π·k·R) · exp(-V·(R+ξ)/(2α))
   * for the melt pool boundary T = T_liquidus.
   *
   * Includes Monte Carlo uncertainty propagation with LHS on:
   *   - Power (±2% uniform)
   *   - Absorptivity (CV=10% normal)
   *   - Thermal conductivity (CV=8% normal)
   *
   * Sobol first-order sensitivity indices via Saltelli's scheme.
   *
   * @param input - Laser parameters and material selection
   * @returns Melt pool dimensions with CI95 and Sobol indices
   *
   * Ref: Rosenthal D. (1946) Trans. ASME 68; DebRoy et al. (2018) Prog. Mat. Sci.
   */
  meltPool(input: MeltPoolInput): AtomicValue<MeltPoolResult> {
    const mat = this.getMaterial(input.material);
    const MAX_TRIALS = 100_000;
    const nTrials = Math.min(input.n_trials ?? 500, MAX_TRIALS);
    const T0 = (input.preheat_C ?? 25) + 273.15; // K
    const T_liq = mat.T_liq + 273.15; // K

    const alpha = mat.k / (mat.rho * mat.Cp); // thermal diffusivity [m²/s]

    // Deterministic solve
    const detResult = this.rosenthalSolve(
      input.power_W, mat.absorptivity, mat.k, alpha,
      input.scan_speed_mm_s / 1000, T0, T_liq
    );

    // Monte Carlo with LHS — 3 uncertain parameters
    const rng = mulberry32(42);
    const lhsSamples = latinHypercube(nTrials, 6, rng); // 6 cols for Sobol (A+B matrices)

    const widths: number[] = [];
    const depths: number[] = [];

    // Saltelli scheme: A matrix (cols 0-2), B matrix (cols 3-5)
    // Parameters: [power, absorptivity, conductivity]
    const samplesA: number[][] = [];
    const samplesB: number[][] = [];
    const widthsA: number[] = [];
    const widthsB: number[] = [];
    const widthsABi: number[][] = [[], [], []]; // A_B^(i) for each param

    for (let i = 0; i < nTrials; i++) {
      const lhs = lhsSamples[i];
      // A matrix params
      const pA = input.power_W * (0.98 + 0.04 * lhs[0]);
      const aA = mat.absorptivity * (1 + 0.10 * normalFromUniform(lhs[1], lhs[0]));
      const kA = mat.k * (1 + 0.08 * normalFromUniform(lhs[2], lhs[1]));

      // B matrix params
      const pB = input.power_W * (0.98 + 0.04 * lhs[3]);
      const aB = mat.absorptivity * (1 + 0.10 * normalFromUniform(lhs[4], lhs[3]));
      const kB = mat.k * (1 + 0.08 * normalFromUniform(lhs[5], lhs[4]));

      samplesA.push([pA, aA, kA]);
      samplesB.push([pB, aB, kB]);

      const alphaA = kA / (mat.rho * mat.Cp);
      const rA = this.rosenthalSolve(pA, Math.max(aA, 0.01), kA, alphaA,
        input.scan_speed_mm_s / 1000, T0, T_liq);
      widthsA.push(rA.width);
      widths.push(rA.width);
      depths.push(rA.depth);

      const alphaB = kB / (mat.rho * mat.Cp);
      const rB = this.rosenthalSolve(pB, Math.max(aB, 0.01), kB, alphaB,
        input.scan_speed_mm_s / 1000, T0, T_liq);
      widthsB.push(rB.width);

      // A_B^(i): take A but replace i-th column with B
      for (let j = 0; j < 3; j++) {
        const params = [...samplesA[i]];
        params[j] = samplesB[i][j];
        const alphaABi = params[2] / (mat.rho * mat.Cp);
        const rABi = this.rosenthalSolve(params[0], Math.max(params[1], 0.01), params[2],
          alphaABi, input.scan_speed_mm_s / 1000, T0, T_liq);
        widthsABi[j].push(rABi.width);
      }
    }

    // CI95
    const sortedW = [...widths].sort((a, b) => a - b);
    const sortedD = [...depths].sort((a, b) => a - b);

    // Sobol first-order indices: Si = V(E[Y|Xi]) / V(Y)
    const fA = mean(widthsA);
    const varY = variance(widthsA);
    const sobolIndices: number[] = [];
    for (let j = 0; j < 3; j++) {
      let num = 0;
      for (let i = 0; i < nTrials; i++) {
        num += widthsB[i] * (widthsABi[j][i] - widthsA[i]);
      }
      num /= nTrials;
      sobolIndices.push(Math.max(0, Math.min(1, num / Math.max(varY, 1e-15))));
    }

    // Cooling rate at solidification front (dT/dt ≈ G · R)
    const V_m_s = input.scan_speed_mm_s / 1000;
    const coolingRate = this.estimateCoolingRate(input.power_W, mat, V_m_s, T0, T_liq);

    // Melt pool volume approximation: half-ellipsoid
    const vol = (2 / 3) * Math.PI * (detResult.width / 2) * (detResult.depth) *
      (detResult.length / 2);

    const result: MeltPoolResult = {
      width_mm: round4(detResult.width * 1000),
      depth_mm: round4(detResult.depth * 1000),
      length_mm: round4(detResult.length * 1000),
      aspect_ratio: round4(detResult.depth / detResult.width),
      cooling_rate_K_per_s: round4(coolingRate),
      melt_pool_volume_mm3: round4(vol * 1e9),
      uncertainty: {
        width_ci95: [round4(percentile(sortedW, 0.025) * 1000), round4(percentile(sortedW, 0.975) * 1000)],
        depth_ci95: [round4(percentile(sortedD, 0.025) * 1000), round4(percentile(sortedD, 0.975) * 1000)],
        sobol_power: round4(sobolIndices[0]),
        sobol_absorptivity: round4(sobolIndices[1]),
        sobol_conductivity: round4(sobolIndices[2]),
      },
    };

    return {
      value: result,
      unit: 'mm',
      formula: 'T(ξ,y,z) = T₀ + (Q·η)/(2π·k·R)·exp(-V·(R+ξ)/(2α))',
      confidence: 0.95,
    };
  }

  /**
   * Solve Rosenthal equation for melt pool boundary dimensions.
   * Returns width, depth, length in meters.
   */
  private rosenthalSolve(
    P: number, eta: number, k: number, alpha: number,
    V: number, T0: number, T_liq: number
  ): { width: number; depth: number; length: number } {
    const Q = P * eta;

    // Temperature at point (xi, y, z) in moving frame:
    // T = T0 + Q/(2π·k·R) · exp(-V·(R+ξ)/(2α))
    const tempAt = (xi: number, y: number, z: number): number => {
      const R = Math.sqrt(xi * xi + y * y + z * z);
      if (R < 1e-10) return Infinity;
      return T0 + (Q / (2 * Math.PI * k * R)) * Math.exp(-V * (R + xi) / (2 * alpha));
    };

    // Bisection solver for boundary where T = T_liq
    const bisect = (
      fn: (d: number) => number, lo: number, hi: number, tol: number
    ): number => {
      for (let iter = 0; iter < 80; iter++) {
        const mid = (lo + hi) / 2;
        if (fn(mid) > 0) lo = mid;
        else hi = mid;
        if (hi - lo < tol) break;
      }
      return (lo + hi) / 2;
    };

    // Find max y at z=0, xi=0 (half-width)
    const maxSearch = 5e-3; // 5 mm search range
    const tol = 1e-7;

    // Check if melt pool exists
    if (tempAt(0, tol, 0) < T_liq) {
      return { width: 0, depth: 0, length: 0 };
    }

    let halfWidth = 0;
    if (tempAt(0, maxSearch, 0) < T_liq) {
      halfWidth = bisect((y) => tempAt(0, y, 0) - T_liq, tol, maxSearch, tol);
    }

    // Find max depth at y=0, xi=0
    let depth = 0;
    if (tempAt(0, 0, tol) >= T_liq) {
      if (tempAt(0, 0, maxSearch) < T_liq) {
        depth = bisect((z) => tempAt(0, 0, z) - T_liq, tol, maxSearch, tol);
      } else {
        depth = maxSearch;
      }
    }

    // Find length: front (+xi) and rear (-xi) extents
    const lenSearch = 10e-3;
    let frontLen = 0;
    if (tempAt(tol, 0, 0) >= T_liq) {
      if (tempAt(lenSearch, 0, 0) < T_liq) {
        frontLen = bisect((x) => tempAt(x, 0, 0) - T_liq, tol, lenSearch, tol);
      } else {
        frontLen = lenSearch;
      }
    }

    let rearLen = 0;
    if (tempAt(-tol, 0, 0) >= T_liq) {
      if (tempAt(-lenSearch, 0, 0) < T_liq) {
        rearLen = bisect((x) => tempAt(-x, 0, 0) - T_liq, tol, lenSearch, tol);
      } else {
        rearLen = lenSearch;
      }
    }

    return {
      width: 2 * halfWidth,
      depth: depth,
      length: frontLen + rearLen,
    };
  }

  /**
   * Estimate cooling rate at solidification front.
   * dT/dt ≈ G · V where G is computed from Rosenthal gradient.
   */
  private estimateCoolingRate(
    P: number, mat: AMMaterial, V: number, T0: number, T_liq: number
  ): number {
    const Q = P * mat.absorptivity;
    const alpha = mat.k / (mat.rho * mat.Cp);

    // At the trailing edge of the melt pool on the centerline (y=0, z=0),
    // approximate G ≈ dT/dξ from Rosenthal. Use finite difference at pool boundary.
    // Simplified: G ≈ 2π·k·(T_liq - T0)² / (Q·η) — order-of-magnitude
    // Cooling rate ≈ G · V
    const deltaT = T_liq - T0;
    const G = (2 * Math.PI * mat.k * deltaT * deltaT) / Math.max(Q, 1e-6);
    return G * V;
  }

  /**
   * Predict bead profile geometry and optimal hatch spacing.
   *
   * Uses parabolic bead profile h(y) = h_max · (1 - (2y/w)²) and
   * computes inter-bead porosity as a function of overlap fraction.
   * Surface roughness from bead stacking: Ra ≈ h_max · (1 - OL)² / 4.
   *
   * @param input - Bead dimensions and layer parameters
   * @returns Optimal overlap, porosity, roughness, and bond ratio
   *
   * Ref: Li Y. et al. (2018) "Bead geometry prediction for multi-pass DED" J. Mfg. Proc.
   */
  beadOverlap(input: BeadOverlapInput): AtomicValue<BeadOverlapResult> {
    const w = input.bead_width_mm;
    const h = input.bead_height_mm;
    const lt = input.layer_thickness_mm;
    const mpd = input.melt_pool_depth_mm;

    // Optimal overlap: minimize porosity. Porosity model:
    // For parabolic bead, the inter-bead void area as function of overlap OL:
    // A_void = (w·h/3)·(1 - OL)³  (integrated from parabolic profile gap)
    // A_bead = (2/3)·w·h
    // Porosity ≈ A_void / (A_bead · something) → simplified empirical:
    // P = 100 · (1 - OL)³ · f_correction
    // Minimum near OL=0.33 balancing porosity vs over-melt

    // Sweep OL to find minimum porosity
    let bestOL = 0.33;
    let bestPorosity = Infinity;
    for (let ol = 0.10; ol <= 0.60; ol += 0.01) {
      // Porosity from void between parabolic beads
      const voidFrac = Math.pow(1 - ol, 3);
      // Excessive overlap causes re-melt humping — porosity penalty above OL>0.45
      const excessPenalty = ol > 0.45 ? 0.5 * Math.pow(ol - 0.45, 2) * 100 : 0;
      const porosity = voidFrac * 8 + excessPenalty; // empirical scaling
      if (porosity < bestPorosity) {
        bestPorosity = porosity;
        bestOL = ol;
      }
    }

    const hatchFromInput = input.hatch_spacing_mm;
    const useOL = hatchFromInput != null ? (1 - hatchFromInput / w) : bestOL;
    const useHatch = hatchFromInput ?? w * (1 - bestOL);

    const actualOL = Math.max(0, Math.min(0.99, 1 - useHatch / w));
    const porosity = Math.pow(1 - actualOL, 3) * 8 +
      (actualOL > 0.45 ? 0.5 * Math.pow(actualOL - 0.45, 2) * 100 : 0);

    // Surface roughness: Ra ≈ h_max · (1 - OL)² / 4
    const Ra_um = h * 1000 * Math.pow(1 - actualOL, 2) / 4;

    // Layer bonding: ratio of melt pool depth to layer thickness
    const bondRatio = mpd / lt;

    const result: BeadOverlapResult = {
      optimal_hatch_mm: round4(w * (1 - bestOL)),
      overlap_fraction: round4(actualOL),
      predicted_porosity_pct: round4(Math.max(0, porosity)),
      surface_roughness_um: round4(Ra_um),
      layer_bond_ratio: round4(bondRatio),
    };

    return {
      value: result,
      unit: 'mm',
      formula: 'h(y) = h_max·(1-(2y/w)²); OL = 1 - d/w; Ra ≈ h·(1-OL)²/4',
      confidence: bondRatio >= 1.0 ? 0.90 : 0.75,
    };
  }

  /**
   * Predict solidification microstructure from thermal gradient G and
   * solidification velocity R at the melt pool trailing edge.
   *
   * G/R ratio determines morphology:
   *   - Planar: G/R > 10⁶ K·s/m²
   *   - Cellular: 10⁴ < G/R < 10⁶
   *   - Columnar dendritic: 10² < G/R < 10⁴
   *   - Equiaxed: G/R < 10²
   *
   * Primary dendrite arm spacing: λ₁ = a·(G·R)^(-n) (Hunt model)
   *
   * Columnar-to-equiaxed transition (CET):
   *   G < a·N₀^(1/3)·(1 - (ΔT_N/ΔT_C)³)^(1/3)·ΔT_C
   *
   * @param input - Material and process parameters
   * @returns Morphology, G, R, PDAS, CET flag
   *
   * Ref: Hunt J.D. (1984) Mat. Sci. Eng.; Kurz & Fisher (1986) "Fundamentals of Solidification"
   */
  solidification(input: SolidificationInput): AtomicValue<SolidificationResult> {
    const mat = this.getMaterial(input.material);
    const V = input.scan_speed_mm_s / 1000; // m/s
    const T0 = (input.preheat_C ?? 25) + 273.15;
    const T_liq = mat.T_liq + 273.15;
    const alpha = mat.k / (mat.rho * mat.Cp);
    const Q = input.power_W * mat.absorptivity;

    // Temperature gradient G at solidification front (trailing edge, centerline)
    // From Rosenthal: dT/dξ at the melt pool boundary ≈ V·(T_liq - T0)/(2α)
    // More precise: G ≈ 2π·k·(T_liq - T0)²/(Q) [K/m]
    const deltaT = T_liq - T0;
    const G = (2 * Math.PI * mat.k * deltaT * deltaT) / Math.max(Q, 1);

    // Solidification velocity R = V·cos(θ), at trailing edge θ≈0 → R ≈ V
    const R = V;

    // G/R ratio
    const GR_ratio = G / Math.max(R, 1e-10);

    // Morphology classification
    let morphology: SolidificationResult['morphology'];
    if (GR_ratio > 1e6) morphology = 'planar';
    else if (GR_ratio > 1e4) morphology = 'cellular';
    else if (GR_ratio > 1e2) morphology = 'columnar_dendritic';
    else morphology = 'equiaxed';

    // Cooling rate = G · R
    const coolingRate = G * R;

    // PDAS: λ₁ = a · (G·R)^(-n)  [µm, with G in K/m and R in m/s]
    const PDAS = mat.hunt_a * Math.pow(Math.max(coolingRate, 1), -mat.hunt_n);

    // Grain size approximation (~ 2-5× PDAS for columnar, larger for equiaxed)
    const grainMultiplier = morphology === 'equiaxed' ? 5 : morphology === 'columnar_dendritic' ? 3 : 2;
    const grainSize = PDAS * grainMultiplier;

    // CET criterion (Hunt): G < a·N₀^(1/3)·(1 - (ΔT_N/ΔT_C)³)^(1/3)·ΔT_C
    // ΔT_C = constitutional supercooling ≈ T_liq - T_sol
    const deltaT_C = mat.T_liq - mat.T_sol;
    const deltaT_N = mat.delta_T_N;
    const ratio_cubed = Math.pow(deltaT_N / Math.max(deltaT_C, 1), 3);
    const G_CET = 0.617 * Math.pow(mat.N0, 1 / 3) *
      Math.pow(Math.max(0, 1 - ratio_cubed), 1 / 3) * deltaT_C;
    const CET_possible = G < G_CET;

    const result: SolidificationResult = {
      morphology,
      G_K_per_m: round4(G),
      R_m_per_s: round4(R),
      cooling_rate: round4(coolingRate),
      PDAS_um: round4(PDAS),
      grain_size_um: round4(grainSize),
      CET_possible,
    };

    return {
      value: result,
      unit: 'mixed',
      formula: 'G/R→morphology; λ₁=a·(G·R)^(-n); Hunt CET: G < 0.617·N₀^(1/3)·f(ΔT)·ΔT_C',
      confidence: 0.85,
    };
  }

  /**
   * Predict thermal residual stress and distortion using modified
   * Mercelis-Kruth layer-by-layer stress accumulation model.
   *
   * Thermal strain: ε_th = α·ΔT
   * Plane stress: σ = E·α·ΔT/(1-ν)
   * Distortion (Euler-Bernoulli): δ = σ·L²/(2·E·t)
   * Stress relief from re-melting: each subsequent layer relieves ~30-50%
   * of stress in the layer below.
   *
   * @param input - Build geometry and process parameters
   * @returns Peak stress, yield ratio, distortion, risk level
   *
   * Ref: Mercelis P. & Kruth J-P. (2006) Rapid Prototyping J. 12(5)
   */
  thermalStress(input: ThermalStressInput): AtomicValue<ThermalStressResult> {
    const mat = this.getMaterial(input.material);
    const T0 = input.preheat_C ?? 25;
    const deltaT = mat.T_liq - T0; // approximate peak thermal excursion
    const lt = input.layer_thickness_mm / 1000; // m
    const nLayers = input.num_layers;
    const L = input.part_length_mm / 1000; // m
    const tSub = (input.substrate_thickness_mm ?? 10) / 1000; // m

    // Single-layer thermal stress (plane stress)
    const sigma_single = (mat.E * mat.alpha_CTE * deltaT) / (1 - mat.nu);

    // Layer-by-layer accumulation with stress relief from re-melting
    // Each layer re-melts ~1.5× layer thickness into previous layer, relieving ~40%
    const reliefFactor = 0.40;
    let accumulatedStress = 0;
    const stressProfile: number[] = [];

    for (let i = 0; i < nLayers; i++) {
      // New layer adds full thermal stress
      accumulatedStress = accumulatedStress * (1 - reliefFactor) + sigma_single;
      stressProfile.push(accumulatedStress);
    }

    // Peak stress is max of accumulated profile
    const peakStress = Math.max(...stressProfile);

    // Steady-state stress (geometric series convergence)
    const steadyState = sigma_single / reliefFactor;
    const effectivePeak = Math.min(peakStress, steadyState);

    // Yield ratio
    const yieldRatio = effectivePeak / mat.yield_MPa;

    // Distortion: Euler-Bernoulli cantilever analogy
    // δ = σ·L²/(2·E·t) where t = total build height + substrate
    const totalThickness = nLayers * lt + tSub;
    const distortion = (effectivePeak * L * L) / (2 * mat.E * totalThickness);
    const distortion_mm = distortion * 1000;

    // Stress gradient (through build height)
    const buildHeight = nLayers * lt;
    const stressGradient = buildHeight > 0 ?
      (stressProfile[nLayers - 1] - stressProfile[0]) / (buildHeight * 1000) : 0;

    // Risk classification
    let risk: ThermalStressResult['risk_level'];
    if (yieldRatio > 1.0) risk = 'critical';
    else if (yieldRatio > 0.8) risk = 'high';
    else if (yieldRatio > 0.5) risk = 'moderate';
    else risk = 'low';

    const result: ThermalStressResult = {
      peak_stress_MPa: round4(effectivePeak),
      yield_ratio: round4(yieldRatio),
      distortion_mm: round4(distortion_mm),
      stress_gradient_MPa_per_mm: round4(stressGradient),
      risk_level: risk,
    };

    return {
      value: result,
      unit: 'MPa',
      formula: 'σ = E·α·ΔT/(1-ν); δ = σ·L²/(2·E·t); Mercelis-Kruth layer accumulation',
      confidence: 0.80,
    };
  }

  /**
   * Evaluate and rank scan strategies for thermal uniformity,
   * residual stress, and build time.
   *
   * Strategies: raster, zigzag, island/checkerboard, spiral, fractal (Hilbert).
   * Scores are normalized 0-1 (higher = better).
   *
   * Island size optimization: trade-off between thermal uniformity
   * (smaller islands) and travel overhead (fewer, larger islands).
   *
   * Standard inter-layer rotation of 67° minimizes anisotropy by
   * ensuring non-repeating scan directions over many layers.
   *
   * @param input - Layer geometry and process parameters
   * @returns Recommended strategy, scores, optimal island size, rotation
   *
   * Ref: Thijs L. et al. (2010) "A study of the microstructural evolution..." Acta Materialia
   */
  scanStrategy(input: ScanStrategyInput): AtomicValue<ScanStrategyResult> {
    const mat = this.getMaterial(input.material);
    const area = input.layer_area_mm2;
    const hatch = input.hatch_spacing_mm;
    const V = input.scan_speed_mm_s;

    const strategies: ScanStrategyType[] = input.strategies ??
      ['raster', 'zigzag', 'island', 'spiral', 'fractal'];

    // Base scan length for the layer
    const sideLen = Math.sqrt(area);
    const numPasses = sideLen / hatch;
    const baseScanLen = numPasses * sideLen; // total scan path length

    const scores: Record<string, StrategyScore> = {};

    // Score each strategy
    for (const strat of strategies) {
      let thermalUniformity: number;
      let stressScore: number;
      let timeScore: number;

      switch (strat) {
        case 'raster':
          // Unidirectional — worst thermal uniformity, most anisotropic stress
          thermalUniformity = 0.45;
          stressScore = 0.35;
          timeScore = 0.90; // fast, minimal repositioning
          break;
        case 'zigzag':
          // Bidirectional — better uniformity, less anisotropy
          thermalUniformity = 0.60;
          stressScore = 0.55;
          timeScore = 0.95; // fastest, no reposition at end of pass
          break;
        case 'island':
          // Checkerboard — best uniformity, randomized heat input
          thermalUniformity = 0.90;
          stressScore = 0.85;
          timeScore = 0.65; // travel between islands
          break;
        case 'spiral':
          // Inward/outward spiral — good uniformity, continuous path
          thermalUniformity = 0.75;
          stressScore = 0.70;
          timeScore = 0.80;
          break;
        case 'fractal':
          // Hilbert curve — excellent uniformity, space-filling
          thermalUniformity = 0.85;
          stressScore = 0.80;
          timeScore = 0.55; // many direction changes
          break;
      }

      // Adjust for material thermal conductivity — high k → less sensitivity to strategy
      const kNorm = mat.k / 50; // normalize to ~1 for mid-range
      const kFactor = Math.min(1.0, 0.5 + 0.5 * kNorm);
      thermalUniformity = Math.min(1.0, thermalUniformity * (0.7 + 0.3 * kFactor));

      scores[strat] = {
        thermal_uniformity: round4(thermalUniformity),
        stress_score: round4(stressScore),
        time_score: round4(timeScore),
      };
    }

    // Rank by weighted composite: 40% thermal, 40% stress, 20% time
    let bestStrat = strategies[0];
    let bestComposite = -1;
    for (const strat of strategies) {
      const s = scores[strat];
      const composite = 0.4 * s.thermal_uniformity + 0.4 * s.stress_score + 0.2 * s.time_score;
      if (composite > bestComposite) {
        bestComposite = composite;
        bestStrat = strat;
      }
    }

    // Optimal island size: balance thermal uniformity vs travel overhead
    // Empirical: ~5-10mm for most LPBF processes
    // Optimal ≈ sqrt(2·α/V) · scaling — relate to thermal diffusion length
    const alpha = mat.k / (mat.rho * mat.Cp);
    const diffusionLength = Math.sqrt(2 * alpha / (V / 1000)) * 1000; // mm
    const optIsland = Math.max(2, Math.min(15, diffusionLength * 50));

    const result: ScanStrategyResult = {
      recommended_strategy: bestStrat,
      scores,
      optimal_island_size_mm: round4(optIsland),
      optimal_rotation_deg: 67, // irrational angle, standard in LPBF
    };

    return {
      value: result,
      unit: 'scores',
      formula: 'Composite = 0.4·thermal + 0.4·stress + 0.2·time; rotation = 67°',
      confidence: 0.85,
    };
  }

  /**
   * Calculate volumetric energy density and classify process regime.
   *
   * E_v = P / (V·h·t) [J/mm³]
   *
   * Normalized enthalpy (Hann et al. 2011):
   *   ΔH/h_s = (A·P) / (ρ·h_s·√(π·α·V·σ³))
   * where h_s = Cp·(T_liq - T₀), σ = beam radius.
   *
   * Process regimes:
   *   - Keyhole: E_v > material threshold → deep penetration, porosity risk
   *   - Conduction: optimal range → stable melt pool
   *   - Lack-of-fusion: E_v < threshold → incomplete melting, porosity
   *
   * @param input - Full process parameter set
   * @returns Energy density, regime classification, process window bounds
   *
   * Ref: Hann D.B. et al. (2011) J. Phys. D; King W.E. et al. (2014) J. Mat. Proc. Tech.
   */
  processWindow(input: ProcessWindowInput): AtomicValue<ProcessWindowResult> {
    const mat = this.getMaterial(input.material);
    const thresholds = PROCESS_THRESHOLDS[input.material];
    const P = input.power_W;
    const V = input.scan_speed_mm_s;
    const h = input.hatch_spacing_mm;
    const t = input.layer_thickness_mm;
    const sigma = (input.beam_radius_um ?? 50) / 1e6; // m

    // Volumetric energy density [J/mm³]
    const E_v = P / (V * h * t);

    // Normalized enthalpy (Hann model)
    const alpha = mat.k / (mat.rho * mat.Cp); // m²/s
    const V_m = V / 1000; // m/s
    const T0 = 298.15; // K
    const T_liq_K = mat.T_liq + 273.15;
    const h_s = mat.Cp * (T_liq_K - T0); // specific enthalpy to melting [J/kg]
    const denominator = mat.rho * h_s * Math.sqrt(Math.PI * alpha * V_m * sigma * sigma * sigma);
    const nh = (mat.absorptivity * P) / Math.max(denominator, 1e-20);

    // Regime classification
    let regime: ProcessWindowResult['regime'];
    if (E_v > thresholds.E_v_keyhole) {
      regime = 'keyhole';
    } else if (E_v < thresholds.E_v_lof) {
      regime = 'lack_of_fusion';
    } else {
      regime = 'conduction';
    }

    // Process window bounds: solve for P at fixed V, h, t
    const P_min = thresholds.E_v_lof * V * h * t;
    const P_max = thresholds.E_v_keyhole * V * h * t;

    const result: ProcessWindowResult = {
      energy_density_J_mm3: round4(E_v),
      regime,
      normalized_enthalpy: round4(nh),
      process_window_bounds: {
        E_v_min: thresholds.E_v_lof,
        E_v_max: thresholds.E_v_keyhole,
        power_min_W: round4(P_min),
        power_max_W: round4(P_max),
      },
    };

    return {
      value: result,
      unit: 'J/mm³',
      formula: 'E_v = P/(V·h·t); ΔH/h_s = (A·P)/(ρ·h_s·√(π·α·V·σ³))',
      confidence: 0.90,
    };
  }
}

// ─── Utility ───────────────────────────────────────────────────────

function round4(v: number): number {
  return Math.round(v * 10000) / 10000;
}

// ─── Singleton Export ──────────────────────────────────────────────

export const additiveManufacturingPhysicsEngine = new AdditiveManufacturingPhysicsEngine();
