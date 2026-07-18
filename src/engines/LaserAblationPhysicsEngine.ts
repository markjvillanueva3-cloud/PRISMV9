/**
 * LaserAblationPhysicsEngine — First-principles pulsed laser ablation physics
 *
 * Provides Beer-Lambert ablation depth, material removal rate, heat affected
 * zone prediction, laser drilling (percussion & trepan), pulse overlap /
 * surface texture estimation, and plasma shielding models.
 *
 * Self-contained: no external dependencies. Monte Carlo uncertainty via LHS
 * on material properties (alpha_abs CV=12%, F_th CV=15%).
 *
 * References:
 *   Bäuerle, "Laser Processing and Chemistry" 4th ed. (Springer, 2011),
 *   Chichkov et al., Appl. Phys. A 63 (1996) 109-115 (fs ablation regimes),
 *   Gamaly et al., Phys. Plasmas 9 (2002) 949 (ablation by ultrashort pulses),
 *   Prokhorov et al., "Laser Heating of Metals" (Adam Hilger, 1990),
 *   Nolte et al., J. Opt. Soc. Am. B 14 (1997) 2716 (incubation effect),
 *   Stuart et al., Phys. Rev. B 53 (1996) 1749 (damage thresholds)
 */

// ─── Types ──────────────────────────────────────────────────────────

/** Standard PRISM return wrapper with generic payload. */
export interface AtomicValue<T> {
  value: T;
  unit: string;
  formula?: string;
  confidence?: number;
}

// ─── Input / Output Interfaces ──────────────────────────────────────

export interface AblationDepthInput {
  material: string;
  wavelength_nm: 1064 | 532 | 355;
  pulse_energy_mJ: number;
  pulse_duration: 'ns' | 'ps' | 'fs';
  pulse_duration_value_s?: number;
  spot_diameter_um: number;
  n_pulses?: number;
}

export interface AblationDepthOutput {
  depth_per_pulse_um: number;
  total_depth_um: number;
  fluence_J_cm2: number;
  threshold_fluence_J_cm2: number;
  ablation_rate_um3_per_pulse: number;
  regime: 'thermal' | 'non-thermal' | 'mixed';
}

export interface RemovalRateInput {
  material: string;
  wavelength_nm: 1064 | 532 | 355;
  pulse_energy_mJ: number;
  pulse_duration: 'ns' | 'ps' | 'fs';
  spot_diameter_um: number;
  rep_rate_kHz: number;
  scan_speed_mm_s?: number;
  line_spacing_um?: number;
}

export interface RemovalRateOutput {
  mrr_mm3_per_s: number;
  mrr_mm3_per_min: number;
  specific_energy_J_mm3: number;
  volume_per_pulse_um3: number;
  optimal_rep_rate_kHz: number;
  process_time_per_mm2_s: number;
}

export interface HAZInput {
  material: string;
  pulse_duration: 'ns' | 'ps' | 'fs';
  pulse_duration_value_s?: number;
  fluence_J_cm2: number;
}

export interface HAZOutput {
  thermal_diffusion_length_um: number;
  HAZ_width_um: number;
  recast_thickness_um: number;
  melt_depth_um: number;
  microcrack_risk: 'low' | 'medium' | 'high';
  quality_grade: 'precision' | 'standard' | 'rough';
}

export interface LaserDrillingInput {
  material: string;
  hole_diameter_mm: number;
  depth_mm: number;
  method: 'percussion' | 'trepan';
  pulse_energy_mJ: number;
  rep_rate_kHz: number;
  wavelength_nm?: 1064 | 532 | 355;
  pulse_duration?: 'ns' | 'ps' | 'fs';
}

export interface LaserDrillingOutput {
  n_pulses: number;
  process_time_s: number;
  entry_diameter_mm: number;
  exit_diameter_mm: number;
  taper_deg: number;
  recast_thickness_um: number;
  aspect_ratio: number;
  quality_rating: string;
}

export interface PulseOverlapInput {
  spot_diameter_um: number;
  scan_speed_mm_s: number;
  rep_rate_kHz: number;
  line_spacing_um: number;
  depth_per_pulse_um: number;
}

export interface PulseOverlapOutput {
  spatial_overlap_pct: number;
  line_overlap_pct: number;
  estimated_Ra_um: number;
  surface_quality: 'mirror' | 'smooth' | 'textured' | 'rough';
  LIPSS_possible: boolean;
  crater_shape: string;
}

export interface PlasmaShieldingInput {
  material: string;
  fluence_J_cm2: number;
  pulse_duration: 'ns' | 'ps' | 'fs';
  wavelength_nm: 1064 | 532 | 355;
  ambient: 'air' | 'argon' | 'vacuum';
}

export interface PlasmaShieldingOutput {
  shielding_active: boolean;
  efficiency_pct: number;
  effective_fluence_J_cm2: number;
  plasma_temp_K: number;
  recommendation: string;
}

// ─── Material Database ──────────────────────────────────────────────

interface LaserAblationMaterial {
  name: string;
  /** Optical absorption coefficient at 1064 nm [1/m] */
  alpha_abs_1064: number;
  /** Ablation threshold fluence — nanosecond regime [J/cm²] */
  F_th_ns: number;
  /** Ablation threshold fluence — femtosecond regime [J/cm²] */
  F_th_fs: number;
  /** Thermal diffusivity [m²/s] */
  alpha_thermal: number;
  /** Young's modulus [GPa] */
  E_GPa: number;
  /** Coefficient of thermal expansion [1/K] */
  alpha_CTE: number;
  /** Poisson's ratio */
  nu: number;
  /** Incubation coefficient S (Jee et al.) */
  S_incubation: number;
  /** Electron-phonon coupling constant [W/m³·K] (for ultrashort pulse model) */
  g_coupling: number;
  /** Melting temperature [K] */
  T_melt: number;
  /** Plasma shielding threshold in air [J/cm²] */
  plasma_shield_threshold: number;
}

const MATERIALS: Record<string, LaserAblationMaterial> = {
  steel: {
    name: 'Steel', alpha_abs_1064: 5.7e7, F_th_ns: 2.0, F_th_fs: 0.15,
    alpha_thermal: 1.2e-5, E_GPa: 200, alpha_CTE: 12e-6, nu: 0.3,
    S_incubation: 0.85, g_coupling: 3.6e17, T_melt: 1800, plasma_shield_threshold: 15
  },
  aluminum: {
    name: 'Aluminum', alpha_abs_1064: 1.5e8, F_th_ns: 4.0, F_th_fs: 0.10,
    alpha_thermal: 9.7e-5, E_GPa: 70, alpha_CTE: 23e-6, nu: 0.33,
    S_incubation: 0.80, g_coupling: 2.4e17, T_melt: 933, plasma_shield_threshold: 20
  },
  copper: {
    name: 'Copper', alpha_abs_1064: 8.3e7, F_th_ns: 5.5, F_th_fs: 0.35,
    alpha_thermal: 1.17e-4, E_GPa: 120, alpha_CTE: 17e-6, nu: 0.34,
    S_incubation: 0.82, g_coupling: 1.0e17, T_melt: 1358, plasma_shield_threshold: 25
  },
  silicon: {
    name: 'Silicon', alpha_abs_1064: 1.0e5, F_th_ns: 0.8, F_th_fs: 0.08,
    alpha_thermal: 8.8e-5, E_GPa: 130, alpha_CTE: 2.6e-6, nu: 0.28,
    S_incubation: 0.90, g_coupling: 1.5e18, T_melt: 1687, plasma_shield_threshold: 10
  },
  titanium: {
    name: 'Titanium', alpha_abs_1064: 6.2e7, F_th_ns: 1.5, F_th_fs: 0.12,
    alpha_thermal: 9.0e-6, E_GPa: 116, alpha_CTE: 8.6e-6, nu: 0.34,
    S_incubation: 0.88, g_coupling: 4.2e17, T_melt: 1941, plasma_shield_threshold: 12
  },
  ceramics: {
    name: 'Ceramics/Al2O3', alpha_abs_1064: 2.0e3, F_th_ns: 8.0, F_th_fs: 1.5,
    alpha_thermal: 1.2e-5, E_GPa: 370, alpha_CTE: 7.5e-6, nu: 0.22,
    S_incubation: 0.95, g_coupling: 1.0e16, T_melt: 2345, plasma_shield_threshold: 50
  }
};

/** Wavelength scaling factors for alpha_abs relative to 1064 nm. */
const WAVELENGTH_ALPHA_FACTOR: Record<number, number> = {
  1064: 1.0,
  532: 1.8,   // Higher absorption at shorter wavelengths (metals)
  355: 3.2    // UV even higher
};

/** Wavelength scaling factors for F_th relative to 1064 nm. */
const WAVELENGTH_FTH_FACTOR: Record<number, number> = {
  1064: 1.0,
  532: 0.7,
  355: 0.5
};

// ─── Deterministic PRNG (mulberry32) ────────────────────────────────

function mulberry32(seed: number): () => number {
  let s = seed | 0;
  return (): number => {
    s = (s + 0x6D2B79F5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Box-Muller normal deviate from uniform RNG. */
function normalRandom(rng: () => number, mean: number, std: number): number {
  const u1 = rng();
  const u2 = rng();
  const z = Math.sqrt(-2 * Math.log(Math.max(u1, 1e-15))) * Math.cos(2 * Math.PI * u2);
  return mean + std * z;
}

/** Latin Hypercube Sampling — returns N samples of k variables in [0,1]^k. */
function lhsSample(n: number, k: number, rng: () => number): number[][] {
  const result: number[][] = [];
  for (let i = 0; i < n; i++) result.push(new Array<number>(k));
  for (let j = 0; j < k; j++) {
    const perm = Array.from({ length: n }, (_, i) => i);
    // Fisher-Yates shuffle
    for (let i = n - 1; i > 0; i--) {
      const idx = Math.floor(rng() * (i + 1));
      [perm[i], perm[idx]] = [perm[idx], perm[i]];
    }
    for (let i = 0; i < n; i++) {
      result[i][j] = (perm[i] + rng()) / n;
    }
  }
  return result;
}

/** Inverse normal CDF (Beasley-Springer-Moro). */
function invNormCDF(p: number): number {
  if (p <= 0) return -8;
  if (p >= 1) return 8;
  if (p === 0.5) return 0;
  const a = [
    -3.969683028665376e+01, 2.209460984245205e+02,
    -2.759285104469687e+02, 1.383577518672690e+02,
    -3.066479806614716e+01, 2.506628277459239e+00
  ];
  const b = [
    -5.447609879822406e+01, 1.615858368580409e+02,
    -1.556989798598866e+02, 6.680131188771972e+01, -1.328068155288572e+01
  ];
  const c = [
    -7.784894002430293e-03, -3.223964580411365e-01,
    -2.400758277161838e+00, -2.549732539343734e+00,
    4.374664141464968e+00, 2.938163982698783e+00
  ];
  const d = [
    7.784695709041462e-03, 3.224671290700398e-01,
    2.445134137142996e+00, 3.754408661907416e+00
  ];
  const pLow = 0.02425;
  const pHigh = 1 - pLow;
  let q: number, r: number;
  if (p < pLow) {
    q = Math.sqrt(-2 * Math.log(p));
    return (((((c[0]*q+c[1])*q+c[2])*q+c[3])*q+c[4])*q+c[5]) /
           ((((d[0]*q+d[1])*q+d[2])*q+d[3])*q+1);
  } else if (p <= pHigh) {
    q = p - 0.5;
    r = q * q;
    return (((((a[0]*r+a[1])*r+a[2])*r+a[3])*r+a[4])*r+a[5]) * q /
           (((((b[0]*r+b[1])*r+b[2])*r+b[3])*r+b[4])*r+1);
  } else {
    q = Math.sqrt(-2 * Math.log(1 - p));
    return -(((((c[0]*q+c[1])*q+c[2])*q+c[3])*q+c[4])*q+c[5]) /
            ((((d[0]*q+d[1])*q+d[2])*q+d[3])*q+1);
  }
}

// ─── Helpers ────────────────────────────────────────────────────────

function resolveMaterial(name: string): LaserAblationMaterial {
  const key = name.toLowerCase().replace(/[\s_/-]/g, '');
  for (const [k, v] of Object.entries(MATERIALS)) {
    if (key === k || key === v.name.toLowerCase().replace(/[\s_/-]/g, '')) return v;
  }
  // partial match
  for (const [, v] of Object.entries(MATERIALS)) {
    if (v.name.toLowerCase().includes(key) || key.includes(v.name.toLowerCase().replace(/[\s/]/g, ''))) return v;
  }
  return MATERIALS.steel; // fallback
}

function getAlpha(mat: LaserAblationMaterial, wl: number): number {
  return mat.alpha_abs_1064 * (WAVELENGTH_ALPHA_FACTOR[wl] ?? 1.0);
}

function getThresholdFluence(mat: LaserAblationMaterial, duration: string, wl: number): number {
  const wlFactor = WAVELENGTH_FTH_FACTOR[wl] ?? 1.0;
  if (duration === 'fs') return mat.F_th_fs * wlFactor;
  if (duration === 'ps') {
    // Interpolate between fs and ns: F_th_ps ≈ geometric mean
    return Math.sqrt(mat.F_th_fs * mat.F_th_ns) * wlFactor;
  }
  return mat.F_th_ns * wlFactor;
}

function getPulseDurationSeconds(duration: string, value_s?: number): number {
  if (value_s !== undefined && value_s > 0) return value_s;
  switch (duration) {
    case 'fs': return 200e-15; // 200 fs typical
    case 'ps': return 10e-12;  // 10 ps typical
    case 'ns': return 10e-9;   // 10 ns typical
    default: return 10e-9;
  }
}

function classifyRegime(duration: string): 'thermal' | 'non-thermal' | 'mixed' {
  if (duration === 'fs') return 'non-thermal';
  if (duration === 'ps') return 'mixed';
  return 'thermal';
}

function computeFluence(pulse_energy_mJ: number, spot_diameter_um: number): number {
  const E_J = pulse_energy_mJ * 1e-3;
  const r_cm = (spot_diameter_um * 1e-4) / 2;
  const A_cm2 = Math.PI * r_cm * r_cm;
  return E_J / A_cm2;
}

function percentile(sorted: number[], p: number): number {
  const idx = p * (sorted.length - 1);
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo];
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
}

// ─── Engine ─────────────────────────────────────────────────────────

/**
 * LaserAblationPhysicsEngine — first-principles physics for pulsed laser
 * ablation, drilling, and micromachining.
 *
 * Six public methods covering Beer-Lambert ablation depth, volumetric MRR,
 * HAZ/recast prediction, percussion & trepan drilling, pulse overlap /
 * surface texture, and plasma shielding. All return `AtomicValue<T>`.
 *
 * Monte Carlo uncertainty propagation with LHS on material properties
 * (alpha_abs CV=12%, F_th CV=15%) producing CI95 on depth and MRR.
 */
export class LaserAblationPhysicsEngine {

  // ── 1. Single-Pulse Ablation Depth ──────────────────────────────

  /**
   * Beer-Lambert ablation depth model with incubation effect and
   * two-temperature ultrashort pulse correction.
   *
   * Physics: d = (1/alpha) * ln(F/F_th) for F > F_th, else 0.
   * Short pulse (< 10 ps): F_th_ultra ~ F_th_long * sqrt(tau_p / tau_thermal).
   * Incubation: F_th(N) = F_th(1) * N^(S-1).
   *
   * @param input - Ablation parameters (material, laser, geometry)
   * @returns AtomicValue with ablation depth breakdown
   *
   * @reference Bäuerle, "Laser Processing and Chemistry" Ch. 12
   * @reference Chichkov et al., Appl. Phys. A 63 (1996) 109-115
   * @reference Nolte et al., J. Opt. Soc. Am. B 14 (1997) 2716
   */
  ablationDepth(input: AblationDepthInput): AtomicValue<AblationDepthOutput> {
    const mat = resolveMaterial(input.material);
    const wl = input.wavelength_nm;
    const alpha = getAlpha(mat, wl);
    const F = computeFluence(input.pulse_energy_mJ, input.spot_diameter_um);
    const nPulses = input.n_pulses ?? 1;
    const tau_p = getPulseDurationSeconds(input.pulse_duration, input.pulse_duration_value_s);

    let F_th = getThresholdFluence(mat, input.pulse_duration, wl);

    // Two-temperature ultrashort correction (< 10 ps)
    if (tau_p < 10e-12) {
      const tau_thermal = mat.alpha_thermal / (alpha * alpha * 1e-12); // approximate thermal relaxation
      const tau_ref = Math.max(tau_thermal, 1e-12);
      F_th = F_th * Math.sqrt(tau_p / tau_ref);
      // Clamp: F_th should not go below ~10% of fs value
      F_th = Math.max(F_th, mat.F_th_fs * 0.1 * (WAVELENGTH_FTH_FACTOR[wl] ?? 1.0));
    }

    // Incubation effect for multiple pulses
    if (nPulses > 1) {
      F_th = F_th * Math.pow(nPulses, mat.S_incubation - 1);
    }

    let depth_per_pulse_m = 0;
    if (F > F_th) {
      depth_per_pulse_m = (1 / alpha) * Math.log(F / F_th);
    }
    const depth_per_pulse_um = depth_per_pulse_m * 1e6;
    const total_depth_um = depth_per_pulse_um * nPulses;

    // Ablation volume per pulse (cylindrical approximation)
    const r_um = input.spot_diameter_um / 2;
    const A_spot_um2 = Math.PI * r_um * r_um;
    const ablation_rate_um3 = depth_per_pulse_um * A_spot_um2;

    const regime = classifyRegime(input.pulse_duration);

    // MC uncertainty
    const rng = mulberry32(12345);
    const N_MC = 200;
    const samples = lhsSample(N_MC, 2, rng);
    const depths: number[] = [];
    const alphaCV = 0.12;
    const fthCV = 0.15;

    for (let i = 0; i < N_MC; i++) {
      const a_s = alpha * (1 + alphaCV * invNormCDF(samples[i][0]));
      let fth_s = F_th * (1 + fthCV * invNormCDF(samples[i][1]));
      fth_s = Math.max(fth_s, 0.001);
      if (F > fth_s && a_s > 0) {
        depths.push((1 / a_s) * Math.log(F / fth_s) * 1e6);
      } else {
        depths.push(0);
      }
    }
    depths.sort((a, b) => a - b);
    const ci_lo = percentile(depths, 0.025);
    const ci_hi = percentile(depths, 0.975);

    return {
      value: {
        depth_per_pulse_um,
        total_depth_um,
        fluence_J_cm2: F,
        threshold_fluence_J_cm2: F_th,
        ablation_rate_um3_per_pulse: ablation_rate_um3,
        regime
      },
      unit: 'um',
      formula: `d = (1/${(alpha).toExponential(2)}) * ln(${F.toFixed(2)}/` +
        `${F_th.toFixed(3)}) [Beer-Lambert]; ` +
        `CI95=[${ci_lo.toFixed(3)}, ${ci_hi.toFixed(3)}] um`,
      confidence: 0.95
    };
  }

  // ── 2. Material Removal Rate ────────────────────────────────────

  /**
   * Volumetric ablation rate for production laser micromachining.
   *
   * Gaussian beam effective area: A_eff = pi*w0^2/2 * ln(F_peak/F_th).
   * MRR = V_pulse * f_rep. Optimizes rep rate vs thermal accumulation.
   *
   * @param input - Process parameters (material, laser, scanning)
   * @returns AtomicValue with volumetric removal rates and efficiency
   *
   * @reference Gamaly et al., Phys. Plasmas 9 (2002) 949
   * @reference Raciukaitis et al., JLMN 4 (2009) 186-191
   */
  removalRate(input: RemovalRateInput): AtomicValue<RemovalRateOutput> {
    const mat = resolveMaterial(input.material);
    const wl = input.wavelength_nm;
    const alpha = getAlpha(mat, wl);
    const F = computeFluence(input.pulse_energy_mJ, input.spot_diameter_um);
    const F_th = getThresholdFluence(mat, input.pulse_duration, wl);
    const f_rep = input.rep_rate_kHz * 1e3; // Hz

    // Depth per pulse
    const d_pulse = F > F_th ? (1 / alpha) * Math.log(F / F_th) : 0; // metres

    // Gaussian effective ablation area
    const w0_m = (input.spot_diameter_um * 1e-6) / 2;
    const A_eff_m2 = F > F_th
      ? (Math.PI * w0_m * w0_m / 2) * Math.log(F / F_th)
      : 0;

    const V_pulse_m3 = d_pulse * A_eff_m2;
    const V_pulse_um3 = V_pulse_m3 * 1e18;

    const mrr_m3_per_s = V_pulse_m3 * f_rep;
    const mrr_mm3_per_s = mrr_m3_per_s * 1e9;
    const mrr_mm3_per_min = mrr_mm3_per_s * 60;

    // Specific removal energy
    const E_pulse_J = input.pulse_energy_mJ * 1e-3;
    const specific_energy = V_pulse_m3 > 0 ? E_pulse_J / (V_pulse_m3 * 1e9) : Infinity; // J/mm³

    // Optimal rep rate: avoid thermal accumulation. Threshold ≈ 1/(4 * alpha_thermal / w0^2)
    const thermal_time = w0_m * w0_m / (4 * mat.alpha_thermal);
    const optimal_rep_Hz = 1 / thermal_time;
    const optimal_rep_kHz = Math.min(optimal_rep_Hz / 1e3, 10000); // cap at 10 MHz

    // Process time per mm²
    const scan_speed = input.scan_speed_mm_s ?? (f_rep * input.spot_diameter_um * 1e-3 * 0.5);
    const line_sp = input.line_spacing_um ?? (input.spot_diameter_um * 0.5);
    const passes_per_mm = 1e3 / line_sp; // lines per mm width
    const time_per_mm_length = 1 / scan_speed; // s per mm in scan dir
    const process_time_per_mm2 = passes_per_mm * time_per_mm_length;

    // MC uncertainty on MRR
    const rng = mulberry32(54321);
    const N_MC = 200;
    const samples = lhsSample(N_MC, 2, rng);
    const mrrs: number[] = [];
    for (let i = 0; i < N_MC; i++) {
      const a_s = alpha * (1 + 0.12 * invNormCDF(samples[i][0]));
      let fth_s = F_th * (1 + 0.15 * invNormCDF(samples[i][1]));
      fth_s = Math.max(fth_s, 0.001);
      if (F > fth_s && a_s > 0) {
        const d_s = (1 / a_s) * Math.log(F / fth_s);
        const ae_s = (Math.PI * w0_m * w0_m / 2) * Math.log(F / fth_s);
        mrrs.push(d_s * ae_s * f_rep * 1e9);
      } else {
        mrrs.push(0);
      }
    }
    mrrs.sort((a, b) => a - b);
    const ci_lo = percentile(mrrs, 0.025);
    const ci_hi = percentile(mrrs, 0.975);

    return {
      value: {
        mrr_mm3_per_s,
        mrr_mm3_per_min,
        specific_energy_J_mm3: specific_energy,
        volume_per_pulse_um3: V_pulse_um3,
        optimal_rep_rate_kHz: Math.round(optimal_rep_kHz * 10) / 10,
        process_time_per_mm2_s: process_time_per_mm2
      },
      unit: 'mm³/s',
      formula: `MRR = V_pulse * f_rep; V = d * A_eff(Gaussian); CI95=[${ci_lo.toExponential(3)}, ${ci_hi.toExponential(3)}] mm³/s`,
      confidence: 0.95
    };
  }

  // ── 3. Heat Affected Zone ───────────────────────────────────────

  /**
   * Predict thermal damage extent: HAZ width, recast layer, melt depth,
   * micro-crack risk, and quality grade.
   *
   * Thermal diffusion length: l_th = 2*sqrt(alpha_thermal * tau_p).
   * Recast: t_recast ~ k_recast * l_th * (F/F_th - 1).
   * Melt depth (ns): d_melt ~ l_th * sqrt(F/F_th) from Stefan problem.
   * Micro-crack: sigma_th = E * alpha_CTE * DeltaT / (1 - nu).
   *
   * @param input - Material, pulse duration, fluence
   * @returns AtomicValue with thermal damage predictions
   *
   * @reference Prokhorov et al., "Laser Heating of Metals" (1990)
   * @reference Bäuerle, "Laser Processing and Chemistry" Ch. 6-7
   */
  heatAffectedZone(input: HAZInput): AtomicValue<HAZOutput> {
    const mat = resolveMaterial(input.material);
    const tau_p = getPulseDurationSeconds(input.pulse_duration, input.pulse_duration_value_s);
    const F = input.fluence_J_cm2;
    const F_th = getThresholdFluence(mat, input.pulse_duration, 1064);

    // Thermal diffusion length
    const l_th_m = 2 * Math.sqrt(mat.alpha_thermal * tau_p);
    const l_th_um = l_th_m * 1e6;

    // HAZ width: proportional to thermal diffusion length, scaled by fluence ratio
    let HAZ_um: number;
    if (input.pulse_duration === 'fs') {
      HAZ_um = l_th_um * 0.1; // Minimal HAZ for fs
    } else if (input.pulse_duration === 'ps') {
      HAZ_um = l_th_um * 0.5 * Math.sqrt(Math.max(F / F_th, 1));
    } else {
      HAZ_um = l_th_um * Math.sqrt(Math.max(F / F_th, 1));
    }

    // Recast layer: t_recast ~ 0.3 * l_th * (F/F_th - 1) for ns
    const k_recast = input.pulse_duration === 'fs' ? 0.02 : input.pulse_duration === 'ps' ? 0.1 : 0.3;
    const recast_um = k_recast * l_th_um * Math.max(F / F_th - 1, 0);

    // Melt depth (Stefan problem approximation, mainly ns regime)
    let melt_depth_um = 0;
    if (input.pulse_duration === 'ns') {
      melt_depth_um = l_th_um * Math.sqrt(Math.max(F / F_th, 0));
    } else if (input.pulse_duration === 'ps') {
      melt_depth_um = l_th_um * 0.3 * Math.sqrt(Math.max(F / F_th, 0));
    }
    // fs: negligible melt

    // Micro-crack risk: thermal stress
    const deltaT = mat.T_melt * 0.5 * Math.min(F / F_th, 5); // approximate surface temperature rise
    const sigma_th_MPa = (mat.E_GPa * 1e3 * mat.alpha_CTE * deltaT) / (1 - mat.nu); // MPa
    let microcrack_risk: 'low' | 'medium' | 'high';
    if (sigma_th_MPa < 200 || input.pulse_duration === 'fs') {
      microcrack_risk = 'low';
    } else if (sigma_th_MPa < 600) {
      microcrack_risk = 'medium';
    } else {
      microcrack_risk = 'high';
    }

    // Quality grade
    let quality_grade: 'precision' | 'standard' | 'rough';
    if (HAZ_um < 1 && recast_um < 0.5) {
      quality_grade = 'precision';
    } else if (HAZ_um < 10 && recast_um < 5) {
      quality_grade = 'standard';
    } else {
      quality_grade = 'rough';
    }

    return {
      value: {
        thermal_diffusion_length_um: l_th_um,
        HAZ_width_um: HAZ_um,
        recast_thickness_um: recast_um,
        melt_depth_um,
        microcrack_risk,
        quality_grade
      },
      unit: 'um',
      formula: `l_th = 2*sqrt(${mat.alpha_thermal.toExponential(2)} * ` +
        `${tau_p.toExponential(2)}); HAZ ~ l_th*sqrt(F/F_th); ` +
        `recast ~ ${k_recast}*l_th*(F/F_th - 1)`
    };
  }

  // ── 4. Laser Drilling ───────────────────────────────────────────

  /**
   * Percussion and trepan drilling models with taper, recast, and
   * aspect ratio analysis.
   *
   * Percussion: N = h / d_per_pulse. Taper theta = arctan((D_entry-D_exit)/(2h)).
   * Trepan: circumferential scan, time = pi*D/v_scan per pass.
   *
   * @param input - Hole geometry, method, laser parameters
   * @returns AtomicValue with drilling process predictions
   *
   * @reference Bäuerle, "Laser Processing and Chemistry" Ch. 13
   * @reference Dahotre & Harimkar, "Laser Fabrication and Machining of Materials" (2008)
   */
  laserDrilling(input: LaserDrillingInput): AtomicValue<LaserDrillingOutput> {
    const mat = resolveMaterial(input.material);
    const wl = input.wavelength_nm ?? 1064;
    const duration = input.pulse_duration ?? 'ns';
    const alpha = getAlpha(mat, wl);
    const spotDiam_um = 50; // typical focused spot for drilling
    const F = computeFluence(input.pulse_energy_mJ, spotDiam_um);
    const F_th = getThresholdFluence(mat, duration, wl);
    const f_rep = input.rep_rate_kHz * 1e3;

    // Depth per pulse
    const d_pulse_m = F > F_th ? (1 / alpha) * Math.log(F / F_th) : 1e-9;
    const d_pulse_um = d_pulse_m * 1e6;

    const depth_um = input.depth_mm * 1000;
    const holeDiam_um = input.hole_diameter_mm * 1000;
    const aspect_ratio = input.depth_mm / input.hole_diameter_mm;

    let n_pulses: number;
    let process_time_s: number;
    let taper_deg: number;
    let entry_diameter_mm: number;
    let exit_diameter_mm: number;

    if (input.method === 'percussion') {
      // Percussion: straight stack of pulses
      n_pulses = Math.ceil(depth_um / d_pulse_um);
      process_time_s = n_pulses / f_rep;

      // Taper: 2-10° typical for percussion, scales with aspect ratio
      const base_taper = 3 + 2 * Math.log10(Math.max(aspect_ratio, 1));
      taper_deg = Math.min(base_taper * (duration === 'fs' ? 0.5 : duration === 'ps' ? 0.7 : 1.0), 10);

      const taper_rad = taper_deg * Math.PI / 180;
      entry_diameter_mm = input.hole_diameter_mm;
      exit_diameter_mm = Math.max(
        entry_diameter_mm - 2 * input.depth_mm * Math.tan(taper_rad),
        entry_diameter_mm * 0.3
      );
    } else {
      // Trepan: cut circumference
      const circumference_mm = Math.PI * input.hole_diameter_mm;
      const scan_speed_mm_s = f_rep * (spotDiam_um * 1e-3) * 0.5; // 50% overlap
      const n_depth_passes = Math.ceil(depth_um / d_pulse_um);
      const time_per_pass = circumference_mm / scan_speed_mm_s;
      process_time_s = time_per_pass * n_depth_passes;
      n_pulses = Math.ceil(process_time_s * f_rep);

      // Trepan taper: 0.5-2°
      taper_deg = 0.5 + 0.5 * Math.log10(Math.max(aspect_ratio, 1));
      taper_deg *= (duration === 'fs' ? 0.5 : duration === 'ps' ? 0.7 : 1.0);
      taper_deg = Math.min(taper_deg, 2);

      const taper_rad = taper_deg * Math.PI / 180;
      entry_diameter_mm = input.hole_diameter_mm;
      exit_diameter_mm = Math.max(
        entry_diameter_mm - 2 * input.depth_mm * Math.tan(taper_rad),
        entry_diameter_mm * 0.6
      );
    }

    // Recast thickness in hole (thicker at bottom)
    const tau_p = getPulseDurationSeconds(duration);
    const l_th_m = 2 * Math.sqrt(mat.alpha_thermal * tau_p);
    const k_r = duration === 'fs' ? 0.02 : duration === 'ps' ? 0.1 : 0.3;
    const recast_um = k_r * l_th_m * 1e6 * Math.max(F / F_th - 1, 0) * 1.5; // 1.5x for hole geometry

    // Quality rating
    let quality_rating: string;
    if (taper_deg < 1 && recast_um < 2) {
      quality_rating = 'excellent — precision micro-hole';
    } else if (taper_deg < 3 && recast_um < 10) {
      quality_rating = 'good — standard industrial quality';
    } else if (taper_deg < 6) {
      quality_rating = 'acceptable — moderate taper and recast';
    } else {
      quality_rating = 'poor — significant taper and thermal damage';
    }

    // Aspect ratio limits
    const maxAR = input.method === 'percussion' ? 10 : 20;
    if (aspect_ratio > maxAR) {
      quality_rating += ` (WARNING: aspect ratio ${aspect_ratio.toFixed(1)} exceeds ${input.method} limit of ${maxAR}:1)`;
    }

    return {
      value: {
        n_pulses,
        process_time_s,
        entry_diameter_mm,
        exit_diameter_mm,
        taper_deg,
        recast_thickness_um: recast_um,
        aspect_ratio,
        quality_rating
      },
      unit: 'mixed',
      formula: `${input.method}: N=${n_pulses} pulses, ` +
        `d/pulse=${d_pulse_um.toFixed(3)} um, ` +
        `AR=${aspect_ratio.toFixed(1)}:1, taper=${taper_deg.toFixed(1)}deg`
    };
  }

  // ── 5. Pulse Overlap & Surface Texture ──────────────────────────

  /**
   * Surface quality prediction from pulse spacing and overlap geometry.
   *
   * Spatial overlap: OL = 1 - v/(f_rep * d_spot).
   * Line overlap: OL_line = 1 - line_spacing/d_spot.
   * Ra ~ d_per_pulse * (1-OL)^2 / 4.
   * LIPSS detection for ultrashort pulses near threshold fluence.
   *
   * @param input - Scan parameters (speed, rep rate, spacing)
   * @returns AtomicValue with surface quality predictions
   *
   * @reference Bäuerle, "Laser Processing and Chemistry" Ch. 28
   * @reference Vorobyev & Guo, Laser Photon. Rev. 7 (2013) 385
   */
  pulseOverlap(input: PulseOverlapInput): AtomicValue<PulseOverlapOutput> {
    const d_spot_mm = input.spot_diameter_um * 1e-3;
    const f_rep_Hz = input.rep_rate_kHz * 1e3;

    // Spatial (scan direction) overlap
    const pulse_spacing_mm = input.scan_speed_mm_s / f_rep_Hz;
    const spatial_overlap = Math.max(0, 1 - pulse_spacing_mm / d_spot_mm);
    const spatial_overlap_pct = spatial_overlap * 100;

    // Line (cross-scan) overlap
    const line_spacing_mm = input.line_spacing_um * 1e-3;
    const line_overlap = Math.max(0, 1 - line_spacing_mm / d_spot_mm);
    const line_overlap_pct = line_overlap * 100;

    // Surface roughness estimate (scallop model analogy)
    const OL = Math.min(spatial_overlap, 0.99);
    const estimated_Ra_um = input.depth_per_pulse_um * Math.pow(1 - OL, 2) / 4;

    // Surface quality classification
    let surface_quality: 'mirror' | 'smooth' | 'textured' | 'rough';
    if (estimated_Ra_um < 0.05) {
      surface_quality = 'mirror';
    } else if (estimated_Ra_um < 0.5) {
      surface_quality = 'smooth';
    } else if (estimated_Ra_um < 2.0) {
      surface_quality = 'textured';
    } else {
      surface_quality = 'rough';
    }

    // LIPSS: possible for ultrashort pulses at fluence near threshold
    // (This method doesn't have fluence info directly, so flag based on overlap)
    const LIPSS_possible = spatial_overlap_pct > 60 && input.depth_per_pulse_um < 0.5;

    // Crater morphology
    let crater_shape: string;
    if (spatial_overlap_pct > 80 && line_overlap_pct > 80) {
      crater_shape = 'flat — high overlap smooths individual craters';
    } else if (spatial_overlap_pct > 50) {
      crater_shape = 'overlapping Gaussian — moderate scallop pattern';
    } else if (spatial_overlap_pct > 20) {
      crater_shape = 'discrete Gaussian — visible individual craters';
    } else {
      crater_shape = 'isolated craters — minimal overlap';
    }

    return {
      value: {
        spatial_overlap_pct,
        line_overlap_pct,
        estimated_Ra_um,
        surface_quality,
        LIPSS_possible,
        crater_shape
      },
      unit: '%',
      formula: `OL_spatial = 1 - ${input.scan_speed_mm_s}/(${f_rep_Hz} * ${d_spot_mm.toFixed(4)}); Ra ~ ${input.depth_per_pulse_um} * (1-OL)^2 / 4`
    };
  }

  // ── 6. Plasma Shielding ─────────────────────────────────────────

  /**
   * Plasma absorption model for high-fluence nanosecond ablation.
   *
   * Inverse Bremsstrahlung absorption: alpha_plasma = (n_e * e^2) /
   * (m_e * c * eps0 * omega^2) * nu_ei. Effective fluence reduced by
   * exp(-alpha_plasma * L_plasma). Ambient gas effects on plasma confinement.
   *
   * @param input - Fluence, pulse regime, ambient gas
   * @returns AtomicValue with shielding efficiency and recommendations
   *
   * @reference Prokhorov et al., "Laser Heating of Metals" (1990)
   * @reference Bogaerts et al., Spectrochim. Acta B 58 (2003) 1867
   */
  plasmaShielding(input: PlasmaShieldingInput): AtomicValue<PlasmaShieldingOutput> {
    const mat = resolveMaterial(input.material);
    const F = input.fluence_J_cm2;
    const wl = input.wavelength_nm;

    // Plasma shielding primarily significant for ns pulses
    const isNs = input.pulse_duration === 'ns';
    const isPs = input.pulse_duration === 'ps';

    // Ambient gas factor on plasma confinement
    const ambientFactor: Record<string, number> = {
      air: 1.0,
      argon: 0.7,   // Inert gas reduces plasma temperature
      vacuum: 0.15  // Plasma expands freely, minimal shielding
    };
    const gasFactor = ambientFactor[input.ambient] ?? 1.0;

    // Threshold for plasma shielding
    const shield_threshold = mat.plasma_shield_threshold * (1 / gasFactor);
    const shielding_active = isNs && F > shield_threshold;

    // Plasma temperature estimate [K]: rough scaling with fluence
    let plasma_temp_K: number;
    if (isNs && F > shield_threshold) {
      // Typical plasma 5,000-30,000 K for ns pulses
      plasma_temp_K = 5000 + 10000 * Math.log(F / shield_threshold) * gasFactor;
    } else if (isPs) {
      plasma_temp_K = 2000 + 3000 * Math.min(F / (shield_threshold * 2), 3);
    } else {
      plasma_temp_K = 300; // fs: no plasma during pulse
    }
    plasma_temp_K = Math.min(plasma_temp_K, 50000);

    // Effective fluence after plasma absorption
    let efficiency_pct: number;
    let F_eff: number;

    if (!isNs || F <= shield_threshold) {
      // No significant shielding
      efficiency_pct = isPs ? Math.max(95 - 2 * Math.max(F - shield_threshold * 2, 0), 85) : 100;
      F_eff = F * efficiency_pct / 100;
    } else {
      // IB absorption model (simplified)
      // alpha_plasma scales with n_e^2, which scales with F above threshold
      // L_plasma ~ few mm for ns in air
      const L_plasma_m = 1e-3 * gasFactor; // plasma plume length
      const omega = 2 * Math.PI * 3e8 / (wl * 1e-9); // angular frequency
      // Simplified: plasma optical depth ~ k * (F/F_th_shield - 1)^1.5
      const optical_depth = 0.5 * Math.pow(F / shield_threshold - 1, 1.5) * gasFactor;
      const transmission = Math.exp(-optical_depth);
      efficiency_pct = transmission * 100;
      F_eff = F * transmission;

      // Clamp
      efficiency_pct = Math.max(efficiency_pct, 10);
      F_eff = Math.max(F_eff, F * 0.1);
    }

    // Recommendation
    let recommendation: string;
    if (!shielding_active) {
      if (input.pulse_duration === 'fs') {
        recommendation = 'No plasma shielding — ultrashort pulse ablates before plasma forms';
      } else if (input.pulse_duration === 'ps') {
        recommendation = 'Minimal plasma effect — picosecond regime has low plasma interaction';
      } else {
        recommendation = `Fluence ${F.toFixed(1)} J/cm² is below shielding threshold ${shield_threshold.toFixed(1)} J/cm² — efficient ablation`;
      }
    } else if (efficiency_pct > 70) {
      const loss = (100 - efficiency_pct).toFixed(0);
      const gas = input.ambient === 'air'
        ? 'argon assist or vacuum' : 'vacuum';
      recommendation = `Mild plasma shielding (${loss}% loss). ` +
        `Consider ${gas} to improve.`;
    } else if (efficiency_pct > 40) {
      const loss = (100 - efficiency_pct).toFixed(0);
      recommendation = `Significant plasma shielding (${loss}% loss). ` +
        `Reduce fluence and increase rep rate, or switch to ps/fs pulses.`;
    } else {
      const loss = (100 - efficiency_pct).toFixed(0);
      recommendation = `Severe plasma shielding (${loss}% loss). ` +
        `Strongly recommend shorter pulses (ps/fs), vacuum, ` +
        `or multi-pulse strategy at lower fluence.`;
    }

    return {
      value: {
        shielding_active,
        efficiency_pct,
        effective_fluence_J_cm2: F_eff,
        plasma_temp_K,
        recommendation
      },
      unit: '%',
      formula: `F_eff = ${F.toFixed(2)} * exp(-tau_plasma); ` +
        `tau ~ 0.5*(F/F_shield - 1)^1.5 * g_ambient; ` +
        `shield threshold=${shield_threshold.toFixed(1)} J/cm2`
    };
  }
}

// ─── Singleton Export ─────────────────────────────────────────────

export const laserAblationPhysicsEngine = new LaserAblationPhysicsEngine();
export { LaserAblationPhysicsEngine as default };
