/**
 * ThreadStrengthFatigueEngine — Thread structural integrity physics
 * Implements thread shear, pullout, fatigue, preload, and loosening formulas
 */

export interface ThreadStrengthInput {
  action: 'thread_strength' | 'thread_fatigue' | 'bolt_preload' | 'vibration_loosening' | 'joint_analysis';
  // thread_strength
  thread_type?: string; // M8, M10, etc.
  major_diameter_mm?: number;
  minor_diameter_mm?: number;
  pitch_mm?: number;
  engagement_length_mm?: number;
  material_ult_shear_mpa?: number;
  // thread_fatigue
  stress_amplitude_mpa?: number;
  mean_stress_mpa?: number;
  endurance_limit_mpa?: number;
  ultimate_strength_mpa?: number;
  kt_thread?: number; // stress concentration, typically 3-5
  // bolt_preload
  torque_nm?: number;
  bolt_diameter_mm?: number;
  nut_factor_k?: number; // 0.15-0.25
  bolt_stiffness_n_mm?: number;
  member_stiffness_n_mm?: number;
  external_force_n?: number;
  // vibration_loosening
  preload_force_n?: number;
  transverse_force_n?: number;
  friction_coefficient?: number;
  // joint_analysis
  pitch_diameter_mm?: number;
  nut_shear_area_mm2?: number;
}

export class ThreadStrengthFatigueEngine {
  calculate(input: ThreadStrengthInput): Record<string, any> {
    switch (input.action) {
      case 'thread_strength': return this.threadStrength(input);
      case 'thread_fatigue': return this.threadFatigue(input);
      case 'bolt_preload': return this.boltPreload(input);
      case 'vibration_loosening': return this.vibrationLoosening(input);
      case 'joint_analysis': return this.jointAnalysis(input);
      default: return { error: `Unknown action: ${input.action}` };
    }
  }

  /** Thread shear area and pullout force per ISO 898 */
  threadStrength(p: ThreadStrengthInput) {
    const D = p.major_diameter_mm ?? 10;
    const d = p.minor_diameter_mm ?? D * 0.838; // approximate for metric
    const pitch = p.pitch_mm ?? (D <= 6 ? 1.0 : D <= 10 ? 1.5 : D <= 16 ? 2.0 : 2.5);
    const Le = p.engagement_length_mm ?? D * 1.5;
    const tau_ult = p.material_ult_shear_mpa ?? 300; // mild steel default

    // Thread shear area: As = 0.5 * pi * n * Le * (D_major or d_minor)
    const threads_per_mm = 1 / pitch;
    const As_bolt = 0.5 * Math.PI * threads_per_mm * Le * d; // bolt strip area
    const As_nut = 0.5 * Math.PI * threads_per_mm * Le * D;  // nut strip area
    const As_min = Math.min(As_bolt, As_nut);

    // Pullout force
    const F_pullout = tau_ult * As_min;

    // Minimum engagement length for equal strength
    const Le_min = As_bolt > 0 ? (2 * As_bolt) / (Math.PI * threads_per_mm * D) : Le;

    // Tensile stress area (ISO 898)
    const d2 = D - 0.6495 * pitch; // pitch diameter
    const d3 = D - 1.2269 * pitch; // minor diameter
    const At = (Math.PI / 4) * ((d2 + d3) / 2) ** 2;

    return {
      shear_area_bolt_mm2: Math.round(As_bolt * 100) / 100,
      shear_area_nut_mm2: Math.round(As_nut * 100) / 100,
      shear_area_min_mm2: Math.round(As_min * 100) / 100,
      tensile_stress_area_mm2: Math.round(At * 100) / 100,
      pullout_force_n: Math.round(F_pullout),
      min_engagement_length_mm: Math.round(Le_min * 100) / 100,
      engagement_ratio: Math.round((Le / D) * 100) / 100,
      adequate: Le >= Le_min,
      threads_engaged: Math.round(Le / pitch * 10) / 10,
    };
  }

  /** Goodman fatigue diagram for threaded fasteners */
  threadFatigue(p: ThreadStrengthInput) {
    const sigma_a = p.stress_amplitude_mpa ?? 50;
    const sigma_m = p.mean_stress_mpa ?? 200;
    const Se = p.endurance_limit_mpa ?? 250;
    const Su = p.ultimate_strength_mpa ?? 800;
    const Kt = p.kt_thread ?? 4.0; // thread stress concentration

    // Effective endurance limit with thread Kt
    const Se_eff = Se / Kt;

    // Goodman criterion: sigma_a/Se + sigma_m/Su = 1/n (safety factor)
    const goodman_sum = (sigma_a / Se_eff) + (sigma_m / Su);
    const safety_factor = goodman_sum > 0 ? 1 / goodman_sum : Infinity;

    // S-N life estimate (Basquin: sigma_a = sigma_f' * (2N)^b)
    const b = -0.085; // typical for steel
    const sigma_f_prime = Su * 1.5; // approximate
    const N_cycles = sigma_a > 0
      ? Math.pow(sigma_a / sigma_f_prime, 1 / b) / 2
      : Infinity;

    // Modified Goodman line
    const max_amplitude_at_zero_mean = Se_eff;
    const max_mean_at_zero_amplitude = Su;

    return {
      goodman_ratio: Math.round(goodman_sum * 1000) / 1000,
      safety_factor: Math.round(safety_factor * 100) / 100,
      safe: safety_factor >= 1.0,
      infinite_life: safety_factor >= 1.0,
      estimated_cycles: N_cycles > 1e10 ? Infinity : Math.round(N_cycles),
      kt_thread: Kt,
      effective_endurance_mpa: Math.round(Se_eff * 10) / 10,
      max_amplitude_mpa: Math.round(max_amplitude_at_zero_mean * 10) / 10,
      max_mean_mpa: Math.round(max_mean_at_zero_amplitude),
    };
  }

  /** Bolt preload from applied torque */
  boltPreload(p: ThreadStrengthInput) {
    const T = p.torque_nm ?? 25;
    const d = p.bolt_diameter_mm ?? 10;
    const K = p.nut_factor_k ?? 0.2;

    // F = T / (K * d)
    const F_preload = (T * 1000) / (K * d); // convert Nm to Nmm

    // Joint stiffness ratio
    const kb = p.bolt_stiffness_n_mm ?? 500000;
    const km = p.member_stiffness_n_mm ?? 2500000;
    const C = kb / (kb + km); // stiffness ratio

    // Clamp load under external force
    const F_ext = p.external_force_n ?? 0;
    const F_bolt = F_preload + C * F_ext;
    const F_clamp = F_preload - (1 - C) * F_ext;
    const joint_separates = F_clamp <= 0;

    return {
      preload_force_n: Math.round(F_preload),
      stiffness_ratio_c: Math.round(C * 1000) / 1000,
      bolt_force_n: Math.round(F_bolt),
      clamp_force_n: Math.round(Math.max(0, F_clamp)),
      joint_separates: joint_separates,
      separation_force_n: Math.round(F_preload / (1 - C)),
      bolt_stress_increase_pct: F_preload > 0 ? Math.round((C * F_ext / F_preload) * 10000) / 100 : 0,
    };
  }

  /** Junker vibration loosening criterion */
  vibrationLoosening(p: ThreadStrengthInput) {
    const F_pre = p.preload_force_n ?? 10000;
    const F_trans = p.transverse_force_n ?? 2000;
    const mu = p.friction_coefficient ?? 0.15;

    // Self-loosening occurs when transverse force exceeds friction resistance
    const F_resist = mu * F_pre;
    const loosening_ratio = F_trans / F_resist;
    const will_loosen = F_trans > F_resist;

    // Required preload to prevent loosening with safety factor 1.5
    const F_pre_required = (F_trans * 1.5) / mu;

    return {
      friction_resistance_n: Math.round(F_resist),
      loosening_ratio: Math.round(loosening_ratio * 1000) / 1000,
      will_loosen: will_loosen,
      required_preload_n: Math.round(F_pre_required),
      safety_factor: Math.round((1 / loosening_ratio) * 100) / 100,
      recommendation: will_loosen
        ? 'Use thread-locking compound, prevailing torque nut, or increase preload'
        : 'Joint is stable against vibration loosening',
    };
  }

  /** Joint stiffness and stripping analysis */
  jointAnalysis(p: ThreadStrengthInput) {
    const D = p.major_diameter_mm ?? 10;
    const pitch = p.pitch_mm ?? 1.5;
    const dp = p.pitch_diameter_mm ?? (D - 0.6495 * pitch);
    const tau_ult = p.material_ult_shear_mpa ?? 300;

    // Thread stripping torque
    const Le = p.engagement_length_mm ?? D * 1.5;
    const As_nut = 0.5 * Math.PI * (1 / pitch) * Le * D;
    const T_strip = (As_nut * tau_ult * dp) / (2 * Math.PI * 1000); // in Nm

    // Rotscher cone model for member stiffness
    // Simplified: km ~ 0.5774 * pi * E * d
    const E = 207000; // steel, MPa
    const km_simplified = 0.5774 * Math.PI * E * D; // N/mm approximate

    // Bolt stiffness: kb = At * E / L_grip
    const d2 = D - 0.6495 * pitch;
    const d3 = D - 1.2269 * pitch;
    const At = (Math.PI / 4) * ((d2 + d3) / 2) ** 2;
    const L_grip = Le * 2; // approximate grip length
    const kb = (At * E) / L_grip;

    return {
      stripping_torque_nm: Math.round(T_strip * 100) / 100,
      member_stiffness_n_mm: Math.round(km_simplified),
      bolt_stiffness_n_mm: Math.round(kb),
      stiffness_ratio: Math.round(kb / (kb + km_simplified) * 1000) / 1000,
      tensile_area_mm2: Math.round(At * 100) / 100,
      pitch_diameter_mm: Math.round(dp * 1000) / 1000,
    };
  }
}

export const threadStrengthFatigueEngine = new ThreadStrengthFatigueEngine();
