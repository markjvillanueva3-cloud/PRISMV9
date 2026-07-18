/**
 * PRISM MCP Server — Miner's Cumulative Damage Engine
 *
 * Palmgren-Miner cumulative fatigue damage analysis for cutting tools
 * and machine components (spindles, ballscrews, bearings).
 *
 * Six methods:
 * - calculateCumulativeDamage: Palmgren-Miner linear damage summation
 * - buildSNcurve: Basquin S-N curve with Marin correction factors
 * - calculateToolFatigueDamage: Miner's rule applied to cutting tools via Kienzle/Taylor
 * - calculateMachineFatigueDamage: Bearing L10, spindle, ballscrew fatigue
 * - calculateSequenceEffect: Marco-Starkey load-sequence-dependent damage
 * - calculateRainflowDamage: Rainflow cycle counting + Goodman mean stress correction
 *
 * References:
 * - Miner, M.A. (1945). "Cumulative Damage in Fatigue", J. Applied Mechanics, 12(3), A159-A164.
 * - Palmgren, A. (1924). "Die Lebensdauer von Kugellagern", VDI Zeitschrift, 68(14), 339-341.
 * - Basquin, O.H. (1910). "The Exponential Law of Endurance Tests", Proc. ASTM, 10, 625-630.
 *
 * @module MinerCumulativeDamageEngine
 */

import { log } from "../utils/Logger.js";

// ============================================================================
// TYPES
// ============================================================================

/** A single stress level with applied cycles and (optionally) known cycles to failure. */
export interface StressLevel {
  stress_amplitude: number;
  cycles_applied: number;
  cycles_to_failure?: number;
}

export interface CumulativeDamageInput {
  stress_levels: StressLevel[];
  /** Optional S-N curve to compute Ni when cycles_to_failure is not provided. */
  sn_curve?: SNcurveParams;
}

export interface DamageLevelResult {
  stress_amplitude: number;
  cycles_applied: number;
  cycles_to_failure: number;
  damage_fraction: number;
}

export interface CumulativeDamageResult {
  total_damage_D: number;
  remaining_life_fraction: number;
  predicted_failure: boolean;
  damage_per_level: DamageLevelResult[];
  dominant_stress_level: number;
  safety_factor: number;
}

/** Basquin S-N curve parameters. */
export interface SNcurveParams {
  sigma_f_prime: number;   // fatigue strength coefficient (MPa)
  basquin_b: number;       // Basquin exponent (negative, e.g. -0.085)
  endurance_limit?: number; // Se (MPa), stress below which infinite life
}

/** Marin correction factor inputs. */
export interface MarinFactorsInput {
  surface_finish: "ground" | "machined" | "hot_rolled" | "forged";
  Sut_MPa: number;
  diameter_mm?: number;
  reliability?: number; // 0.5, 0.9, 0.95, 0.99, 0.999
  temperature_factor?: number; // kd, default 1.0
  miscellaneous_factor?: number; // ke, default 1.0
}

export interface MarinFactors {
  ka: number; // surface finish
  kb: number; // size
  kc: number; // reliability
  kd: number; // temperature
  ke: number; // miscellaneous
}

export interface SNcurveResult {
  sn_curve: SNcurveParams;
  endurance_limit: number;
  corrected_endurance_limit: number;
  marin_factors: MarinFactors;
  /** Cycles to failure at a given stress amplitude. */
  cycles_to_failure_fn: (sigma_a: number) => number;
}

/** A single machining operation for tool fatigue. */
export interface ToolOperation {
  material: string;
  cutting_speed_m_min: number;
  feed_mm_rev: number;
  depth_of_cut_mm: number;
  duration_minutes: number;
}

export interface ToolFatigueInput {
  operations: ToolOperation[];
  /** Extended Taylor constants: T = C / (V^(1/n) × f^(1/n2) × ap^(1/n3)) */
  taylor_C?: number;
  taylor_n?: number;
  taylor_n2?: number;
  taylor_n3?: number;
  /** Tool cross-section area (mm²) for stress estimation. */
  tool_cross_section_mm2?: number;
  /** Specific cutting force (N/mm²), Kienzle kc1.1. */
  kienzle_kc11?: number;
  /** Kienzle exponent mc. */
  kienzle_mc?: number;
}

export interface ToolFatigueResult {
  total_damage_D: number;
  remaining_life_fraction: number;
  predicted_failure: boolean;
  operations_damage: Array<{
    operation_index: number;
    equivalent_stress_MPa: number;
    taylor_life_minutes: number;
    damage_fraction: number;
  }>;
  predicted_remaining_life_minutes: number;
}

/** A load case for machine component fatigue. */
export interface MachineLoadCase {
  component: "bearing" | "spindle" | "ballscrew";
  load_N: number;
  speed_rpm: number;
  duration_hours: number;
  /** Bearing dynamic load rating C (N). Required for bearing. */
  bearing_C_rating?: number;
  /** Bearing type for life exponent. */
  bearing_type?: "ball" | "roller";
  /** Shaft diameter (mm) for spindle fatigue. */
  shaft_diameter_mm?: number;
  /** Moment arm (mm) for spindle bending. */
  moment_arm_mm?: number;
  /** Ballscrew lead (mm). */
  ballscrew_lead_mm?: number;
  /** Ballscrew dynamic load rating Ca (N). */
  ballscrew_Ca?: number;
}

export interface MachineFatigueDamageResult {
  components: Record<string, {
    total_damage_D: number;
    remaining_life_fraction: number;
    predicted_failure: boolean;
    load_cases: Array<{ load_case_index: number; life_hours: number; damage_fraction: number }>;
  }>;
  most_critical_component: string;
  overall_damage: number;
}

export interface SequenceEffectInput {
  stress_levels: StressLevel[];
  sn_curve?: SNcurveParams;
  /** Ordering: "high_to_low" means highest stress first, "low_to_high" means lowest first. */
  loading_order: "high_to_low" | "low_to_high" | "mixed";
}

export interface SequenceEffectResult {
  linear_damage_D: number;
  sequence_correction_factor: number;
  adjusted_damage_D: number;
  predicted_D_at_failure: number;
  exponents: number[];
  predicted_failure: boolean;
}

export interface RainflowCycle {
  range: number;
  mean: number;
  count: number; // 0.5 for half-cycle, 1.0 for full
  amplitude: number;
}

export interface RainflowDamageInput {
  load_history: number[];
  sn_curve: SNcurveParams;
  Sut_MPa?: number; // for Goodman correction
  use_goodman?: boolean;
}

export interface RainflowDamageResult {
  cycles_counted: RainflowCycle[];
  total_damage: number;
  predicted_failure: boolean;
  rainflow_matrix: Array<{ range: number; mean: number; count: number; damage: number }>;
  remaining_life_fraction: number;
}

// ============================================================================
// CONSTANTS
// ============================================================================

/** Surface finish Marin factor coefficients: ka = a × Sut^b (Sut in MPa). */
const SURFACE_FINISH_COEFFICIENTS: Record<string, { a: number; b: number }> = {
  ground:     { a: 1.58,  b: -0.085 },
  machined:   { a: 4.51,  b: -0.265 },
  hot_rolled: { a: 57.7,  b: -0.718 },
  forged:     { a: 272.0, b: -0.995 },
};

/** Reliability correction factor kc. */
const RELIABILITY_FACTORS: Record<number, number> = {
  0.5:   1.000,
  0.9:   0.897,
  0.95:  0.868,
  0.99:  0.814,
  0.999: 0.753,
};

/** Default Kienzle kc1.1 for common workpiece materials (N/mm²). */
const KIENZLE_DEFAULTS: Record<string, { kc11: number; mc: number }> = {
  steel:      { kc11: 1800, mc: 0.25 },
  stainless:  { kc11: 2100, mc: 0.25 },
  aluminum:   { kc11: 700,  mc: 0.23 },
  titanium:   { kc11: 2800, mc: 0.28 },
  cast_iron:  { kc11: 1100, mc: 0.28 },
};

// ============================================================================
// ENGINE
// ============================================================================

class MinerCumulativeDamageEngine {
  /**
   * Calculate cumulative fatigue damage using Palmgren-Miner linear damage rule.
   *
   * D = Σ(ni / Ni)
   *
   * Failure predicted when D ≥ 1.0.
   *
   * @param input - Stress levels with cycles applied and (optionally) cycles to failure.
   * @returns Cumulative damage result with safety factor, dominant level, and per-level breakdown.
   */
  calculateCumulativeDamage(input: CumulativeDamageInput): CumulativeDamageResult {
    log.info("[MinerCumulativeDamage] calculateCumulativeDamage");
    const { stress_levels, sn_curve } = input;

    if (!stress_levels || stress_levels.length === 0) {
      return {
        total_damage_D: 0,
        remaining_life_fraction: 1.0,
        predicted_failure: false,
        damage_per_level: [],
        dominant_stress_level: 0,
        safety_factor: Infinity,
      };
    }

    // Build cycles-to-failure function from S-N curve if provided
    let snFn: ((sigma: number) => number) | undefined;
    if (sn_curve) {
      snFn = this._basquinNf(sn_curve);
    }

    const damage_per_level: DamageLevelResult[] = [];
    let total_damage_D = 0;
    let maxDamage = -1;
    let dominant_stress_level = 0;

    for (const level of stress_levels) {
      let Ni = level.cycles_to_failure;
      if (Ni === undefined || Ni === null) {
        if (!snFn) {
          throw new Error("cycles_to_failure not provided and no sn_curve given");
        }
        Ni = snFn(level.stress_amplitude);
      }

      // Infinite life if stress below endurance limit
      if (Ni === Infinity || Ni <= 0) {
        damage_per_level.push({
          stress_amplitude: level.stress_amplitude,
          cycles_applied: level.cycles_applied,
          cycles_to_failure: Ni === Infinity ? Infinity : Ni,
          damage_fraction: 0,
        });
        continue;
      }

      const di = level.cycles_applied / Ni;
      total_damage_D += di;

      damage_per_level.push({
        stress_amplitude: level.stress_amplitude,
        cycles_applied: level.cycles_applied,
        cycles_to_failure: Ni,
        damage_fraction: di,
      });

      if (di > maxDamage) {
        maxDamage = di;
        dominant_stress_level = level.stress_amplitude;
      }
    }

    const remaining = Math.max(0, 1 - total_damage_D);
    return {
      total_damage_D,
      remaining_life_fraction: remaining,
      predicted_failure: total_damage_D >= 1.0,
      damage_per_level,
      dominant_stress_level,
      safety_factor: total_damage_D > 0 ? 1 / total_damage_D : Infinity,
    };
  }

  /**
   * Build an S-N curve using the Basquin equation with Marin correction factors.
   *
   * Basquin: σa = σf' × (2Nf)^b
   * Endurance limit for steel: Se ≈ 0.5 × Sut (for Sut < 1400 MPa)
   * Modified: Se' = ka × kb × kc × kd × ke × Se
   *
   * @param material - Material properties (Sut_MPa required) or explicit S-N curve params.
   * @param marin - Marin correction factor inputs.
   * @returns S-N curve parameters and corrected endurance limit.
   */
  buildSNcurve(material: {
    Sut_MPa: number;
    sigma_f_prime?: number;
    basquin_b?: number;
  }, marin?: MarinFactorsInput): SNcurveResult {
    log.info("[MinerCumulativeDamage] buildSNcurve");
    const Sut = material.Sut_MPa;

    // Endurance limit: Se ≈ 0.5 × Sut for steel (Sut < 1400 MPa)
    const Se_base = Sut < 1400 ? 0.5 * Sut : 700; // cap at 700 MPa

    // Marin factors
    let ka = 1, kb = 1, kc = 1, kd = 1, ke = 1;
    if (marin) {
      // Surface finish factor: ka = a × Sut^b
      const sf = SURFACE_FINISH_COEFFICIENTS[marin.surface_finish] || SURFACE_FINISH_COEFFICIENTS.machined;
      ka = sf.a * Math.pow(marin.Sut_MPa, sf.b);
      ka = Math.min(ka, 1.0); // cannot exceed 1.0

      // Size factor: kb = 1.24 × d^(-0.107) for 2.79 ≤ d ≤ 51 mm
      if (marin.diameter_mm !== undefined) {
        const d = marin.diameter_mm;
        if (d >= 2.79 && d <= 51) {
          kb = 1.24 * Math.pow(d, -0.107);
        } else if (d > 51 && d <= 254) {
          kb = 1.51 * Math.pow(d, -0.157);
        }
        // else kb = 1.0 (small parts)
      }

      // Reliability factor
      if (marin.reliability !== undefined) {
        kc = RELIABILITY_FACTORS[marin.reliability] ?? 1.0;
      }

      kd = marin.temperature_factor ?? 1.0;
      ke = marin.miscellaneous_factor ?? 1.0;
    }

    const corrected_Se = ka * kb * kc * kd * ke * Se_base;

    // Basquin curve parameters
    // Default: σf' ≈ Sut + 345 MPa (Shigley approximation), b ≈ -0.085
    const sigma_f_prime = material.sigma_f_prime ?? (Sut + 345);
    const basquin_b = material.basquin_b ?? -0.085;

    const sn_curve: SNcurveParams = {
      sigma_f_prime,
      basquin_b,
      endurance_limit: corrected_Se,
    };

    const cycles_to_failure_fn = this._basquinNf(sn_curve);

    return {
      sn_curve,
      endurance_limit: Se_base,
      corrected_endurance_limit: corrected_Se,
      marin_factors: { ka, kb, kc, kd, ke },
      cycles_to_failure_fn,
    };
  }

  /**
   * Calculate cumulative fatigue damage for cutting tools across mixed machining operations.
   *
   * Uses Kienzle force model for stress estimation and extended Taylor equation for tool life.
   * Extended Taylor: T = C / (V^(1/n) × f^(1/n2) × ap^(1/n3))
   *
   * @param input - Tool operations and optional Taylor/Kienzle parameters.
   * @returns Cumulative tool damage and predicted remaining life.
   */
  calculateToolFatigueDamage(input: ToolFatigueInput): ToolFatigueResult {
    log.info("[MinerCumulativeDamage] calculateToolFatigueDamage");
    const {
      operations,
      taylor_C = 300,
      taylor_n = 0.25,
      taylor_n2 = 0.75,
      taylor_n3 = 0.45,
      tool_cross_section_mm2 = 100,
      kienzle_kc11,
      kienzle_mc,
    } = input;

    if (!operations || operations.length === 0) {
      return {
        total_damage_D: 0,
        remaining_life_fraction: 1.0,
        predicted_failure: false,
        operations_damage: [],
        predicted_remaining_life_minutes: Infinity,
      };
    }

    const ops_damage: ToolFatigueResult["operations_damage"] = [];
    let total_D = 0;

    for (let i = 0; i < operations.length; i++) {
      const op = operations[i];
      const mat = op.material.toLowerCase();

      // Kienzle force estimation: Fc = kc1.1 × ap × f^(1-mc)
      const kz = KIENZLE_DEFAULTS[mat] || KIENZLE_DEFAULTS.steel;
      const kc11_eff = kienzle_kc11 ?? kz.kc11;
      const mc_eff = kienzle_mc ?? kz.mc;

      const Fc = kc11_eff * op.depth_of_cut_mm * Math.pow(op.feed_mm_rev, 1 - mc_eff);
      const equiv_stress = Fc / tool_cross_section_mm2;

      // Extended Taylor tool life (minutes)
      const V = op.cutting_speed_m_min;
      const f = op.feed_mm_rev;
      const ap = op.depth_of_cut_mm;
      const taylor_life = taylor_C / (
        Math.pow(V, 1 / taylor_n) *
        Math.pow(f, 1 / taylor_n2) *
        Math.pow(ap, 1 / taylor_n3)
      );

      const di = op.duration_minutes / taylor_life;
      total_D += di;

      ops_damage.push({
        operation_index: i,
        equivalent_stress_MPa: equiv_stress,
        taylor_life_minutes: taylor_life,
        damage_fraction: di,
      });
    }

    const remaining_frac = Math.max(0, 1 - total_D);

    // Estimate remaining life based on average damage rate
    const total_time = operations.reduce((s, op) => s + op.duration_minutes, 0);
    const avg_rate = total_time > 0 ? total_D / total_time : 0;
    const remaining_life = avg_rate > 0 ? remaining_frac / avg_rate : Infinity;

    return {
      total_damage_D: total_D,
      remaining_life_fraction: remaining_frac,
      predicted_failure: total_D >= 1.0,
      operations_damage: ops_damage,
      predicted_remaining_life_minutes: remaining_life,
    };
  }

  /**
   * Calculate cumulative fatigue damage for machine components: bearings, spindles, ballscrews.
   *
   * Bearing life: L10 = (C/P)^p × 10^6 revolutions (p=3 ball, p=10/3 roller)
   * Spindle fatigue: cyclic bending stress σ = 32·M/(π·d³)
   * Ballscrew fatigue: L10 = (Ca/Fa)^3 × 10^6 revolutions
   *
   * @param load_cases - Array of load cases for different components.
   * @returns Per-component damage and overall critical assessment.
   */
  calculateMachineFatigueDamage(load_cases: MachineLoadCase[]): MachineFatigueDamageResult {
    log.info("[MinerCumulativeDamage] calculateMachineFatigueDamage");
    const components: MachineFatigueDamageResult["components"] = {};

    for (let i = 0; i < load_cases.length; i++) {
      const lc = load_cases[i];
      const key = lc.component;
      if (!components[key]) {
        components[key] = { total_damage_D: 0, remaining_life_fraction: 1, predicted_failure: false, load_cases: [] };
      }

      let life_hours: number;

      if (lc.component === "bearing") {
        // L10 = (C/P)^p × 10^6 revolutions; convert to hours
        const C = lc.bearing_C_rating ?? 50000;
        const P = lc.load_N;
        const p = lc.bearing_type === "roller" ? 10 / 3 : 3;
        const L10_rev = Math.pow(C / P, p) * 1e6;
        life_hours = L10_rev / (lc.speed_rpm * 60);
      } else if (lc.component === "spindle") {
        // Bending stress σ = 32·M / (π·d³), damage based on endurance
        const d = lc.shaft_diameter_mm ?? 50;
        const arm = lc.moment_arm_mm ?? 200;
        const M = lc.load_N * arm; // N·mm
        const sigma = (32 * M) / (Math.PI * Math.pow(d, 3)); // MPa
        // Assume steel spindle Se ≈ 250 MPa, use Basquin with default params
        const Se = 250;
        if (sigma <= Se * 0.5) {
          life_hours = Infinity; // below endurance limit
        } else {
          // Rough Basquin: Nf = (σf'/σa)^(1/b) / 2, with σf'=800, b=-0.085
          const Nf = Math.pow(800 / sigma, 1 / 0.085) / 2;
          const revolutions_applied = lc.speed_rpm * 60 * lc.duration_hours;
          life_hours = (Nf / (lc.speed_rpm * 60));
        }
      } else {
        // ballscrew: L10 = (Ca/Fa)^3 × 10^6 revolutions
        const Ca = lc.ballscrew_Ca ?? 80000;
        const Fa = lc.load_N;
        const lead = lc.ballscrew_lead_mm ?? 10;
        const L10_rev = Math.pow(Ca / Fa, 3) * 1e6;
        const rpm_equiv = lc.speed_rpm; // assume direct drive
        life_hours = L10_rev / (rpm_equiv * 60);
      }

      const di = life_hours === Infinity ? 0 : lc.duration_hours / life_hours;
      components[key].total_damage_D += di;
      components[key].load_cases.push({ load_case_index: i, life_hours, damage_fraction: di });
    }

    // Finalize each component
    let most_critical = "";
    let worst_D = -1;
    for (const [key, comp] of Object.entries(components)) {
      comp.remaining_life_fraction = Math.max(0, 1 - comp.total_damage_D);
      comp.predicted_failure = comp.total_damage_D >= 1.0;
      if (comp.total_damage_D > worst_D) {
        worst_D = comp.total_damage_D;
        most_critical = key;
      }
    }

    return {
      components,
      most_critical_component: most_critical,
      overall_damage: worst_D,
    };
  }

  /**
   * Calculate sequence-dependent cumulative damage using Marco-Starkey modification.
   *
   * D = Σ(ni/Ni)^αi where αi depends on stress ordering:
   * - High-then-low: α > 1 → damage accelerated (D_failure < 1.0)
   * - Low-then-high: α < 1 → damage decelerated (D_failure > 1.0)
   *
   * @param input - Stress levels with ordering information.
   * @returns Adjusted damage with sequence correction factor.
   */
  calculateSequenceEffect(input: SequenceEffectInput): SequenceEffectResult {
    log.info("[MinerCumulativeDamage] calculateSequenceEffect");
    const { stress_levels, sn_curve, loading_order } = input;

    let snFn: ((sigma: number) => number) | undefined;
    if (sn_curve) {
      snFn = this._basquinNf(sn_curve);
    }

    // Determine stress range for exponent scaling
    const stresses = stress_levels.map(l => l.stress_amplitude);
    const maxStress = Math.max(...stresses);
    const minStress = Math.min(...stresses);
    const stressRange = maxStress - minStress || 1;

    let linear_D = 0;
    let adjusted_D = 0;
    const exponents: number[] = [];

    for (let i = 0; i < stress_levels.length; i++) {
      const level = stress_levels[i];
      let Ni = level.cycles_to_failure;
      if (Ni === undefined) {
        if (!snFn) throw new Error("cycles_to_failure not provided and no sn_curve given");
        Ni = snFn(level.stress_amplitude);
      }

      if (Ni === Infinity || Ni <= 0) {
        exponents.push(1.0);
        continue;
      }

      const ni_over_Ni = level.cycles_applied / Ni;
      linear_D += ni_over_Ni;

      // Marco-Starkey exponent depends on stress level relative to spectrum
      let alpha: number;
      const normalized = (level.stress_amplitude - minStress) / stressRange;

      if (loading_order === "high_to_low") {
        // High stress first → accelerated damage: alpha > 1
        // Higher stress levels get lower exponent (applied first, seed cracks)
        // Lower stress levels get higher exponent (grow existing cracks faster)
        alpha = 0.8 + 0.6 * (1 - normalized); // ranges 0.8 to 1.4
      } else if (loading_order === "low_to_high") {
        // Low stress first → beneficial: alpha < 1
        alpha = 0.6 + 0.4 * normalized; // ranges 0.6 to 1.0
      } else {
        // Mixed: slight acceleration
        alpha = 0.9 + 0.2 * Math.random();
        alpha = 1.0; // deterministic for mixed
      }

      exponents.push(alpha);
      adjusted_D += Math.pow(ni_over_Ni, alpha);
    }

    // Predicted D at failure for the given sequence
    const predicted_D_failure = loading_order === "high_to_low" ? 0.7
      : loading_order === "low_to_high" ? 1.4
      : 1.0;

    const correction = linear_D > 0 ? adjusted_D / linear_D : 1.0;

    return {
      linear_damage_D: linear_D,
      sequence_correction_factor: correction,
      adjusted_damage_D: adjusted_D,
      predicted_D_at_failure: predicted_D_failure,
      exponents,
      predicted_failure: adjusted_D >= predicted_D_failure,
    };
  }

  /**
   * Rainflow cycle counting for variable amplitude loading with Goodman mean stress correction.
   *
   * Extracts closed hysteresis loops, counts half/full cycles, maps each to S-N damage.
   * Goodman: σa_eff = σa / (1 - σm/Sut)
   *
   * @param input - Load history time series and S-N curve parameters.
   * @returns Counted cycles, total damage, and rainflow matrix.
   */
  calculateRainflowDamage(input: RainflowDamageInput): RainflowDamageResult {
    log.info("[MinerCumulativeDamage] calculateRainflowDamage");
    const { load_history, sn_curve, Sut_MPa, use_goodman = false } = input;

    // Step 1: Extract peaks and valleys from load history
    const extrema = this._extractExtrema(load_history);

    // Step 2: Rainflow counting (simplified four-point method)
    const cycles = this._rainflowCount(extrema);

    // Step 3: Calculate damage for each cycle
    const snFn = this._basquinNf(sn_curve);
    let total_damage = 0;
    const rainflow_matrix: RainflowDamageResult["rainflow_matrix"] = [];

    for (const cycle of cycles) {
      let effective_amplitude = cycle.amplitude;

      // Goodman mean stress correction
      if (use_goodman && Sut_MPa && Sut_MPa > 0) {
        const mean_ratio = cycle.mean / Sut_MPa;
        if (mean_ratio < 1) {
          effective_amplitude = cycle.amplitude / (1 - mean_ratio);
        } else {
          effective_amplitude = Infinity; // immediate failure
        }
      }

      const Nf = snFn(effective_amplitude);
      const damage = Nf === Infinity ? 0 : cycle.count / Nf;
      total_damage += damage;

      rainflow_matrix.push({
        range: cycle.range,
        mean: cycle.mean,
        count: cycle.count,
        damage,
      });
    }

    return {
      cycles_counted: cycles,
      total_damage,
      predicted_failure: total_damage >= 1.0,
      rainflow_matrix,
      remaining_life_fraction: Math.max(0, 1 - total_damage),
    };
  }

  // ==========================================================================
  // PRIVATE HELPERS
  // ==========================================================================

  /**
   * Build a cycles-to-failure function from Basquin S-N curve.
   * σa = σf' × (2Nf)^b  →  Nf = 0.5 × (σa / σf')^(1/b)
   */
  private _basquinNf(sn: SNcurveParams): (sigma_a: number) => number {
    return (sigma_a: number): number => {
      if (sigma_a <= 0) return Infinity;
      // Below endurance limit → infinite life
      if (sn.endurance_limit !== undefined && sigma_a < sn.endurance_limit) {
        return Infinity;
      }
      const ratio = sigma_a / sn.sigma_f_prime;
      if (ratio <= 0) return Infinity;
      // Nf = 0.5 × (σa / σf')^(1/b)
      const Nf = 0.5 * Math.pow(ratio, 1 / sn.basquin_b);
      return Math.max(0, Nf);
    };
  }

  /** Extract peaks and valleys from a time series, keeping first and last points. */
  private _extractExtrema(data: number[]): number[] {
    if (data.length <= 2) return [...data];
    const result: number[] = [data[0]];
    for (let i = 1; i < data.length - 1; i++) {
      const prev = data[i - 1];
      const curr = data[i];
      const next = data[i + 1];
      if ((curr >= prev && curr >= next) || (curr <= prev && curr <= next)) {
        result.push(curr);
      }
    }
    result.push(data[data.length - 1]);
    return result;
  }

  /**
   * Simplified rainflow cycle counting (four-point method).
   * Returns array of counted cycles with range, mean, amplitude, and count.
   */
  private _rainflowCount(extrema: number[]): RainflowCycle[] {
    const cycles: RainflowCycle[] = [];
    const points = [...extrema];

    // Four-point rainflow method
    let i = 0;
    while (points.length >= 4) {
      i = 0;
      let extracted = false;
      while (i < points.length - 3) {
        const s0 = points[i];
        const s1 = points[i + 1];
        const s2 = points[i + 2];
        const s3 = points[i + 3];

        const range1 = Math.abs(s1 - s2);
        const range0 = Math.abs(s0 - s1);
        const range2 = Math.abs(s2 - s3);

        // If inner range ≤ outer ranges, extract full cycle
        if (range1 <= range0 && range1 <= range2) {
          const mean = (s1 + s2) / 2;
          cycles.push({
            range: range1,
            mean,
            count: 1.0,
            amplitude: range1 / 2,
          });
          // Remove the two inner points
          points.splice(i + 1, 2);
          extracted = true;
          break;
        }
        i++;
      }
      if (!extracted) break;
    }

    // Remaining points form half-cycles
    for (let j = 0; j < points.length - 1; j++) {
      const range = Math.abs(points[j + 1] - points[j]);
      if (range > 0) {
        cycles.push({
          range,
          mean: (points[j] + points[j + 1]) / 2,
          count: 0.5,
          amplitude: range / 2,
        });
      }
    }

    return cycles;
  }
}

export const minerCumulativeDamageEngine = new MinerCumulativeDamageEngine();
