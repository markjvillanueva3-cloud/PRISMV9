/**
 * PRISM MCP Server -- Advanced Wear Physics Engine
 *
 * 7 wear and degradation physics models with full math:
 * - Kannatey-Asibu stochastic tool life (LogNormal Monte Carlo)
 * - Fick's law crater wear (diffusion-controlled)
 * - Notch wear (oxidation + mechanical)
 * - Log-normal tool life distribution fitting (MLE, censored data)
 * - Rabinowicz abrasive wear model
 * - Flank wear ODE (RK4 three-phase progression)
 * - Takeyama-Murata combined wear mechanisms
 *
 * @module AdvancedWearPhysicsEngine
 */

import { log } from "../utils/Logger.js";

// ============================================================================
// CONSTANTS
// ============================================================================

const R_GAS = 8.314; // J/(mol·K)

// Default diffusion parameters: D0 (m²/s), Q (kJ/mol)
const DIFFUSION_PARAMS: Record<string, Record<string, { D0: number; Q: number }>> = {
  carbide:  { steel: { D0: 1.2e-4, Q: 160 }, stainless: { D0: 1.5e-4, Q: 155 }, titanium: { D0: 2.0e-4, Q: 140 } },
  cermet:   { steel: { D0: 0.8e-4, Q: 180 }, stainless: { D0: 1.0e-4, Q: 175 }, titanium: { D0: 1.4e-4, Q: 160 } },
  ceramic:  { steel: { D0: 0.3e-4, Q: 220 }, stainless: { D0: 0.4e-4, Q: 210 }, titanium: { D0: 0.6e-4, Q: 195 } },
};

// ============================================================================
// TYPES
// ============================================================================

export interface StochasticWearInput {
  cutting_speed_m_min: number;
  taylor_C: number;
  taylor_n: number;
  life_scatter_cv?: number;
  n_simulations?: number;
}

export interface StochasticWearOutput {
  mean_life_min: number;
  std_life_min: number;
  p10_life: number;
  p50_life: number;
  p90_life: number;
  probability_of_failure_at_time: (t: number) => number;
  reliability_at_time: (t: number) => number;
}

export interface FickCraterInput {
  temperature_C: number;
  time_min: number;
  tool_material: "carbide" | "cermet" | "ceramic";
  workpiece_material: "steel" | "stainless" | "titanium";
  D0_m2_s?: number;
  activation_energy_kJ?: number;
}

export interface FickCraterOutput {
  crater_depth_um: number;
  crater_width_mm: number;
  diffusion_coefficient_m2_s: number;
  wear_rate_um_per_min: number;
  critical_time_to_failure_min: number;
}

export interface NotchWearInput {
  cutting_speed_m_min: number;
  temperature_C: number;
  time_min: number;
  depth_of_cut_mm: number;
  work_hardening_ratio?: number;
  atmosphere?: "air" | "inert";
}

export interface NotchWearOutput {
  notch_depth_mm: number;
  oxidation_component_mm: number;
  mechanical_component_mm: number;
  dominant_mechanism: "oxidation" | "mechanical";
  critical_time_min: number;
}

export interface LifeDataPoint { time: number; censored: boolean; }

export interface LogNormalLifeInput {
  life_data: LifeDataPoint[];
  confidence?: number;
}

export interface LogNormalLifeOutput {
  mu: number;
  sigma: number;
  mean_life: number;
  median_life: number;
  cv: number;
  percentiles: { B10: number; B50: number; B90: number };
  ci_lower: number;
  ci_upper: number;
  goodness_of_fit: { anderson_darling: number; p_value: number };
}

export interface RabinowiczInput {
  normal_force_N: number;
  sliding_distance_mm: number;
  surface_hardness_HV: number;
  abrasive_hardness_HV: number;
  wear_coefficient_K?: number;
}

export interface RabinowiczOutput {
  wear_volume_mm3: number;
  wear_depth_um: number;
  wear_rate_mm3_per_m: number;
  severity: "mild" | "moderate" | "severe";
  hardness_ratio: number;
}

export interface FlankWearODEInput {
  cutting_speed_m_min: number;
  feed_mm_rev: number;
  time_steps_min: number[];
  initial_VB_mm?: number;
  VB_threshold_mm?: number;
  breakin_constant: number;
  steady_rate: number;
  accel_constants: [number, number];
}

export interface FlankWearProfile { time_min: number; VB_mm: number; phase: "break_in" | "steady" | "accelerated"; }

export interface FlankWearODEOutput {
  vb_profile: FlankWearProfile[];
  time_to_threshold_min: number;
  current_phase: "break_in" | "steady" | "accelerated";
  wear_rate_mm_per_min: number;
}

export interface CombinedWearInput {
  cutting_speed_m_min: number;
  temperature_C: number;
  mechanical_constant: number;
  diffusion_constant: number;
  activation_energy_kJ: number;
  time_max_min: number;
  dt_min: number;
}

export interface CombinedWearProfile { time_min: number; VB_mm: number; mechanical_mm: number; thermal_mm: number; }

export interface CombinedWearOutput {
  vb_profile: CombinedWearProfile[];
  dominant_mechanism: "mechanical" | "thermal";
  crossover_time_min: number;
  time_to_03mm_min: number;
}

// ============================================================================
// HELPERS
// ============================================================================

/** Box-Muller transform: two uniform randoms -> standard normal */
function randNormal(): number {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

/** Standard normal CDF (Abramowitz & Stegun approximation) */
function normalCDF(x: number): number {
  const a1 = 0.254829592, a2 = -0.284496736, a3 = 1.421413741, a4 = -1.453152027, a5 = 1.061405429;
  const p = 0.3275911;
  const sign = x < 0 ? -1 : 1;
  const z = Math.abs(x) / Math.SQRT2;
  const t = 1.0 / (1.0 + p * z);
  const y = 1.0 - ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-z * z);
  return 0.5 * (1.0 + sign * y);
}

/** Inverse normal CDF (rational approximation, Beasley-Springer-Moro) */
function normalInvCDF(p: number): number {
  if (p <= 0) return -Infinity;
  if (p >= 1) return Infinity;
  if (p === 0.5) return 0;
  const a = [-3.969683028665376e1, 2.209460984245205e2, -2.759285104469687e2, 1.383577518672690e2, -3.066479806614716e1, 2.506628277459239e0];
  const b = [-5.447609879822406e1, 1.615858368580409e2, -1.556989798598866e2, 6.680131188771972e1, -1.328068155288572e1];
  const c = [-7.784894002430293e-3, -3.223964580411365e-1, -2.400758277161838e0, -2.549732539343734e0, 4.374664141464968e0, 2.938163982698783e0];
  const d = [7.784695709041462e-3, 3.224671290700398e-1, 2.445134137142996e0, 3.754408661907416e0];
  const pLow = 0.02425, pHigh = 1 - pLow;
  let q: number, r: number;
  if (p < pLow) {
    q = Math.sqrt(-2 * Math.log(p));
    return (((((c[0]*q+c[1])*q+c[2])*q+c[3])*q+c[4])*q+c[5]) / ((((d[0]*q+d[1])*q+d[2])*q+d[3])*q+1);
  } else if (p <= pHigh) {
    q = p - 0.5; r = q * q;
    return (((((a[0]*r+a[1])*r+a[2])*r+a[3])*r+a[4])*r+a[5])*q / (((((b[0]*r+b[1])*r+b[2])*r+b[3])*r+b[4])*r+1);
  } else {
    q = Math.sqrt(-2 * Math.log(1 - p));
    return -(((((c[0]*q+c[1])*q+c[2])*q+c[3])*q+c[4])*q+c[5]) / ((((d[0]*q+d[1])*q+d[2])*q+d[3])*q+1);
  }
}

// ============================================================================
// ENGINE IMPLEMENTATION
// ============================================================================

class AdvancedWearPhysicsEngineImpl {

  /** 1. Kannatey-Asibu stochastic wear model (LogNormal Monte Carlo) */
  kannateyAsibuStochastic(input: StochasticWearInput): StochasticWearOutput {
    const { cutting_speed_m_min: V, taylor_C: C, taylor_n: n } = input;
    const cv = input.life_scatter_cv ?? 0.15;
    const nSim = input.n_simulations ?? 10000;

    // Taylor deterministic life: T = (C/V)^(1/n)
    const T_det = Math.pow(C / V, 1 / n);
    // LogNormal parameters from deterministic mean + cv
    // For LogNormal: cv² = exp(σ²) - 1  =>  σ² = ln(1 + cv²)
    const sigma2 = Math.log(1 + cv * cv);
    const sigma = Math.sqrt(sigma2);
    // mu chosen so E[T] = T_det: E[T] = exp(mu + σ²/2)  =>  mu = ln(T_det) - σ²/2
    const mu = Math.log(T_det) - sigma2 / 2;

    // Monte Carlo samples
    const samples: number[] = new Array(nSim);
    for (let i = 0; i < nSim; i++) {
      samples[i] = Math.exp(mu + sigma * randNormal());
    }
    samples.sort((a, b) => a - b);

    const mean = samples.reduce((s, v) => s + v, 0) / nSim;
    const variance = samples.reduce((s, v) => s + (v - mean) ** 2, 0) / (nSim - 1);
    const std = Math.sqrt(variance);
    const p10 = samples[Math.floor(nSim * 0.1)];
    const p50 = samples[Math.floor(nSim * 0.5)];
    const p90 = samples[Math.floor(nSim * 0.9)];

    log.info(`[AdvancedWearPhysics] Stochastic wear: V=${V} m/min, T_det=${T_det.toFixed(1)} min, mean=${mean.toFixed(1)}, std=${std.toFixed(1)}`);

    return {
      mean_life_min: mean,
      std_life_min: std,
      p10_life: p10,
      p50_life: p50,
      p90_life: p90,
      probability_of_failure_at_time: (t: number) => normalCDF((Math.log(t) - mu) / sigma),
      reliability_at_time: (t: number) => 1 - normalCDF((Math.log(t) - mu) / sigma),
    };
  }

  /** 2. Fick's second law crater wear (diffusion-controlled) */
  fickCraterWear(input: FickCraterInput): FickCraterOutput {
    const T_K = input.temperature_C + 273.15;
    const t_s = input.time_min * 60;
    const params = DIFFUSION_PARAMS[input.tool_material]?.[input.workpiece_material]
      ?? { D0: 1.0e-4, Q: 160 };
    const D0 = input.D0_m2_s ?? params.D0;
    const Q = (input.activation_energy_kJ ?? params.Q) * 1000; // J/mol

    // D(T) = D0 * exp(-Q/(R*T))
    const D = D0 * Math.exp(-Q / (R_GAS * T_K));

    // Crater depth: KT = sqrt(2*D*t) * C_interface
    // C_interface ~ 0.05 (carbon concentration at interface, dimensionless fraction)
    const C_iface = 0.05;
    const KT_m = Math.sqrt(2 * D * t_s) * C_iface;
    const KT_um = KT_m * 1e6;

    // Crater width approximation: ~10x depth (parabolic profile)
    const crater_width_mm = KT_um * 10 / 1000;

    // Wear rate
    const rate_um_min = t_s > 0 ? KT_um / input.time_min : 0;

    // Critical time: KT = 100 um (typical failure criterion)
    const KT_crit_m = 100e-6;
    const t_crit_s = C_iface > 0 ? (KT_crit_m / C_iface) ** 2 / (2 * D) : Infinity;
    const t_crit_min = t_crit_s / 60;

    log.info(`[AdvancedWearPhysics] Fick crater: D=${D.toExponential(3)} m²/s, KT=${KT_um.toFixed(2)} um at ${input.time_min} min`);

    return {
      crater_depth_um: KT_um,
      crater_width_mm,
      diffusion_coefficient_m2_s: D,
      wear_rate_um_per_min: rate_um_min,
      critical_time_to_failure_min: t_crit_min,
    };
  }

  /** 3. Notch wear: oxidation + mechanical abrasion */
  notchWear(input: NotchWearInput): NotchWearOutput {
    const T_K = input.temperature_C + 273.15;
    const t = input.time_min;
    const whr = input.work_hardening_ratio ?? 1.5;
    const isAir = (input.atmosphere ?? "air") === "air";

    // Oxidation: W_ox = K_ox * exp(-Q_ox/(RT)) * sqrt(t)
    const K_ox = isAir ? 2.5e-3 : 1.0e-4; // mm·min^(-1/2) base
    const Q_ox = 120000; // J/mol
    const W_ox = K_ox * Math.exp(-Q_ox / (R_GAS * T_K)) * Math.sqrt(t);

    // Mechanical: W_mech = K_mech * sigma_wh * V * t
    // sigma_wh = work_hardening_ratio * base_yield (~300 MPa for SS)
    const sigma_wh = whr * 300; // MPa
    const K_mech = 1.5e-9; // mm/(MPa·m/min·min)
    const W_mech = K_mech * sigma_wh * input.cutting_speed_m_min * t;

    const W_total = W_ox + W_mech;
    const dominant: "oxidation" | "mechanical" = W_ox >= W_mech ? "oxidation" : "mechanical";

    // Critical time: W_notch = 1.0 mm (typical notch failure)
    // Solve: K_ox*exp(-Q/(RT))*sqrt(t) + K_mech*sigma_wh*V*t = 1.0
    // Newton-Raphson
    let tc = 10;
    const oxCoeff = K_ox * Math.exp(-Q_ox / (R_GAS * T_K));
    const mechCoeff = K_mech * sigma_wh * input.cutting_speed_m_min;
    for (let i = 0; i < 50; i++) {
      const f = oxCoeff * Math.sqrt(tc) + mechCoeff * tc - 1.0;
      const fp = oxCoeff / (2 * Math.sqrt(tc)) + mechCoeff;
      const tn = tc - f / fp;
      if (Math.abs(tn - tc) < 1e-6) break;
      tc = Math.max(tn, 0.001);
    }

    log.info(`[AdvancedWearPhysics] Notch wear: total=${W_total.toFixed(4)} mm, dominant=${dominant}, tc=${tc.toFixed(1)} min`);

    return {
      notch_depth_mm: W_total,
      oxidation_component_mm: W_ox,
      mechanical_component_mm: W_mech,
      dominant_mechanism: dominant,
      critical_time_min: tc,
    };
  }

  /** 4. Log-normal tool life distribution fitting (MLE with censored data) */
  logNormalToolLife(input: LogNormalLifeInput): LogNormalLifeOutput {
    const data = input.life_data;
    const conf = input.confidence ?? 0.95;
    const z = normalInvCDF(0.5 + conf / 2);
    const n = data.length;

    // Separate failures and censored
    const failures = data.filter(d => !d.censored);
    const censored = data.filter(d => d.censored);
    const nf = failures.length;

    if (nf < 2) throw new Error("Need at least 2 uncensored observations for MLE");

    // MLE for log-normal with right-censored data (Newton-Raphson on log-likelihood)
    // Initial estimates from uncensored data
    const logTimes = failures.map(d => Math.log(d.time));
    let mu = logTimes.reduce((s, v) => s + v, 0) / nf;
    let sigma = Math.sqrt(logTimes.reduce((s, v) => s + (v - mu) ** 2, 0) / nf);
    if (sigma < 0.01) sigma = 0.1;

    // EM-style iteration for censored MLE
    for (let iter = 0; iter < 100; iter++) {
      let sumW = 0, sumWx = 0, sumWx2 = 0;

      // Uncensored contributions
      for (const d of failures) {
        const lnT = Math.log(d.time);
        sumW += 1;
        sumWx += lnT;
        sumWx2 += lnT * lnT;
      }

      // Censored contributions via conditional expectations
      for (const d of censored) {
        const lnT = Math.log(d.time);
        const z_c = (lnT - mu) / sigma;
        const phi = Math.exp(-0.5 * z_c * z_c) / Math.sqrt(2 * Math.PI);
        const Phi = normalCDF(z_c);
        const R = 1 - Phi;
        if (R < 1e-12) continue;
        const lambda = phi / R; // inverse Mills ratio
        // E[ln(T) | ln(T) > lnT] = mu + sigma * lambda
        const eLnT = mu + sigma * lambda;
        // E[ln(T)² | ln(T) > lnT] = mu² + sigma² + sigma*(mu + sigma*z_c - sigma)*lambda ... simplified
        const eLnT2 = eLnT * eLnT + sigma * sigma * (1 - lambda * (lambda - z_c));
        sumW += 1;
        sumWx += eLnT;
        sumWx2 += eLnT2;
      }

      const muNew = sumWx / sumW;
      const sigma2New = sumWx2 / sumW - muNew * muNew;
      const sigmaNew = Math.sqrt(Math.max(sigma2New, 1e-8));

      if (Math.abs(muNew - mu) < 1e-8 && Math.abs(sigmaNew - sigma) < 1e-8) break;
      mu = muNew;
      sigma = sigmaNew;
    }

    const meanLife = Math.exp(mu + sigma * sigma / 2);
    const medianLife = Math.exp(mu);
    const cvLife = Math.sqrt(Math.exp(sigma * sigma) - 1);

    const B10 = Math.exp(mu + sigma * normalInvCDF(0.10));
    const B50 = medianLife;
    const B90 = Math.exp(mu + sigma * normalInvCDF(0.90));

    // Confidence interval on median
    const se_mu = sigma / Math.sqrt(nf);
    const ci_lower = Math.exp(mu - z * se_mu);
    const ci_upper = Math.exp(mu + z * se_mu);

    // Anderson-Darling test on uncensored data
    const sortedLog = [...logTimes].sort((a, b) => a - b);
    let A2 = 0;
    for (let i = 0; i < nf; i++) {
      const zi = (sortedLog[i] - mu) / sigma;
      const Fi = normalCDF(zi);
      const cFi = Math.max(1e-12, Math.min(1 - 1e-12, Fi));
      A2 += (2 * (i + 1) - 1) * (Math.log(cFi) + Math.log(1 - normalCDF((sortedLog[nf - 1 - i] - mu) / sigma)));
    }
    A2 = -nf - A2 / nf;
    // Adjusted A² for small samples
    const A2adj = A2 * (1 + 0.75 / nf + 2.25 / (nf * nf));
    // Approximate p-value (D'Agostino & Stephens)
    let pVal: number;
    if (A2adj < 0.2) pVal = 1 - Math.exp(-13.436 + 101.14 * A2adj - 223.73 * A2adj * A2adj);
    else if (A2adj < 0.34) pVal = 1 - Math.exp(-8.318 + 42.796 * A2adj - 59.938 * A2adj * A2adj);
    else if (A2adj < 0.6) pVal = Math.exp(0.9177 - 4.279 * A2adj - 1.38 * A2adj * A2adj);
    else pVal = Math.exp(1.2937 - 5.709 * A2adj + 0.0186 * A2adj * A2adj);
    pVal = Math.max(0, Math.min(1, pVal));

    log.info(`[AdvancedWearPhysics] LogNormal fit: mu=${mu.toFixed(3)}, sigma=${sigma.toFixed(3)}, median=${medianLife.toFixed(1)} min, n=${n} (${nf} failures)`);

    return {
      mu, sigma, mean_life: meanLife, median_life: medianLife, cv: cvLife,
      percentiles: { B10, B50, B90 },
      ci_lower, ci_upper,
      goodness_of_fit: { anderson_darling: A2adj, p_value: pVal },
    };
  }

  /** 5. Rabinowicz abrasive wear model */
  rabinowiczAbrasiveWear(input: RabinowiczInput): RabinowiczOutput {
    const { normal_force_N: F, sliding_distance_mm: L_mm, surface_hardness_HV: Hw, abrasive_hardness_HV: Ha } = input;
    const ratio = Ha / Hw;
    const L_m = L_mm / 1000;

    // Wear coefficient from hardness ratio
    // K ~ 1e-1 for Ha/Hw > 1.2 (severe), 1e-3 for 0.8-1.2 (moderate), 1e-5 for < 0.8 (mild)
    let K: number;
    if (input.wear_coefficient_K !== undefined) {
      K = input.wear_coefficient_K;
    } else if (ratio > 1.2) {
      K = 5e-2 * (ratio - 0.8);
    } else if (ratio > 0.8) {
      K = 1e-3 * ratio;
    } else {
      K = 1e-5 * ratio;
    }

    // Hardness in Pa: HV * 9.807e6
    const H_Pa = Hw * 9.807e6;

    // W = K * F * L / (3 * H)  [m³]
    const W_m3 = K * F * L_m / (3 * H_Pa);
    const W_mm3 = W_m3 * 1e9;

    // Wear depth: assume circular contact area ~ F/(H*9.807e6), radius = sqrt(A/pi)
    const A_m2 = F / H_Pa;
    const depth_m = W_m3 / Math.max(A_m2, 1e-12);
    const depth_um = depth_m * 1e6;

    const rate_mm3_per_m = L_m > 0 ? W_mm3 / L_m : 0;

    let severity: "mild" | "moderate" | "severe";
    if (ratio > 1.2) severity = "severe";
    else if (ratio > 0.8) severity = "moderate";
    else severity = "mild";

    log.info(`[AdvancedWearPhysics] Rabinowicz: K=${K.toExponential(2)}, W=${W_mm3.toFixed(4)} mm³, severity=${severity}`);

    return {
      wear_volume_mm3: W_mm3,
      wear_depth_um: depth_um,
      wear_rate_mm3_per_m: rate_mm3_per_m,
      severity,
      hardness_ratio: ratio,
    };
  }

  /** 6. Flank wear ODE with RK4 integration (three-phase model) */
  flankWearODE(input: FlankWearODEInput): FlankWearODEOutput {
    const { time_steps_min: steps, breakin_constant: C1, steady_rate: C2, accel_constants: [C3, C4] } = input;
    const VB0 = input.initial_VB_mm ?? 0;
    const VB_thresh = input.VB_threshold_mm ?? 0.3;
    const breakinEnd = 0.1; // VB at which break-in transitions to steady

    const profile: FlankWearProfile[] = [];
    let VB = VB0;
    let thresholdTime = -1;

    // dVB/dt depends on phase
    const dvbdt = (vb: number, t: number): number => {
      if (vb < breakinEnd && t < 5) {
        // Break-in: dVB/dt = C1 / sqrt(t)
        return C1 / Math.sqrt(Math.max(t, 0.001));
      } else if (vb < VB_thresh * 0.8) {
        // Steady: dVB/dt = C2
        return C2;
      } else {
        // Accelerated: dVB/dt = C3 * exp(C4 * VB)
        return C3 * Math.exp(C4 * vb);
      }
    };

    const getPhase = (vb: number, t: number): "break_in" | "steady" | "accelerated" => {
      if (vb < breakinEnd && t < 5) return "break_in";
      if (vb < VB_thresh * 0.8) return "steady";
      return "accelerated";
    };

    // Sort time steps and integrate with RK4
    const sorted = [...steps].sort((a, b) => a - b);
    let tPrev = 0;
    profile.push({ time_min: 0, VB_mm: VB, phase: getPhase(VB, 0) });

    for (const tTarget of sorted) {
      // RK4 from tPrev to tTarget with adaptive substeps
      let tCur = tPrev;
      const nSub = Math.max(Math.ceil((tTarget - tPrev) * 10), 1);
      const dt = (tTarget - tPrev) / nSub;

      for (let s = 0; s < nSub; s++) {
        const k1 = dvbdt(VB, tCur);
        const k2 = dvbdt(VB + 0.5 * dt * k1, tCur + 0.5 * dt);
        const k3 = dvbdt(VB + 0.5 * dt * k2, tCur + 0.5 * dt);
        const k4 = dvbdt(VB + dt * k3, tCur + dt);
        VB += (dt / 6) * (k1 + 2 * k2 + 2 * k3 + k4);
        VB = Math.max(VB, 0);
        tCur += dt;

        if (thresholdTime < 0 && VB >= VB_thresh) {
          thresholdTime = tCur;
        }
      }

      profile.push({ time_min: tTarget, VB_mm: VB, phase: getPhase(VB, tTarget) });
      tPrev = tTarget;
    }

    const lastEntry = profile[profile.length - 1];
    const prevEntry = profile.length > 1 ? profile[profile.length - 2] : profile[0];
    const dt_last = lastEntry.time_min - prevEntry.time_min;
    const rate = dt_last > 0 ? (lastEntry.VB_mm - prevEntry.VB_mm) / dt_last : 0;

    log.info(`[AdvancedWearPhysics] Flank ODE: VB=${VB.toFixed(3)} mm at t=${sorted[sorted.length - 1]} min, phase=${lastEntry.phase}`);

    return {
      vb_profile: profile,
      time_to_threshold_min: thresholdTime > 0 ? thresholdTime : (VB < VB_thresh ? Infinity : sorted[sorted.length - 1]),
      current_phase: lastEntry.phase,
      wear_rate_mm_per_min: rate,
    };
  }

  /** 7. Takeyama-Murata combined wear: mechanical + thermochemical */
  combinedWearMechanisms(input: CombinedWearInput): CombinedWearOutput {
    const { mechanical_constant: C1, diffusion_constant: C2, time_max_min: tMax, dt_min: dt } = input;
    const T_K = input.temperature_C + 273.15;
    const Ea = input.activation_energy_kJ * 1000; // J/mol

    // dVB/dt = C1 + C2 * exp(-Ea/(R*T))
    const thermalRate = C2 * Math.exp(-Ea / (R_GAS * T_K));

    const profile: CombinedWearProfile[] = [];
    let VB = 0, mechTotal = 0, thermTotal = 0;
    let crossover = -1;
    let timeTo03 = -1;

    const nSteps = Math.ceil(tMax / dt);
    for (let i = 0; i <= nSteps; i++) {
      const t = Math.min(i * dt, tMax);

      if (i > 0) {
        const stepDt = t - (i - 1) * dt;
        const dMech = C1 * stepDt;
        const dTherm = thermalRate * stepDt;
        mechTotal += dMech;
        thermTotal += dTherm;
        VB = mechTotal + thermTotal;

        if (crossover < 0 && thermTotal > mechTotal) {
          crossover = t;
        }
        if (timeTo03 < 0 && VB >= 0.3) {
          timeTo03 = t;
        }
      }

      profile.push({
        time_min: t,
        VB_mm: VB,
        mechanical_mm: mechTotal,
        thermal_mm: thermTotal,
      });

      if (t >= tMax) break;
    }

    const dominant: "mechanical" | "thermal" = mechTotal >= thermTotal ? "mechanical" : "thermal";

    log.info(`[AdvancedWearPhysics] Takeyama-Murata: VB=${VB.toFixed(3)} mm at ${tMax} min, dominant=${dominant}, thermal_rate=${thermalRate.toExponential(3)}`);

    return {
      vb_profile: profile,
      dominant_mechanism: dominant,
      crossover_time_min: crossover > 0 ? crossover : Infinity,
      time_to_03mm_min: timeTo03 > 0 ? timeTo03 : Infinity,
    };
  }
}

export const advancedWearPhysicsEngine = new AdvancedWearPhysicsEngineImpl();
