/**
 * AdvancedCuttingPhenomenaEngine — Five cutting phenomena models
 *
 * Models: Built-Up Edge (BUE) formation, Usui crater wear,
 *         Brammertz surface roughness correction, Colding tool life,
 *         Coffin-Manson thermal fatigue
 * References: Usui, E. et al. (1978) — crater wear diffusion model
 *             Brammertz, P.H. (1961) — minimum chip thickness and roughness
 *             Coffin, L.F. (1954) / Manson, S.S. (1953) — low-cycle fatigue
 *             Colding, B. (1959) — equivalent chip thickness
 */

import { log } from "../utils/Logger.js";

// ─── Constants ──────────────────────────────────────────────────────
const DEG = Math.PI / 180;

/** BUE peak speed estimates by material family (m/min). */
const BUE_PEAK_SPEED: Record<string, number> = {
  steel: 40,
  aluminum: 100,
  stainless: 25,
  titanium: 20,
  cast_iron: 35,
};

/** BUE speed window width by material (m/min). */
const BUE_SPEED_WIDTH: Record<string, number> = {
  steel: 25,
  aluminum: 50,
  stainless: 15,
  titanium: 12,
  cast_iron: 20,
};

/** Recrystallization temperatures by material family (K). */
const T_RECRYSTALLIZATION: Record<string, number> = {
  steel: 723,
  aluminum: 423,
  stainless: 773,
  titanium: 873,
  cast_iron: 700,
};

/** Default Usui constants by workpiece material. */
const USUI_DEFAULTS: Record<string, { A: number; B: number }> = {
  steel: { A: 1e-7, B: 8000 },
  aluminum: { A: 5e-7, B: 6000 },
  stainless: { A: 2e-7, B: 7000 },
  titanium: { A: 3e-7, B: 9000 },
};

/** Default Colding constants by material. */
const COLDING_DEFAULTS: Record<string, { K0: number; K1: number; K2: number }> = {
  steel: { K0: 15, K1: 3.5, K2: 1.2 },
  aluminum: { K0: 17, K1: 3.0, K2: 1.0 },
  stainless: { K0: 13, K1: 4.0, K2: 1.5 },
  titanium: { K0: 12, K1: 4.5, K2: 1.8 },
};

// ─── Input / Output Types ───────────────────────────────────────────

export interface BUEFormationInput {
  cutting_speed: number;      // m/min
  feed: number;               // mm/rev
  material_type: string;      // steel | aluminum | stainless | titanium | cast_iron
  rake_angle: number;         // degrees
  temperature?: number;       // K — interface temperature (estimated if omitted)
}

export interface BUEFormationOutput {
  bue_probability: number;
  bue_height_mm: number;
  bue_stable: boolean;
  speed_window: [number, number];
  effect_on_Ra: number;
  effect_on_forces: number;
  recommended_speed_to_avoid: number;
  mechanism: string;
}

export interface BUEEffectInput {
  bue_probability: number;
  bue_height_mm: number;
  cutting_speed: number;
  material_type: string;
}

export interface BUEEffectOutput {
  force_reduction_pct: number;
  roughness_multiplier: number;
  wear_rate_factor: number;
  cycle_frequency_Hz: number;
}

export interface UsuiCraterWearInput {
  normal_stress_MPa: number;
  sliding_velocity: number;    // m/min
  temperature_K: number;
  contact_length_mm: number;
  time_minutes: number;
  A?: number;
  B?: number;
  material?: string;
}

export interface UsuiCraterWearOutput {
  crater_depth_KT_mm: number;
  crater_width_KB_mm: number;
  crater_center_KM_mm: number;
  wear_rate_mm_per_min: number;
  remaining_life_min: number;
  iso_3685_classification: string;
}

export interface CombinedWearInput {
  normal_stress_MPa: number;
  sliding_velocity: number;
  temperature_K: number;
  contact_length_mm: number;
  time_minutes: number;
  flank_wear_rate_mm_per_min: number;
  notch_wear_rate_mm_per_min: number;
  A?: number;
  B?: number;
  material?: string;
}

export interface CombinedWearOutput {
  dominant_mechanism: string;
  time_to_failure_min: number;
  vb_at_failure: number;
  kt_at_failure: number;
  vn_at_failure: number;
}

export interface BrammertzRoughnessInput {
  feed: number;                 // mm/rev
  nose_radius: number;          // mm
  edge_radius: number;          // mm (cutting edge radius)
  cutting_speed: number;        // m/min
  material: string;
  friction_coeff?: number;      // default 0.35
  vibration_amplitude?: number; // mm (peak)
  vibration_freq_ratio?: number;// f_excitation / f_natural
}

export interface BrammertzRoughnessOutput {
  Ra_theoretical: number;
  Ra_brammertz: number;
  Ra_with_bue: number;
  Ra_total: number;
  dominant_contribution: string;
  optimal_speed_for_finish: number;
  roughness_vs_speed_curve: Array<{ speed: number; Ra: number }>;
}

export interface ColdingToolLifeInput {
  cutting_speed: number;        // m/min
  feed: number;                 // mm/rev
  depth_of_cut: number;         // mm
  approach_angle_deg: number;   // degrees (κr)
  K0?: number;
  K1?: number;
  K2?: number;
  material?: string;
}

export interface ColdingToolLifeOutput {
  tool_life_min: number;
  equivalent_chip_thickness: number;
  colding_constants_used: { K0: number; K1: number; K2: number };
  taylor_equivalent_n: number;
  comparison_with_taylor: string;
}

export interface CoffinMansonInput {
  delta_T: number;              // temperature range K
  alpha_cte: number;            // coefficient of thermal expansion (1/K)
  sigma_f_prime: number;        // fatigue strength coefficient (MPa)
  epsilon_f_prime: number;      // fatigue ductility coefficient
  b_exponent: number;           // fatigue strength exponent (e.g. -0.08)
  c_exponent: number;           // fatigue ductility exponent (e.g. -0.6)
  E_modulus: number;            // Young's modulus (MPa)
  cycles?: number;              // evaluate at this cycle count
}

export interface CoffinMansonOutput {
  total_strain_range: number;
  elastic_strain: number;
  plastic_strain: number;
  cycles_to_failure_Nf: number;
  is_low_cycle: boolean;
  transition_life_Nt: number;
  dominant_regime: string;
}

// ─── Engine ─────────────────────────────────────────────────────────

export class AdvancedCuttingPhenomenaEngine {
  // ── 1a. BUE Formation ───────────────────────────────────────────
  /**
   * Predict Built-Up Edge formation probability and characteristics.
   * BUE forms at intermediate cutting speeds when interface temperature
   * is below the recrystallization threshold.
   */
  predictBUEFormation(params: BUEFormationInput): BUEFormationOutput {
    const { cutting_speed, feed, material_type, rake_angle } = params;
    const mat = material_type.toLowerCase();

    const V = Math.max(cutting_speed, 0.001);
    const f = Math.max(feed, 0.0001);

    const V_peak = BUE_PEAK_SPEED[mat] ?? 40;
    const V_width = BUE_SPEED_WIDTH[mat] ?? 25;
    const V_crit = V_peak + 2 * V_width; // speed above which BUE vanishes

    // Gaussian probability centred on V_peak
    const bue_probability = Math.exp(-(((V - V_peak) / V_width) ** 2));

    // BUE height: h_BUE = K × f^0.7 × (1 - V/V_crit)  for V < V_crit
    const K_bue_coeff = 0.15; // empirical constant (mm)
    let bue_height_mm = 0;
    if (V < V_crit) {
      bue_height_mm = K_bue_coeff * Math.pow(f, 0.7) * (1 - V / V_crit);
      bue_height_mm = Math.max(bue_height_mm, 0);
    }

    // Stability: BUE is stable only in a narrow band near V_peak
    const bue_stable = bue_probability > 0.6 && bue_height_mm > 0.005;

    // Speed window where BUE probability > 0.1
    const halfW = V_width * Math.sqrt(-Math.log(0.1)); // ~1.517 × V_width
    const V_min = Math.max(V_peak - halfW, 0);
    const V_max = V_peak + halfW;

    // Temperature check (optional override)
    let mechanism = "adhesion-temperature";
    if (params.temperature !== undefined) {
      const T_recryst = T_RECRYSTALLIZATION[mat] ?? 723;
      if (params.temperature > T_recryst * 0.4) {
        mechanism = "temperature-above-threshold";
      }
    }

    // Effects
    const effect_on_Ra = 1 + 3 * bue_probability; // 1× to 4× roughness increase
    const effect_on_forces = 1 - 0.25 * bue_probability; // up to 25% force reduction

    // Recommend speed above the BUE window
    const recommended_speed_to_avoid = V_max * 1.2;

    return {
      bue_probability,
      bue_height_mm,
      bue_stable,
      speed_window: [V_min, V_max],
      effect_on_Ra,
      effect_on_forces,
      recommended_speed_to_avoid,
      mechanism,
    };
  }

  // ── 1b. BUE Effect ─────────────────────────────────────────────
  /**
   * Compute quantitative effects of existing BUE on forces, roughness, wear.
   */
  predictBUEEffect(params: BUEEffectInput): BUEEffectOutput {
    const { bue_probability, bue_height_mm, cutting_speed, material_type } = params;
    const mat = material_type.toLowerCase();
    const V_peak = BUE_PEAK_SPEED[mat] ?? 40;

    // Force reduction 10-30% proportional to BUE probability
    const force_reduction_pct = 10 + 20 * bue_probability;

    // Roughness multiplier 1-5× (BUE breakage cycles create irregularities)
    const roughness_multiplier = 1 + 4 * bue_probability;

    // Wear rate factor: BUE protects the tool (lower = better)
    const wear_rate_factor = 1 - 0.4 * bue_probability;

    // BUE growth/break cycle frequency
    const V_ratio = Math.max(cutting_speed / V_peak, 0.01);
    const K_cycle = 2.0; // Hz baseline
    const cycle_frequency_Hz = K_cycle * Math.pow(V_ratio, -0.5);

    return {
      force_reduction_pct,
      roughness_multiplier,
      wear_rate_factor,
      cycle_frequency_Hz,
    };
  }

  // ── 2a. Usui Crater Wear ───────────────────────────────────────
  /**
   * Calculate crater wear depth using the Usui diffusion-based model.
   * dW/dt = A × σn × Vs × exp(-B/T)
   * Reference: Usui, E. et al. (1978)
   */
  calculateUsuiCraterWear(params: UsuiCraterWearInput): UsuiCraterWearOutput {
    const { normal_stress_MPa, sliding_velocity, temperature_K, contact_length_mm, time_minutes } = params;

    // Resolve constants
    const mat = (params.material ?? "steel").toLowerCase();
    const defaults = USUI_DEFAULTS[mat] ?? USUI_DEFAULTS.steel;
    const A = params.A ?? defaults.A;
    const B = params.B ?? defaults.B;

    const T = Math.max(temperature_K, 1); // avoid division by zero
    const sigma = Math.max(normal_stress_MPa, 0);
    const Vs = Math.max(sliding_velocity, 0);

    // Instantaneous wear rate
    const wear_rate = A * sigma * Vs * Math.exp(-B / T);

    // Numerical integration (Euler, dt = 0.1 min or time/100)
    const steps = Math.max(Math.ceil(time_minutes / 0.1), 100);
    const dt = time_minutes / steps;
    let KT = 0;
    for (let i = 0; i < steps; i++) {
      KT += wear_rate * dt;
    }

    // Crater geometry per ISO 3685
    const KM = 0.5 * contact_length_mm; // crater center distance
    const KB = 1.5 * contact_length_mm; // crater width ≈ 1.5 × contact length

    // Remaining life to KT_max = 0.1 mm
    const KT_max = 0.1;
    let remaining_life_min: number;
    if (wear_rate > 0) {
      remaining_life_min = Math.max((KT_max - KT) / wear_rate, 0);
    } else {
      remaining_life_min = Infinity;
    }

    // ISO 3685 classification
    let iso_3685_classification: string;
    if (KT < 0.02) {
      iso_3685_classification = "initial_wear";
    } else if (KT < 0.06) {
      iso_3685_classification = "steady_state_wear";
    } else if (KT < 0.1) {
      iso_3685_classification = "accelerated_wear";
    } else {
      iso_3685_classification = "tool_failure";
    }

    return {
      crater_depth_KT_mm: KT,
      crater_width_KB_mm: KB,
      crater_center_KM_mm: KM,
      wear_rate_mm_per_min: wear_rate,
      remaining_life_min,
      iso_3685_classification,
    };
  }

  // ── 2b. Combined Wear ──────────────────────────────────────────
  /**
   * Combine flank (VB) + crater (KT) + notch (VN) wear to find dominant
   * failure mechanism and time to failure.
   * Limits: VB=0.3mm, KT=0.1mm, VN=0.6mm (ISO 3685).
   */
  predictCombinedWear(params: CombinedWearInput): CombinedWearOutput {
    const { flank_wear_rate_mm_per_min, notch_wear_rate_mm_per_min } = params;

    // Get crater wear rate from Usui model
    const crater = this.calculateUsuiCraterWear(params);
    const crater_rate = crater.wear_rate_mm_per_min;

    // Time to reach each limit
    const VB_LIMIT = 0.3;
    const KT_LIMIT = 0.1;
    const VN_LIMIT = 0.6;

    const t_vb = flank_wear_rate_mm_per_min > 0 ? VB_LIMIT / flank_wear_rate_mm_per_min : Infinity;
    const t_kt = crater_rate > 0 ? KT_LIMIT / crater_rate : Infinity;
    const t_vn = notch_wear_rate_mm_per_min > 0 ? VN_LIMIT / notch_wear_rate_mm_per_min : Infinity;

    // Dominant = first to reach limit
    const t_fail = Math.min(t_vb, t_kt, t_vn);
    let dominant_mechanism: string;
    if (t_fail === t_vb) dominant_mechanism = "flank_wear";
    else if (t_fail === t_kt) dominant_mechanism = "crater_wear";
    else dominant_mechanism = "notch_wear";

    return {
      dominant_mechanism,
      time_to_failure_min: t_fail,
      vb_at_failure: flank_wear_rate_mm_per_min * t_fail,
      kt_at_failure: crater_rate * t_fail,
      vn_at_failure: notch_wear_rate_mm_per_min * t_fail,
    };
  }

  // ── 3. Brammertz Surface Roughness ─────────────────────────────
  /**
   * Brammertz-corrected surface roughness including minimum chip
   * thickness effect, BUE contribution, and vibration.
   * Reference: Brammertz, P.H. (1961)
   */
  calculateBrammertzRoughness(params: BrammertzRoughnessInput): BrammertzRoughnessOutput {
    const {
      feed, nose_radius, edge_radius, cutting_speed, material,
    } = params;
    const mu = params.friction_coeff ?? 0.35;
    const vib_amp = params.vibration_amplitude ?? 0;
    const vib_ratio = params.vibration_freq_ratio ?? 0;

    const f = Math.max(feed, 1e-6);
    const r_nose = Math.max(nose_radius, 1e-6);
    const r_edge = Math.max(edge_radius, 0);
    const mat = material.toLowerCase();

    // 1. Theoretical kinematic roughness
    const Rth = (f * f) / (8 * r_nose);

    // 2. Minimum chip thickness
    const h_min = r_edge > 0
      ? r_edge * (1 - Math.cos(Math.atan(mu)))
      : 0;

    // 3. Brammertz correction
    const Ra_brammertz = Rth
      + (h_min * h_min) / (8 * r_nose)
      + (Rth * h_min) / (4 * f * r_nose);

    // 4. BUE contribution
    const bueResult = this.predictBUEFormation({
      cutting_speed,
      feed: f,
      material_type: mat,
      rake_angle: 6, // typical
    });
    const K_bue_rough = 2.5; // empirical scaling
    const Ra_bue_component = Ra_brammertz * K_bue_rough * bueResult.bue_probability;
    const Ra_with_bue = Ra_brammertz + Ra_bue_component;

    // 5. Vibration contribution
    const C_vib = 0.5;
    const Ra_vib = vib_amp > 0
      ? C_vib * (vib_ratio ** 2) * vib_amp
      : 0;

    // 6. RSS total
    const Ra_total = Math.sqrt(Ra_brammertz ** 2 + Ra_bue_component ** 2 + Ra_vib ** 2);

    // Dominant contribution
    const contributions: Array<[string, number]> = [
      ["kinematic+chip_thickness", Ra_brammertz],
      ["built_up_edge", Ra_bue_component],
      ["vibration", Ra_vib],
    ];
    contributions.sort((a, b) => b[1] - a[1]);
    const dominant_contribution = contributions[0][0];

    // Optimal speed for finish: above BUE window, below thermal damage
    const V_peak = BUE_PEAK_SPEED[mat] ?? 40;
    const V_width = BUE_SPEED_WIDTH[mat] ?? 25;
    const optimal_speed_for_finish = V_peak + 2.5 * V_width;

    // Generate Ra vs speed curve (10 points)
    const roughness_vs_speed_curve: Array<{ speed: number; Ra: number }> = [];
    const V_start = Math.max(5, V_peak - 3 * V_width);
    const V_end = V_peak + 4 * V_width;
    const nPoints = 15;
    for (let i = 0; i < nPoints; i++) {
      const spd = V_start + (V_end - V_start) * (i / (nPoints - 1));
      const bue = this.predictBUEFormation({
        cutting_speed: spd,
        feed: f,
        material_type: mat,
        rake_angle: 6,
      });
      const ra_bue_c = Ra_brammertz * K_bue_rough * bue.bue_probability;
      // Thermal roughness at very high speeds
      const thermal_factor = spd > optimal_speed_for_finish
        ? 0.001 * (spd - optimal_speed_for_finish)
        : 0;
      const ra_pt = Math.sqrt(Ra_brammertz ** 2 + ra_bue_c ** 2 + thermal_factor ** 2);
      roughness_vs_speed_curve.push({ speed: spd, Ra: ra_pt });
    }

    return {
      Ra_theoretical: Rth,
      Ra_brammertz,
      Ra_with_bue,
      Ra_total,
      dominant_contribution,
      optimal_speed_for_finish,
      roughness_vs_speed_curve,
    };
  }

  // ── 4. Colding Tool Life ───────────────────────────────────────
  /**
   * Colding equivalent chip thickness tool life model.
   * ln(T) = K0 - K1×ln(Vc) - K2×ln(he)
   * Reference: Colding, B. (1959)
   */
  calculateColdingToolLife(params: ColdingToolLifeInput): ColdingToolLifeOutput {
    const { cutting_speed, feed, depth_of_cut, approach_angle_deg } = params;

    const Vc = Math.max(cutting_speed, 0.01);
    const f = Math.max(feed, 0.001);
    const ap = Math.max(depth_of_cut, 0.001);
    const kappa_r = approach_angle_deg * DEG;

    // Resolve constants
    const mat = (params.material ?? "steel").toLowerCase();
    const defaults = COLDING_DEFAULTS[mat] ?? COLDING_DEFAULTS.steel;
    const K0 = params.K0 ?? defaults.K0;
    const K1 = params.K1 ?? defaults.K1;
    const K2 = params.K2 ?? defaults.K2;

    // Equivalent chip thickness
    const he = (f * ap) / (f + ap * Math.sin(kappa_r));

    // Tool life
    const lnT = K0 - K1 * Math.log(Vc) - K2 * Math.log(he);
    const tool_life_min = Math.exp(lnT);

    // Taylor equivalent: T = C × V^(-1/n), so n = 1/K1
    const taylor_equivalent_n = 1 / K1;

    // Comparison
    let comparison_with_taylor: string;
    if (Math.abs(taylor_equivalent_n - 0.25) < 0.1) {
      comparison_with_taylor = "Consistent with Taylor (carbide tools, n~0.25)";
    } else if (taylor_equivalent_n < 0.15) {
      comparison_with_taylor = "Steeper than typical Taylor (HSS-like, n<0.15)";
    } else if (taylor_equivalent_n > 0.4) {
      comparison_with_taylor = "Flatter than typical Taylor (ceramic-like, n>0.4)";
    } else {
      comparison_with_taylor = `Taylor equivalent n=${taylor_equivalent_n.toFixed(3)} within general range`;
    }

    return {
      tool_life_min,
      equivalent_chip_thickness: he,
      colding_constants_used: { K0, K1, K2 },
      taylor_equivalent_n,
      comparison_with_taylor,
    };
  }

  // ── 5. Coffin-Manson Thermal Fatigue ───────────────────────────
  /**
   * Coffin-Manson low-cycle fatigue model for thermal cycling.
   * Δε/2 = (σf'/E)×(2Nf)^b + εf'×(2Nf)^c
   * References: Coffin (1954), Manson (1953)
   */
  calculateCoffinManson(params: CoffinMansonInput): CoffinMansonOutput {
    const {
      delta_T, alpha_cte, sigma_f_prime, epsilon_f_prime,
      b_exponent, c_exponent, E_modulus,
    } = params;

    const E = Math.max(E_modulus, 1);

    // Total strain range from thermal cycling
    const total_strain_range = alpha_cte * delta_T;
    const half_strain = total_strain_range / 2;

    // Solve for Nf using bisection on:
    // half_strain = (sigma_f'/E) * (2Nf)^b + epsilon_f' * (2Nf)^c
    const strainAtN = (Nf: number): number => {
      const twoN = 2 * Nf;
      const elastic = (sigma_f_prime / E) * Math.pow(twoN, b_exponent);
      const plastic = epsilon_f_prime * Math.pow(twoN, c_exponent);
      return elastic + plastic;
    };

    // Bisection: find Nf where strainAtN(Nf) = half_strain
    let lo = 1;
    let hi = 1e12;
    let Nf = 1e6; // fallback

    if (half_strain <= 0) {
      Nf = Infinity;
    } else {
      // Expand hi if needed
      for (let attempt = 0; attempt < 20; attempt++) {
        if (strainAtN(lo) < half_strain) break;
        lo = lo / 10;
        if (lo < 1e-6) { lo = 1e-6; break; }
      }
      for (let attempt = 0; attempt < 20; attempt++) {
        if (strainAtN(hi) > half_strain) break;
        hi *= 10;
        if (hi > 1e18) { hi = 1e18; break; }
      }

      for (let iter = 0; iter < 200; iter++) {
        Nf = Math.sqrt(lo * hi); // geometric bisection for log-scale
        const val = strainAtN(Nf);
        if (Math.abs(val - half_strain) / Math.max(half_strain, 1e-15) < 1e-8) break;
        if (val > half_strain) {
          lo = Nf;
        } else {
          hi = Nf;
        }
      }
    }

    // Elastic and plastic strain at Nf
    const twoNf = 2 * Math.max(Nf, 1);
    const elastic_strain = (sigma_f_prime / E) * Math.pow(twoNf, b_exponent);
    const plastic_strain = epsilon_f_prime * Math.pow(twoNf, c_exponent);

    // Transition life: elastic = plastic
    // (sigma_f'/E) * (2Nt)^b = epsilon_f' * (2Nt)^c
    // (2Nt)^(b-c) = (epsilon_f' * E) / sigma_f'
    // 2Nt = ((epsilon_f' * E) / sigma_f')^(1/(b-c))
    const ratio = (epsilon_f_prime * E) / sigma_f_prime;
    const exp_bc = b_exponent - c_exponent;
    let transition_life_Nt: number;
    if (Math.abs(exp_bc) > 1e-10 && ratio > 0) {
      const twoNt = Math.pow(ratio, 1 / exp_bc);
      transition_life_Nt = twoNt / 2;
    } else {
      transition_life_Nt = 1e6;
    }

    const is_low_cycle = isFinite(Nf) && Nf < 1e4;

    let dominant_regime: string;
    if (!isFinite(Nf)) {
      dominant_regime = "no_fatigue";
    } else if (Nf < transition_life_Nt) {
      dominant_regime = "plastic_dominated";
    } else {
      dominant_regime = "elastic_dominated";
    }

    return {
      total_strain_range,
      elastic_strain,
      plastic_strain,
      cycles_to_failure_Nf: Nf,
      is_low_cycle,
      transition_life_Nt: transition_life_Nt,
      dominant_regime,
    };
  }
}

export const advancedCuttingPhenomenaEngine = new AdvancedCuttingPhenomenaEngine();
