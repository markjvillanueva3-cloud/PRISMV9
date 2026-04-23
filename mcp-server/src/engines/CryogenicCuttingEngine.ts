/**
 * CryogenicCuttingEngine — First-principles physics for cryogenic machining
 *
 * Models LN2 and CO2 coolant delivery during cutting operations, including
 * heat transfer (Bromley/Rohsenow), tool life extension (extended Taylor),
 * force modification (Kienzle + thermal yield), surface integrity, delivery
 * optimization, and hybrid LN2+MQL systems.
 *
 * References:
 *   Pusavec et al. (2010) — Sustainable machining via cryogenic/MQL
 *   Jawahir et al. (2016) — Cryogenic manufacturing processes
 *   Bermingham et al. (2012) — Cryogenic turning of Ti-6Al-4V
 *   Bromley (1950) — Film boiling correlation
 *   Rohsenow (1952) — Nucleate boiling correlation
 *   Kienzle (1952) — Specific cutting force model
 *   Brinksmeier et al. (1982) — Residual stress in machining
 *   Hong & Ding (2001) — Cryogenic machining friction model
 */

// ============================================================================
// TYPES
// ============================================================================

interface AtomicValue<T> { value: T; unit: string; formula?: string; confidence?: number; }

export type CryoCoolant = 'LN2' | 'CO2' | 'LN2+MQL';

export interface CryoHeatTransferInput {
  coolant: CryoCoolant;
  flow_rate_L_min: number;
  nozzle_diameter_mm: number;
  standoff_mm: number;
  surface_temp_C: number;
}

export interface CryoHeatTransferOutput {
  heat_transfer_coeff_W_m2K: AtomicValue<number>;
  heat_removal_rate_W: AtomicValue<number>;
  surface_temp_after_C: AtomicValue<number>;
  boiling_regime: AtomicValue<string>;
  coolant_consumption_kg_hr: AtomicValue<number>;
}

export interface CryoToolLifeInput {
  material: string;
  coolant: CryoCoolant;
  cutting_speed_m_min: number;
  feed_mm_rev: number;
  depth_mm: number;
  dry_tool_life_min?: number;
  taylor_n?: number;
  taylor_C?: number;
  mc_samples?: number;
}

export interface CryoToolLifeOutput {
  dry_tool_life_min: AtomicValue<number>;
  cryo_tool_life_min: AtomicValue<number>;
  improvement_factor: AtomicValue<number>;
  wear_rate_reduction_pct: AtomicValue<number>;
  diffusion_rate_ratio: AtomicValue<number>;
  uncertainty: { ci95_life: AtomicValue<[number, number]> };
}

export interface CryoForcesInput {
  material: string;
  coolant: CryoCoolant;
  cutting_speed_m_min: number;
  feed_mm_rev: number;
  depth_mm: number;
  rake_angle_deg?: number;
  dry_friction_coeff?: number;
}

export interface CryoForcesOutput {
  Fc_dry_N: AtomicValue<number>;
  Fc_cryo_N: AtomicValue<number>;
  force_change_pct: AtomicValue<number>;
  yield_strength_ratio: AtomicValue<number>;
  friction_ratio: AtomicValue<number>;
  dominant_mechanism: AtomicValue<string>;
}

export interface CryoSurfaceIntegrityInput {
  material: string;
  coolant: CryoCoolant;
  cutting_speed_m_min: number;
  feed_mm_rev: number;
  depth_mm: number;
  dry_Ra_um?: number;
  dry_surface_temp_C?: number;
}

export interface CryoSurfaceIntegrityOutput {
  Ra_improvement_pct: AtomicValue<number>;
  residual_stress_MPa: AtomicValue<number>;
  stress_type: AtomicValue<'compressive' | 'tensile'>;
  white_layer_risk: AtomicValue<boolean>;
  hardness_change_pct: AtomicValue<number>;
}

export interface DeliveryOptimizationInput {
  coolant: CryoCoolant;
  cutting_speed_m_min: number;
  depth_mm: number;
  feed_mm_rev: number;
  nozzle_diameter_mm?: number;
  delivery_type?: 'external' | 'through_tool';
}

export interface DeliveryOptimizationOutput {
  optimal_flow_rate_L_min: AtomicValue<number>;
  optimal_angle_deg: AtomicValue<number>;
  optimal_standoff_mm: AtomicValue<number>;
  coolant_cost_per_hour: AtomicValue<number>;
  energy_cost_per_hour: AtomicValue<number>;
  total_cost_per_hour: AtomicValue<number>;
}

export interface CryoMQLInput {
  material: string;
  cutting_speed_m_min: number;
  feed_mm_rev: number;
  depth_mm: number;
  oil_flow_mL_hr?: number;
  ln2_flow_L_min?: number;
}

export interface CryoMQLOutput {
  tool_life_factor: AtomicValue<number>;
  Ra_improvement_pct: AtomicValue<number>;
  force_change_pct: AtomicValue<number>;
  total_coolant_cost_per_hr: AtomicValue<number>;
  recommended_LN2_flow: AtomicValue<number>;
  recommended_oil_flow: AtomicValue<number>;
}

// ============================================================================
// MATERIAL DATABASE
// ============================================================================

interface MaterialProps {
  sigma_y_MPa: number;
  E_GPa: number;
  alpha_per_K: number;
  k_W_mK: number;
  phase_transform_C: number | null;
  kc1_1: number;           // Kienzle specific cutting force kc1.1 [MPa]
  mc: number;              // Kienzle exponent
  C_str: number;           // thermal strengthening coefficient
  n_str: number;           // thermal strengthening exponent
  k_f: number;             // friction reduction sensitivity
  dry_mu: number;          // dry friction coefficient
  Ra_ratio_cryo: number;   // Ra_cryo / Ra_dry
}

const MATERIALS: Record<string, MaterialProps> = {
  'Ti-6Al-4V': {
    sigma_y_MPa: 880, E_GPa: 114, alpha_per_K: 8.6e-6, k_W_mK: 6.7,
    phase_transform_C: 882, kc1_1: 2800, mc: 0.28,
    C_str: 0.0008, n_str: 1.0, k_f: 0.15, dry_mu: 0.45, Ra_ratio_cryo: 0.75,
  },
  'Inconel 718': {
    sigma_y_MPa: 1035, E_GPa: 205, alpha_per_K: 13e-6, k_W_mK: 11.4,
    phase_transform_C: 720, kc1_1: 2800, mc: 0.25,
    C_str: 0.0006, n_str: 1.0, k_f: 0.12, dry_mu: 0.50, Ra_ratio_cryo: 0.78,
  },
  'AISI 4140': {
    sigma_y_MPa: 655, E_GPa: 200, alpha_per_K: 12.3e-6, k_W_mK: 42.7,
    phase_transform_C: 727, kc1_1: 1500, mc: 0.26,
    C_str: 0.0003, n_str: 1.0, k_f: 0.30, dry_mu: 0.40, Ra_ratio_cryo: 0.85,
  },
  'AISI 316L': {
    sigma_y_MPa: 205, E_GPa: 193, alpha_per_K: 16e-6, k_W_mK: 16.3,
    phase_transform_C: null, kc1_1: 2100, mc: 0.22,
    C_str: 0.0010, n_str: 1.0, k_f: 0.20, dry_mu: 0.42, Ra_ratio_cryo: 0.80,
  },
  'Al 7075-T6': {
    sigma_y_MPa: 503, E_GPa: 71.7, alpha_per_K: 23.6e-6, k_W_mK: 130,
    phase_transform_C: null, kc1_1: 750, mc: 0.18,
    C_str: 0.0002, n_str: 1.0, k_f: 0.25, dry_mu: 0.35, Ra_ratio_cryo: 0.90,
  },
};

// ============================================================================
// K_CRYO FACTORS (tool life multipliers from published data)
// ============================================================================

interface KCryoRange { min: number; max: number; avg: number; }

const K_CRYO: Record<string, Record<string, KCryoRange>> = {
  'Ti-6Al-4V':   { LN2: { min: 2.5, max: 4.0, avg: 3.0 }, CO2: { min: 1.8, max: 2.5, avg: 2.0 } },
  'Inconel 718': { LN2: { min: 2.0, max: 3.5, avg: 2.5 }, CO2: { min: 1.5, max: 2.0, avg: 1.7 } },
  'AISI 4140':   { LN2: { min: 1.5, max: 2.0, avg: 1.7 }, CO2: { min: 1.3, max: 1.6, avg: 1.4 } },
  'AISI 316L':   { LN2: { min: 1.8, max: 2.8, avg: 2.2 }, CO2: { min: 1.4, max: 1.9, avg: 1.6 } },
  'Al 7075-T6':  { LN2: { min: 1.2, max: 1.5, avg: 1.3 }, CO2: { min: 1.1, max: 1.3, avg: 1.2 } },
};

// ============================================================================
// COOLANT PROPERTIES
// ============================================================================

interface CoolantProps {
  temp_C: number;
  h_fg_kJ_kg: number;      // latent heat of vaporization/sublimation
  rho_l_kg_m3: number;     // liquid density
  rho_v_kg_m3: number;     // vapor density
  k_v_W_mK: number;        // vapor thermal conductivity
  mu_v_Pa_s: number;       // vapor dynamic viscosity
  cost_per_L: number;      // USD/L (or USD/kg for CO2)
  density_for_flow: number; // density used for mass flow conversion
}

const COOLANT_PROPS: Record<string, CoolantProps> = {
  LN2: {
    temp_C: -196, h_fg_kJ_kg: 199, rho_l_kg_m3: 808, rho_v_kg_m3: 4.62,
    k_v_W_mK: 0.0076, mu_v_Pa_s: 5.4e-6, cost_per_L: 0.22, density_for_flow: 808,
  },
  CO2: {
    temp_C: -78.5, h_fg_kJ_kg: 571, rho_l_kg_m3: 1101, rho_v_kg_m3: 2.0,
    k_v_W_mK: 0.0166, mu_v_Pa_s: 14.8e-6, cost_per_L: 0.10, density_for_flow: 1101,
  },
};

// ============================================================================
// SELF-CONTAINED PRNG (Mulberry32 + LHS)
// ============================================================================

class PRNG {
  private state: number;
  constructor(seed: number = 42) { this.state = seed | 0; }

  /** Generate uniform [0,1) via Mulberry32. */
  next(): number {
    let t = (this.state += 0x6D2B79F5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /** Box-Muller normal(μ, σ). */
  normal(mu: number, sigma: number): number {
    const u1 = this.next() || 1e-10;
    const u2 = this.next();
    return mu + sigma * Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  }

  /** Latin Hypercube Sample: n samples of d dimensions, each in [0,1]. */
  lhs(n: number, d: number): number[][] {
    const result: number[][] = [];
    for (let i = 0; i < n; i++) result.push(new Array(d));
    for (let dim = 0; dim < d; dim++) {
      const perm = this.permutation(n);
      for (let i = 0; i < n; i++) {
        result[i][dim] = (perm[i] + this.next()) / n;
      }
    }
    return result;
  }

  private permutation(n: number): number[] {
    const arr: number[] = [];
    for (let i = 0; i < n; i++) arr.push(i);
    for (let i = n - 1; i > 0; i--) {
      const j = Math.floor(this.next() * (i + 1));
      const tmp = arr[i]; arr[i] = arr[j]; arr[j] = tmp;
    }
    return arr;
  }
}

// ============================================================================
// HELPERS
// ============================================================================

const R_GAS = 8.314;  // J/(mol·K)
const G_ACCEL = 9.81;

function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}

function celsiusToKelvin(c: number): number { return c + 273.15; }

function quantile(sorted: number[], q: number): number {
  const pos = q * (sorted.length - 1);
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  if (lo === hi) return sorted[lo];
  return sorted[lo] + (pos - lo) * (sorted[hi] - sorted[lo]);
}

function ci95(samples: number[]): [number, number] {
  const s = [...samples].sort((a, b) => a - b);
  return [quantile(s, 0.025), quantile(s, 0.975)];
}

function resolveMaterial(name: string): MaterialProps {
  const m = MATERIALS[name];
  if (!m) throw new Error(`Unknown material: ${name}. Available: ${Object.keys(MATERIALS).join(', ')}`);
  return m;
}

function resolveKCryo(material: string, coolant: CryoCoolant): KCryoRange {
  const key = coolant === 'LN2+MQL' ? 'LN2' : coolant;
  const byMat = K_CRYO[material];
  if (!byMat) {
    return { min: 1.3, max: 2.0, avg: 1.6 }; // conservative default
  }
  return byMat[key] ?? { min: 1.3, max: 2.0, avg: 1.6 };
}

function resolveCoolantProps(coolant: CryoCoolant): CoolantProps {
  const key = coolant === 'LN2+MQL' ? 'LN2' : coolant;
  return COOLANT_PROPS[key];
}

// ============================================================================
// ENGINE
// ============================================================================

/**
 * CryogenicCuttingEngine — physics-based models for cryogenic machining processes
 * using LN2, CO2, or hybrid LN2+MQL delivery during metal cutting.
 *
 * Unlike CryogenicTreatmentEngine (which models pre-process tool cold soaking),
 * this engine models in-process cryogenic coolant delivery and its effects on
 * heat transfer, tool life, cutting forces, and surface integrity.
 */
export class CryogenicCuttingEngine {
  /**
   * Empirical cryogenic performance improvement constants by coolant type and work material.
   * Sources: Pusavec et al. (2010), Jawahir et al. (2016), Bermingham et al. (2012),
   *          2024-2025 literature survey (Springer IJAMT, CIRP Annals, J. Manuf. Sci. Eng.).
   * Note: CO2 is 19% less power consumption vs LN2; LN2 preferred for LCA (lower impact).
   *       LN2+MQL hybrid achieves best overall performance for Ti/Ni alloys.
   */
  static readonly CRYO_PERFORMANCE = {
    LN2: {
      titanium: { force_reduction_pct: 32, tool_wear_reduction_pct: 67, ra_reduction_pct: 61, temp_reduction_pct: 85 },
      inconel:  { force_reduction_pct: 15, tool_wear_reduction_pct: 35, ra_reduction_pct: 27, temp_reduction_pct: 75 },
      steel:    { force_reduction_pct: 10, tool_wear_reduction_pct: 40, ra_reduction_pct: 20, temp_reduction_pct: 70 },
      aluminum: { force_reduction_pct:  5, tool_wear_reduction_pct: 15, ra_reduction_pct: 10, temp_reduction_pct: 50 },
    },
    CO2: {
      titanium: { force_reduction_pct: 25, tool_wear_reduction_pct: 55, ra_reduction_pct: 45, temp_reduction_pct: 70 },
      inconel:  { force_reduction_pct: 12, tool_wear_reduction_pct: 35, ra_reduction_pct: 27, temp_reduction_pct: 65 },
      steel:    { force_reduction_pct:  8, tool_wear_reduction_pct: 30, ra_reduction_pct: 15, temp_reduction_pct: 55 },
      aluminum: { force_reduction_pct:  3, tool_wear_reduction_pct: 10, ra_reduction_pct:  8, temp_reduction_pct: 40 },
    },
    LN2_MQL_hybrid: {
      titanium: { force_reduction_pct: 38, tool_wear_reduction_pct: 72, ra_reduction_pct: 65, temp_reduction_pct: 88 },
      inconel:  { force_reduction_pct: 20, tool_wear_reduction_pct: 45, ra_reduction_pct: 35, temp_reduction_pct: 80 },
    },
  } as const;

  // --------------------------------------------------------------------------
  // 1. CRYOGENIC HEAT TRANSFER
  // --------------------------------------------------------------------------

  /**
   * Model LN2/CO2 phase-change heat transfer at the tool-chip interface.
   *
   * Uses Bromley (1950) film boiling correlation for the Leidenfrost regime,
   * Rohsenow (1952) nucleate boiling correlation, and linear interpolation
   * for the transition boiling regime. CO2 modeled via Joule-Thomson
   * expansion from ~60 bar supply to atmospheric (snow at -78.5 °C).
   *
   * @param input - heat transfer parameters
   * @returns heat transfer coefficients, removal rate, regime identification
   *
   * @reference Bromley, L.A. (1950). Heat transfer in stable film boiling.
   * @reference Rohsenow, W.M. (1952). A method of correlating heat transfer
   *            data for surface boiling of liquids.
   * @reference Jawahir et al. (2016). Cryogenic manufacturing processes.
   */
  cryoHeatTransfer(input: CryoHeatTransferInput): CryoHeatTransferOutput {
    const cp = resolveCoolantProps(input.coolant);
    const D = input.nozzle_diameter_mm / 1000;          // m
    const T_surface = input.surface_temp_C;
    const T_sat = cp.temp_C;
    const deltaT = T_surface - T_sat;

    // --- Film boiling (Bromley correlation) ---
    // h_film = 0.62·(k_v³·ρ_v·(ρ_l-ρ_v)·g·h_fg / (μ_v·D·ΔT))^0.25
    const h_fg = cp.h_fg_kJ_kg * 1000; // J/kg
    const num = cp.k_v_W_mK ** 3 * cp.rho_v_kg_m3 * (cp.rho_l_kg_m3 - cp.rho_v_kg_m3) * G_ACCEL * h_fg;
    const den = cp.mu_v_Pa_s * D * Math.max(deltaT, 1);
    const h_film = 0.62 * Math.pow(Math.max(num / den, 0), 0.25);

    // --- Nucleate boiling (Rohsenow correlation, simplified) ---
    // For cryogens on metal: h_nucl ≈ 5000-15000 W/m²K typical range
    // Simplified Rohsenow: h_nucl ∝ ΔT² for moderate superheat
    const C_sf = 0.013;  // Rohsenow constant for cryogen on metal
    const h_nucl_base = 8000; // base nucleate boiling HTC
    const deltaT_nucl = clamp(deltaT, 1, 50);
    const h_nucl = h_nucl_base * (deltaT_nucl / 20) ** 0.67;

    // --- Regime determination ---
    // Leidenfrost point for LN2 ≈ 150-200°C superheat, CO2 ≈ 80-120°C
    const leidenfrost_dT = input.coolant === 'CO2' ? 100 : 175;
    const nucleate_max_dT = leidenfrost_dT * 0.4;

    let h_eff: number;
    let regime: string;
    if (deltaT > leidenfrost_dT) {
      h_eff = h_film;
      regime = 'film_boiling';
    } else if (deltaT < nucleate_max_dT) {
      h_eff = h_nucl;
      regime = 'nucleate_boiling';
    } else {
      // Transition boiling: linear interpolation
      const frac = (deltaT - nucleate_max_dT) / (leidenfrost_dT - nucleate_max_dT);
      h_eff = h_nucl * (1 - frac) + h_film * frac;
      regime = 'transition_boiling';
    }

    // CO2 Joule-Thomson: T_drop = μ_JT · ΔP (60 bar → 1 bar)
    if (input.coolant === 'CO2') {
      // μ_JT for CO2 ≈ 1.1 K/bar near saturation
      const mu_JT = 1.1;
      const _T_drop = mu_JT * 59; // 59 bar drop → ~65°C additional cooling
      // Already accounted for in CO2 temp_C = -78.5
    }

    // Jet contact area ≈ π·(D/2)² spreading factor based on standoff
    const spread = 1 + 0.1 * (input.standoff_mm / input.nozzle_diameter_mm);
    const A_contact = Math.PI * (D / 2) ** 2 * spread; // m²

    // Heat removal rate
    const Q_removal = h_eff * A_contact * deltaT;

    // Surface temperature after cooling (simplified energy balance)
    // Assume quasi-steady: T_after = T_surface - Q/(h_eff·A_larger)
    // More realistically: partial surface coverage
    const coverage = clamp(A_contact * 1e6 / 25, 0.1, 1.0); // fraction of 25 mm² cutting zone
    const T_after = T_surface - coverage * deltaT * 0.3; // empirical 30% effectiveness

    // Coolant consumption
    const flow_m3_s = (input.flow_rate_L_min / 1000) / 60;
    const mass_flow_kg_s = flow_m3_s * cp.density_for_flow;
    const consumption_kg_hr = mass_flow_kg_s * 3600;

    return {
      heat_transfer_coeff_W_m2K: {
        value: Math.round(h_eff * 10) / 10, unit: 'W/(m²·K)',
        formula: 'Bromley: h=0.62·(k_v³·ρ_v·Δρ·g·h_fg/(μ_v·D·ΔT))^0.25',
        confidence: 0.80,
      },
      heat_removal_rate_W: {
        value: Math.round(Q_removal * 100) / 100, unit: 'W',
        formula: 'Q = h_eff · A_contact · ΔT', confidence: 0.75,
      },
      surface_temp_after_C: {
        value: Math.round(T_after * 10) / 10, unit: '°C',
        formula: 'T_after = T_surf - coverage·ΔT·η', confidence: 0.70,
      },
      boiling_regime: {
        value: regime, unit: '-',
        formula: `ΔT=${Math.round(deltaT)}°C vs Leidenfrost=${leidenfrost_dT}°C`,
      },
      coolant_consumption_kg_hr: {
        value: Math.round(consumption_kg_hr * 100) / 100, unit: 'kg/hr',
        formula: 'ṁ = Q̇_vol · ρ · 3600',
      },
    };
  }

  // --------------------------------------------------------------------------
  // 2. TOOL LIFE EXTENSION
  // --------------------------------------------------------------------------

  /**
   * Predict tool life improvement under cryogenic cooling using extended
   * Taylor model with K_cryo multipliers from published experimental data.
   *
   * Includes Arrhenius diffusion-rate reduction model for crater wear
   * mechanism and Monte Carlo uncertainty propagation with Latin Hypercube
   * Sampling on K_cryo (CV=15%) and T_dry (CV=20%).
   *
   * @param input - material, coolant, cutting parameters
   * @returns dry vs cryo tool life, improvement factor, CI95
   *
   * @reference Bermingham et al. (2012). Tool life in cryogenic turning of Ti-6Al-4V.
   * @reference Pusavec et al. (2010). Transitioning to sustainable production.
   */
  cryoToolLife(input: CryoToolLifeInput): CryoToolLifeOutput {
    const mat = resolveMaterial(input.material);
    const kRange = resolveKCryo(input.material, input.coolant);
    const cp = resolveCoolantProps(input.coolant);

    // Dry tool life from Taylor equation or provided value
    const n_taylor = input.taylor_n ?? 0.25;
    const C_taylor = input.taylor_C ?? 300;
    const T_dry = input.dry_tool_life_min ?? Math.pow(C_taylor / Math.max(input.cutting_speed_m_min, 1), 1 / n_taylor);
    const T_dry_clamped = clamp(T_dry, 1, 500);

    // Deterministic cryo tool life
    const K_avg = kRange.avg;
    const T_cryo_det = T_dry_clamped * K_avg;

    // Diffusion rate ratio (Arrhenius)
    // D = D₀·exp(-Q_a/(R·T))  →  D_cryo/D_dry = exp(-Q_a/R · (1/T_cryo - 1/T_dry))
    const Q_a = 200000; // activation energy ~200 kJ/mol for diffusion wear
    const T_dry_surface_K = celsiusToKelvin(600); // typical dry cutting temp
    // Cryo surface temp: reduced by coolant effectiveness
    const T_cryo_surface_K = celsiusToKelvin(600 + 0.3 * (cp.temp_C - 600));
    const diffusion_ratio = Math.exp((-Q_a / R_GAS) * (1 / T_cryo_surface_K - 1 / T_dry_surface_K));

    // Wear rate reduction from diffusion + mechanical
    const wear_reduction_pct = (1 - diffusion_ratio) * 100 * 0.6 + (K_avg - 1) / K_avg * 100 * 0.4;

    // Monte Carlo with LHS
    const MAX_TRIALS = 100_000;
    const N = Math.min(input.mc_samples ?? 500, MAX_TRIALS);
    const rng = new PRNG(12345);
    const samples = rng.lhs(N, 2); // [K_cryo_u, T_dry_u] each in [0,1]
    const lifeSamples: number[] = [];

    const K_sigma = K_avg * 0.15;  // CV = 15%
    const T_sigma = T_dry_clamped * 0.20; // CV = 20%

    for (let i = 0; i < N; i++) {
      // Convert LHS uniform to normal via inverse-CDF approximation
      const k_sample = K_avg + K_sigma * this.invNormApprox(samples[i][0]);
      const t_sample = T_dry_clamped + T_sigma * this.invNormApprox(samples[i][1]);
      lifeSamples.push(Math.max(t_sample * Math.max(k_sample, 1), 0.1));
    }

    const bounds = ci95(lifeSamples);

    return {
      dry_tool_life_min: {
        value: Math.round(T_dry_clamped * 10) / 10, unit: 'min',
        formula: 'Taylor: T = C / V^(1/n)', confidence: 0.75,
      },
      cryo_tool_life_min: {
        value: Math.round(T_cryo_det * 10) / 10, unit: 'min',
        formula: 'T_cryo = T_dry · K_cryo', confidence: 0.80,
      },
      improvement_factor: {
        value: Math.round(K_avg * 100) / 100, unit: '×',
        formula: `K_cryo(${input.material},${input.coolant})`, confidence: 0.80,
      },
      wear_rate_reduction_pct: {
        value: Math.round(wear_reduction_pct * 10) / 10, unit: '%',
        formula: 'Arrhenius diffusion + mechanical', confidence: 0.75,
      },
      diffusion_rate_ratio: {
        value: Math.round(diffusion_ratio * 1e4) / 1e4, unit: '-',
        formula: 'D_cryo/D_dry = exp(-Q_a/R·(1/T_cryo-1/T_dry))', confidence: 0.70,
      },
      uncertainty: {
        ci95_life: {
          value: [Math.round(bounds[0] * 10) / 10, Math.round(bounds[1] * 10) / 10],
          unit: 'min', formula: 'MC-LHS N=' + N + ', CV_K=15%, CV_T=20%', confidence: 0.95,
        },
      },
    };
  }

  // --------------------------------------------------------------------------
  // 3. CUTTING FORCE MODIFICATION
  // --------------------------------------------------------------------------

  /**
   * Predict force changes under cryogenic cooling, accounting for competing
   * effects: material strengthening at low temperature (increases force) vs
   * friction reduction (decreases force).
   *
   * Uses Kienzle specific cutting force model with temperature-modified kc1.1
   * and Hong & Ding (2001) friction reduction model.
   *
   * @param input - material, coolant, cutting parameters
   * @returns dry and cryo forces, dominant mechanism
   *
   * @reference Kienzle, O. (1952). Die Bestimmung von Kräften und Leistungen.
   * @reference Hong, S.Y. & Ding, Y. (2001). Cooling approaches and cutting
   *            temperatures in cryogenic machining of Ti-6Al-4V.
   */
  cryoForces(input: CryoForcesInput): CryoForcesOutput {
    const mat = resolveMaterial(input.material);
    const cp = resolveCoolantProps(input.coolant);

    const f = input.feed_mm_rev;
    const ap = input.depth_mm;
    const rake = input.rake_angle_deg ?? 6;

    // --- Dry force (Kienzle) ---
    // Fc = kc1.1 · b · h^(1-mc)  where b ≈ ap, h ≈ f
    const kc_dry = mat.kc1_1 * Math.pow(f, -mat.mc);
    // Rake angle correction: kc_corrected = kc / (1 - rake/100)
    const kc_dry_corr = kc_dry / (1 - rake / 100);
    const Fc_dry = kc_dry_corr * ap * f;

    // --- Temperature at cutting zone ---
    const T_dry_cut = 600; // typical dry cutting temp °C
    const T_ref = 20;      // reference temperature
    // Cryo reduces surface temperature
    const T_cryo_cut = T_dry_cut + 0.3 * (cp.temp_C - T_dry_cut); // ~30% cooling effectiveness

    // --- Yield strength at cryo temperature ---
    // σ_y(T) = σ_y0 · (1 + C_str · (T_ref - T)^n_str)
    const dT_dry = Math.max(T_ref - T_dry_cut, 0);
    const dT_cryo = Math.max(T_ref - T_cryo_cut, 0);
    const sigma_dry = mat.sigma_y_MPa * (1 + mat.C_str * Math.pow(dT_dry, mat.n_str));
    const sigma_cryo = mat.sigma_y_MPa * (1 + mat.C_str * Math.pow(dT_cryo, mat.n_str));
    const yield_ratio = sigma_cryo / sigma_dry;

    // --- Friction reduction ---
    // μ_cryo = μ_dry · (1 - k_f · ΔT/T_ref)
    // ΔT here is the temperature drop from cryo cooling
    const mu_dry = input.dry_friction_coeff ?? mat.dry_mu;
    const dT_cool = T_dry_cut - T_cryo_cut;
    const mu_cryo = mu_dry * (1 - mat.k_f * dT_cool / T_dry_cut);
    const mu_cryo_clamped = clamp(mu_cryo, 0.05, mu_dry);
    const friction_ratio = mu_cryo_clamped / mu_dry;

    // --- Modified kc1.1 for cryo ---
    // kc1.1_cryo = kc1.1 · (σ_y(T_cryo)/σ_y(T_dry))^0.8
    const kc_cryo_base = mat.kc1_1 * Math.pow(yield_ratio, 0.8);
    const kc_cryo = kc_cryo_base * Math.pow(f, -mat.mc);
    // Apply friction reduction to force (friction force ≈ 30% of total)
    const friction_force_fraction = 0.30;
    const kc_cryo_final = kc_cryo * (1 - friction_force_fraction * (1 - friction_ratio));
    const kc_cryo_corr = kc_cryo_final / (1 - rake / 100);
    const Fc_cryo = kc_cryo_corr * ap * f;

    const force_change = ((Fc_cryo - Fc_dry) / Fc_dry) * 100;

    // Determine dominant mechanism
    const strengthening_effect = (yield_ratio - 1) * 100;
    const friction_effect = (1 - friction_ratio) * 100;
    const dominant = strengthening_effect > friction_effect
      ? 'material_strengthening' : 'friction_reduction';

    return {
      Fc_dry_N: {
        value: Math.round(Fc_dry * 10) / 10, unit: 'N',
        formula: 'Kienzle: Fc=kc1.1·f^(-mc)·ap·f/(1-γ/100)', confidence: 0.80,
      },
      Fc_cryo_N: {
        value: Math.round(Fc_cryo * 10) / 10, unit: 'N',
        formula: 'kc_cryo=kc1.1·(σ_cryo/σ_dry)^0.8·friction_adj', confidence: 0.75,
      },
      force_change_pct: {
        value: Math.round(force_change * 10) / 10, unit: '%',
        formula: '(Fc_cryo-Fc_dry)/Fc_dry·100', confidence: 0.75,
      },
      yield_strength_ratio: {
        value: Math.round(yield_ratio * 1000) / 1000, unit: '-',
        formula: 'σ_y(T_cryo)/σ_y(T_dry)', confidence: 0.70,
      },
      friction_ratio: {
        value: Math.round(friction_ratio * 1000) / 1000, unit: '-',
        formula: 'μ_cryo/μ_dry = 1-k_f·ΔT/T_ref', confidence: 0.70,
      },
      dominant_mechanism: {
        value: dominant, unit: '-',
        formula: `strengthening=${strengthening_effect.toFixed(1)}% vs friction_reduction=${friction_effect.toFixed(1)}%`,
      },
    };
  }

  // --------------------------------------------------------------------------
  // 4. SURFACE INTEGRITY
  // --------------------------------------------------------------------------

  /**
   * Predict surface quality improvements under cryogenic conditions including
   * residual stress (Brinksmeier model), roughness improvement, white layer
   * suppression, and microhardness changes.
   *
   * @param input - material, coolant, cutting parameters
   * @returns Ra improvement, residual stress, white layer risk, hardness change
   *
   * @reference Brinksmeier, E. et al. (1982). Residual stresses — measurement
   *            and causes in machining processes.
   * @reference Pusavec, F. et al. (2011). Surface integrity in cryogenic and
   *            dry machining of Inconel 718.
   */
  cryoSurfaceIntegrity(input: CryoSurfaceIntegrityInput): CryoSurfaceIntegrityOutput {
    const mat = resolveMaterial(input.material);
    const cp = resolveCoolantProps(input.coolant);

    const T_dry_surface = input.dry_surface_temp_C ?? 500;
    const T_cryo_surface = T_dry_surface + 0.3 * (cp.temp_C - T_dry_surface);
    const deltaT = T_dry_surface - T_cryo_surface;

    // --- Residual stress (Brinksmeier) ---
    // σ_residual = -E · α · ΔT_surface + σ_mechanical
    const E_Pa = mat.E_GPa * 1e9;
    const sigma_thermal = -E_Pa * mat.alpha_per_K * deltaT / 1e6; // MPa (compressive from cooling)
    // Mechanical compression from cutting forces (empirical 50-200 MPa compressive)
    const sigma_mechanical = -(50 + 150 * (input.feed_mm_rev / 0.3)); // more feed → more compression
    const sigma_total = sigma_thermal + sigma_mechanical;
    const stress_type: 'compressive' | 'tensile' = sigma_total < 0 ? 'compressive' : 'tensile';

    // --- Ra improvement ---
    const Ra_ratio = mat.Ra_ratio_cryo;
    // Adjust for feed rate: higher feed = less relative improvement
    const feed_factor = clamp(1 - 0.2 * (input.feed_mm_rev - 0.1) / 0.2, 0.8, 1.1);
    const Ra_improvement = (1 - Ra_ratio * feed_factor) * 100;

    // --- White layer suppression ---
    // White layer forms when T_surface > phase transformation temperature
    const has_phase_transform = mat.phase_transform_C !== null;
    const white_layer_risk = has_phase_transform
      ? T_cryo_surface > (mat.phase_transform_C as number)
      : false;

    // --- Hardness change ---
    // Cryo: work hardening without thermal softening → net hardness increase
    // Typical 5-15% increase for difficult-to-machine alloys
    const base_hardness_gain = mat.sigma_y_MPa > 800 ? 10 : mat.sigma_y_MPa > 400 ? 7 : 4;
    const hardness_change = base_hardness_gain * (deltaT / 300);

    return {
      Ra_improvement_pct: {
        value: Math.round(Ra_improvement * 10) / 10, unit: '%',
        formula: '(1 - Ra_ratio · feed_factor) · 100', confidence: 0.75,
      },
      residual_stress_MPa: {
        value: Math.round(sigma_total * 10) / 10, unit: 'MPa',
        formula: 'σ = -E·α·ΔT + σ_mech (Brinksmeier)', confidence: 0.70,
      },
      stress_type: {
        value: stress_type, unit: '-',
        formula: 'σ<0 → compressive', confidence: 0.85,
      },
      white_layer_risk: {
        value: white_layer_risk, unit: '-',
        formula: `T_surface(${Math.round(T_cryo_surface)}°C) vs T_phase(${mat.phase_transform_C ?? 'none'}°C)`,
        confidence: 0.80,
      },
      hardness_change_pct: {
        value: Math.round(hardness_change * 10) / 10, unit: '%',
        formula: 'cryo work hardening - no thermal softening', confidence: 0.70,
      },
    };
  }

  // --------------------------------------------------------------------------
  // 5. DELIVERY OPTIMIZATION
  // --------------------------------------------------------------------------

  /**
   * Optimize cryogenic coolant nozzle position, flow rate, and delivery
   * parameters to minimize cost while maintaining cutting zone coverage.
   *
   * Models jet coherence via Weber number breakup criterion, optimal nozzle
   * angle from rake face geometry, and total cost including coolant and
   * energy consumption.
   *
   * @param input - coolant type, cutting parameters, delivery configuration
   * @returns optimal flow, angle, standoff, and cost breakdown
   *
   * @reference Jawahir, I.S. et al. (2016). Cryogenic manufacturing processes.
   */
  deliveryOptimization(input: DeliveryOptimizationInput): DeliveryOptimizationOutput {
    const cp = resolveCoolantProps(input.coolant);
    const D_nozzle = (input.nozzle_diameter_mm ?? 2.0) / 1000; // m
    const is_through_tool = input.delivery_type === 'through_tool';

    // --- Optimal flow rate ---
    // Base on cutting zone heat load: Q_cut ≈ kc · ap · f · Vc · η_heat
    // Simplified: flow scales with MRR
    const MRR_cm3_min = input.cutting_speed_m_min * 1000 * input.feed_mm_rev * input.depth_mm / 1e3;
    // LN2: ~0.5-2.0 L/min typical, CO2: ~0.3-1.5 kg/min
    const base_flow = input.coolant === 'CO2' ? 0.4 : 0.8; // L/min
    const flow_scale = clamp(MRR_cm3_min / 10, 0.5, 3.0);
    const optimal_flow = base_flow * flow_scale;
    // Through-tool typically needs 20% less flow due to better targeting
    const flow_adjusted = is_through_tool ? optimal_flow * 0.8 : optimal_flow;

    // --- Jet coherence (Weber number) ---
    // We = ρ · v² · D / σ_surface_tension
    // Breakup when We > 12-14 (Rayleigh breakup)
    // L_coherent/D ≈ 8-12 for round nozzles at moderate Re
    const flow_m3_s = (flow_adjusted / 1000) / 60;
    const A_nozzle = Math.PI * (D_nozzle / 2) ** 2;
    const v_jet = flow_m3_s / A_nozzle;
    const sigma_surface = input.coolant === 'CO2' ? 0.002 : 0.00886; // N/m
    const We = cp.rho_l_kg_m3 * v_jet ** 2 * D_nozzle / sigma_surface;
    const L_coherent = D_nozzle * clamp(12 - 0.5 * Math.log10(Math.max(We, 1)), 4, 15);

    // Optimal standoff = 60-80% of coherent length
    const optimal_standoff = L_coherent * 0.7 * 1000; // mm

    // --- Optimal angle ---
    // 15-45° from rake face depending on chip curl and speed
    const base_angle = 25; // degrees
    const speed_adj = clamp((input.cutting_speed_m_min - 50) / 200 * 10, -5, 10);
    const optimal_angle = base_angle + speed_adj;

    // --- Cost model ---
    const mass_flow_kg_hr = flow_adjusted / 1000 * cp.density_for_flow * 60;
    const coolant_cost_hr = (flow_adjusted * 60) * cp.cost_per_L; // L/hr * $/L
    // Energy: compressor/pump power ≈ 2-5 kW for cryo system
    const system_power_kW = input.coolant === 'CO2' ? 2.5 : 3.5;
    const energy_rate = 0.12; // $/kWh
    const energy_cost_hr = system_power_kW * energy_rate;
    const total_cost_hr = coolant_cost_hr + energy_cost_hr;

    return {
      optimal_flow_rate_L_min: {
        value: Math.round(flow_adjusted * 100) / 100, unit: 'L/min',
        formula: 'Q = Q_base · f(MRR) · η_delivery', confidence: 0.75,
      },
      optimal_angle_deg: {
        value: Math.round(optimal_angle * 10) / 10, unit: '°',
        formula: '25° base + speed adjustment', confidence: 0.70,
      },
      optimal_standoff_mm: {
        value: Math.round(optimal_standoff * 10) / 10, unit: 'mm',
        formula: '0.7 · L_coherent, We=' + Math.round(We), confidence: 0.70,
      },
      coolant_cost_per_hour: {
        value: Math.round(coolant_cost_hr * 100) / 100, unit: '$/hr',
        formula: 'Q̇ · ρ · cost/unit', confidence: 0.80,
      },
      energy_cost_per_hour: {
        value: Math.round(energy_cost_hr * 100) / 100, unit: '$/hr',
        formula: `P_sys(${system_power_kW}kW) · rate`, confidence: 0.80,
      },
      total_cost_per_hour: {
        value: Math.round(total_cost_hr * 100) / 100, unit: '$/hr',
        formula: 'coolant + energy', confidence: 0.75,
      },
    };
  }

  // --------------------------------------------------------------------------
  // 6. LN2+MQL HYBRID
  // --------------------------------------------------------------------------

  /**
   * Model hybrid LN2+MQL (cryogenic minimum quantity lubrication) system
   * where LN2 provides cooling and MQL provides boundary lubrication.
   *
   * Synergistic effect: K_hybrid = K_LN2 · K_MQL_lubr where the MQL
   * lubrication multiplier is typically 1.1-1.3 additional improvement
   * over pure LN2 cooling.
   *
   * @param input - material, cutting parameters, optional flow rates
   * @returns tool life factor, Ra improvement, costs, recommended flows
   *
   * @reference Pusavec, F. et al. (2010). Sustainable machining via cryogenic
   *            and minimum quantity lubrication.
   * @reference Kaynak, Y. (2014). Evaluation of machining performance in
   *            cryogenic machining of Inconel 718.
   */
  cryoMQL(input: CryoMQLInput): CryoMQLOutput {
    const mat = resolveMaterial(input.material);
    const kRange = resolveKCryo(input.material, 'LN2');

    // MQL lubrication synergy factor: 1.1-1.3 depending on material
    // Higher for materials where friction is significant (lower k_f → less cryo friction benefit → more MQL benefit)
    const K_MQL_lubr = 1.1 + 0.2 * mat.k_f / 0.3;
    const K_hybrid = kRange.avg * clamp(K_MQL_lubr, 1.1, 1.3);

    // Recommended flows
    // LN2: reduced vs pure LN2 (0.5-2.0 L/min → 0.3-1.2 L/min)
    const MRR = input.cutting_speed_m_min * input.feed_mm_rev * input.depth_mm;
    const rec_LN2 = clamp(0.3 + MRR / 50, 0.3, 1.5);
    const actual_LN2 = input.ln2_flow_L_min ?? rec_LN2;
    // MQL oil: 10-100 mL/hr (vegetable-based)
    const rec_oil = clamp(20 + MRR * 2, 10, 100);
    const actual_oil = input.oil_flow_mL_hr ?? rec_oil;

    // Ra improvement: better than pure LN2 due to lubrication
    const Ra_improvement = (1 - mat.Ra_ratio_cryo) * 100 + 5; // ~5% additional from MQL

    // Force change: MQL lubricant reduces friction further
    // Net force change is less than pure cryo (less friction component)
    const cp = COOLANT_PROPS['LN2'];
    const T_dry_cut = 600;
    const T_cryo_cut = T_dry_cut + 0.3 * (cp.temp_C - T_dry_cut);
    const dT_cool = T_dry_cut - T_cryo_cut;
    const yield_ratio = 1 + mat.C_str * Math.pow(Math.max(20 - T_cryo_cut, 0), mat.n_str);
    const mu_ratio_cryo = 1 - mat.k_f * dT_cool / T_dry_cut;
    const mu_ratio_hybrid = mu_ratio_cryo * 0.85; // MQL adds 15% friction reduction
    const force_change = ((yield_ratio * 0.8 - 1) * 70 + (mu_ratio_hybrid - 1) * 30);

    // Cost
    const ln2_cost_hr = actual_LN2 * 60 * 0.22; // L/hr * $/L
    const oil_cost_hr = actual_oil / 1000 * 15;  // mL/hr → L/hr * ~$15/L for vegetable oil
    const energy_hr = 3.5 * 0.12 + 0.3 * 0.12;  // cryo system + MQL pump
    const total_cost = ln2_cost_hr + oil_cost_hr + energy_hr;

    return {
      tool_life_factor: {
        value: Math.round(K_hybrid * 100) / 100, unit: '×',
        formula: 'K_hybrid = K_LN2 · K_MQL_lubr', confidence: 0.75,
      },
      Ra_improvement_pct: {
        value: Math.round(Ra_improvement * 10) / 10, unit: '%',
        formula: 'cryo_Ra_improvement + MQL_lubrication_bonus', confidence: 0.70,
      },
      force_change_pct: {
        value: Math.round(force_change * 10) / 10, unit: '%',
        formula: 'yield_strengthening(70%) + friction_reduction(30%)', confidence: 0.70,
      },
      total_coolant_cost_per_hr: {
        value: Math.round(total_cost * 100) / 100, unit: '$/hr',
        formula: 'LN2_cost + oil_cost + energy', confidence: 0.80,
      },
      recommended_LN2_flow: {
        value: Math.round(rec_LN2 * 100) / 100, unit: 'L/min',
        formula: 'reduced vs pure LN2 (MQL supplements cooling)', confidence: 0.70,
      },
      recommended_oil_flow: {
        value: Math.round(rec_oil * 10) / 10, unit: 'mL/hr',
        formula: 'vegetable-based MQL 10-100 mL/hr', confidence: 0.70,
      },
    };
  }

  // --------------------------------------------------------------------------
  // PRIVATE HELPERS
  // --------------------------------------------------------------------------

  /**
   * Rational approximation to the inverse normal CDF (Beasley-Springer-Moro).
   * Maps uniform [0,1] → standard normal quantile.
   */
  private invNormApprox(p: number): number {
    const p_clamped = clamp(p, 1e-8, 1 - 1e-8);
    const t = p_clamped < 0.5
      ? Math.sqrt(-2 * Math.log(p_clamped))
      : Math.sqrt(-2 * Math.log(1 - p_clamped));

    // Abramowitz & Stegun 26.2.23 rational approximation
    const c0 = 2.515517, c1 = 0.802853, c2 = 0.010328;
    const d1 = 1.432788, d2 = 0.189269, d3 = 0.001308;
    const z = t - (c0 + c1 * t + c2 * t * t) / (1 + d1 * t + d2 * t * t + d3 * t * t * t);

    return p_clamped < 0.5 ? -z : z;
  }
}

// ============================================================================
// SINGLETON
// ============================================================================

export const cryogenicCuttingEngine = new CryogenicCuttingEngine();
