/**
 * LAMThermalSofteningEngine — Laser-Assisted Machining thermal softening physics
 *
 * First-principles models for CW/pulsed laser preheating in LAM: moving heat
 * source temperature fields, Johnson-Cook flow stress reduction at elevated
 * temperature, tool life extension from force reduction, optimal laser-tool
 * spacing, process window mapping, and LAM economics/ROI.
 *
 * Self-contained: no external dependencies. Bessel K₀ rational approximation
 * (Abramowitz & Stegun 9.8.1/9.8.2, |ε|<2.5e-8). Seeded PRNG for Monte Carlo.
 *
 * References:
 *   Sun S, Brandt M, Dargusch M, Int J Mach Tools Manuf 50 (2010) 961-975
 *     (thermally enhanced machining of hard-to-machine materials),
 *   Lei S, Shin YC, Incropera FP, J Manuf Sci Eng 123 (2001) 639-646
 *     (LAM of Si₃N₄ ceramics),
 *   Anderson M, Patwa R, Shin YC, Int J Mach Tools Manuf 46 (2006) 2007-2014
 *     (LAM of Inconel 718),
 *   Pfefferkorn FE, Lei S, Jeon Y, Haddad G, J Manuf Sci Eng 131 (2009) 021001
 *     (laser-assisted machining process window),
 *   Johnson GR, Cook WH, Proc 7th Int Symp Ballistics (1983) 541-547
 *     (constitutive model for metals under large strains)
 */

// ─── Types ──────────────────────────────────────────────────────────

/** Standard PRISM return wrapper with generic payload. */
export interface AtomicValue<T> {
  value: T;
  unit: string;
  formula?: string;
  confidence?: number;
}

// ─── Material Database ──────────────────────────────────────────────

interface MaterialThermal {
  k: number;           // thermal conductivity W/(m·K)
  rho: number;         // density kg/m³
  cp: number;          // specific heat J/(kg·K)
  abs: number;         // laser absorptivity 0-1
  T_melt: number;      // melting point °C
  T_soften: number;    // onset softening °C
}

interface JohnsonCookParams {
  A: number;   // yield stress MPa
  B: number;   // hardening modulus MPa
  n: number;   // hardening exponent
  C: number;   // strain rate coefficient
  m: number;   // thermal softening exponent
  T_ref: number;  // reference temperature °C
  T_melt: number; // melting temperature °C
}

const MATERIAL_THERMAL: Record<string, MaterialThermal> = {
  'Inconel718':  { k: 11.4, rho: 8190, cp: 435, abs: 0.30, T_melt: 1336, T_soften: 600 },
  'Ti-6Al-4V':   { k: 6.7,  rho: 4430, cp: 526, abs: 0.40, T_melt: 1660, T_soften: 500 },
  'Si3N4':       { k: 30.0, rho: 3200, cp: 680, abs: 0.80, T_melt: 1900, T_soften: 800 },
  'SiC':         { k: 120.0, rho: 3210, cp: 750, abs: 0.70, T_melt: 2730, T_soften: 1000 },
  'AISI4140':    { k: 42.7, rho: 7850, cp: 473, abs: 0.30, T_melt: 1416, T_soften: 400 },
};

const JC_PARAMS: Record<string, JohnsonCookParams> = {
  'Inconel718': { A: 1241, B: 622,  n: 0.65,  C: 0.0134, m: 1.3,  T_ref: 25, T_melt: 1336 },
  'Ti-6Al-4V':  { A: 862,  B: 331,  n: 0.34,  C: 0.012,  m: 0.8,  T_ref: 25, T_melt: 1660 },
  'AISI4140':   { A: 595,  B: 580,  n: 0.133, C: 0.023,  m: 1.03, T_ref: 25, T_melt: 1416 },
};

/** Tool material max safe temperature °C */
const TOOL_MAX_TEMP: Record<string, number> = {
  carbide: 800,
  CBN: 1200,
  ceramic: 1000,
};

// ─── Input / Output Interfaces ──────────────────────────────────────

export interface PreheatProfileInput {
  material: string;
  laser_power_W: number;
  spot_diameter_mm: number;
  cutting_speed_m_per_min: number;
  /** Depths at which to evaluate temperature (mm). Default [0.1, 0.5, 1.0, 2.0] */
  eval_depths_mm?: number[];
  ambient_T_C?: number;
}

export interface TemperaturePoint {
  depth_mm: number;
  T_C: number;
}

export interface PreheatProfileOutput {
  T_surface_C: number;
  heated_depth_mm: number;
  temperature_profile: TemperaturePoint[];
}

export interface ForceReductionInput {
  material: string;
  laser_power_W: number;
  spot_diameter_mm: number;
  cutting_speed_m_per_min: number;
  depth_of_cut_mm: number;
  feed_mm_per_rev: number;
  /** Strain, default 0.3 */
  strain?: number;
  /** Strain rate 1/s, default 1e3 */
  strain_rate?: number;
}

export interface ForceReductionOutput {
  F_conventional_N: number;
  F_LAM_N: number;
  force_reduction_pct: number;
  optimal_T_range_C: [number, number];
}

export interface LAMToolLifeInput {
  material: string;
  laser_power_W: number;
  spot_diameter_mm: number;
  cutting_speed_m_per_min: number;
  depth_of_cut_mm: number;
  feed_mm_per_rev: number;
  tool_material: string;
  conventional_life_min: number;
  /** MC sample count. Default 500 */
  mc_samples?: number;
}

export interface LAMToolLifeOutput {
  conventional_life_min: number;
  LAM_life_min: number;
  improvement_factor: number;
  ci95_life: [number, number];
}

export interface OptimalSpacingInput {
  material: string;
  laser_power_W: number;
  spot_diameter_mm: number;
  cutting_speed_m_per_min: number;
  depth_of_cut_mm: number;
  feed_mm_per_rev: number;
  /** Min chip length mm (safety floor for spacing). Default 2 */
  min_chip_length_mm?: number;
}

export interface OptimalSpacingOutput {
  optimal_spacing_mm: number;
  T_at_tool_C: number;
  sensitivity_to_speed: number;
}

export interface ProcessWindowInput {
  material: string;
  spot_diameter_mm: number;
  /** Power range [min, max] W */
  power_range_W: [number, number];
  /** Speed range [min, max] m/min */
  speed_range_m_per_min: [number, number];
  /** Grid steps per axis. Default 20 */
  grid_steps?: number;
  /** Max HAZ width mm. Default 0.5 */
  max_HAZ_mm?: number;
}

export interface FeasiblePoint {
  power_W: number;
  speed_m_per_min: number;
  T_surface_C: number;
  HAZ_mm: number;
}

export interface ProcessWindowOutput {
  feasible_region: FeasiblePoint[];
  optimal_point: FeasiblePoint;
  boundaries: {
    T_min_C: number;
    T_max_C: number;
    max_HAZ_mm: number;
  };
}

export interface LAMEconomicsInput {
  material: string;
  laser_power_W: number;
  spot_diameter_mm: number;
  cutting_speed_m_per_min: number;
  depth_of_cut_mm: number;
  feed_mm_per_rev: number;
  tool_material: string;
  conventional_tool_life_min: number;
  /** Cycle time per part min. Default 10 */
  cycle_time_min?: number;
  /** Electricity cost $/kWh. Default 0.12 */
  electricity_cost_per_kWh?: number;
  /** Tool insert cost $. Default 25 */
  tool_cost_usd?: number;
  /** Machine hourly rate $/hr. Default 120 */
  machine_rate_per_hr?: number;
  /** Laser system investment $. Default 100000 */
  laser_system_cost_usd?: number;
  /** Annual production volume. Default 50000 */
  annual_volume?: number;
}

export interface LAMEconomicsOutput {
  conventional_cost_per_part: number;
  LAM_cost_per_part: number;
  payback_parts: number;
  annual_savings: number;
}

// ─── Math Utilities ─────────────────────────────────────────────────

/**
 * Modified Bessel function K₀(x) — Abramowitz & Stegun 9.8.1/9.8.2
 * Polynomial/rational approximation, |ε| < 2.5e-8.
 */
function besselK0(x: number): number {
  if (x <= 0) return 1e30;
  if (x <= 2) {
    const t = x * x / 4;
    const I0 = 1 + t * (3.5156229 + t * (3.0899424 + t * (1.2067492
      + t * (0.2659732 + t * (0.0360768 + t * 0.0045813)))));
    const lnHalf = Math.log(x / 2);
    const s = t;
    const K0add = -0.57721566 + s * (0.42278420 + s * (0.23069756
      + s * (0.03488590 + s * (0.00262698 + s * (0.00010750 + s * 0.0000074)))));
    return -lnHalf * I0 + K0add;
  }
  // x > 2
  const t = 2 / x;
  const poly = 1.25331414 + t * (-0.07832358 + t * (0.02189568
    + t * (-0.01062446 + t * (0.00587872 + t * (-0.00251540 + t * 0.00053208)))));
  return poly * Math.exp(-x) / Math.sqrt(x);
}

/**
 * Seeded PRNG (xorshift128+) for reproducible Monte Carlo.
 */
function createPRNG(seed: number): () => number {
  let s0 = seed | 0 || 1;
  let s1 = (seed * 2654435761) | 0 || 1;
  return (): number => {
    let a = s0;
    const b = s1;
    s0 = b;
    a ^= a << 23;
    a ^= a >> 17;
    a ^= b;
    a ^= b >> 26;
    s1 = a;
    return ((s0 + s1) >>> 0) / 4294967296;
  };
}

/** Standard normal via Box-Muller */
function normalRandom(rng: () => number, mean: number, std: number): number {
  const u1 = rng() || 1e-15;
  const u2 = rng();
  return mean + std * Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

// ─── Engine ─────────────────────────────────────────────────────────

/**
 * LAMThermalSofteningEngine — Laser-Assisted Machining thermal softening physics.
 *
 * Provides six first-principles methods for analysing CW laser preheating in
 * turning/milling of difficult-to-machine alloys and ceramics:
 *
 * 1. `preheatProfile`  — Moving heat source temperature field (Rosenthal/K₀)
 * 2. `forceReduction`  — Johnson-Cook flow stress ratio at elevated T
 * 3. `lamToolLife`     — Tool life extension with MC uncertainty
 * 4. `optimalSpacing`  — Laser-to-tool distance optimisation
 * 5. `processWindow`   — Power × speed feasibility grid
 * 6. `lamEconomics`    — ROI and payback analysis
 */
export class LAMThermalSofteningEngine {

  /**
   * Supported materials for thermal property lookup.
   */
  get supportedMaterials(): string[] {
    return Object.keys(MATERIAL_THERMAL);
  }

  /**
   * Supported materials for Johnson-Cook force model.
   */
  get supportedJCMaterials(): string[] {
    return Object.keys(JC_PARAMS);
  }

  // ── helpers ──

  /** Resolve material thermal props with fallback. */
  private mat(name: string): MaterialThermal {
    const m = MATERIAL_THERMAL[name];
    if (!m) {
      throw new Error(
        `Unknown material "${name}". Supported: ${this.supportedMaterials.join(', ')}`
      );
    }
    return m;
  }

  /** Resolve Johnson-Cook params. */
  private jc(name: string): JohnsonCookParams {
    const p = JC_PARAMS[name];
    if (!p) {
      throw new Error(
        `No Johnson-Cook data for "${name}". Supported: ${this.supportedJCMaterials.join(', ')}`
      );
    }
    return p;
  }

  /** Thermal diffusivity α = k/(ρ·cp) in m²/s */
  private alpha(m: MaterialThermal): number {
    return m.k / (m.rho * m.cp);
  }

  /** Surface temperature from moving heat source (Rosenthal 2-D steady). */
  private surfaceTemp(
    mat: MaterialThermal,
    power_W: number,
    spot_mm: number,
    speed_m_per_min: number,
    T0: number,
    depth_mm: number
  ): number {
    const Q = power_W;
    const eta = mat.abs;
    const k = mat.k;                        // W/(m·K)
    const al = this.alpha(mat);             // m²/s
    const V = speed_m_per_min / 60;         // m/s
    const r = Math.max(spot_mm / 2, depth_mm) * 1e-3; // m (radial distance)
    const x = r;                            // on surface, ahead of source

    // Péclet number argument: Vr/(2α)
    const arg = (V * r) / (2 * al);
    if (arg > 500) {
      // Very high Péclet — negligible heating
      return T0;
    }

    // T = T₀ + (2Qη)/(π k) · K₀(Vr/2α) · exp(-Vx/2α)
    const K0val = besselK0(arg);
    const expTerm = Math.exp(-(V * x) / (2 * al));
    const dT = (2 * Q * eta) / (Math.PI * k) * K0val * expTerm;

    return T0 + Math.min(dT, mat.T_melt - T0);
  }

  /** Johnson-Cook flow stress at given T, ε, ε̇ */
  private jcStress(
    jc: JohnsonCookParams,
    T_C: number,
    strain: number,
    strainRate: number
  ): number {
    const eps = Math.max(strain, 1e-6);
    const epsDot = Math.max(strainRate, 1);
    const Tstar = Math.max(0, Math.min(1,
      (T_C - jc.T_ref) / (jc.T_melt - jc.T_ref)
    ));
    const strainTerm = jc.A + jc.B * Math.pow(eps, jc.n);
    const rateTerm = 1 + jc.C * Math.log(epsDot);
    const thermalTerm = 1 - Math.pow(Tstar, jc.m);
    return strainTerm * rateTerm * Math.max(thermalTerm, 0.01);
  }

  // ═══════════════════════════════════════════════════════════════════
  // 1. PREHEAT PROFILE
  // ═══════════════════════════════════════════════════════════════════

  /**
   * Moving heat source temperature profile.
   *
   * Uses the Rosenthal 2-D steady-state solution with modified Bessel K₀:
   *   T = T₀ + (2Qη)/(πk) · K₀(Vr/2α) · exp(−Vx/2α)
   *
   * Heated depth defined as depth where T > T_soften.
   *
   * @param input - Preheat profile parameters
   * @returns AtomicValue wrapping surface temperature, heated depth, and profile
   */
  preheatProfile(input: PreheatProfileInput): AtomicValue<PreheatProfileOutput> {
    const m = this.mat(input.material);
    const T0 = input.ambient_T_C ?? 25;
    const depths = input.eval_depths_mm ?? [0.05, 0.1, 0.2, 0.5, 1.0, 2.0];

    const T_surface = this.surfaceTemp(
      m, input.laser_power_W, input.spot_diameter_mm,
      input.cutting_speed_m_per_min, T0, 0.01
    );

    const profile: TemperaturePoint[] = depths.map(d => ({
      depth_mm: d,
      T_C: Math.round(this.surfaceTemp(
        m, input.laser_power_W, input.spot_diameter_mm,
        input.cutting_speed_m_per_min, T0, d
      ) * 10) / 10,
    }));

    // Heated depth: binary search for T_soften boundary
    let lo = 0, hi = 10; // mm
    for (let i = 0; i < 30; i++) {
      const mid = (lo + hi) / 2;
      const Tmid = this.surfaceTemp(
        m, input.laser_power_W, input.spot_diameter_mm,
        input.cutting_speed_m_per_min, T0, mid
      );
      if (Tmid > m.T_soften) lo = mid; else hi = mid;
    }
    const heated_depth = Math.round((lo + hi) / 2 * 1000) / 1000;

    return {
      value: {
        T_surface_C: Math.round(T_surface * 10) / 10,
        heated_depth_mm: heated_depth,
        temperature_profile: profile,
      },
      unit: '°C / mm',
      formula: 'T=T₀+(2Qη)/(πk)·K₀(Vr/2α)·exp(−Vx/2α)',
      confidence: 0.85,
    };
  }

  // ═══════════════════════════════════════════════════════════════════
  // 2. FORCE REDUCTION
  // ═══════════════════════════════════════════════════════════════════

  /**
   * Johnson-Cook flow stress reduction at elevated temperature.
   *
   *   σ = (A + Bε^n)(1 + C·ln ε̇)(1 − T*^m)
   *   T* = (T − T_ref)/(T_melt − T_ref)
   *   Force ratio ≈ σ(T_hot) / σ(T_room)
   *
   * Cutting force estimated via F = Kc · ap · f where Kc ∝ σ_flow.
   *
   * @param input - Force reduction parameters
   * @returns AtomicValue wrapping conventional/LAM forces and reduction %
   */
  forceReduction(input: ForceReductionInput): AtomicValue<ForceReductionOutput> {
    const m = this.mat(input.material);
    const jcP = this.jc(input.material);
    const T0 = 25;
    const eps = input.strain ?? 0.3;
    const epsDot = input.strain_rate ?? 1e3;

    // Surface temperature from laser
    const T_hot = this.surfaceTemp(
      m, input.laser_power_W, input.spot_diameter_mm,
      input.cutting_speed_m_per_min, T0, input.depth_of_cut_mm * 0.3
    );

    // Flow stress at room and elevated T
    const sigma_room = this.jcStress(jcP, T0, eps, epsDot);
    const sigma_hot = this.jcStress(jcP, T_hot, eps, epsDot);

    // Cutting force estimate: F = σ · ap · f (simplified Kienzle)
    const ap = input.depth_of_cut_mm;
    const f = input.feed_mm_per_rev;
    const F_conv = sigma_room * ap * f;
    const F_LAM = sigma_hot * ap * f;
    const reduction = ((F_conv - F_LAM) / F_conv) * 100;

    // Optimal T range: above softening, below damage/melting
    const T_low = m.T_soften;
    const T_high = Math.min(m.T_melt * 0.7, m.T_melt - 100);

    return {
      value: {
        F_conventional_N: Math.round(F_conv * 100) / 100,
        F_LAM_N: Math.round(F_LAM * 100) / 100,
        force_reduction_pct: Math.round(reduction * 100) / 100,
        optimal_T_range_C: [Math.round(T_low), Math.round(T_high)],
      },
      unit: 'N / %',
      formula: 'σ=(A+Bε^n)(1+Clnε̇)(1−T*^m); F∝σ·ap·f',
      confidence: 0.80,
    };
  }

  // ═══════════════════════════════════════════════════════════════════
  // 3. LAM TOOL LIFE
  // ═══════════════════════════════════════════════════════════════════

  /**
   * Tool life extension from LAM force reduction with Monte Carlo uncertainty.
   *
   *   T_LAM = T_conv × (F_conv / F_LAM)^k_wear
   *
   * k_wear ≈ 1.5 (empirical exponent relating force ratio to wear rate).
   * MC perturbs J-C parameters A, B with CV=10% to propagate uncertainty.
   * Tool temperature checked against max safe temp for the tool material.
   *
   * @param input - Tool life parameters
   * @returns AtomicValue wrapping life extension and 95% CI
   */
  lamToolLife(input: LAMToolLifeInput): AtomicValue<LAMToolLifeOutput> {
    const m = this.mat(input.material);
    const jcP = this.jc(input.material);
    const toolMax = TOOL_MAX_TEMP[input.tool_material];
    if (toolMax === undefined) {
      throw new Error(
        `Unknown tool material "${input.tool_material}". Supported: ${Object.keys(TOOL_MAX_TEMP).join(', ')}`
      );
    }

    const T0 = 25;
    const eps = 0.3;
    const epsDot = 1e3;
    const k_wear = 1.5;
    const MAX_TRIALS = 100_000;
    const N = Math.min(input.mc_samples ?? 500, MAX_TRIALS);
    const rng = createPRNG(42);

    // Nominal surface temperature
    const T_hot = this.surfaceTemp(
      m, input.laser_power_W, input.spot_diameter_mm,
      input.cutting_speed_m_per_min, T0, input.depth_of_cut_mm * 0.3
    );

    // Check tool safety
    const effectiveT = Math.min(T_hot, toolMax);

    // Nominal force ratio
    const sigma_room = this.jcStress(jcP, T0, eps, epsDot);
    const sigma_hot = this.jcStress(jcP, effectiveT, eps, epsDot);
    const forceRatio = sigma_room / Math.max(sigma_hot, 1);
    const nominalLife = input.conventional_life_min * Math.pow(forceRatio, k_wear);

    // Monte Carlo on J-C A, B (CV=10%)
    const lives: number[] = [];
    for (let i = 0; i < N; i++) {
      const A_mc = normalRandom(rng, jcP.A, jcP.A * 0.10);
      const B_mc = normalRandom(rng, jcP.B, jcP.B * 0.10);
      const jcMC: JohnsonCookParams = { ...jcP, A: A_mc, B: B_mc };
      const sr = this.jcStress(jcMC, T0, eps, epsDot);
      const sh = this.jcStress(jcMC, effectiveT, eps, epsDot);
      const fr = sr / Math.max(sh, 1);
      lives.push(input.conventional_life_min * Math.pow(fr, k_wear));
    }
    lives.sort((a, b) => a - b);
    const ci_lo = lives[Math.floor(N * 0.025)];
    const ci_hi = lives[Math.floor(N * 0.975)];

    return {
      value: {
        conventional_life_min: input.conventional_life_min,
        LAM_life_min: Math.round(nominalLife * 100) / 100,
        improvement_factor: Math.round((nominalLife / input.conventional_life_min) * 100) / 100,
        ci95_life: [Math.round(ci_lo * 100) / 100, Math.round(ci_hi * 100) / 100],
      },
      unit: 'min',
      formula: 'T_LAM=T_conv×(F_conv/F_LAM)^k_wear; MC on J-C A,B CV=10%',
      confidence: 0.75,
    };
  }

  // ═══════════════════════════════════════════════════════════════════
  // 4. OPTIMAL SPACING
  // ═══════════════════════════════════════════════════════════════════

  /**
   * Optimal laser-to-tool spacing.
   *
   * Heat diffusion time: t_diff = d²/(4α)
   * Travel time: t_travel = d / V
   * Temperature at tool arrival decays as: T(d) ≈ T_surface × √(t_exp/(t_exp+t_travel))
   * where t_exp = (spot/2)² / (4α) is the laser exposure time.
   *
   * Minimises |T(d) − T_target| subject to d > min_chip_length.
   * Sensitivity: ∂T/∂V at optimal d.
   *
   * @param input - Spacing parameters
   * @returns AtomicValue wrapping optimal spacing, temperature, and sensitivity
   */
  optimalSpacing(input: OptimalSpacingInput): AtomicValue<OptimalSpacingOutput> {
    const m = this.mat(input.material);
    const T0 = 25;
    const V = input.cutting_speed_m_per_min / 60; // m/s
    const al = this.alpha(m);
    const minChip = (input.min_chip_length_mm ?? 2) * 1e-3; // m
    const spotR = (input.spot_diameter_mm / 2) * 1e-3; // m

    // Exposure time
    const t_exp = spotR * spotR / (4 * al);

    // Surface temperature at laser spot
    const T_surf = this.surfaceTemp(
      m, input.laser_power_W, input.spot_diameter_mm,
      input.cutting_speed_m_per_min, T0, input.depth_of_cut_mm * 0.3
    );

    // Target: softening temperature
    const T_target = m.T_soften;

    // Scan d from minChip to 50 mm
    let bestD = minChip;
    let bestScore = 1e30;
    let bestT = T0;
    const steps = 500;
    const dMax = 0.05; // 50 mm in m
    for (let i = 0; i < steps; i++) {
      const d = minChip + (dMax - minChip) * (i / (steps - 1));
      const t_travel = d / Math.max(V, 1e-6);
      const T_d = T0 + (T_surf - T0) * Math.sqrt(t_exp / (t_exp + t_travel));
      const score = Math.abs(T_d - T_target);
      if (score < bestScore && T_d >= T_target * 0.8) {
        bestScore = score;
        bestD = d;
        bestT = T_d;
      }
    }

    // If no point reached 80% of target, pick minimum spacing
    if (bestT < T_target * 0.8) {
      bestD = minChip;
      const t_travel = bestD / Math.max(V, 1e-6);
      bestT = T0 + (T_surf - T0) * Math.sqrt(t_exp / (t_exp + t_travel));
    }

    // Sensitivity: ∂T/∂V via finite difference (speed ±5%)
    const dV = V * 0.05;
    const tTr1 = bestD / Math.max(V + dV, 1e-6);
    const tTr2 = bestD / Math.max(V - dV, 1e-6);
    const T_surf_hi = this.surfaceTemp(
      m, input.laser_power_W, input.spot_diameter_mm,
      (V + dV) * 60, T0, input.depth_of_cut_mm * 0.3
    );
    const T_surf_lo = this.surfaceTemp(
      m, input.laser_power_W, input.spot_diameter_mm,
      (V - dV) * 60, T0, input.depth_of_cut_mm * 0.3
    );
    const T_hi = T0 + (T_surf_hi - T0) * Math.sqrt(t_exp / (t_exp + tTr1));
    const T_lo = T0 + (T_surf_lo - T0) * Math.sqrt(t_exp / (t_exp + tTr2));
    const sensitivity = (T_hi - T_lo) / (2 * dV * 60); // °C per m/min

    return {
      value: {
        optimal_spacing_mm: Math.round(bestD * 1e3 * 100) / 100,
        T_at_tool_C: Math.round(bestT * 10) / 10,
        sensitivity_to_speed: Math.round(sensitivity * 100) / 100,
      },
      unit: 'mm / °C / (°C·min/m)',
      formula: 'T(d)=T₀+(T_s−T₀)·√(t_exp/(t_exp+d/V))',
      confidence: 0.78,
    };
  }

  // ═══════════════════════════════════════════════════════════════════
  // 5. PROCESS WINDOW
  // ═══════════════════════════════════════════════════════════════════

  /**
   * Feasible LAM process window via power × speed grid search.
   *
   * Boundaries:
   *   - T_min: material softening onset temperature
   *   - T_max: 70% of melting point (avoid phase damage / excessive HAZ)
   *   - HAZ width ≤ max_HAZ_mm (thermal diffusion length √(4αt_exp))
   *
   * Each grid point evaluates surface temperature and HAZ width.
   * Optimal point maximises T within constraints (best softening).
   *
   * @param input - Process window parameters
   * @returns AtomicValue wrapping feasible region, optimal point, boundaries
   */
  processWindow(input: ProcessWindowInput): AtomicValue<ProcessWindowOutput> {
    const m = this.mat(input.material);
    const T0 = 25;
    const al = this.alpha(m);
    const steps = input.grid_steps ?? 20;
    const maxHAZ = input.max_HAZ_mm ?? 0.5;
    const T_min = m.T_soften;
    const T_max = m.T_melt * 0.7;

    const [pLo, pHi] = input.power_range_W;
    const [sLo, sHi] = input.speed_range_m_per_min;

    const feasible: FeasiblePoint[] = [];
    let bestPoint: FeasiblePoint | null = null;
    let bestT = 0;

    for (let pi = 0; pi <= steps; pi++) {
      const P = pLo + (pHi - pLo) * (pi / steps);
      for (let si = 0; si <= steps; si++) {
        const S = sLo + (sHi - sLo) * (si / steps);
        const V = S / 60; // m/s
        const spotR = (input.spot_diameter_mm / 2) * 1e-3;
        const t_exp = Math.max(spotR / Math.max(V, 1e-6), 1e-6);
        const HAZ = Math.sqrt(4 * al * t_exp) * 1e3; // mm

        const T_s = this.surfaceTemp(
          m, P, input.spot_diameter_mm, S, T0, 0.01
        );

        if (T_s >= T_min && T_s <= T_max && HAZ <= maxHAZ) {
          const pt: FeasiblePoint = {
            power_W: Math.round(P),
            speed_m_per_min: Math.round(S * 100) / 100,
            T_surface_C: Math.round(T_s * 10) / 10,
            HAZ_mm: Math.round(HAZ * 1000) / 1000,
          };
          feasible.push(pt);
          if (T_s > bestT) {
            bestT = T_s;
            bestPoint = pt;
          }
        }
      }
    }

    // Fallback optimal if nothing feasible
    if (!bestPoint) {
      bestPoint = {
        power_W: Math.round((pLo + pHi) / 2),
        speed_m_per_min: Math.round((sLo + sHi) / 2 * 100) / 100,
        T_surface_C: T0,
        HAZ_mm: 0,
      };
    }

    return {
      value: {
        feasible_region: feasible,
        optimal_point: bestPoint,
        boundaries: {
          T_min_C: Math.round(T_min),
          T_max_C: Math.round(T_max),
          max_HAZ_mm: maxHAZ,
        },
      },
      unit: 'W × m/min → °C',
      formula: 'Grid P×V; T∈[T_soften, 0.7·T_melt]; HAZ=√(4αt)≤max',
      confidence: 0.82,
    };
  }

  // ═══════════════════════════════════════════════════════════════════
  // 6. LAM ECONOMICS
  // ═══════════════════════════════════════════════════════════════════

  /**
   * LAM cost-benefit and ROI analysis.
   *
   * Compares conventional vs LAM per-part cost including:
   *   - Machine time cost (hourly rate × cycle time)
   *   - Tool cost (insert cost ÷ parts per edge)
   *   - Laser energy cost (power × cycle time × electricity rate)
   *   - Laser system amortisation over annual volume
   *
   * Payback = laser_system_cost / (conventional_cost − LAM_cost) per part.
   *
   * @param input - Economics parameters
   * @returns AtomicValue wrapping per-part costs, payback, and annual savings
   */
  lamEconomics(input: LAMEconomicsInput): AtomicValue<LAMEconomicsOutput> {
    const m = this.mat(input.material);
    const jcP = this.jc(input.material);
    const T0 = 25;
    const eps = 0.3;
    const epsDot = 1e3;
    const k_wear = 1.5;

    const cycleTime = input.cycle_time_min ?? 10;
    const elecCost = input.electricity_cost_per_kWh ?? 0.12;
    const toolCost = input.tool_cost_usd ?? 25;
    const machRate = input.machine_rate_per_hr ?? 120;
    const laserCost = input.laser_system_cost_usd ?? 100000;
    const annualVol = input.annual_volume ?? 50000;

    const toolMax = TOOL_MAX_TEMP[input.tool_material];
    if (toolMax === undefined) {
      throw new Error(
        `Unknown tool material "${input.tool_material}". Supported: ${Object.keys(TOOL_MAX_TEMP).join(', ')}`
      );
    }

    // Force ratio for tool life calc
    const T_hot = Math.min(
      this.surfaceTemp(
        m, input.laser_power_W, input.spot_diameter_mm,
        input.cutting_speed_m_per_min, T0, input.depth_of_cut_mm * 0.3
      ),
      toolMax
    );
    const sigma_room = this.jcStress(jcP, T0, eps, epsDot);
    const sigma_hot = this.jcStress(jcP, T_hot, eps, epsDot);
    const forceRatio = sigma_room / Math.max(sigma_hot, 1);
    const lamLife = input.conventional_tool_life_min * Math.pow(forceRatio, k_wear);

    // Parts per tool edge
    const convPartsPerEdge = Math.max(1, input.conventional_tool_life_min / cycleTime);
    const lamPartsPerEdge = Math.max(1, lamLife / cycleTime);

    // Machine cost per part
    const machineCostPerPart = machRate * (cycleTime / 60);

    // Tool cost per part
    const convToolCostPerPart = toolCost / convPartsPerEdge;
    const lamToolCostPerPart = toolCost / lamPartsPerEdge;

    // Laser energy cost per part
    const laserEnergyPerPart = (input.laser_power_W / 1000) * (cycleTime / 60) * elecCost;

    // Laser amortisation per part (5-year life)
    const laserAmortPerPart = laserCost / (annualVol * 5);

    // Total costs
    const convCost = machineCostPerPart + convToolCostPerPart;
    const lamCostTotal = machineCostPerPart + lamToolCostPerPart + laserEnergyPerPart + laserAmortPerPart;

    // Savings and payback
    const savingsPerPart = convCost - lamCostTotal;
    const paybackParts = savingsPerPart > 0
      ? Math.ceil(laserCost / savingsPerPart)
      : Infinity;
    const annualSavings = savingsPerPart * annualVol;

    return {
      value: {
        conventional_cost_per_part: Math.round(convCost * 10000) / 10000,
        LAM_cost_per_part: Math.round(lamCostTotal * 10000) / 10000,
        payback_parts: paybackParts === Infinity ? -1 : paybackParts,
        annual_savings: Math.round(annualSavings * 100) / 100,
      },
      unit: 'USD',
      formula: 'ΔCost=machine+tool+laser_energy+amort; payback=invest/ΔCost_per_part',
      confidence: 0.70,
    };
  }
}

// ─── Singleton Export ───────────────────────────────────────────────

/** Singleton instance of LAMThermalSofteningEngine. */
export const lamThermalSofteningEngine = new LAMThermalSofteningEngine();
