/**
 * ConstitutiveModelEngine — 9 material constitutive and failure models
 * Zerilli-Armstrong, MTS, Voce, PTW, Paris Law, Norton Creep,
 * Larson-Miller, Hollomon, Machinability Index
 *
 * References:
 *   [1] Zerilli, F.J. & Armstrong, R.W. (1987). "Dislocation-mechanics-based
 *       constitutive relations for material dynamics calculations". J. Appl.
 *       Phys., 61(5), 1816-1825. doi:10.1063/1.338024
 *       (BCC/FCC dislocation-mechanics flow stress model)
 *   [2] Voce, E. (1948). "The Relationship between Stress and Strain for
 *       Homogeneous Deformation". J. Inst. Metals, 74, 537-562.
 *       (Exponential saturation hardening law)
 *   [3] Norton, F.H. (1929). "The Creep of Steel at High Temperatures".
 *       McGraw-Hill, New York.
 *       (Power-law steady-state creep: eps_dot = A * sigma^n * exp(-Q/RT))
 *   [4] Paris, P. & Erdogan, F. (1963). "A Critical Analysis of Crack
 *       Propagation Laws". J. Basic Eng., 85(4), 528-533.
 *       doi:10.1115/1.3656900 (Fatigue crack growth: da/dN = C * dK^m)
 *   [5] Larson, F.R. & Miller, J. (1952). "A Time-Temperature Relationship
 *       for Rupture and Creep Stresses". Trans. ASME, 74, 765-775.
 *       (Larson-Miller parameter: LMP = T * (C + log(t_r)))
 *   [6] Hollomon, J.H. (1945). "Tensile Deformation". Trans. AIME, 162,
 *       268-290. (Power-law strain hardening: sigma = K * eps^n)
 *   [7] Follansbee, P.S. & Kocks, U.F. (1988). "A constitutive description
 *       of the deformation of copper based on the use of the mechanical
 *       threshold stress as an internal state variable". Acta Metall., 36(1),
 *       81-93. (MTS model foundation)
 *   [8] Preston, D.L., Tonks, D.L. & Wallace, D.C. (2003). "Model of plastic
 *       deformation for extreme loading conditions". J. Appl. Phys., 93(1),
 *       211-220. doi:10.1063/1.1524706 (PTW model)
 */
import { log } from "../utils/Logger.js";

// ── Interfaces ──────────────────────────────────────────────────────

interface ZerilliArmstrongInput {
  strain: number; strain_rate: number; temperature_C: number;
  crystal_structure: "BCC" | "FCC";
  constants: { C0: number; C1: number; C2: number; C3: number; C4: number; C5: number; n: number };
}
interface ZerilliArmstrongOutput { flow_stress_MPa: number; thermal_component_MPa: number; athermal_component_MPa: number }

interface MTSInput {
  strain: number; strain_rate: number; temperature_C: number;
  params: { sigma_a: number; sigma_hat: number; g0: number; p: number; q: number; b: number; mu_0: number; D_mu: number; eps_dot_0: number };
}
interface MTSOutput { flow_stress_MPa: number; threshold_stress_MPa: number; scaling_factor: number }

interface VoceInput { strain: number; sigma_0_MPa: number; sigma_s_MPa: number; epsilon_c: number }
interface VoceOutput { flow_stress_MPa: number; hardening_rate_MPa: number; saturation_fraction: number }

interface PTWInput {
  strain: number; strain_rate: number; temperature_C: number;
  params: { s0: number; s_inf: number; kappa: number; gamma_xi: number; y0: number; y_inf: number; y1: number; y2: number; beta: number; M: number; rho: number; theta: number };
}
interface PTWOutput { flow_stress_MPa: number; regime: "thermal_activation" | "phonon_drag"; normalized_stress: number }

interface ParisLawInput { initial_crack_mm: number; critical_crack_mm: number; stress_range_MPa: number; geometry_factor_Y: number; C: number; m: number }
interface ParisLawOutput { cycles_to_failure: number; crack_growth_rate_mm_cycle: number; current_delta_K: number; crack_length_vs_cycles: Array<{ N: number; a_mm: number }> }

interface NortonCreepInput { stress_MPa: number; temperature_C: number; A: number; n: number; Q_kJ_mol: number }
interface NortonCreepOutput { creep_rate_per_hour: number; time_to_1pct_strain_hours: number; rupture_regime: "safe" | "caution" | "critical" }

interface LarsonMillerInput { test_data: Array<{ temperature_C: number; rupture_hours: number }>; target_temperature_C: number; target_hours?: number }
interface LarsonMillerOutput { larson_miller_parameter: number; predicted_rupture_hours?: number; predicted_temperature_C?: number; stress_rupture_curve: Array<{ hours: number; stress_MPa: number }> }

interface HollomonInput { strain_data: number[]; stress_data: number[] }
interface HollomonOutput { K_MPa: number; n_exponent: number; r_squared: number; UTS_MPa: number; uniform_elongation: number }

interface MachinabilityInput { material_v60_m_min: number; reference_v60_m_min?: number; specific_energy_ratio?: number; chip_factor?: number; surface_factor?: number }
interface MachinabilityOutput { machinability_rating: number; category: "excellent" | "good" | "fair" | "poor" | "difficult"; recommended_speed_range_pct: [number, number] }

// ── Constants ───────────────────────────────────────────────────────

const R_GAS = 8.314e-3; // kJ/(mol·K)
const K_BOLTZMANN = 1.380649e-23; // J/K

// ── Engine ──────────────────────────────────────────────────────────

class ConstitutiveModelEngineImpl {

  /** Zerilli-Armstrong dislocation-mechanics flow stress (BCC/FCC) */
  zerilliArmstrong(input: ZerilliArmstrongInput): ZerilliArmstrongOutput {
    const { strain: eps, strain_rate: epsDot, temperature_C, crystal_structure, constants: c } = input;
    const T = temperature_C + 273.15;
    const lnEpsDot = Math.log(Math.max(epsDot, 1e-30));
    let thermal: number, athermal: number;

    if (crystal_structure === "BCC") {
      thermal = c.C1 * Math.exp(-c.C3 * T + c.C4 * T * lnEpsDot);
      athermal = c.C5 * Math.pow(Math.max(eps, 1e-12), c.n);
    } else {
      thermal = c.C2 * Math.sqrt(Math.max(eps, 1e-12)) * Math.exp(-c.C3 * T + c.C4 * T * lnEpsDot);
      athermal = 0;
    }
    const flow = c.C0 + thermal + athermal;
    log.debug(`[ConstitutiveModel] ZA ${crystal_structure}: σ=${flow.toFixed(1)} MPa at T=${temperature_C}°C, ε̇=${epsDot}`);
    return { flow_stress_MPa: Math.max(flow, 0), thermal_component_MPa: thermal, athermal_component_MPa: c.C0 + athermal };
  }

  /** Mechanical Threshold Stress model */
  mechanicalThresholdStress(input: MTSInput): MTSOutput {
    const { strain_rate: epsDot, temperature_C, params: p } = input;
    const T = temperature_C + 273.15;
    const mu = p.mu_0 - p.D_mu / (Math.exp(p.D_mu / (p.mu_0 * T)) - 1); // shear modulus with T
    const lnRatio = Math.log(Math.max(p.eps_dot_0 / Math.max(epsDot, 1e-30), 1));
    const arg = (K_BOLTZMANN * T / (p.g0 * mu * Math.pow(p.b, 3))) * lnRatio;
    const clamped = Math.min(Math.max(arg, 0), 1);
    const s = Math.pow(1 - Math.pow(clamped, 1 / p.q), 1 / p.p);
    const flow = p.sigma_a + p.sigma_hat * s;
    log.debug(`[ConstitutiveModel] MTS: σ=${flow.toFixed(1)} MPa, s=${s.toFixed(4)}`);
    return { flow_stress_MPa: Math.max(flow, 0), threshold_stress_MPa: p.sigma_hat, scaling_factor: s };
  }

  /** Voce saturation hardening */
  voceHardening(input: VoceInput): VoceOutput {
    const { strain: eps, sigma_0_MPa: s0, sigma_s_MPa: ss, epsilon_c: ec } = input;
    const expTerm = Math.exp(-eps / ec);
    const flow = ss - (ss - s0) * expTerm;
    const rate = ((ss - s0) / ec) * expTerm;
    const satFrac = 1 - expTerm;
    log.debug(`[ConstitutiveModel] Voce: σ=${flow.toFixed(1)} MPa, saturation=${(satFrac * 100).toFixed(1)}%`);
    return { flow_stress_MPa: flow, hardening_rate_MPa: rate, saturation_fraction: satFrac };
  }

  /** Preston-Tonks-Wallace model (thermal activation + phonon drag) */
  prestonTonksWallace(input: PTWInput): PTWOutput {
    const { strain_rate: epsDot, temperature_C, params: p } = input;
    const T = temperature_C + 273.15;
    const T_melt = p.theta > 0 ? T / (p.theta * 1000) : T / 1500; // normalized temperature
    const dragThreshold = p.gamma_xi * 1e4; // transition strain rate

    let tauHat: number;
    let regime: "thermal_activation" | "phonon_drag";

    if (epsDot < dragThreshold) {
      // Thermal activation regime
      const erfArg = p.kappa * p.theta * Math.log(Math.max(p.gamma_xi / Math.max(epsDot, 1e-30), 1));
      tauHat = p.s0 - (p.s0 - p.s_inf) * erf(erfArg);
      regime = "thermal_activation";
    } else {
      // Phonon drag regime
      tauHat = p.s0 * Math.pow(epsDot / p.gamma_xi, p.beta);
      regime = "phonon_drag";
    }

    // Convert normalized stress to MPa: σ = 2τ̂ · μ / M  (simplified with μ from rho)
    const mu = p.rho > 0 ? p.rho * 1e6 : 80e3; // shear modulus estimate in MPa
    const flow = 2 * tauHat * mu / Math.max(p.M, 1);
    log.debug(`[ConstitutiveModel] PTW: σ=${flow.toFixed(1)} MPa, regime=${regime}`);
    return { flow_stress_MPa: Math.max(flow, 0), regime, normalized_stress: tauHat };
  }

  /** Paris law fatigue crack growth with cycle integration */
  parisLaw(input: ParisLawInput): ParisLawOutput {
    const { initial_crack_mm: a0, critical_crack_mm: ac, stress_range_MPa: dSigma, geometry_factor_Y: Y, C, m } = input;
    const curve: Array<{ N: number; a_mm: number }> = [{ N: 0, a_mm: a0 }];
    let a = a0;
    let N = 0;
    const maxSteps = 10000;
    const dN = Math.max(Math.ceil((ac - a0) / (C * Math.pow(Y * dSigma * Math.sqrt(Math.PI * ac), m)) / maxSteps), 1);

    while (a < ac && N < 1e12) {
      const dK = Y * dSigma * Math.sqrt(Math.PI * a * 1e-3); // a in mm → m for K in MPa√m
      const dadn = C * Math.pow(dK, m); // mm/cycle
      a += dadn * dN;
      N += dN;
      if (curve.length < 200 || N % (dN * 50) === 0) {
        curve.push({ N, a_mm: Math.min(a, ac) });
      }
    }

    const dK0 = Y * dSigma * Math.sqrt(Math.PI * a0 * 1e-3);
    const initialRate = C * Math.pow(dK0, m);
    log.debug(`[ConstitutiveModel] Paris: N_f=${N}, da/dN₀=${initialRate.toExponential(2)} mm/cycle`);
    return { cycles_to_failure: N, crack_growth_rate_mm_cycle: initialRate, current_delta_K: dK0, crack_length_vs_cycles: curve };
  }

  /** Norton power-law creep */
  nortonCreep(input: NortonCreepInput): NortonCreepOutput {
    const { stress_MPa: sigma, temperature_C, A, n, Q_kJ_mol: Q } = input;
    const T = temperature_C + 273.15;
    const rateSec = A * Math.pow(sigma, n) * Math.exp(-Q / (R_GAS * T)); // per second
    const rateHour = rateSec * 3600;
    const timeTo1pct = rateHour > 0 ? 0.01 / rateHour : Infinity;
    const regime: "safe" | "caution" | "critical" =
      timeTo1pct > 10000 ? "safe" : timeTo1pct > 1000 ? "caution" : "critical";
    log.debug(`[ConstitutiveModel] Norton: ε̇=${rateHour.toExponential(3)}/hr, regime=${regime}`);
    return { creep_rate_per_hour: rateHour, time_to_1pct_strain_hours: timeTo1pct, rupture_regime: regime };
  }

  /** Larson-Miller parameter for creep rupture extrapolation */
  larsonMiller(input: LarsonMillerInput): LarsonMillerOutput {
    const { test_data, target_temperature_C, target_hours } = input;
    const C_LM = 20; // Larson-Miller constant
    const T_target = target_temperature_C + 273.15;

    // Compute LMP from test data (average)
    const lmps = test_data.map(d => {
      const Tk = d.temperature_C + 273.15;
      return Tk * (C_LM + Math.log10(Math.max(d.rupture_hours, 1e-6)));
    });
    const avgLMP = lmps.reduce((s, v) => s + v, 0) / Math.max(lmps.length, 1);

    let predictedHours: number | undefined;
    let predictedTemp: number | undefined;

    if (target_hours !== undefined) {
      // Solve for temperature: T = LMP / (C + log10(t))
      predictedTemp = avgLMP / (C_LM + Math.log10(Math.max(target_hours, 1e-6))) - 273.15;
    } else {
      // Solve for rupture time: log10(t) = LMP/T - C
      const logT = avgLMP / T_target - C_LM;
      predictedHours = Math.pow(10, logT);
    }

    // Generate stress-rupture curve (time vs approximate stress placeholder)
    const curve: Array<{ hours: number; stress_MPa: number }> = [];
    for (let logH = 0; logH <= 6; logH += 0.5) {
      const hrs = Math.pow(10, logH);
      const lmpAtH = T_target * (C_LM + logH);
      const stressRatio = Math.max(0, 1 - (lmpAtH - avgLMP * 0.7) / (avgLMP * 0.6));
      curve.push({ hours: hrs, stress_MPa: stressRatio * 500 });
    }

    log.debug(`[ConstitutiveModel] LM: P=${avgLMP.toFixed(0)}, predicted=${predictedHours?.toFixed(1) ?? predictedTemp?.toFixed(1)}`);
    return { larson_miller_parameter: avgLMP, predicted_rupture_hours: predictedHours, predicted_temperature_C: predictedTemp, stress_rupture_curve: curve };
  }

  /** Hollomon power-law hardening σ = K·εⁿ — fit from data */
  hollomonHardening(input: HollomonInput): HollomonOutput {
    const { strain_data, stress_data } = input;
    const len = Math.min(strain_data.length, stress_data.length);
    // Log-log linear regression: ln(σ) = ln(K) + n·ln(ε)
    let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0, count = 0;
    for (let i = 0; i < len; i++) {
      if (strain_data[i] > 1e-6 && stress_data[i] > 0) {
        const x = Math.log(strain_data[i]);
        const y = Math.log(stress_data[i]);
        sumX += x; sumY += y; sumXY += x * y; sumXX += x * x;
        count++;
      }
    }
    const n_exp = (count * sumXY - sumX * sumY) / (count * sumXX - sumX * sumX || 1);
    const lnK = (sumY - n_exp * sumX) / Math.max(count, 1);
    const K = Math.exp(lnK);

    // R-squared
    const meanY = sumY / Math.max(count, 1);
    let ssTot = 0, ssRes = 0;
    for (let i = 0; i < len; i++) {
      if (strain_data[i] > 1e-6 && stress_data[i] > 0) {
        const y = Math.log(stress_data[i]);
        const yHat = lnK + n_exp * Math.log(strain_data[i]);
        ssTot += (y - meanY) ** 2;
        ssRes += (y - yHat) ** 2;
      }
    }
    const r2 = ssTot > 0 ? 1 - ssRes / ssTot : 0;
    const UTS = K * Math.pow(Math.max(n_exp, 1e-6), n_exp); // at ε = n (Considere criterion)

    log.debug(`[ConstitutiveModel] Hollomon: K=${K.toFixed(1)}, n=${n_exp.toFixed(4)}, R²=${r2.toFixed(4)}`);
    return { K_MPa: K, n_exponent: n_exp, r_squared: r2, UTS_MPa: UTS, uniform_elongation: Math.max(n_exp, 0) };
  }

  /** Comparative machinability rating */
  machinabilityIndex(input: MachinabilityInput): MachinabilityOutput {
    const refV60 = input.reference_v60_m_min ?? 160; // AISI 1112 baseline
    const seRatio = input.specific_energy_ratio ?? 1;
    const chipF = input.chip_factor ?? 1;
    const surfF = input.surface_factor ?? 1;

    const baseRating = (input.material_v60_m_min / refV60) * 100;
    const rating = baseRating * (1 / seRatio) * chipF * surfF;

    const category: MachinabilityOutput["category"] =
      rating >= 120 ? "excellent" :
      rating >= 80 ? "good" :
      rating >= 50 ? "fair" :
      rating >= 25 ? "poor" : "difficult";

    // Recommended speed range as % of reference
    const lo = Math.round(rating * 0.7);
    const hi = Math.round(rating * 1.2);

    log.debug(`[ConstitutiveModel] Machinability: ${rating.toFixed(1)}% (${category})`);
    return { machinability_rating: Math.round(rating * 10) / 10, category, recommended_speed_range_pct: [lo, hi] };
  }
}

// ── Gauss error function (no stdlib) ────────────────────────────────

function erf(x: number): number {
  const a1 = 0.254829592, a2 = -0.284496736, a3 = 1.421413741, a4 = -1.453152027, a5 = 1.061405429;
  const p = 0.3275911;
  const sign = x < 0 ? -1 : 1;
  const t = 1 / (1 + p * Math.abs(x));
  const y = 1 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);
  return sign * y;
}

export const constitutiveModelEngine = new ConstitutiveModelEngineImpl();
